import os
import sys
sys.path.append("../")
from .dim_reduction import data_preprocess, get_data

import random
import pandas as pd
import numpy as np  

import warnings
warnings.filterwarnings("ignore")


#将int64类型转换为int类型
def int64_to_int(data):  
    if isinstance(data, dict):  
        return {k: int64_to_int(v) for k, v in data.items()}  
    elif isinstance(data, list):  
        return [int64_to_int(element) for element in data]  
    elif isinstance(data, np.int64):  
        return int(data)  
    else:  
        return data  
    

#从现有子群提前保存数据
def extract_data(subgroups):  
    transformed_data = {}  
  
    for group in subgroups:  
        key = str(group['id'])  
        transformed_data[key] = {  
            'cover_id': group['covered id'],  
            'charts': group['charts']  
        }  
  
    return transformed_data  


#获取直方图不同bin的count
def get_bin_counts(df,  treatment='t'):
    # 创建一个DataFrame  
    df_new = df.copy()

    # 创建bins  
    bins = np.linspace(0, 1, 11)  

    # 对'e'列进行分bin，并添加新的列'bin'到df中  
    df_new['bin'] = pd.cut(df_new['e'], bins, include_lowest=True)  

    # 根据treatment和'bin'列进行分组，并计算每个组的大小  
    counts = df_new.groupby([treatment, 'bin']).size()  

    # 将counts转换为你需要的格式  
    treatment_counts = counts[1].tolist()  # 't'列值为1表示treatment  
    control_counts = counts[0].tolist()  # 't'列值为0表示control  

    result = {  
        "range":[0,1],
        "treatment": treatment_counts,  
        "control": control_counts
    }  
    return result

#得到点图数据
def get_dot_data(data_file, subgroup_id, covered_id, treatment = 't', outcome = 'y', num_thresh = 4, dot_size = 20, bin_num = 10, categorical_columns = []):

    df = get_data(data_file, categorical_columns)
    
    #得到匹配对id
    sub_df = df.loc[covered_id]
    pairs = greedy_matching(sub_df, treatment)

    length = len(pairs)

    effects = []  
    
    for pair in pairs:  
        effect = sub_df.loc[pair[0], outcome] - sub_df.loc[pair[1], outcome]  
        effects.append(effect)  

    #给最大最小值形成的范围进行往外扩展10%
    min_effect = min(effects) - 0.1 * abs(min(effects))
    max_effect = max(effects) + 0.1 * abs(max(effects))
 
    average_effect = np.mean(effects)  
    std_dev_effect = np.std(effects)  
        
    effect_range = [min_effect, max_effect]

    # effect_range 分为n个等间隔的 bins  
    n = bin_num  
    
    # 使用 numpy 的 linspace 函数生成等间隔的 bins  
    bins = np.linspace(effect_range[0], effect_range[1], n+1)  
    
    # 创建一个空字典，键为bins，值为空列表  
    pairs_dict = {str(bins[i]): [] for i in range(n)}  

    for pair in pairs:    
        pair_data = []    
        for id in pair:  
            row_data = df.loc[id].to_dict()    
            row_data['propensity_score'] = row_data.pop('e')   
            row_data['id'] = id  
            row_data.pop('TE', None)
            row_data.pop('v', None)
            row_data.pop('wt', None)

            pair_data.append(row_data)    
        
        # 计算 effect  
        effect = sub_df.loc[pair[0], outcome] - sub_df.loc[pair[1], outcome]  
        
        # 找到 effect 所在的 bin  
        bin_index = max(np.digitize(effect, bins) - 1, 0)  # numpy的digitize函数返回的是索引+1，所以我们需要减1  


        pairs_dict[str(bins[bin_index])].append(pair_data)  

    max_pairs = max(len(lst) for lst in pairs_dict.values())  

    sample_rate = min(dot_size / max_pairs, 1)

    #将pairs_dict每一部分的列表中随机抽取一部分
    for key in pairs_dict.keys():
        notNone = 0 if len(pairs_dict[key]) == 0 else 1 
        pairs_dict[key] = random.sample(pairs_dict[key], max(int(sample_rate * len(pairs_dict[key])),notNone))

    data = {}
    data[str(subgroup_id)] = {
        "range": effect_range,
        "treatment": treatment,
        "mean": average_effect,
        "confidence": [average_effect - std_dev_effect, average_effect + std_dev_effect],
        "outcome": outcome,
        "pairs": pairs_dict,
        "barchart": get_bin_counts(sub_df, treatment),
        "length": length
    }

    return data


# 定义贪心匹配函数，先局部，再全局,pair=(treatment_idx, control_idx )
def greedy_matching(df, treatment='t', bin_size=0.1, global_match_threshold=0.05):  
    # 划分为处理组和对照组    
    treatment_df = df[df[treatment] == 1].reset_index(drop=False)    
    control_df = df[df[treatment] == 0].reset_index(drop=False)      
    
    matched_pairs = []    
    # 对于每个bin_size的bin，进行匹配    
    for bin in np.arange(0, 1.1, bin_size):    
        bin_treatment_df = treatment_df[(treatment_df['e'] >= bin) & (treatment_df['e'] < bin + bin_size)]    
        bin_control_df = control_df[(control_df['e'] >= bin) & (control_df['e'] < bin + bin_size)]    
        for idx, row in bin_treatment_df.iterrows():    
            if bin_control_df.empty:    
                break    
            distances = abs(bin_control_df['e'] - row['e'])    
            matched_control_idx = distances.idxmin()    
            matched_pairs.append((row['index'], bin_control_df.loc[matched_control_idx, 'index']))    
            bin_control_df = bin_control_df.drop(matched_control_idx)  
            control_df = control_df.drop(matched_control_idx)  # 从全局对照组中移除已匹配的成员  
    
    matched_treatment_indices = set(pair[0] for pair in matched_pairs)  

    # 进行全局匹配  
    for idx, row in treatment_df.iterrows():  
        if row['index'] in matched_treatment_indices:  # 如果已经匹配过，就跳过  
            continue  
        distances = abs(control_df['e'] - row['e'])  
        if distances.min() <= global_match_threshold:  # 如果有满足全局匹配阈值的对照组成员  
            matched_control_idx = distances.idxmin()  
            matched_pairs.append((row['index'], control_df.loc[matched_control_idx, 'index']))  
            control_df = control_df.drop(matched_control_idx)  # 从对照组中移除已匹配的成员

    return matched_pairs


# 得到指定子群的相关数据
def get_subgroup_id_metrics( data_file, subgroup_id, charts, attributes_dic, tag = None, treatment = 't', outcome = 'y', categorical_columns = []):
    
    df = get_data(data_file, categorical_columns)

    #选择满足条件的行
    for key, value in charts.items():  
        attribute = next((item for item in attributes_dic if item["id"] == int(key)), None)  
        if attribute is not None:  
            if attribute["type"] == "string":  
                df = df[df[attribute["name"]].isin(value)]  
            elif attribute["type"] == "number":  
                df = df[(df[attribute["name"]] >= value[0]) & (df[attribute["name"]] <= value[1])]

    covered_id = list(df.index)

    metircs = cal_metrics(df, treatment, outcome)

    tag = "tag" + str(subgroup_id) if tag is None else tag  

    data = {
        "id": subgroup_id,
        "tag": tag,
        "charts": charts,
        "metrics": {
            "treatment effect": metircs["effect"],  
            "treated variance": metircs["tr_var"],  
            "control variance": metircs["con_var"],
            "covered units": len(covered_id),
            "rule antecedent length": len(charts)
        },
        "covered id": covered_id
    }

    return data

#根据样本id得到子群信息和指标
def get_subgroup_metrics_by_id(data_file, subgroup_id, covered_id, charts, treatment='t', outcome='y', categorical_columns = []):

    df = get_data(data_file, categorical_columns)

    df = df[df.index.isin(covered_id)]

    metircs = cal_metrics(df, treatment, outcome)

    tag = "tag" + str(subgroup_id) if tag is None else tag  

    data = {
        "id": subgroup_id,
        "tag": tag,
        "charts": charts,
        "metrics": {
            "treatment effect": metircs["effect"],  
            "treated variance": metircs["tr_var"],  
            "control variance": metircs["con_var"],
            "covered units": len(covered_id),
            "rule antecedent length": len(charts)
        },
        "covered id": covered_id
    }

    return data


#计算子群因果指标
def cal_metrics(sub_df, treatment='t', outcome='y'):

    twt = np.sum(sub_df['wt'])  
    ttreat = np.sum(sub_df['wt'] * sub_df[treatment])  
    temp1 = np.sum(sub_df[outcome] * sub_df['wt'] * sub_df[treatment])
    temp0 = np.sum(sub_df[outcome] * sub_df['wt'] * (1 - sub_df[treatment]))

    if ttreat == 0 or (twt - ttreat) == 0:
        effect =  0
    else:
        effect = (temp1 / ttreat) - (temp0 / (twt - ttreat))

    tr_sqr_sum = np.sum(sub_df[outcome]**2 * sub_df['wt'] * sub_df[treatment])  
    con_sqr_sum = np.sum(sub_df[outcome]**2 * sub_df['wt'] *(1 - sub_df[treatment])) 

    if not np.isfinite(ttreat) or not np.isfinite(twt) or np.isclose(ttreat, 0, atol=1e-8) or np.isclose(twt - ttreat, 0, atol=1e-8):   
        tr_var = 0
        con_var = 0
    else:
        tr_var = tr_sqr_sum / ttreat - (temp1 / ttreat)**2   
        con_var = con_sqr_sum / (twt - ttreat) - (temp0 / (twt - ttreat))**2 

    result = {   
        "effect": effect,
        "tr_var": tr_var,  
        "con_var": con_var, 
    }  

    return result

#合并charts
def merge_charts(charts):  
    result = {}    
      
    # 使用字典计数每个键出现的次数  
    key_counts = {}  
    for chart in charts:  
        for key in chart:  
            key_counts[key] = key_counts.get(key, 0) + 1  
  
    # 只保留在所有图表中都存在的键  
    common_keys = {key for key, count in key_counts.items() if count == len(charts)}  
  
    for key in common_keys:  
        for chart in charts:  
            value = chart[key]  
            if key in result:    
                if all(isinstance(i, str) for i in value):  # if values are strings    
                    result[key].extend([v for v in value if v not in result[key]])    
                else:  # if values are numbers    
                    result[key] = [min(result[key][0], value[0]), max(result[key][1], value[1])]      
            else:    
                result[key] = value    
      
    return result  


#得到划分后的两个子群的样本的charts范围
def split_group(data_file, charts, attributes_dic, categorical_columns = []):

    import random
    random.seed(1)
    
    df = get_data(data_file, categorical_columns)

    #将charts复制两个副本
    charts0 = charts.copy()
    charts1 = charts.copy()
    
    #随机选择一个不包括的特征
    available_attributes = [attribute for attribute in attributes_dic if attribute['id'] not in charts]

    selected_attribute = random.choice(available_attributes)
    
    attribute = selected_attribute['id'] 

    #将这个特征的值分为两部分
    if(selected_attribute['type'] == 'string'):
        #随机选择前一半的值作为新的charts范围
        values = selected_attribute['range']
        values_0 = values[:len(values)//2]
        values_1 = values[len(values)//2:]
        charts0[str(attribute)] = values_0
        charts1[str(attribute)] = values_1
    else:
        #选择range的中位数划分两部分
        values = selected_attribute['range']
        median = df[selected_attribute['name']].median()
        charts0[str(attribute)] = [values[0], median]
        charts1[str(attribute)] = [median, values[1]]
    
    return{
        "0": charts0,
        "1": charts1
    }


#根据覆盖样本得到charts
def id_to_charts(data_file, covered_id, attributes_dic, categorical_columns = []):  
  
    df = get_data(data_file, categorical_columns)
    sub_df = df.loc[covered_id]  
    charts = {}  
    for attribute in attributes_dic:    
        name = attribute["name"]    
        if attribute["type"] == "string":    
            unique_values = sub_df[name].unique().tolist()  
            if set(unique_values) != set(df[name].unique().tolist()):  
                charts[str(attribute["id"])] = unique_values  
        else:    
            df_min = df[name].min()  
            df_max = df[name].max()  
            sub_df_min = sub_df[name].min()  
            sub_df_max = sub_df[name].max()  
            if sub_df_min != df_min or sub_df_max != df_max:  
                charts[str(attribute["id"])] = [sub_df_min, sub_df_max]  
                           
    return charts  


#得到所有因果单元的id
def get_all_causal_units(subgroups_dic):

    all_covered_ids = set()  
    
    for subgroup in subgroups_dic.values():

        all_covered_ids = all_covered_ids.union(set(subgroup["cover_id"]))  
     
    all_covered_ids = list(all_covered_ids) 

    return list(all_covered_ids)

