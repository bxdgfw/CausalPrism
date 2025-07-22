# CausalPrism

CausalPrism is a web-based application. Its front-end is written in React and JavaScript to run on modern browsers and support multiple user interactions and efficient causal inference. The back-end is implemented in Python and Flask, which supports subgroup discovery and treatment effect inference.

## Directory Structure

- frontend: files for the visual interface
- backend: subgroup discovery algorithms and datasets
- evaluation: code for quantitative experiments, with settings in the PDF

## Running Instruction

#### run the CausalPrism system:

- create virtual environment
  - conda create -n causal python=3.9
  - conda activate causal
- run the backend
  - cd backend
  - pip install -r requirements.txt
  - flask run
- run the frontend
  - cd frontend
  - yarn
  - yarn start

（Then you can see our system through the browser. If you want to completely replicate the case study part in our paper, you can follow the entire process in the video）



#### run the quantitative experiments:

1. **Navigate to the evaluation directory**:

   ```
   cd backend
   cd evaluation
   ```

2. **Install Jupyter support** (if not already installed in your environment):

   ```
   conda activate causal
   pip install jupyter
   ```

3. **Launch Jupyter Notebook**:

   ```
   jupyter notebook
   ```

4. **Open and run the notebook**:

   - In your web browser, open `evaluation.ipynb`
   - Select the `causal` kernel:
     `Kernel` → `Change kernel` → `causal` (Python 3.9)
   - Execute all cells:
     `Cell` → `Run All`

5. **View results**:

   - All experimental outputs excel will be stored in `results/` directory

     