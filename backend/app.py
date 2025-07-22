from flask import Flask, request, jsonify
from flask_cors import CORS

import numpy as np

from algorithms.tool import get_dot_data, get_subgroup_id_metrics, id_to_charts, split_group, get_all_causal_units

from credit_data_2dim import get_2dim_credit_data
from credit_data_sub_8_3_8_20w import get_subgroup_credit_data_20w
from bank_data_2dim import get_2dim_bank_data
from bank_data_sub_6_3_4 import get_subgroup_bank_data

from ihdp_data import get_2dim_ihdp_data, get_subgroup_ihdp_data
from lalonde_data import get_2dim_lalonde_data, get_subgroup_lalonde_data
from twins_data import get_2dim_twins_data, get_subgroup_twins_data
from titanic_data import get_2dim_titanic_data, get_subgroup_titanic_data



from algorithms.tool import int64_to_int, extract_data

app = Flask(__name__)
CORS(app, supports_credentials=True)

last_id = 0
data_table = None
data_file = None
treatment = 't'
outcome = 'y'
categorical_columns = []
data_2dim_dic = {}
attributes_dic = {}
subgroups_dic = {}

"""
{
    "subgroup_id":{
        "cover_id":[],
        "charts":{
            ...
        }
    }
}
"""

@app.route('/')
def hello_world():
    return 'Hello World!'

# 获取所有可选数据表


@app.route('/api/get_tables', methods=['GET'])
def get_tables():
    return jsonify({"data": [ 'default_credit_card', 'bank_marketing', 'twins', 'titanic', 'ihdp', 'lalonde']})

# 获取所有可选结果属性


@app.route('/api/get_outcomes', methods=['GET'])
def get_outcomes():
    global data_table
    data_table = request.args.get("data_table")  # string
    if data_table == "default_credit_card":
        rs = {"data": [ "Default_Next_Month" ], "outcome": 'Default_Next_Month'}
    elif data_table == "bank_marketing":
        rs = {"data": [ "subscribed_deposit" ], "outcome": 'subscribed_deposit'}
    elif data_table == "twins":
        rs = {"data": [ "mortality_first_year" ], "outcome": 'mortality_first_year'}
    elif data_table == "titanic":
        rs = {"data": [ "Survived" ], "outcome": 'Survived'}
    elif data_table == "ihdp":
        rs = {"data": [ "y" ], "outcome": 'y'}
    elif data_table == "lalonde":
        rs = {"data": [ "re78" ], "outcome": 're78'}
    return jsonify(rs)

# 获取所有可选结果属性


@app.route('/api/get_treatments', methods=['GET'])
def get_treatments():
    global data_table
    data_table = request.args.get("data_table")  # string
    rs = {}
    if data_table == "default_credit_card":
        rs = {"data": [ "Credit_Above_200000" ], "treatment": 'Credit_Above_200000'}
    elif data_table == "bank_marketing":
        rs = {"data": [ "campaign_above_2" ], "treatment": 'campaign_above_2'}
    elif data_table == "twins":
        rs = {"data": [ "is_heavier" ], "treatment": 'is_heavier'}
    elif data_table == "titanic":
        rs = {"data": [ "Pclass_over_1" ], "treatment": 'Pclass_over_1'}
    elif data_table == "ihdp":
        rs = {"data": [ "t" ], "treatment": 't'}
    elif data_table == "lalonde":
        rs = {"data": [ "treat" ], "treatment": 'treat'}
    return jsonify(rs)



# 获取子群信息(静态数据)
@app.route('/api/get_subgroups', methods=['GET'])
def get_subgroups():
    global data_table, subgroups_dic, attributes_dic, last_id, treatment, outcome, categorical_columns, data_file
    if data_table == "default_credit_card":
        rs = get_subgroup_credit_data_20w
        categorical_columns = ["Repay_Sep_2005", "Repay_Aug_2005", "Repay_Jul_2005", "Repay_Jun_2005", "Repay_May_2005", "Repay_Apr_2005"]
        treatment = 'Credit_Above_200000'
        outcome = 'Default_Next_Month'
        data_file = "default_of_credit_card_clients_20w.csv"
        #rs = subgroup_discovery("default_of_credit_card_clients_v6.csv", treatment="Credit_Amount_Above_100000", outcome="Default_Payment_Next_Month", length_limit = 6, cov_ratio = 0.03, categorical_columns = categorical_columns)
    
    elif data_table == "bank_marketing":
        rs = get_subgroup_bank_data
        treatment = 'campaign_above_2'
        outcome = 'subscribed_deposit'
        data_file = "bank_campaign.csv"

    elif data_table == "twins":
        rs = get_subgroup_twins_data
        treatment = 'is_heavier'
        outcome = 'mortality_first_year'
        data_file = "dowhy_twins.csv"

    elif data_table == "titanic":
        rs = get_subgroup_titanic_data
        treatment = 'Pclass_over_1'
        outcome = 'Survived'
        data_file = "titanic.csv"
        
    elif data_table == "ihdp":
        rs = get_subgroup_ihdp_data
        treatment = 't'
        outcome = 'y'
        data_file = "dowhy_ihdp.csv"

    elif data_table == "lalonde":
        rs = get_subgroup_lalonde_data
        treatment = 'treat'
        outcome = 're78'
        data_file = "lalonde.csv"

    attributes_dic = rs["attributes"]
    last_id = rs["dataset_info"]["subgroup_num"]
    subgroups_dic = extract_data(rs["subgroup"])

    return jsonify(int64_to_int(rs))


# 获取降维结果

@app.route('/api/get_dimension_reduction_results', methods=['GET'])
def get_dimension_reduction_results():
    #data_table = request.args.get("data_table")  # string
    global data_table, data_2dim_dic
    rs = None
    #rs = dim_reduction(data_table)
    if data_table == "default_credit_card":
        rs = get_2dim_credit_data
    elif data_table == "bank_marketing":
        rs = get_2dim_bank_data
    elif data_table == "twins":
        rs = get_2dim_twins_data
    elif data_table == "titanic":
        rs = get_2dim_titanic_data
    elif data_table == "ihdp":
        rs = get_2dim_ihdp_data
    elif data_table == "lalonde":
        rs = get_2dim_lalonde_data

    data_2dim_dic = rs

    return jsonify(rs)


#获取增加子群的信息

@app.route('/api/add_subgroup', methods=['POST'])
def add_subgroup():
    params = request.get_json()
    subgroup_id = params['id']
    tag = params['tag']
    charts = params['charts']
    global subgroups_dic, last_id
    last_id += 1
    subgroup = ''

    subgroup = get_subgroup_id_metrics(data_file,subgroup_id, charts, attributes_dic, tag, treatment, outcome, categorical_columns)

    #加载测试静态数据 
    #rs = get_new_subgroup_data

    subgroups_dic[str(subgroup_id)] = {
        "cover_id": subgroup["covered id"],
        "charts": charts
    }

    causal_id = get_all_causal_units(subgroups_dic)

    rs = {
        "subgroup": [subgroup],
        "attributes": attributes_dic,
        "causal_units_id": causal_id
    }

    return jsonify(rs)



#获取编辑后的子群信息


@app.route('/api/edit_subgroup', methods=['POST'])
def edit_subgroup():
    params = request.get_json()
    subgroup_id = params['id']
    tag = params['tag']
    charts = params['charts']
    subgroup = ''
    global data_table, subgroups_dic

    subgroup = get_subgroup_id_metrics(data_file,subgroup_id, charts, attributes_dic, tag, treatment, outcome, categorical_columns)


    #加载测试静态数据    
    #rs = get_edit_subgroup_data

    subgroups_dic[str(subgroup_id)] = {
        "cover_id": subgroup["covered id"],
        "charts": charts
    }

    causal_id = get_all_causal_units(subgroups_dic)

    rs = {
        "subgroup": [subgroup],
        "attributes": attributes_dic,
        "causal_units_id": causal_id
    }

    return jsonify(rs)   



#合并子群


@app.route('/api/merge_subgroup', methods=['POST'])
def merge_subgroup():
    params = request.get_json()
    subgroup_id_list = params['id']
    global data_table, subgroups_dic, last_id

    covered_id0 = set(subgroups_dic[str(subgroup_id_list[0])]["cover_id"])
    covered_id1 = set(subgroups_dic[str(subgroup_id_list[1])]["cover_id"])
    merge_id = list(covered_id0.union(covered_id1))

    merged_charts = id_to_charts(data_file, merge_id, attributes_dic, categorical_columns)
    
    subgroup = ''
    
    subgroup = get_subgroup_id_metrics(data_file,last_id, merged_charts, attributes_dic, treatment = treatment,outcome = outcome, categorical_columns = categorical_columns)

    if np.isnan(subgroup["metrics"]["treatment effect"]):
        effect0 = get_subgroup_credit_data_20w["subgroup"][subgroup_id_list[0]]["metrics"]["treatment effect"]
        effect1 = get_subgroup_credit_data_20w["subgroup"][subgroup_id_list[1]]["metrics"]["treatment effect"]
        subgroup["metrics"]["treatment effect"] = (effect1 + effect0) / 2

        var0 = get_subgroup_credit_data_20w["subgroup"][subgroup_id_list[0]]["metrics"]["treated variance"]
        var1 = get_subgroup_credit_data_20w["subgroup"][subgroup_id_list[1]]["metrics"]["treated variance"]
        subgroup["metrics"]["treated variance"] = (var0 + var1) / 2

        var0 = get_subgroup_credit_data_20w["subgroup"][subgroup_id_list[0]]["metrics"]["control variance"]
        var1 = get_subgroup_credit_data_20w["subgroup"][subgroup_id_list[1]]["metrics"]["control variance"]
        subgroup["metrics"]["control variance"] = (var0 + var1) / 2

        covered_id0 = set(get_subgroup_credit_data_20w["subgroup"][subgroup_id_list[0]]["covered id"])
        covered_id1 = set(get_subgroup_credit_data_20w["subgroup"][subgroup_id_list[1]]["covered id"])

        subgroup["covered id"] = list(covered_id0.union(covered_id1))
        subgroup["metrics"]["covered units"] = len(subgroup["covered id"])

    #加载测试静态数据    
    #rs = get_merge_subgroup_data

    subgroups_dic[str(last_id)] = {
        "cover_id": subgroup["covered id"],
        "charts": merged_charts
    }

    causal_id = get_all_causal_units(subgroups_dic)

    rs = {
        "subgroup": [subgroup],
        "attributes": attributes_dic,
        "causal_units_id": causal_id
    }
    
    last_id += 1

    return jsonify(int64_to_int(rs)) 


#分裂子群


@app.route('/api/split_subgroup', methods=['POST'])
def split_subgroup():
    global data_table, subgroups_dic, last_id

    params = request.get_json()
    subgroup_id = params['id']
    covered_id = subgroups_dic[str(subgroup_id)]["cover_id"]
    charts = subgroups_dic[str(subgroup_id)]["charts"]
    new_charts = split_group(data_file, charts, attributes_dic, categorical_columns)
    charts0 = new_charts["0"]
    charts1 = new_charts["1"]

    subgroup0 = get_subgroup_id_metrics(data_file,last_id, charts0, attributes_dic, treatment = treatment,outcome = outcome, categorical_columns = categorical_columns)
    subgroup1 = get_subgroup_id_metrics(data_file,last_id + 1, charts1, attributes_dic, treatment = treatment,outcome = outcome, categorical_columns = categorical_columns)

    #加载测试静态数据    
    #rs = get_split_subgroup_data

    subgroups_dic[str(last_id)] = {
        "cover_id": subgroup0["covered id"],
        "charts": charts0
    }

    subgroups_dic[str(last_id + 1)] = {
        "cover_id": subgroup1["covered id"],
        "charts": charts1
    }

    causal_id = get_all_causal_units(subgroups_dic)

    rs = {
        "subgroup": [subgroup0, subgroup1],
        "attributes": attributes_dic,
        "causal_units_id": causal_id
    }

    last_id += 2

    return jsonify(int64_to_int(rs))




# 删除子群


@app.route('/api/delete_subgroup', methods=['POST'])
def delete_subgroup():
    params = request.get_json()
    subgroup_id = params['id']
    global subgroups_dic

    del subgroups_dic[str(subgroup_id)]
    causal_id = get_all_causal_units(subgroups_dic)

    rs = {
        "status": "success",
        "causal_units_id": causal_id     
    }

    return jsonify(rs)




# 获取点图信息



@app.route('/api/get_dotplot', methods=['POST'])
def get_dotplot():
    params = request.get_json()
    subgroup_id = params['subgroup_id']
    global data_table

    cover_id = subgroups_dic[str(subgroup_id)]["cover_id"]
    rs = get_dot_data(data_file, subgroup_id, cover_id, treatment, outcome, categorical_columns = categorical_columns)


    #加载测试静态数据
    #rs = get_dotplot_data1
    return jsonify(int64_to_int(rs[str(subgroup_id)]))  


# 查看现有子群


@app.route('/api/get_all_subgroup', methods=['GET'])
def get_all_subgroup():
    global subgroups_dic
    return jsonify(int64_to_int(subgroups_dic))


