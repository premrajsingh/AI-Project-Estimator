"""
OrchestratorAgent  — UPGRADED
Changes vs original:
  1. Parallel Stage 1: MetricsAgent + DesignValidatorAgent + HealthScoreAgent run via asyncio.gather
  2. Sequential Stage 2: EstimationAgent → RiskAgent → CodeReviewAgent
  3. DesignValidator errors abort pipeline early with clear error_message
  4. HealthScoreAgent result included in final DB record
  5. Per-stage DB writes for real-time frontend polling
"""
import asyncio
from agents.metrics_agent      import MetricsAgent
from agents.design_validator   import DesignValidatorAgent
from agents.health_agent       import HealthScoreAgent
from agents.estimation_agent   import EstimationAgent
from agents.risk_agent         import RiskAgent
from agents.code_review_agent  import CodeReviewAgent
from agents.report_agent       import ReportAgent
from database.mongo            import update_project


class OrchestratorAgent:
    def __init__(self, project_id: str):
        self.project_id = project_id

    def _log(self, msg: str):
        print(f"[{self.project_id}] {msg}")

    async def _on_ai_retry(self, status_code, wait, attempt):
        """Callback from GeminiClient when rate-limited."""
        self._log(f"Gemini {status_code} — Retrying in {wait}s (attempt {attempt}). Updating status to 'retrying_ai'.")
        await update_project(self.project_id, {
            "status":        "retrying_ai",
            "last_error":    f"AI Quota Reached (HTTP {status_code}). Retrying in {wait}s...",
            "retry_wait":    wait,
            "retry_attempt": attempt
        })

    async def run_pipeline(
        self,
        github_url: str = None,
        zip_path:   str = None,
        code:       str = None,
        description: str = None,
        hourly_rate: int = 1000,
        num_developers: int = 1,
        experience: str = "Intermediate",
    ):
        try:
            # ── Stage 0: status = analyzing ─────────────────────────────────
            await update_project(self.project_id, {"status": "analyzing"})

            # ── Stage 1: PARALLEL ────────────────────────────────────────────
            # Only run DesignValidator when a description is provided (Idea Estimator flow).
            # GitHub URL / ZIP analysis has no description, so skip it.
            has_description = bool(description and description.strip())

            if has_description:
                self._log("Stage 1 — parallel: Metrics + DesignValidator")
                metrics_task = asyncio.to_thread(self._run_metrics, github_url, zip_path)
                design_task  = self._run_design_validator(description)
                metrics, design_result = await asyncio.gather(metrics_task, design_task)
            else:
                self._log("Stage 1 — Metrics only (no description provided)")
                metrics = await asyncio.to_thread(self._run_metrics, github_url, zip_path)
                design_result = {"valid": True, "errors": [], "warnings": []}

            await update_project(self.project_id, {
                "metrics":       metrics,
                "design_result": design_result,
                "status":        "stage1_done",
            })

            # Abort if design validator found blocking errors (only relevant when description was given)
            if has_description and not design_result.get("valid", True) and design_result.get("errors"):
                error_codes = [e["code"] for e in design_result["errors"]]
                await update_project(self.project_id, {
                    "status":        "failed",
                    "error_message": f"Design validation failed: {', '.join(error_codes)}",
                })
                return

            # ── Stage 1b: Health Score (needs metrics + design) ──────────────
            self._log("Stage 1b — Health Score")
            health_agent  = HealthScoreAgent()
            health_result = health_agent.compute(
                metrics       = metrics,
                design_errors = design_result.get("errors", []),
                estimations   = {},   # re-scored after estimation
            )
            await update_project(self.project_id, {"health_preliminary": health_result})

            # ── Stage 2: SEQUENTIAL ──────────────────────────────────────────
            await asyncio.sleep(8)  # Increased for rate limit mitigation
            self._log("Stage 2a — Estimation")
            estimation_agent = EstimationAgent()
            if estimation_agent.gemini:
                estimation_agent.gemini.on_retry_cb = self._on_ai_retry

            estimations = await estimation_agent.predict(metrics, hourly_rate=hourly_rate, num_developers=num_developers, seniority=experience)
            await update_project(self.project_id, {"estimations": estimations, "status": "estimating"})

            await asyncio.sleep(8)  # Increased for rate limit mitigation
            self._log("Stage 2b — Risk")
            risk_agent = RiskAgent()
            if risk_agent.gemini:
                risk_agent.gemini.on_retry_cb = self._on_ai_retry

            risks = await risk_agent.analyze(metrics, estimations)
            await update_project(self.project_id, {"risks": risks, "status": "analyzing_risks"})

            await asyncio.sleep(8)  # Increased for rate limit mitigation
            self._log("Stage 2c — Code Review")
            code_result = {}
            reviewer = CodeReviewAgent()
            if reviewer.gemini:
                reviewer.gemini.on_retry_cb = self._on_ai_retry

            if code and code.strip():
                code_result = await reviewer.review(code)
            else:
                # Fallback: suggestion-mode from metrics
                code_result = {"optimizations": await reviewer.suggest(metrics, risks)}
            
            await update_project(self.project_id, {
                "code_review":   code_result,
                "optimizations": code_result.get("optimizations", []),
            })

            # ── Stage 3: Final Health Score (with estimation data) ───────────
            self._log("Stage 3 — Final Health Score")
            final_health = health_agent.compute(
                metrics       = metrics,
                design_errors = design_result.get("errors", []),
                estimations   = estimations,
            )
            await update_project(self.project_id, {"health": final_health})

            # ── Stage 4: Report ──────────────────────────────────────────────
            await asyncio.sleep(8)  # Increased for rate limit mitigation
            self._log("Stage 4 — Report Generation")
            report_agent = ReportAgent()
            if report_agent.gemini:
                report_agent.gemini.on_retry_cb = self._on_ai_retry

            final_report = await report_agent.generate_report(
                metrics, estimations, risks,
                code_result.get("optimizations", []),
            )

            await update_project(self.project_id, {
                "final_report": final_report,
                "status":       "completed",
            })
            self._log("Pipeline completed ✓")

        except Exception as e:
            self._log(f"Pipeline FAILED: {e}")
            await update_project(self.project_id, {
                "status":        "failed",
                "error_message": str(e),
            })

    # ── Thread-safe wrappers (for asyncio.to_thread) ─────────────────────────

    def _run_metrics(self, github_url, zip_path):
        agent = MetricsAgent()
        return agent.analyze(github_url, zip_path)

    async def _run_design_validator(self, description: str):
        agent = DesignValidatorAgent()
        if agent.gemini:
            agent.gemini.on_retry_cb = self._on_ai_retry
        return await agent.validate(description, expected_days=30, team_size=3)
