import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

def generate_and_train(num_samples=3000, output_path='/home/claude/project/backend/models/effort_model.pkl'):
    np.random.seed(42)

    print("Generating enhanced synthetic training data...")

    # === Features ===
    total_loc = np.random.randint(500, 300000, size=num_samples)
    file_count = np.maximum(1, (total_loc / np.random.uniform(50, 300, size=num_samples)).astype(int))
    
    # Realistic complexity: most projects are 2-8, some high
    avg_complexity = np.clip(np.random.exponential(scale=3.0, size=num_samples) + 1.0, 1.0, 25.0)
    # Higher LOC slightly correlates with complexity
    avg_complexity += (total_loc / 200000) * 3.0
    avg_complexity = np.clip(avg_complexity, 1.0, 30.0)

    duplication_percentage = np.clip(np.random.exponential(scale=5.0, size=num_samples), 0.0, 40.0)

    team_size = np.random.randint(1, 15, size=num_samples)

    # Functional Points: roughly proportional to file count + API routes
    # ~1-10 FP per file on average
    functional_points = np.maximum(1, (file_count * np.random.uniform(2, 8, size=num_samples)).astype(int))
    functional_points = np.clip(functional_points, 1, 5000)

    # === Targets ===
    # Effort based on LOC + FP + complexity
    base_effort = total_loc / 10.0  # 1 hr per 10 LOC
    fp_effort = functional_points * np.random.uniform(1.5, 3.5, size=num_samples)  # 1.5-3.5 hrs per FP
    
    complexity_mod = 1.0 + (avg_complexity / 12.0) ** 1.4
    dup_mod = 1.0 + (duplication_percentage / 100.0)
    noise = np.random.normal(1.0, 0.15, size=num_samples)

    # Use max of LOC-based and FP-based effort
    actual_effort_hours = np.maximum(base_effort, fp_effort) * complexity_mod * dup_mod * noise
    actual_effort_hours = np.maximum(8, actual_effort_hours.astype(int))

    # Time in days
    overhead = 1.0 + (team_size * 0.04)  # Brooks's Law
    actual_time_days = (actual_effort_hours / (team_size * 8)) * overhead
    actual_time_days = np.maximum(1, actual_time_days.astype(int))

    # Cost in INR (₹800 - ₹2000/hr for Indian market)
    hourly_rate_inr = np.random.uniform(800, 2000, size=num_samples)
    actual_cost_inr = actual_effort_hours * hourly_rate_inr
    actual_cost_inr = actual_cost_inr.astype(int)

    df = pd.DataFrame({
        'total_loc': total_loc,
        'file_count': file_count,
        'avg_complexity': avg_complexity,
        'duplication_percentage': duplication_percentage,
        'team_size': team_size,
        'functional_points': functional_points,
        'actual_effort_hours': actual_effort_hours,
        'actual_time_days': actual_time_days,
        'actual_cost_inr': actual_cost_inr,
    })

    print(f"Generated {num_samples} samples")
    print(f"Effort range: {actual_effort_hours.min()} - {actual_effort_hours.max()} hrs")
    print(f"Time range: {actual_time_days.min()} - {actual_time_days.max()} days")
    print(f"Cost range: ₹{actual_cost_inr.min():,} - ₹{actual_cost_inr.max():,}")

    # === Train ===
    features = ['total_loc', 'file_count', 'avg_complexity', 'duplication_percentage', 'team_size', 'functional_points']
    targets = ['actual_effort_hours', 'actual_time_days', 'actual_cost_inr']

    X = df[features]
    y = df[targets]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("\nTraining Random Forest (6 features + INR cost)...")
    base_estimator = RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1, min_samples_leaf=5)
    model = MultiOutputRegressor(base_estimator)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    print("\n--- Model Evaluation ---")
    for i, name in enumerate(targets):
        mae = mean_absolute_error(y_test.iloc[:, i], predictions[:, i])
        r2 = r2_score(y_test.iloc[:, i], predictions[:, i])
        print(f"{name}: MAE={mae:.1f}, R²={r2:.4f}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(model, output_path)
    print(f"\nModel saved to {output_path}")

    # Also save a metadata file so estimation_agent can verify feature order
    meta_path = output_path.replace('.pkl', '_meta.txt')
    with open(meta_path, 'w') as f:
        f.write("features=" + ",".join(features) + "\n")
        f.write("targets=" + ",".join(targets) + "\n")
        f.write("currency=INR\n")
    print(f"Metadata saved to {meta_path}")

    return model

if __name__ == "__main__":
    generate_and_train()
