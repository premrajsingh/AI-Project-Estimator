import pandas as pd
import numpy as np
import os
import random

def generate_synthetic_data(num_samples=1000, output_path='data/synthetic_projects.csv'):
    np.random.seed(42)
    random.seed(42)
    
    # Generate features
    # 1. Total Lines of Code (LOC): 500 to 500,000
    total_loc = np.random.randint(500, 500000, size=num_samples)
    
    # 2. File Count: Roughly proportional to LOC, but with variation
    file_count = np.maximum(1, (total_loc / np.random.uniform(50, 300, size=num_samples)).astype(int))
    
    # 3. Cyclomatic Complexity: Average complexity per function/file (1.0 to 30.0)
    avg_complexity = np.random.uniform(1.0, 30.0, size=num_samples)
    # Higher LOC often correlates with higher complexity
    avg_complexity += (total_loc / 100000) * 2.0 
    
    # 4. Code Duplication Percentage: 0% to 40%
    duplication_percentage = np.random.uniform(0, 40, size=num_samples)
    
    # Generate Targets based on features with some noise
    # Base effort in hours (Assume an average developer writes 50-100 LOC per day (8 hours))
    # Let's say 1 hour per 10 LOC as a baseline for total project effort (including planning, testing)
    
    base_effort_hours = total_loc / 10.0
    
    # Complexity modifier (exponential effect)
    complexity_modifier = 1.0 + (avg_complexity / 15.0)**1.5
    
    # Duplication modifier (increases effort slightly due to maintenance overhead, though initial copy paste is fast)
    duplication_modifier = 1.0 + (duplication_percentage / 100.0)
    
    # Random noise (unforeseen issues)
    noise = np.random.normal(1.0, 0.2, size=num_samples)
    
    actual_effort_hours = base_effort_hours * complexity_modifier * duplication_modifier * noise
    actual_effort_hours = np.maximum(8, actual_effort_hours.astype(int)) # Minimum 8 hours
    
    # Time (Days): Assume 1 developer, 8 hours a day, but team size varies (1 to 20)
    team_size = np.random.randint(1, 20, size=num_samples)
    # Larger teams have communication overhead (Brooks's Law)
    overhead = 1.0 + (team_size * 0.05)
    
    actual_time_days = (actual_effort_hours / ( team_size * 8 )) * overhead
    actual_time_days = np.maximum(1, actual_time_days.astype(int)) # Minimum 1 day
    
    # Cost ($): Assume average hourly rate varies ($20 to $150)
    hourly_rate = np.random.uniform(20, 150, size=num_samples)
    actual_cost = actual_effort_hours * hourly_rate
    actual_cost = actual_cost.astype(int)
    
    # Compile into DataFrame
    df = pd.DataFrame({
        'total_loc': total_loc,
        'file_count': file_count,
        'avg_complexity': avg_complexity,
        'duplication_percentage': duplication_percentage,
        'team_size': team_size,
        'actual_effort_hours': actual_effort_hours,
        'actual_time_days': actual_time_days,
        'actual_cost': actual_cost
    })
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    df.to_csv(output_path, index=False)
    print(f"Generated {num_samples} synthetic samples and saved to {output_path}")

if __name__ == "__main__":
    generate_synthetic_data(2000, 'data/synthetic_projects.csv')
