# CausalPrism

CausalPrism is a web-based application. Its front-end is written in React and JavaScript to run on modern browsers and support multiple user interactions and efficient causal inference. The back-end is implemented in Python and Flask, which supports subgroup discovery and treatment effect inference.

## Directory Structure

- frontend: compressed files for the visual interface，decompression required before use
- backend: subgroup discovery algorithms and datasets
- evaluation: code for quantitative experiments, with settings in the PDF

## Running Instruction

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
