import joblib
import os

class MLService:
    def __init__(self):
        model_path = os.path.join(os.path.dirname(__file__), "../models/effort_model.pkl")
        self.model = joblib.load(model_path)

    def predict(self, metrics: dict):
        features = [[
            metrics["total_loc"],
            metrics["file_count"],
            metrics["avg_complexity"],
            metrics["duplication_percentage"],
            metrics["team_size"]
        ]]

        prediction = self.model.predict(features)[0]

        return {
            "effort_hours": float(prediction[0]),
            "time_days": float(prediction[1]),
            "cost": float(prediction[2])
        }