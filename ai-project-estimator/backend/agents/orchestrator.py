from agents.metrics_agent import MetricsAgent
from agents.estimation_agent import EstimationAgent
from agents.risk_agent import RiskAgent
from agents.optimization_agent import OptimizationAgent
from agents.report_agent import ReportAgent
from database.mongo import update_project

class OrchestratorAgent:
    def __init__(self, project_id: str):
        self.project_id = project_id
        
    async def run_pipeline(self, github_url: str = None, zip_path: str = None):
        """Runs all sub-agents sequentially and updates MongoDB."""
        try:
            # 1. Metrics Extract
            print(f"[{self.project_id}] Starting Metrics Extraction...")
            metrics_agent = MetricsAgent()
            metrics = metrics_agent.analyze(github_url, zip_path)
            await update_project(self.project_id, {"metrics": metrics})
            
            # 2. Estimation 
            print(f"[{self.project_id}] Starting Estimation Prediction...")
            estimation_agent = EstimationAgent()
            estimations = estimation_agent.predict(metrics)
            await update_project(self.project_id, {"estimations": estimations})
            
            # 3. Risk Analysis 
            print(f"[{self.project_id}] Starting Risk Assessment...")
            risk_agent = RiskAgent()
            risks = risk_agent.analyze(metrics, estimations)
            await update_project(self.project_id, {"risks": risks})
            
            # 4. Optimization Recommendations 
            print(f"[{self.project_id}] Starting Optimization Generation...")
            optimization_agent = OptimizationAgent()
            optimizations = optimization_agent.suggest(metrics, risks)
            await update_project(self.project_id, {"optimizations": optimizations})
            
            # 5. Report Generation (LLM)
            print(f"[{self.project_id}] Starting AI Report Generation...")
            report_agent = ReportAgent()
            final_report = await report_agent.generate_report(metrics, estimations, risks, optimizations)
            
            # 6. Final Save
            await update_project(self.project_id, {
                "final_report": final_report,
                "status": "completed"
            })
            print(f"[{self.project_id}] Pipeline Completed Successfully.")
            
        except Exception as e:
            print(f"[{self.project_id}] Pipeline Failed: {e}")
            await update_project(self.project_id, {"status": "failed", "error_message": str(e)})
