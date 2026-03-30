# 3. Machine Learning Guide

The ML component of your system is responsible for predicting the estimated **Development Time (Days)**, **Effort (Hours)**, and **Cost ($)** based on the extracted software metrics (like LOC, Cyclomatic Complexity, and Code Duplication).

## Concepts to Learn First
1. **Supervised Learning:** Specifically **Regression**. You are predicting continuous numbers (hours, cost), not categories (spam/not spam).
2. **Pandas:** A Python library for loading, cleaning, and manipulating datasets (CSV files).
3. **Scikit-Learn (sklearn):** The standard Python library for training traditional ML models like Linear Regression and Random Forest.
4. **Train/Test Split:** Dividing your data so you can test how accurate the model is on unseen data.
5. **Evaluation Metrics:** Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE) to measure prediction accuracy.

## Dataset Preparation
To train an ML model, you need historical project data.
1. **Public Datasets:** Search for the **PROMISE Software Engineering Repository** or **ISBSG** datasets. They contain historical data on software projects (LOC, team size, development methodology -> actual effort in hours).
2. **Synthetic Data:** If you cannot find a good dataset, you can write a short Python script to generate a synthetic CSV file.
   - Example columns: `File_Count`, `Total_LOC`, `Avg_Complexity`, `Team_Size`, `Actual_Effort_Hours`, `Actual_Cost`.
   - Use Pandas to load this CSV: `df = pd.read_csv('projects.csv')`

## Models to Start With
Don't jump straight into Deep Learning (Neural Networks). Start simple:
1. **Linear Regression (`sklearn.linear_model.LinearRegression`):** Great baseline. Fast and interpretable. If LOC goes up, Effort goes up proportionally.
2. **Random Forest Regressor (`sklearn.ensemble.RandomForestRegressor`):** Excellent for this use case. It handles non-linear relationships well (e.g., as complexity gets very high, effort skyrockets, not just scales linearly).
3. **XGBoost (`xgboost.XGBRegressor`):** If Random Forest works well, XGBoost usually performs even better with a bit of tuning.

## How to Train, Save, and Use the Model

### 1. Training and Saving (Jupyter Notebook or Python Script)
```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
import joblib

# Load Data
data = pd.read_csv('software_projects.csv')
X = data[['total_loc', 'avg_complexity', 'file_count']] # Features
y = data['actual_effort_hours'] # Target

# Train
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
model = RandomForestRegressor(n_estimators=100)
model.fit(X_train, y_train)

# Save the trained model to a file
joblib.dump(model, 'effort_model.pkl')
print(f"Model trained. Score: {model.score(X_test, y_test)}")
```

### 2. Loading in FastAPI Backend
In your `EstimationAgent`, load the saved `effort_model.pkl`. 
**Best Practice:** Load the model *once* when the FastAPI server starts, not every time a user makes a request.

```python
import joblib

class EstimationAgent:
    def __init__(self):
        # Load the model from disk
        self.model = joblib.load('models/effort_model.pkl')

    def predict_effort(self, loc, avg_complexity, file_count):
        # Format the input as a 2D array for sklearn
        features = [[loc, avg_complexity, file_count]]
        prediction = self.model.predict(features)
        return float(prediction[0])
```

## How to Improve Accuracy Later
1. **More Features:** Add features like "Number of third-party dependencies," "Average commit size," or "Team experience level."
2. **Hyperparameter Tuning:** Use `GridSearchCV` in sklearn to find the optimal settings (number of trees, max depth) for your Random Forest.
3. **Continuous Learning:** As users use your system, allow them to input the *actual* project time once the project finishes. Save this to MongoDB and retrain the model periodically.
