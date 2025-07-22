from sklearn.model_selection import train_test_split
from aix360.algorithms.rbm import FeatureBinarizer
import re
import ast
import pandas as pd
import numpy as np
import time
import random
import warnings  
import sys
sys.path.append("../")

warnings.filterwarnings("ignore", category=UserWarning)  

def ripper( df_ori, covariates, treatment, outcome):

    from aix360.algorithms.rule_induction.ripper import RipperExplainer

    print("\nripper start\n")
    # prepare data
    df = df_ori.copy()
    df = binary_outcome(df, outcome)
    columns = covariates + [outcome]
    df = df[columns]
    TARGET_COLUMN = outcome
    POS_VALUE = 1
    y_train = df[TARGET_COLUMN]
    x_train = df.drop(columns=[TARGET_COLUMN])

    #train and get the result
    estimator = RipperExplainer()
    start_time = time.time()
    estimator.fit(x_train, y_train, target_label=POS_VALUE)
    end_time = time.time()
    train_time = end_time - start_time

    rules = estimator.explain()
    rule_list = preprocess_rules(str(rules))

    return {
        "rules": rule_list,
        "time": train_time
    }


def brcg( df_ori, covariates, treatment, outcome):
    
    from aix360.algorithms.rule_induction.rbm.boolean_rule_cg import BooleanRuleCG
    from aix360.algorithms.rbm import FeatureBinarizer

    print("\nbrcg start\n")
    # prepare data
    df = df_ori.copy()
    df = binary_outcome(df, outcome)
    columns = covariates + [outcome]
    df = df[columns]
    TARGET_COLUMN = outcome
    POS_VALUE = 1
    y_train = df[TARGET_COLUMN]
    x_train = df.drop(columns=[TARGET_COLUMN])

    #train and get the result
    fb = FeatureBinarizer(negations=True)
    X_train_fb = fb.fit_transform(x_train)  
    explainer = BooleanRuleCG(silent=True)
    start_time = time.time()
    explainer.fit(X_train_fb, y_train)
    end_time = time.time()
    train_time = end_time - start_time

    rules = explainer.explain()
    rule_list = preprocess_rules(str(rules))
    
    return {
        "rules": rule_list,
        "time": train_time
    }


def pys( df_ori, covariates, treatment, outcome):

    import pysubgroup as ps
    print("\npys start\n")
    
    df = df_ori.copy()
    df = binary_outcome(df, outcome)
    target = ps.BinaryTarget (outcome, True)
    non_covariate_columns = [col for col in df.columns if col not in covariates]  
    searchspace = ps.create_selectors(df, ignore=non_covariate_columns)
    task = ps.SubgroupDiscoveryTask (
        df,
        target,
        searchspace,
        result_set_size=20,
        depth=4,
        qf=ps.WRAccQF())

    start_time = time.time()
    result = ps.DFS().execute(task)
    end_time = time.time()
    train_time = end_time - start_time

    result = result.to_dataframe()

    # process the rules
    rules = result["subgroup"].astype(str).tolist() 
    rule_list = pys_process(rules)

    return {
        "rules": rule_list,
        "time": train_time
    }


def dt( df_ori, covariates, treatment, outcome, thre = 0.03, max_depth = 4):
    from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier   
    from sklearn.preprocessing import LabelEncoder 

    print("\ndt start\n")

    # prepare data
    df = df_ori.copy()
    encoders = {}     
    for column in df.columns:    
        if df[column].dtype == 'object':  # 如果是类别型特征    
            le = LabelEncoder()  
            df[column] = le.fit_transform(df[column])  # 进行标签编码    
            encoders[column] = le  # 保存LabelEncoder对象  
        
    X_train = df[covariates]
    y_train = df[outcome]  

    # train the model 
    model = DecisionTreeRegressor(max_depth=max_depth, random_state=42)  
    start_time = time.time()
    model.fit(X_train, y_train)  
    end_time = time.time()
    train_time = end_time - start_time

    # get the rules
    rules = get_reg_rules(model.tree_, covariates, thre) 
    rule_list = [rule[:-5] for prob, rule in rules]
    rule_list = [decode_rule(rule, encoders) for rule in rule_list]

    return {
        "rules": rule_list,
        "time": train_time
    }


def CURLS( df_ori, covariates, treatment, outcome, k, thre = 0.03, max_rule_length = 4, num_thresh=8, variance_weight = 0.0):
    import sys
    sys.path.append("../")
    from CURLS import DataPreprocessor, CausalRuleLearner

    col_categ = []
    for var in covariates:   
        if pd.api.types.is_object_dtype(df_ori[var]):   
            col_categ.append(var)

    data_preprocessor = DataPreprocessor(covariates, col_categ, num_thresh = num_thresh)
    df_binarized = data_preprocessor.fit_transform(df_ori)
    causal_learner = CausalRuleLearner(df_binarized, max_rule_length = max_rule_length,variance_weight = variance_weight, minimum_coverage = thre)
    
    start_time = time.time()
    causal_learner.find_rules(num_rules_to_find = k)
    end_time = time.time()
    train_time = end_time - start_time
    
    causal_learner.print_rules()
    rule_list = causal_learner.conditions_str
    ite_list = causal_learner.treatment_effect_values

    return {
        "rules": rule_list,
        "time": train_time
    }

def causal_tree(df_ori, covariates, treatment, outcome, thre = 0.03, max_rule_length = 4, **kwargs):
    import rpy2.robjects as ro  
    from rpy2.robjects import pandas2ri  
    from rpy2.robjects.conversion import localconverter       

    print("\nct start\n")  

    with localconverter(ro.default_converter + pandas2ri.converter):  
        df = pandas2ri.py2rpy(df_ori)
        
    ro.r('''Sys.setlocale("LC_ALL", "en_US.UTF-8")''')   
    ro.r('set.seed(123)') 
    # load the r file  
    ro.r['source']('r_baseline.R')  

    # load and exec r function  
    r_function = ro.globalenv['causal_tree']   
    result = r_function(df, covariates, treatment, outcome, thre = thre, **kwargs)
    
    # process the error
    if result[0][0] == "rules not found enough":
        print("causal_tree rules not found enough")
        return {
        "rules": [],
        "time": round(float(result[1][0]), 3) 
        }

    # change dataframe to python 
    with localconverter(ro.default_converter + pandas2ri.converter):  
        rules = ro.conversion.rpy2py(result[0])

    # change rules to python grammar
    import re    
    rules = rules.reset_index(drop=True)
    for i in range(len(rules)):   
        rules.loc[i, "rule"] = re.sub(r'%in% c\((.*?)\)', r'in [\1]', rules.loc[i, "rule"])   
    rule_list = list(rules["rule"])
    rule_list = [rule.replace("&", "and") for rule in rule_list]

    return {
        "rules": rule_list,
        "time": round(float(result[1][0]), 3) 
    }



def cre(df_ori, covariates, treatment, outcome, thre = 0.03, max_rule_length = 4):
    import rpy2.robjects as ro  
    from rpy2.robjects import pandas2ri  
    from rpy2.robjects.conversion import localconverter

    print("\ncre start\n")

    with localconverter(ro.default_converter + pandas2ri.converter):  
        df = pandas2ri.py2rpy(df_ori)
        
    ro.r('''Sys.setlocale("LC_ALL", "en_US.UTF-8")''')    
    # load the r file  
    ro.r['source']('r_baseline.R')  
    
    # load and exec r function  
    r_function = ro.globalenv['Causal_rule_ensemble']   
    result = r_function(df, covariates, treatment, outcome)
    
    # change dataframe to python
    with localconverter(ro.default_converter + pandas2ri.converter):  
        rule_df = ro.conversion.rpy2py(result[0])  

    rule_list = rule_df["Rule"].tolist()    
    
    return {
        "rules": rule_list,
        "time": round(float(result[2][0]), 3) 
    }

def causal_forest(df_ori, covariates, treatment, outcome, thre = 0.03, max_rule_length = 4, **kwargs):
    import rpy2.robjects as ro  
    from rpy2.robjects import pandas2ri  
    from rpy2.robjects.conversion import localconverter
    
    print("\ncf start\n")

    with localconverter(ro.default_converter + pandas2ri.converter):  
        df = pandas2ri.py2rpy(df_ori)
        
    ro.r('''Sys.setlocale("LC_ALL", "en_US.UTF-8")''')    
    # load the r file  
    ro.r['source']('r_baseline.R')  

    # load and exec r function  
    print(ro.globalenv)
    r_function = ro.globalenv['causal_forest']   
    result = r_function(df, covariates, treatment, outcome, thre, **kwargs)

    # process the error
    if result[0][0] == "rules not found enough":
        print("causal_forest rules not found enough")

        return {
        "rules": [],
        "time": round(float(result[1][0]), 3)   
        }
    
    # change dataframe to python 
    with localconverter(ro.default_converter + pandas2ri.converter):  
        rules = ro.conversion.rpy2py(result[0])
    
    # change rules to python grammar
    import re    
    rules = rules.reset_index(drop=True)
    for i in range(len(rules)):   
        rules.loc[i, "rule"] = re.sub(r'%in% c\((.*?)\)', r'in [\1]', rules.loc[i, "rule"])   
    rule_list = list(rules["rule"])
    rule_list = [rule.replace("&", "and") for rule in rule_list]

    rule_list = process_cf_rules(rule_list)

    print("rule_list", rule_list)

    return {
        "rules": rule_list,
        "time": round(float(result[1][0]), 3) 
    }


def pymoo_opt(df_ori, covariates, treatment, outcome, cov_ratio = 0.03, length_limit = 4, max_subgroup_size = 20, num_thresh = 4): 
    from pymoo.algorithms.moo.nsga2 import NSGA2   
    from pymoo.optimize import minimize  
    from pymoo.operators.crossover.pntx import TwoPointCrossover  
    from pymoo.operators.mutation.bitflip import BitflipMutation  
    from pymoo.core.sampling import Sampling
    from algorithms.subgroup_discovery import MyProblem, get_unique_res
    from algorithms.preprocess import DataPreprocessor
    from algorithms.subgroup_discovery import get_subgroup_range, get_attributes
    
    print("\npymoo start\n")

    #数据预处理
    df = df_ori.copy()
    categorical_columns = list(df[covariates].select_dtypes(include=['object', 'category']).columns)

    data_preprocessor = DataPreprocessor(covariate_columns = covariates, col_categ = categorical_columns, num_thresh=num_thresh)
    df_binarized = data_preprocessor.fit_transform(df)  

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
    start_time = time.time()
    res = minimize(problem,  
                algorithm,   
                seed=1,  
                save_history=False,
                verbose=False) 
    end_time = time.time()
    train_time = end_time - start_time

    #后处理结果及格式转换
    X_unique, F_unique = get_unique_res(res)

    attributes_dic = get_attributes(df, covariates)
    total_length = 0
    total_cov = 0
    overlap = 0  
    rule_count = len(X_unique)  
    cover_ids = []  

    for i, subgroup_range in enumerate(get_subgroup_range(df, df_binarized, X, attributes_dic) for X in X_unique):  
        
        total_length += len(subgroup_range["features"])
        total_cov += len(subgroup_range["cover id"])
        cover_ids.append(set(subgroup_range["cover id"])) 


    avg_length = total_length / len(X_unique)
    avg_coverage = total_cov / len(df) / len(X_unique)

    # 计算规则之间的重叠  
    for i in range(rule_count):    
        for j in range(i+1, rule_count):    
            overlap += len(cover_ids[i].intersection(cover_ids[j]))   

    if rule_count not in [0, 1]:  
        overlap = overlap/len(df)/((rule_count-1)*rule_count/2)  
    else:  
        overlap = overlap/len(df)  
        
    return {
        "metrics": F_unique * [-1, 1, 1],
        "time": train_time,
        "avg_length": avg_length,
        "avg_coverage": avg_coverage,
        "overlap": overlap
    }


#process the rules from pysubgroup
def pys_process(rules):  
    processed_rules = []  
    for rule in rules:  
        if "AND" in rule:  
            sub_rules = rule.split("AND")  
            processed_sub_rules = [pys_process([sub_rule.strip()])[0] for sub_rule in sub_rules]  
            processed_rules.append(" AND ".join(processed_sub_rules))  
        elif rule.count(":") == 2:  
            column, range_str = rule.split(":", 1)
            lower, upper = range_str.strip("[] ").split(":")
            processed_rules.append(f"{column.strip()} >= {lower.strip()} AND {column.strip()} < {upper.strip()}")  
        else:  
            processed_rules.append(rule)  
    return [rule.replace("AND", "and") for rule in processed_rules]


# get the rules from decision tree
def get_reg_rules(tree, feature_names, thre, node_id=0, decision_path=None):  

    decision_paths = []  
      
    if tree.children_left[node_id] == tree.children_right[node_id]:  
  
        if tree.n_node_samples[node_id] > tree.n_node_samples[0] * thre: 

            avg_value = tree.value[node_id][0]
            decision_paths.append((avg_value, decision_path))  
    else:  
        # 如果不是叶子节点，递归处理左右子节点  
        feature_name = feature_names[tree.feature[node_id]]  
        threshold = round(tree.threshold[node_id], 2)  # 保留m位有效数字  
          
        if decision_path is None:  
            decision_path = ''  
          
        left_decision_path = decision_path + f"{feature_name} <= {threshold} and "  
        decision_paths.extend(get_reg_rules(tree, feature_names, thre, tree.children_left[node_id], left_decision_path))  
          
        right_decision_path = decision_path + f"{feature_name} > {threshold} and "  
        decision_paths.extend(get_reg_rules(tree, feature_names, thre, tree.children_right[node_id], right_decision_path))  
      
    return decision_paths  
    
# Function to convert the outcome data to binary 0 1  
def binary_outcome(df, outcome):    
    df_copy = df.copy()  
      
    # Check if outcome exists in the dataframe  
    if outcome not in df_copy.columns:    
        print(f"Error: No '{outcome}' column in the dataframe")    
        return df_copy    
    
    column_dtype = df_copy[outcome].dtype    
    
    # Check if the outcome column is numeric  
    if np.issubdtype(column_dtype, np.number):    
        unique_values = df_copy[outcome].unique()    
        # Check if the outcome is continuous or non-binary  
        if len(unique_values) > 2 or (len(unique_values) == 2 and set(unique_values) != {0, 1}):    
            # Convert continuous variable to binary  
            median = df_copy[outcome].median()    
            df_copy[outcome] = df_copy[outcome].apply(lambda x: 1 if x > median else 0)    
            print(f"Continuous variable converted to binary. Values greater than the median {median} are marked as 1, others as 0")    
    else:    
        # Handle non 0 1 binary variables  
        value_counts = df_copy[outcome].value_counts()    
        majority_class = value_counts.idxmax()    
        minority_class = value_counts.idxmin()    
    
        # Check if the outcome is non-binary  
        if len(value_counts) > 2 or (len(value_counts) == 2 and set(df_copy[outcome].unique()) != {0, 1}):    
            df[outcome] = df[outcome].apply(lambda x: 1 if x == majority_class else 0)    
            print(f"Binary variable adjusted, majority class {majority_class} marked as 1, minority class {minority_class} marked as 0")    
        
    return df_copy 
  
# Function to convert the encoded values in the rules back to their categorical form  
def decode_rule(rule, encoders):    
    # Create a dictionary to map all possible category values of each feature to their corresponding encoded values  
    category_maps = {feature: list(encoder.classes_) for feature, encoder in encoders.items()}    
    
    # Split the rule into a list of conditions  
    conditions = rule.split(' and ')    
    
    # Process each condition  
    for i in range(len(conditions)):    
        # Split the condition into feature, comparator, and value  
        feature, comp, value = conditions[i].split(' ')    
    
        # Only convert when the feature exists in the encoders dictionary  
        if feature in encoders:    
            # Convert the value to integer  
            value = int(float(value))    
    
            # Convert the value back to the original category label  
            value = encoders[feature].inverse_transform([value])[0]    
    
            # Get all possible category values of this feature  
            categories = category_maps[feature]    
    
            # Determine all possible category values included in this condition based on the comparator  
            if comp == '<=':    
                included_categories = categories[:categories.index(value) + 1]    
                conditions[i] = f'{feature} in {included_categories}'    
            elif comp == '>':    
                included_categories = categories[categories.index(value) + 1:]    
                conditions[i] = f'{feature} in {included_categories}'    
    
    # Reassemble the rule  
    rule = ' and '.join(conditions)    
    
    return rule    

def preprocess_rules(raw_rules):  
    if isinstance(raw_rules, list):
        rules_list = [rule for rule in raw_rules if 't' not in rule]  
        return rules_list
        
    # Remove brackets, 'if\n' and parentheses  
    rules = raw_rules.replace("[", "").replace("]", "").replace("if\n", "").replace("(", "").replace(")", "")  
      
    # Replace connectors with 'and' and 'or'  
    rules = rules.replace("^", " and ").replace(" v\n", " or ")
      
    # Split rules into a list  
    rules_list = rules.split(" or ")  
      
    # Remove the outcome from the last rule  
    rules_list = [rule.split("\nthen\n")[0].strip() for rule in rules_list if rule.strip()]  

    # Remove the rules with 't'
    rules_list = [rule for rule in rules_list if 't' not in rule]  

    return rules_list  
   
#process rule like X7 < 8.4e-01   X6 is -9.0e-01 to 2.1e+00
def process_cf_rules(rule_list):
    # Define a function to convert scientific notation to regular form  
    def convert_sci_to_float(match):  
        sci_num = float(match.group())  
        return format(sci_num, '.2f')  
    
    # Define a function to convert range expressions  
    def convert_range(match):  
        variable, lower, upper = match.groups()  
        return f"{variable} < {upper} and {variable} >= {lower}"  
    

    # Create an empty list to store the processed rules  
    processed_rules = []  
    
    # Loop over each rule in the list  
    for rule in rule_list:  
        # Convert scientific notation to regular form  
        rule = re.sub(r'-?\d+\.\d+e[+-]\d+', convert_sci_to_float, rule)  
        # Convert range expressions  
        rule = re.sub(r'(X\d+) is (-?\d+\.\d+) to (-?\d+\.\d+)', convert_range, rule)  
        # Add the processed rule to the list  
        processed_rules.append(rule)  

    return processed_rules
