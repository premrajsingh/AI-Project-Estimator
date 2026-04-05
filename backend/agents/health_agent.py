"""
HealthScoreAgent
Computes a 0-100 project health score from metrics + design results.
Status: 🟢 >= 75 | 🟡 50-74 | 🔴 < 50
"""

class HealthScoreAgent:
    def compute(self, metrics: dict, design_errors: list, estimations: dict) -> dict:
        score = 100
        breakdown = {}

        # ── 1. Clarity (25 pts) ─────────────────────────────────────────────
        clarity = 25
        error_count = len(design_errors)
        if error_count >= 3:
            clarity -= 20
        elif error_count == 2:
            clarity -= 12
        elif error_count == 1:
            clarity -= 6
        breakdown["clarity"] = max(0, clarity)

        # ── 2. Code Quality (25 pts) ────────────────────────────────────────
        quality = 25
        avg_cx = metrics.get("avg_complexity", 0)
        dup    = metrics.get("duplication_percentage", 0)
        if avg_cx > 20:
            quality -= 20
        elif avg_cx > 10:
            quality -= 10
        if dup > 30:
            quality -= 10
        elif dup > 15:
            quality -= 5
        breakdown["code_quality"] = max(0, quality)

        # ── 3. Feasibility (25 pts) ─────────────────────────────────────────
        feasibility = 25
        days = estimations.get("predicted_time_days", 0)
        if days > 365:
            feasibility -= 20
        elif days > 180:
            feasibility -= 10
        elif days > 90:
            feasibility -= 5
        confidence = estimations.get("confidence", 0.5)
        if confidence < 0.6:
            feasibility -= 5
        breakdown["feasibility"] = max(0, feasibility)

        # ── 4. Risk (25 pts) ────────────────────────────────────────────────
        risk_score = 25
        loc = metrics.get("total_loc", 0)
        if loc > 100_000:
            risk_score -= 15
        elif loc > 50_000:
            risk_score -= 8
        elif loc > 10_000:
            risk_score -= 3
        if error_count >= 2:
            risk_score -= 5
        breakdown["risk"] = max(0, risk_score)

        total = sum(breakdown.values())

        if total >= 75:
            status = "🟢 Healthy"
            label  = "HEALTHY"
        elif total >= 50:
            status = "🟡 Needs Attention"
            label  = "AT_RISK"
        else:
            status = "🔴 Critical"
            label  = "CRITICAL"

        return {
            "score":     total,
            "status":    status,
            "label":     label,
            "breakdown": breakdown,
        }
