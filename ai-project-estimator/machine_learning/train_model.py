import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

def train_and_save_model(data_path='data/synthetic_projects.csv', model_output_path='../backend/models/effort_model.pkl'):
    print(f"Loading data from {data_path}...")
    try:
        data = pd.read_csv(data_path)
    except FileNotFoundError:
        print(f"Error: {data_path} not found. Please run data_synthesizer.py first.")
        return

    # Features (X) and Targets (y)
    features = ['total_loc', 'file_count', 'avg_complexity', 'duplication_percentage', 'team_size']
    targets = ['actual_effort_hours', 'actual_time_days', 'actual_cost']

    X = data[features]
    y = data[targets]

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # We need to predict multiple outputs (effort, time, cost).
    # MultiOutputRegressor allows us to wrap a regression model to handle multiple targets.
    print("Training Random Forest Multi-Output Regressor...")
    base_estimator = RandomForestRegressor(n_estimators=100, random_state=42)
    model = MultiOutputRegressor(base_estimator)
    
    model.fit(X_train, y_train)

    # Evaluate
    predictions = model.predict(X_test)
    
    print("\n--- Model Evaluation ---")
    for i, target_name in enumerate(targets):
        mae = mean_absolute_error(y_test.iloc[:, i], predictions[:, i])
        r2 = r2_score(y_test.iloc[:, i], predictions[:, i])
        print(f"Target: {target_name}")
        print(f"  MAE: {mae:.2f}")
        print(f"  R2 Score: {r2:.4f}\n")

    # Save model
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    joblib.dump(model, model_output_path)
    print(f"Model saved successfully to {model_output_path}")

if __name__ == "__main__":
    train_and_save_model()
