import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    
    # Features
    total_loc = np.random.randint(100, 100000, num_samples)
    file_count = np.random.randint(1, 1000, num_samples)
    avg_complexity = np.random.uniform(1.0, 30.0, num_samples)
    duplication = np.random.uniform(0.0, 40.0, num_samples)
    team_size = np.random.randint(1, 20, num_samples)
    functional_points = np.random.randint(5, 5000, num_samples)
    
    # Targets (Heuristic based on industry rules)
    # Effort (hours) = (LOC/20) + (FP * 4) + (Complexity * 5)
    effort = (total_loc / 25) + (functional_points * 3.5) + (avg_complexity * 4) + (duplication * 2)
    effort = effort * (1 + (team_size / 50)) # Slight overhead for larger teams
    
    # Time (days) = Effort / (TeamSize * 6 productive hours)
    time_days = effort / (team_size * 6)
    
    # Cost (INR) - assuming avg developer salary/rate
    cost_inr = effort * 1200 # Standard rate
    
    data = pd.DataFrame({
        'total_loc': total_loc,
        'file_count': file_count,
        'avg_complexity': avg_complexity,
        'duplication': duplication,
        'team_size': team_size,
        'functional_points': functional_points,
        'target_effort': effort,
        'target_time': time_days,
        'target_cost': cost_inr
    })
    
    return data

def train_and_save():
    print("Generating synthetic dataset...")
    df = generate_synthetic_data()
    
    X = df[['total_loc', 'file_count', 'avg_complexity', 'duplication', 'team_size', 'functional_points']]
    y = df[['target_effort', 'target_time', 'target_cost']]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training RandomForest model...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Model R^2 Score: {score:.4f}")
    
    model_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, 'effort_model.pkl')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_and_save()
