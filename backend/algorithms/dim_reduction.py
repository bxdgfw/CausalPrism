import pandas as pd
import os  
import sys
sys.path.append("../")
from .preprocess import DataPreprocessor

def get_data(data_file,categorical_columns = []):
    data_dir = "data/"
    data_path = os.path.join(data_dir, data_file) 
    
    #将特定列表按类别读取
    if len(categorical_columns) > 0:
        df = pd.read_csv(data_path, dtype={col: 'object' for col in categorical_columns})
    else:
        df = pd.read_csv(data_path)

    return df


def data_preprocess(data_file, treatment="t", outcome="y", num_thresh = 4, categorical_columns = []):
    
    # 读取数据
    df = get_data(data_file, categorical_columns)
    
    #得到特征
    covariates = list(df.columns)
    covariates = [covariate for covariate in covariates if covariate not in ['e', 'wt', 'v', 'TE']]
    covariates.remove(treatment)
    covariates.remove(outcome)
    
    categorical_columns = list(df[covariates].select_dtypes(include=['object', 'category']).columns)

    # 数据预处理
    data_preprocessor = DataPreprocessor(covariate_columns = covariates, col_categ = categorical_columns, num_thresh=num_thresh)
    df_binarized = data_preprocessor.fit_transform(df)  
    df_encoded = pd.get_dummies(df[covariates], columns=categorical_columns) 

    return df, df_binarized, df_encoded, covariates


def dim_reduction(data_file, treatment="t", outcome="y", num_thresh = 4, UMAP = False):
    
    # 数据预处理
    df, df_binarized, df_encoded, covariates = data_preprocess(data_file, treatment, outcome, num_thresh)
    
    from sklearn.manifold import MDS, TSNE 
    from umap import UMAP  
    # 实例化MDS or TSNE类 
    if UMAP:
        reduc = UMAP(n_components=2,n_neighbors=10, min_dist=0.005, random_state=42)
    else: 
        reduc = TSNE(n_components=2)  
    
    # 进行降维  
    reduc_result = reduc.fit_transform(df_encoded)  

    #格式转换
    ids = df.index.tolist()  
    reduc_list = [{'id': id, 'data': [reduc_result[i, 0], reduc_result[i, 1]]} for i, id in enumerate(ids)] 

    x_range = [reduc_result[:, 0].min(), reduc_result[:, 0].max()]  
    y_range = [reduc_result[:, 1].min(), reduc_result[:, 1].max()]  
  
    data = {  
        "units": reduc_list,  
        "dataset_info": {  
            "units_num": len(reduc_list),  
            "range": {  
                "x": x_range,  
                "y": y_range  
            }  
        }  
    }  
    
    return data