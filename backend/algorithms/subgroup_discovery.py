import os
import sys
sys.path.append("../")
from .dim_reduction import data_preprocess, get_data

import random
import pandas as pd
import numpy as np  
import scipy.stats 

import warnings
warnings.filterwarnings("ignore")
 
from pymoo.core.problem import ElementwiseProblem  
from pymoo.algorithms.moo.nsga2 import NSGA2   
from pymoo.optimize import minimize  
from pymoo.operators.crossover.pntx import TwoPointCrossover  
from pymoo.operators.mutation.bitflip import BitflipMutation  
from pymoo.operators.sampling.rnd import BinaryRandomSampling 
from pymoo.core.sampling import Sampling
 

class MyProblem(ElementwiseProblem):  
    
    def __init__(self, df_ori, df_bin, rule_length, cov_ratio, num_thresh, covariate, treatment, outcome):  
        super().__init__(n_var=len(covariate), n_obj=3, n_ieq_constr=2, xl=0, xu=1, type_var=int)  
        self.df_bin = df_bin  
        self.columns = df_bin.columns  
        self.rule_length = rule_length  
        self.cov_ratio = cov_ratio   
        self.num_thresh = num_thresh
        self.df_ori = df_ori
        self.treatment = treatment
        self.outcome = outcome
        self.feature_ranges = self.calculate_feature_ranges()
  
    def _evaluate(self, x, out, *args, **kwargs):  
        sub = self.get_subgroup(x)
        selected_rules = sub["rules"]
        sub_df_bin = sub["sub_df_bin"]
        sub_df_ori = sub["sub_df"]

        # 计算涉及特征的数量
        num_features = 0  
        for feature, (start, end) in self.feature_ranges.items():  
            if any(x[start:end]):  
                num_features += 1  

        # 目标函数
        f1 = self.cal_effect(selected_rules,sub_df_bin) * -1 
        var = self.cal_var(selected_rules,sub_df_bin)
        f2 = var["tr_var"]  
        f3 = var["con_var"]

  
        out["F"] = [f1, f2, f3]  

        #约束条件
        g1 = num_features - self.rule_length
        g2 = self.cov_ratio - len(sub_df_bin) / len(self.df_bin)
        
        out["G"] = [g1, g2] 
         
    def cal_effect(self, selected_rules,sub_df):  
        twt = np.sum(sub_df['wt'])  
        ttreat = np.sum(sub_df['wt'] * sub_df[self.treatment])  
        temp1 = np.sum(sub_df[self.outcome] * sub_df['wt'] * sub_df[self.treatment])
        temp0 = np.sum(sub_df[self.outcome] * sub_df['wt'] * (1 - sub_df[self.treatment]))

        if not np.isfinite(ttreat) or not np.isfinite(twt) or np.isclose(ttreat, 0, atol=1e-8) or np.isclose(twt - ttreat, 0, atol=1e-8):  
            return 0
        
        effect = (temp1 / ttreat) - (temp0 / (twt - ttreat))

        return effect
  
    def cal_var(self, selected_rules,sub_df):  
        
        temp1 = np.sum(sub_df[self.outcome] * sub_df['wt'] * sub_df[self.treatment])  
        temp0 = np.sum(sub_df[self.outcome] * sub_df['wt'] * (1 - sub_df[self.treatment]))  
        twt = np.sum(sub_df['wt'])  
        ttreat = np.sum(sub_df['wt'] * sub_df[self.treatment])  
        tr_sqr_sum = np.sum(sub_df[self.outcome]**2 * sub_df['wt'] * sub_df[self.treatment])  
        con_sqr_sum = np.sum(sub_df[self.outcome]**2 * sub_df['wt'] *(1 - sub_df[self.treatment]))

        if not np.isfinite(ttreat) or not np.isfinite(twt) or np.isclose(ttreat, 0, atol=1e-8) or np.isclose(twt - ttreat, 0, atol=1e-8):   
            return {"tr_var":0, "con_var":0}
        
        tr_var = tr_sqr_sum / ttreat - (temp1 / ttreat)**2   
        con_var = con_sqr_sum / (twt - ttreat) - (temp0 / (twt - ttreat))**2 

        result = {   
            "tr_var": tr_var,  
            "con_var": con_var, 
        }  

        return result 
    
    def calculate_feature_ranges(self):  

        # 初始化特征范围字典  
        feature_ranges = {}  
        start = 0

        col_names = self.df_bin.columns[:self.n_var]
        features = self.df_ori.columns

        # 计算每个特征的出现次数并更新特征范围字典  
        for feature in features:  
            count = sum([col.startswith(feature + " ") for col in col_names])  
            if count > 0:  # 忽略计数为0的特征  
                feature_ranges[feature] = (start, start + count)  
                start += count 
        
        return feature_ranges 
    
    def get_subgroup( self, x):

        selected_rules = [rule for rule, selected in zip(self.columns, x) if selected]      
    
        # Split the selected rules into two categories    
        equality_rules = [rule for rule in selected_rules if '==' in rule]    
        inequality_rules = [rule for rule in selected_rules if '<=' in rule or '>' in rule]    
    
        # For the equality rules, group them by feature and apply any() within each group    
        equality_df = pd.DataFrame(index = self.df_bin.index)    

        for feature in set(rule.split(' ')[0] for rule in equality_rules):    
            feature_rules = [rule for rule in equality_rules if rule.startswith(feature)]    
            equality_df[feature] = self.df_bin[feature_rules].any(axis=1)    
    
        # For the inequality rules, apply all() directly    
        inequality_df = self.df_bin[inequality_rules].all(axis=1)    
    
        # Get the rows that satisfy all rules    
        index_obj = equality_df.all(axis=1) & inequality_df
        
        sub_df_bin = self.df_bin.loc[index_obj]  
        sub_df = self.df_ori.loc[index_obj]  
    
        return {
            "rules":selected_rules,
            "sub_df_bin":sub_df_bin,
            "sub_df": sub_df
        }        
    

#子群发现
def subgroup_discovery(data_file, treatment="t", outcome="y", num_thresh = 4, length_limit = 4, cov_ratio = 0.03, max_subgroup_size = 200, categorical_columns = []):
    #数据预处理
    df, df_binarized, _, covariates = data_preprocess(data_file, treatment, outcome, num_thresh, categorical_columns)

    covariate = [col for col in df_binarized.columns.tolist() if col not in ['e', 'wt', 'v', 'TE', treatment, outcome]]

    problem = MyProblem(df, df_binarized, length_limit, cov_ratio, num_thresh, covariate, treatment, outcome)  

    class CustomSampling(Sampling):  
    
        def __init__(self, rule_length, feature_ranges):  
            super().__init__()  
            self.rule_length = rule_length  
            self.feature_ranges = feature_ranges  
    
        def _do(self, problem, n_samples, **kwargs):  
            X = np.zeros((n_samples, problem.n_var), dtype=int)  
            for i in range(n_samples):  
                # 随机选择`self.rule_length`个特征  
                features = random.sample(list(self.feature_ranges.keys()), self.rule_length)  
                for feature in features:  
                    # 随机选择一个或多个规则  
                    start, end = self.feature_ranges[feature]  
                    indices = np.random.choice(range(start, end), size=random.randint(0, (end-start)/2), replace=False)    
                    # 将选中的规则对应的值设为1  
                    X[i, indices] = 1  
            X = X.astype(bool)
            return X  
        
    algorithm = NSGA2(  
        pop_size=max_subgroup_size,  
        sampling=CustomSampling(rule_length=problem.rule_length, feature_ranges=problem.feature_ranges),
        crossover=TwoPointCrossover(),  
        mutation=BitflipMutation(),  
        eliminate_duplicates=True  
    )  

    # 进行优化 
    res = minimize(problem,  
                algorithm,   
                seed=1,  
                save_history=True,
                verbose=True) 
    
    #后处理结果及格式转换
    X_unique, F_unique = get_unique_res(res)
    
    sub_dfs = {}
    subgroup_list = []
    attributes_dic = {}
    all_covered_ids = set() 

    covariate_counts = {} 
    for i, covariates_list in enumerate(get_covariates_list( df_binarized, X) for X in X_unique):
        unique_covariates = set(covariates_list)
        for covariate in unique_covariates:  
            if covariate in covariate_counts:  
                covariate_counts[covariate] += 1  
            else:  
                covariate_counts[covariate] = 1 

    ordered_covariates = sorted(covariate_counts, key=covariate_counts.get, reverse=True) 

    #得到数据特征信息
    attributes_dic = get_attributes(df, ordered_covariates)

    #得到子群信息
    for i, subgroup_range in enumerate(get_subgroup_range(df, df_binarized, X, attributes_dic) for X in X_unique):  

        subgroup_list.append({  
            "id": i,  
            "charts": subgroup_range["features"],
            "metrics": {  
                "treatment effect": F_unique[i][0] * - 1,  
                "treated variance": F_unique[i][1],  
                "control variance": F_unique[i][2],  
                "covered units": len(subgroup_range["cover id"]),  
                "rule antecedent length": len(subgroup_range["features"]),  
            },  
            "covered id": subgroup_range["cover id"]  
        })  

        sub_dfs["i"] = {  
            "sub_df": subgroup_range["sub_df"],  
            "cover_id": subgroup_range["cover id"]  
        }    

        all_covered_ids = all_covered_ids.union(set(subgroup_range["cover id"]))  
    

    #组合得到最终结果
    data = {  
        "subgroup": subgroup_list,
        "attributes": attributes_dic,
        "dataset_info": {
            "records_num": len(df),
            "attributes_num": len(covariates),
            "subgroup_num": len(subgroup_list)
        },
        "causal_units_id": list(all_covered_ids)
    }  

    return {
        "dic": data,
        "sub_dfs": sub_dfs,
        "res": res
    }

#取出多目标优化结果中的重复值
def get_unique_res(res):  
    # 转换为 DataFrame    
    F = res.F
    X = res.X
    df = pd.DataFrame(F)    
  
    # 找到所有重复的行    
    duplicated_rows = df.duplicated(keep=False)    
  
    # 找到重复行的索引    
    duplicated_indices = np.where(duplicated_rows)[0]    
  
    # 将所有的重复行的索引分组    
    duplicated_indices_grouped = []    
    for index in duplicated_indices:    
        if index not in [item for sublist in duplicated_indices_grouped for item in sublist]:    
            duplicates = (df.iloc[index] == df).all(axis=1)    
            duplicated_indices_grouped.append(list(np.where(duplicates)[0]))    
  
    # 从每个分组中取出第一个索引    
    indices = np.array([group[0] for group in duplicated_indices_grouped])    
  
    # 找到所有非重复行的索引    
    non_duplicated_indices = np.where(~duplicated_rows)[0]    
  
    # 合并重复行和非重复行的索引    
    all_indices = np.concatenate([indices, non_duplicated_indices])    
  
    # 从 X 和 F 中取出对应的行    
    X_unique = X[all_indices]  
    F_unique = F[all_indices]    
      
    return X_unique, F_unique 


#得到字典格式的特征
def get_attributes(df, colunm, sample_count = 10):
    attributes = []  
    count = df.shape[0]

    for i, col in enumerate(colunm, 1):  
        unique_values = df[col].unique()  
        valUniq = df[col].nunique()

        if valUniq > 2 and np.issubdtype(df[col].dtype, np.number):
            type = "number"
        else:
            type = "string"
        attribute = {  
            "id": i,  
            "name": col,  
            "type": type,
            "data":None
        }  
        
        if attribute["type"] == "number":  
            
            mi = int(np.floor(df[col].min()))  
            ma = int(np.ceil(df[col].max())) 
            attribute["range"] = [mi, ma]  
            rs = df[col]  
            density = scipy.stats.gaussian_kde(rs)  
            x = np.linspace(mi, ma, sample_count)  
            y = density(x) * count
            attr_data = np.concatenate((x[:, None], y[:, None]), axis=1).tolist()  
            attribute["data"] = attr_data

        else:  
            attribute["range"] = sorted([str(x) for x in list(set(unique_values))])

            counts = df[col].value_counts().to_dict()  
            # Reorder the counts according to the order of unique values in 'range'  
            attribute["data"] = [counts[val] for val in attribute["range"]] 
        
        attributes.append(attribute)  

    return attributes


#根据X得到涉及的协变量
def get_covariates_list(df_bin, x):
    
    selected_rules = [rule for rule, choose in zip(df_bin.columns, x) if choose]  
    covariates_list = [] 

    # 遍历选择的规则  
    for rule in selected_rules:  
        # 分割规则，获取变量名、操作符和值  
        variable, operator, value = rule.split()  
        covariates_list.append(variable)

    return covariates_list


#将布尔列表转化为规则字典，表示子群描述
def get_subgroup_range( df, df_bin, x, attributes_dic):
    # 通过布尔列表X筛选出你想要的列  
    selected_rules = [rule for rule, choose in zip(df_bin.columns, x) if choose]  
    rules_dict = {}  
    
    #创建特征映射字典
    name_mapping_dict = {attribute['name']: attribute['id'] for attribute in attributes_dic}
    range_mapping_dict = {attribute['name']: attribute['range'] for attribute in attributes_dic}  

    # 遍历选择的规则  
    for rule in selected_rules:  
        # 分割规则，获取变量名、操作符和值  
        variable, operator, value = rule.split()  
        
        # 根据操作符调整规则  
        if operator == '==':  
            if variable in rules_dict:  
                rules_dict[variable].append(value)  
            else:  
                rules_dict[variable] = [value]  
        elif operator in ['<=', '<']:  
            # 如果操作符是不等号，尝试将值转化为浮点数并保留两位有效数字  
            try:  
                value = round(float(value), 2)  
            except ValueError:  
                pass  
            if variable in rules_dict:  
                rules_dict[variable][1] = min(rules_dict[variable][1], value)  
            else:  
                rules_dict[variable] = [range_mapping_dict[variable][0], value]  
        elif operator in ['>', '>=']:  
            # 如果操作符是不等号，尝试将值转化为浮点数并保留两位有效数字  
            try:  
                value = round(float(value), 2)  
            except ValueError:  
                pass  
            if variable in rules_dict:  
                rules_dict[variable][0] = max(rules_dict[variable][0], value)  
            else:  
                rules_dict[variable] = [value, range_mapping_dict[variable][1]] 

    covariates_list = list(rules_dict.keys())  

    new_features = {name_mapping_dict.get(key, "null"): value for key, value in rules_dict.items()}

    # Split the selected rules into two categories    
    equality_rules = [rule for rule in selected_rules if '==' in rule]    
    inequality_rules = [rule for rule in selected_rules if '<=' in rule or '>' in rule]    

    # For the equality rules, group them by feature and apply any() within each group    
    equality_df = pd.DataFrame(index = df_bin.index)    

    for feature in set(rule.split(' ')[0] for rule in equality_rules):    
        feature_rules = [rule for rule in equality_rules if rule.startswith(feature)]    
        equality_df[feature] = df_bin[feature_rules].any(axis=1)    

    # For the inequality rules, apply all() directly    
    inequality_df = df_bin[inequality_rules].all(axis=1)    

    # Get the rows that satisfy all rules    
    index_obj = equality_df.all(axis=1) & inequality_df
    
    sub_df_bin = df_bin.loc[index_obj]  
    sub_df = df.loc[index_obj]  

    index_list = list(sub_df.index)

    return {
        "features":new_features,
        "cover id":index_list,
        "sub_df":sub_df,
        "covariates_list":covariates_list
    }  