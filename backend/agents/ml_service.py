import joblib
import os

class MLService:
    def __init__(self):
        model_path = os.path.join(os.path.dirname(__file__), "../models/effort_model.pkl")
        self.model = joblib.load(model_path)

    def predict(self, metrics: dict):
        # 6 features — must match training order:
        # total_loc, file_count, avg_complexity, duplication_percentage, team_size, functional_points
        features = [[
            metrics["total_loc"],
            metrics["file_count"],
            metrics["avg_complexity"],
            metrics["duplication_percentage"],
            metrics.get("team_size", 5),
            metrics.get("functional_points", 0)
        ]]

        prediction = self.model.predict(features)[0]

        return {
            "effort_hours": float(prediction[0]),
            "time_days":    float(prediction[1]),
            "cost_inr":     float(prediction[2])
        }