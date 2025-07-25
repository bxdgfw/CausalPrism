set.seed(123)

causal_tree <- function( train_data, covariates, treatment, outcome, thre, pru_coef = 0.8){
    # load packages
    library(causalTree)
    library(partykit)

    set.seed(123)

    # create causal tree    
    n_samples <- nrow(train_data)
    formula <- as.formula(paste(outcome, "~", paste(covariates, collapse = "+")))

    start_time <- Sys.time() 
    tree <- causalTree(formula, data = train_data, treatment = train_data[[treatment]],
                    split.Rule = "CT", cv.option = "matching", split.Honest = TRUE, cv.Honest = FALSE, split.Bucket = FALSE, split.alpha = 0.5,
                    xval = 10)
    end_time <- Sys.time()
    train_time <- as.numeric(end_time - start_time, units="secs")  

    # prune the tree
    opcp <- tree$cptable[,1][which.min(tree$cptable[,4])]
    opfit <- prune(tree,cp = opcp* pru_coef)

    node_treatment_effects = get_rules_and_effects( opfit, n_samples, thre)
    node_treatment_effects <- node_treatment_effects[order(-node_treatment_effects$treatment_effect), ]

    if (any(is.na(node_treatment_effects))) {  
        node_treatment_effects <- "rules not found enough"
    } 

    #return the result
    result <- list(rules = node_treatment_effects, train_time = train_time)

    return(result)  
}

Causal_rule_ensemble <- function( train_data, covariates, treatment, outcome){
    #导入包    
    library("CRE")

    #处理数据
    column_names <- colnames(train_data)  
    nonum_col <- list()  
    categories_maps <- list()  
      
    #处理非数值数据列  
    for (column_name in column_names) {  
      if (column_name %in% covariates && !is.numeric(train_data[[column_name]])) {  
        nonum_col <- append(nonum_col, column_name)  
        categories <- unique(train_data[[column_name]])  
        categories_map <- setNames(1:length(categories), categories)  
        categories_maps[[column_name]] <- categories_map  
        train_data[[column_name]] <- as.numeric(factor(train_data[[column_name]], levels = names(categories_map)))  
      }  
    }  
    
    #获得规则
    y <- train_data[[outcome]]
    t <- train_data[[treatment]]
    X <- train_data[unlist(covariates)]
    start_time <- Sys.time() 
    cre_results <- cre(y, t, X)
    end_time <- Sys.time()
    train_time <- as.numeric(end_time - start_time, units="secs")  
    
    #整合rule和cate，并降序排列
    df_res <- cre_results["CATE"][[1]]
    ate = df_res$Estimate[1]
    df_res$Estimate <- ifelse(seq(nrow(df_res)) == 1, df_res$Estimate, df_res$Estimate + df_res$Estimate[1])  
    df_res <- df_res[-1, ]    
    df_res <-df_res[order(-df_res$Estimate), ]  
    cate_list <- df_res$Estimate      
    rules <- df_res$Rule
    
    #修改格式
    rules <- lapply(rules, function(x) {    
      x <- gsub("&", "and", x)    
      x <- gsub("X\\[,([0-9]+)\\]", "X\\1", x)    
      return(x)    
    })     

    #原始规则
    ori_rules <- rules
    ori_rules <- unlist(ori_rules)

    rules <- process_rules(rules, nonum_col, categories_maps) 
    
    rules <- unlist(rules)
    df_res$Rule <- rules
    df <- df_res[, c("Rule", "Estimate")]  
    
    #return the result
    result <- list(rules = df, ate = ate, train_time = train_time)    
    return(result)
}

causal_forest <- function( train_data, covariates, treatment, outcome, thre){
    # load packages
    library(causalTree)
    library(partykit)
    
    n_samples <- nrow(train_data)
    # create formula
    formula <- as.formula(paste(outcome, "~", paste(covariates, collapse = "+")))
    
    # create causal forest
    start_time <- Sys.time() 
    forest <- causalForest(formula, data=train_data, treatment=train_data$t,
            split.Rule="CT", split.Honest=TRUE, split.Bucket=FALSE, cv.option="CT", cv.Honest=TRUE, 
            split.alpha = 0.5, cv.alpha = 0.5, sample.size.total = floor(nrow(train_data) / 2), 
            mtry = ceiling(ncol(train_data)/3), nodesize = 3, num.trees= 5,ncolx= 10,ncov_sample=10)
    end_time <- Sys.time()
    train_time <- as.numeric(end_time - start_time, units="secs") 
    
    #计算每棵树的叶子节点规则以及效应
    trees = forest$trees
    results <- lapply(trees, get_cf_rules,  thre)    
    
    all_results <- do.call(rbind, results)  
    all_results$treatment_effect <- as.numeric(all_results$treatment_effect)
    
    # Sort by treatment effect and select the top k  
    all_results <- all_results[order(-all_results$treatment_effect), ]  
    all_results$rule <- sapply(all_results$rule, as.character) 

    top_k_results <- all_results
    top_k_results$rule <- sapply(top_k_results$rule, as.character)  

    if (any(is.na(top_k_results))) {  
      top_k_results <- "rules not found enough"
    } 
    
    #只取规则
    result <- list(rules = top_k_results, train_time = train_time)
 
    return(result)                        
    }                         
    
                            
# 将规则中的数字保留三位小数
round_nums_in_string <- function(str) {  
    split_vector <- strsplit(str, " ")[[1]]  
    
    result_vector <- sapply(split_vector, function(x) {  
    if (grepl("^-?\\d*\\.?\\d+$", x)) {    
      return(as.character(round(as.numeric(x), 3)))  
    } else {   
      return(x)  
    }  
    })  
    
    result_string <- paste(result_vector, collapse = " ")  
    return(result_string)  
}  

# 得到因果树叶子节点规则和效应 
get_rules_and_effects <- function(tree, n_samples, thre) {  
    # get the leaf nodes    
    leaf_info <- tree$frame[tree$frame$var == "<leaf>" ,]     
    # get the te    
    treatment_effects <- leaf_info$yval    
    # get the leaf nodes with enough samples  
    tar_rows <- which(leaf_info$n > n_samples*thre)  
  
    # get and modify rules for each leaf node  
    party_model <- as.party(tree)     
    leaf_rules <- partykit:::.list.rules.party(party_model)   
    rule_cut <- sapply(unname(leaf_rules), round_nums_in_string)   
  
    # get rules and TE  
    node_treatment_effects <- data.frame(treatment_effect = treatment_effects, rule = unname(rule_cut))    
    rownames(node_treatment_effects) <- names(leaf_rules)   
    node_treatment_effects <- node_treatment_effects[tar_rows,]  
    
    return(node_treatment_effects)  
}

# 帮助处理CRE规则  
get_categories <- function(value, map, operator) {  
  if (operator == "<=") {  
    categories <- names(map)[map <= value]  
  } else if (operator == ">") {  
    categories <- names(map)[map > value]  
  } else {  
    stop("Invalid operator. Only <= and > are supported.")  
  }  
  return(categories)  
}  
  
# 生成规则字符串 
generate_rule <- function(variable, value, map, operator) {  
  categories <- get_categories(value, map, operator)  
  rule <- paste(variable, ' in ["', paste(categories, collapse = '", "'), '"]', sep = "")  
  return(rule)  
}  
  
# 处理CRE规则中的类别型变量 
process_rules <- function(rule_list, categorical_vars, categories_maps) {  
  new_rule_list <- c()  
  
  for (rule in rule_list) {  
    # 分解规则  
    parts <- unlist(strsplit(rule, " and "))  
    
    # 处理每个部分  
    new_parts <- c()  
    for (part in parts) {  
      # 分解部分  
      split_part <- unlist(strsplit(part, "<=|>"))  
      variable <- trimws(split_part[1])  
      value <- as.numeric(trimws(split_part[2]))  
      
      # 判断变量类型  
      if (variable %in% categorical_vars) {  
        operator <- ifelse(grepl("<=", part), "<=", ">")  
        
        # 类别型变量  
        index <- match(variable, categorical_vars)  
        categories_map <- categories_maps[[index]]  
        new_parts <- c(new_parts, generate_rule(variable, value, categories_map, operator))  
      } else {  
        # 数值型变量  
        new_parts <- c(new_parts, part)  
      }  
    }  
    
    # 生成新的规则  
    new_rule <- paste(new_parts, collapse = " and ")  
    new_rule_list <- c(new_rule_list, new_rule)  
  }  
    
  return(new_rule_list)  
}  

#得到因果森林的规则 
get_cf_rules <- function(model, thre) { 

    threshold <- model$frame[1,]$n * thre
    
    rules <- rpart.rules(model, roundint = FALSE)  
     
    valid_leaf_nodes <- rownames(model$frame)[model$frame$var == "<leaf>" & model$frame$n >= threshold]  
 
    rules <- rules[rownames(rules) %in% valid_leaf_nodes, ] 
    
    rules_str <- apply(rules[, -1], 1, function(x) {  
      x <- x[!is.na(x)]  
      rule_str <- paste(x, collapse = " ")  
      return(rule_str)  
    })  
      
    new_rules <- data.frame(  
      treatment_effect = rules[, 1],  
      rule = rules_str  
    )    

    # 规则形式修改-  
    rule_modified <- gsub("&", "and", new_rules$rule)  
    rule_modified <- gsub("when ", "", rule_modified) 
    rule_modified <- gsub("\\s+", " ", rule_modified) 
    rule_modified <- gsub("(\\w+) is ([0-9\\.-]+) to ([0-9\\.-]+)",   
                          "\\1 >= \\2 and \\1 < \\3",   
                          rule_modified)  
  
    rule_modified <- lapply(rule_modified, function(rule) {  
      matches <- gregexpr("(\\w+) is ((\\w+\\sor\\s)*\\w+)", rule, perl = TRUE)  
      matches <- regmatches(rule, matches)[[1]]  
         
      replacements <- sapply(matches, function(m) {  
        parts <- strsplit(m, " is ")[[1]]  
        var <- parts[1]  
        values <- strsplit(parts[2], " or ")[[1]]  
        paste0(var, " in [\"", paste(values, collapse = "\", \""), "\"]")  
      })  
        
      for (i in seq_along(matches)) {  
        rule <- gsub(matches[i], replacements[i], rule)  
      }  
        
      rule  
    })      

    
    new_rules$rule = rule_modified

    return(new_rules)
}  
                         

  