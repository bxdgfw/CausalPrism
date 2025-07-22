import re
import ast
import pandas as pd
import numpy as np
import time
import baseline
from paretoset import paretoset 

import warnings  
warnings.filterwarnings("ignore", category=UserWarning)  

#得到所有算法的帕累托前沿
def get_pareto(df, treatment = 't', outcome = 'y', thre = 0.03, rule_length = 4, **kwargs):
    df_ori = df.copy()

    covariates = list(df.columns)
    covariates = [covariate for covariate in covariates if covariate not in ['e', 'wt', 'v', 'TE']]
    covariates.remove(treatment)
    covariates.remove(outcome)

    categorical_columns = list(df[covariates].select_dtypes(include=['object', 'category']).columns)

    algo_list = ["PYS","Decision Tree","Causal Tree","Causal Forest","pymoo"]
    
    #result_ripper = baseline.ripper(df_ori, covariates, treatment, outcome) 
    result_cre = baseline.cre(df_ori, covariates, treatment, outcome, thre, rule_length)
    result_brcg = baseline.brcg(df_ori, covariates, treatment, outcome)  
    result_pys = baseline.pys(df_ori, covariates, treatment, outcome)  
    result_dt = baseline.dt(df_ori, covariates, treatment, outcome, thre, rule_length)
    result_ct = baseline.causal_tree(df_ori, covariates, treatment, outcome, thre, rule_length, **kwargs)
    result_cf = baseline.causal_forest(df_ori, covariates, treatment, outcome, thre, rule_length)
    result_pymoo = baseline.pymoo_opt(df_ori, covariates, treatment, outcome, cov_ratio = 0.03, length_limit = rule_length) 

    total_pareto_list = []
    alg_result_list = [ result_pys, result_dt, result_ct, result_cf]

    #得到每个算法的帕累托前沿
    for i in range(len(alg_result_list)):
        print("\n" + algo_list[i] + " start\n")
        print("rules is:",alg_result_list[i]["rules"])
        
        if alg_result_list[i]["rules"] == ['false'] or alg_result_list[i]["rules"] == []:
            total_pareto_list.append([])
            continue

        subgroup_list = rule_metrics(df_ori, alg_result_list[i]["rules"])["rule_dfs"]

        result_list = []  
        for df in subgroup_list:  
            result = cal_metrics(df, treatment, outcome)  
        
            result_list.append([result['effect'], result['tr_var'], result['con_var']])  

        pareto_list = find_pareto_frontier(result_list)
        total_pareto_list.append(pareto_list)

    total_pareto_list.append(result_pymoo["metrics"].tolist())
    print("\ntotal_pareto_list is:",total_pareto_list)

    #得到最终的帕累托前沿
    result, final_pareto = calculate_pareto_metrics(algo_list, total_pareto_list)
    print("\nresult is",result)
    print("\nfinal is", final_pareto)

    #得到指标
    for i in range(len(alg_result_list)):

        if alg_result_list[i]["rules"] == ['false'] or alg_result_list[i]["rules"] == []:
            continue

        result[i]["time"] = alg_result_list[i]["time"]

        rule_list_metric = rule_metrics(df_ori, alg_result_list[i]["rules"])
        result[i]["avg_length"] = rule_list_metric["avg_length"]
        result[i]["avg_coverage"] = rule_list_metric["avg_coverage"]
        result[i]["overlap"] = rule_list_metric["overlap"]
      
    result[-1]["time"] = result_pymoo["time"]
    result[-1]["avg_length"] = result_pymoo["avg_length"]
    result[-1]["avg_coverage"] = result_pymoo["avg_coverage"]
    result[-1]["overlap"] = result_pymoo["overlap"]
   
    return result


#计算因果指标
def cal_metrics(sub_df, treatment='t', outcome='y'):

    twt = np.sum(sub_df['wt'])  
    ttreat = np.sum(sub_df['wt'] * sub_df[treatment])  
    temp1 = np.sum(sub_df[outcome] * sub_df['wt'] * sub_df[treatment])
    temp0 = np.sum(sub_df[outcome] * sub_df['wt'] * (1 - sub_df[treatment]))

    if ttreat == 0 or (twt - ttreat) == 0:
        effect =  np.nan
    else:
        effect = (temp1 / ttreat) - (temp0 / (twt - ttreat))

    tr_sqr_sum = np.sum(sub_df[outcome]**2 * sub_df['wt'] * sub_df[treatment])  
    con_sqr_sum = np.sum(sub_df[outcome]**2 * sub_df['wt'] *(1 - sub_df[treatment])) 

    tr_var = tr_sqr_sum / ttreat - (temp1 / ttreat)**2   
    con_var = con_sqr_sum / (twt - ttreat) - (temp0 / (twt - ttreat))**2 

    result = {   
        "effect": effect,
        "tr_var": tr_var,  
        "con_var": con_var, 
    }  

    return result

#得到单个算法的帕累托前沿列表
def find_pareto_frontier(result_list):  
    # Convert result_list to DataFrame  
    results_df = pd.DataFrame(result_list, columns=['effect', 'tr_var', 'con_var'])  
  
    # Use paretoset to find the Pareto frontier  
    mask = paretoset(results_df, sense=['max', 'min', 'min'])  
  
    # Return the Pareto solutions  
    return results_df[mask].values.tolist()  


#根据所有算法的帕累托前沿，计算各个算法的指标
def calculate_pareto_metrics(algo_list, solutions_list):  
    # Combine all solutions into one list  
    combined_solutions = [solution for solutions in solutions_list for solution in solutions]  
  
    # Find the Pareto frontier of the combined solutions  
    final_pareto = find_pareto_frontier(combined_solutions)  
  
    metrics = []  
    for i, solutions in enumerate(solutions_list):   
        if solutions == []:
            continue

        # Count the number of solutions in the final Pareto frontier  
        count_in_final = sum([solution in final_pareto for solution in solutions])  
  
        # Calculate the ratio  
        ratio = count_in_final / len(solutions)  
  
        metrics.append({  
            'algorithm': algo_list[i],  
            'front_count': len(solutions),  
            'true_dominate_count': count_in_final,  
            'true_dominate_rate': ratio  
        })  
  
    return metrics, final_pareto  


#根据规则得到子群指标
def rule_metrics(dataset, rules = None):  
    if rules is None:  
        print("No rules provided.")  
        return  
    
    total_length = 0  
    overlap = 0
    rule_count = len(rules)
    
    #the samlpe list
    rule_dfs = []
    for rule in rules:            
        # Assuming the format is "condition"  
        conditions = re.split(r' and | or ', rule)  # Split by 'and' or 'or'  

        # Create a set to store the features involved  
        features = set() 
  
        #get samples that satisfy the rule
        rule_df = dataset.copy()  
        for condition in conditions:  

            # Extract the feature from the condition  
            match = re.search(r'(.+?)(?=\s*(?:>=|<=|>|<|==|!=|in|is))', condition)  
            if match:  
                feature = match.group().strip()  
                features.add(feature)  

            # Handle different types of conditions  
            if "==" in condition:  
                column, value = condition.split("==")  
                value = value.strip()  
                if value.isnumeric(): 
                    rule_df.loc[:, column.strip()] = rule_df.loc[:, column.strip()].astype(float)   
                    rule_df = rule_df[rule_df[column.strip()] == float(value)]  
                else: 

                    try:  
                        value = ast.literal_eval(value)  

                    except ValueError:   
                        pass  
                    rule_df = rule_df[rule_df[column.strip()] == value]  

            elif "!=" in condition:  
                column, value = condition.split("!=")  
                value = value.strip()  

                if value.isnumeric():  
                    rule_df.loc[:, column.strip()] = rule_df.loc[:, column.strip()].astype(float)  
                    rule_df = rule_df[rule_df[column.strip()] != float(value)]  

                else:  
                    try:   
                        value = ast.literal_eval(value)  

                    except ValueError:   
                        pass 

                    rule_df = rule_df[rule_df[column.strip()] != value]  
            elif "<=" in condition:  
                column, value = condition.split("<=")  
                rule_df.loc[:, column.strip()] = rule_df.loc[:, column.strip()].astype(float)  
                rule_df = rule_df[rule_df[column.strip()] <= float(value)]  
            elif ">=" in condition:  
                column, value = condition.split(">=")  
                rule_df.loc[:, column.strip()] = rule_df.loc[:, column.strip()].astype(float)  
                rule_df = rule_df[rule_df[column.strip()] >= float(value)]  
            elif "<" in condition:  
                column, value = condition.split("<")  
                rule_df.loc[:, column.strip()] = rule_df.loc[:, column.strip()].astype(float)  
                rule_df = rule_df[rule_df[column.strip()] < float(value)]  
            elif ">" in condition:  
                column, value = condition.split(">")  
                rule_df.loc[:, column.strip()] = rule_df.loc[:, column.strip()].astype(float)  
                rule_df = rule_df[rule_df[column.strip()] > float(value)]  
            elif " in " in condition:  
                column, value = condition.split(" in ")  
                value_list = ast.literal_eval(value.strip())  
                rule_df = rule_df[rule_df[column.strip()].isin(value_list)] 
            else:  
                raise ValueError(f"Unknown condition {condition} in rule {rule}")  
           
        rule_dfs.append(rule_df)

        # Calculate the length of the rule
        rule_length = len(features) 
        total_length += rule_length 
        features.clear()  


    for i in range(rule_count):  
        for j in range(i+1, rule_count):  
            overlap += len(pd.merge(rule_dfs[i], rule_dfs[j], how='inner')) 
    if rule_count not in [0, 1]:
        overlap = overlap/len(dataset)/((rule_count-1)*rule_count/2)
    else:
        overlap = overlap/len(dataset)
    
    if rule_count == 0:
        print(str(rules)) 
    avg_length = total_length / rule_count    
    
    result = {
        "rule_count": rule_count,
        "avg_length": avg_length,
        "overlap": overlap,
        "rule_dfs": rule_dfs,
        "avg_coverage": sum(len(df) for df in rule_dfs) /len(dataset)/rule_count
    }

    return result