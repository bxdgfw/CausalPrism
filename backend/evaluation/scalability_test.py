import numpy as np  
import pandas as pd  
import time

def generate_data(n_samples, p, seed):  
    np.random.seed(seed)  
      
    X = np.random.normal(0, 1, size=(n_samples, p))     
    X = np.around(X, 2)    
  
    coefs_T = np.random.uniform(0, 0.5, size=p)    
    coefs_T = np.around(coefs_T, 2)    
    log_odds = np.dot(X, coefs_T) + np.random.uniform(-1, 1, size=n_samples)     
    T_sigmoid = 1/(1 + np.exp(-log_odds))        
    T = np.array([np.random.binomial(1, p) for p in T_sigmoid])    
  
    coefs_TE = np.random.uniform(0, 2, size=p)    
    coefs_TE = np.around(coefs_TE, 2)    
    TE = np.dot(np.maximum(X[:, :], 0), coefs_TE) + np.random.uniform(-1, 1, size=n_samples)    
    TE = np.around(TE, 2)    
    coefs_Y = np.random.uniform(0, 1, size = p)    
    Y = TE * T + np.dot(X, coefs_Y) + np.random.uniform(-1, 1, size=n_samples)      
    Y = np.around(Y, 2)    
    offset =  np.abs(np.min(Y))    
    Y = Y + offset    
  
    e = T_sigmoid    
    wt = np.around(T/e + (1-T)/(1-e), 2)    
  
    df = pd.DataFrame(X, columns=[f'X{i+1}' for i in range(p)])     
    df['t'] = T      
    df['TE'] = TE     
    df['y'] = Y     
    df['e'] = e    
    df['wt'] = wt    
    df['v'] = np.around(wt*Y, 2)    
  
    cols = [f'X{i+1}' for i in range(1, p)]      
    df[cols] = df[cols].astype(float)     
  
    return df  

n_samples_list = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000]  
p_list = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50]  
  
# 用于记录结果的字典  
results_n_samples = {"n_samples": [], "time": [], "std": [], "all_times": []}    
results_p = {"p": [], "time": [], "std": [], "all_times": []}  

import sys
sys.path.append("../")
from CURLS import DataPreprocessor, CausalRuleLearner
 

# 固定p，改变n_samples    
fixed_p = 10  # 可以选择你想固定的p值    
for n_samples in n_samples_list:    
    times = []  # 用于存储每次实验的时间  
    for i in range(10):  # 进行十次实验  
        df = generate_data(n_samples, fixed_p, seed=i)  # 使用不同的种子值生成数据  
        
        #数据预处理
        covariate_columns = [f'X{i+1}' for i in range(fixed_p)]
        data_preprocessor = DataPreprocessor(covariate_columns, None, num_thresh=4)
        df_binarized = data_preprocessor.fit_transform(df)
        
        start_time = time.time()  
        causal_learner = CausalRuleLearner(df_binarized, max_rule_length=4, variance_weight=0.0, minimum_coverage=0.05)
        causal_learner.find_rules(num_rules_to_find=2)
        causal_learner.print_rules()  
        end_time = time.time()    
        elapsed_time = end_time - start_time    
        times.append(elapsed_time)  # 添加到列表中  
    
    avg_time = np.mean(times)  # 计算平均时间    
    std_time = np.std(times)  # 计算标准差  
    results_n_samples["n_samples"].append(n_samples)      
    results_n_samples["time"].append(avg_time)  # 添加平均时间到结果中  
    results_n_samples["std"].append(std_time)  # 添加标准差到结果中  
    results_n_samples["all_times"].append(times)  # 添加所有时间到结果中  
    
# 固定n_samples，改变p    
fixed_n_samples = 1000  # 可以选择你想固定的n_samples值    
for p in p_list:    
    times = []  # 用于存储每次实验的时间  
    for i in range(10):  # 进行十次实验  
        df = generate_data(fixed_n_samples, p, seed=i)  # 使用不同的种子值生成数据  

        #数据预处理
        covariate_columns = [f'X{i+1}' for i in range(p)]
        data_preprocessor = DataPreprocessor(covariate_columns, None, num_thresh=4)
        df_binarized = data_preprocessor.fit_transform(df)
        
        start_time = time.time()  
        causal_learner = CausalRuleLearner(df_binarized, max_rule_length=4, variance_weight=0.0, minimum_coverage=0.05)
        causal_learner.find_rules(num_rules_to_find=2)
        causal_learner.print_rules()     
        end_time = time.time()    
        elapsed_time = end_time - start_time    
        times.append(elapsed_time)  # 添加到列表中  
    
    avg_time = np.mean(times)  # 计算平均时间    
    std_time = np.std(times)  # 计算标准差  
    results_p["p"].append(p)      
    results_p["time"].append(avg_time)  # 添加平均时间到结果中  
    results_p["std"].append(std_time)  # 添加标准差到结果中  
    results_p["all_times"].append(times)  # 添加所有时间到结果中 
  
# 将结果转换为DataFrame并保存为CSV文件  
results_df_n_samples = pd.DataFrame(results_n_samples)  
results_df_n_samples.to_csv("scalability_test_results_n_samples.csv", index=False)  
  
results_df_p = pd.DataFrame(results_p)  
results_df_p.to_csv("scalability_test_results_p.csv", index=False)  

import matplotlib.pyplot as plt  
  
# 从CSV文件中读取结果  
#results_df_n_samples = pd.read_csv("scalability_test_results_n_samples.csv")  
#results_df_p = pd.read_csv("scalability_test_results_p.csv")  
  
# 创建两个子图    
fig, ax = plt.subplots(2, 1, figsize=(10, 10))    
  
# 子图1：训练时间 vs 数据集大小    
ax[0].errorbar(results_df_n_samples["n_samples"], results_df_n_samples["time"], yerr=results_df_n_samples["std"], fmt='-o', capsize=5)  
ax[0].set_xlabel('Number of Samples')    
ax[0].set_ylabel('Training Time')    
ax[0].set_title(f'Training Time vs Number of Samples (p={fixed_p})')    
  
# 子图2：训练时间 vs 协变量数量    
ax[1].errorbar(results_df_p["p"], results_df_p["time"], yerr=results_df_p["std"], fmt='-o', capsize=5)  
ax[1].set_xlabel('Number of Covariates')    
ax[1].set_ylabel('Training Time')    
ax[1].set_title(f'Training Time vs Number of Covariates (n_samples={fixed_n_samples})')    
  
plt.tight_layout()    
  
# 保存图像    
plt.savefig("scalability_with_std.svg")    
