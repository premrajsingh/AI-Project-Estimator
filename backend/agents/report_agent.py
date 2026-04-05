import os
import json
import asyncio
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class ReportAgent:
    def __init__(self):
        from agents.gemini_client import GeminiClient
        self.gemini = GeminiClient(
            model=os.getenv("GEMINI_MODEL_REPORT") or os.getenv("GEMINI_MODEL") or "gemini-2.0-flash",
            timeout_seconds=int(os.getenv("GEMINI_TIMEOUT_SECONDS") or "90")
        )

    async def generate_report(
        self,
        metrics: dict,
        estimations: dict,
        risks: list,
        optimizations: list,
    ) -> str:
        """Generates a natural language report using Gemini or a rich local fallback."""

        prompt = self._build_prompt(metrics, estimations, risks, optimizations)

        if self.gemini.api_key:
            try:
                system_instruction = (
                    "You are an expert AI Software Architect and Project Manager. "
                    "Analyze the project data and generate a highly descriptive, "
                    "point-wise health report covering Optimizations, Cost, Timeline, "
                    "Bugs, and General Comments. Use Markdown with clear section headers. "
                    "Be language-aware: tailor advice to the detected programming language(s). "
                    "All costs must be in Indian Rupees (₹). Use Lakhs (L) or Crores (Cr) for large numbers."
                )
                return await self.gemini.generate_text(
                    system_instruction=system_instruction,
                    user_prompt=prompt
                )
            except Exception as e:
                print(f"Gemini Generation failed: {e}. Falling back to local generation.")
                return self._local_fallback_generation(metrics, estimations, risks, optimizations)
        else:
            print("No GEMINI_API_KEY found. Falling back to local template generation.")
            return self._local_fallback_generation(metrics, estimations, risks, optimizations)

    def _build_prompt(
        self,
        metrics: dict,
        estimations: dict,
        risks: list,
        optimizations: list,
    ) -> str:
        lang_info = ""
        primary = metrics.get("primary_language", "Unknown")
        breakdown = metrics.get("language_breakdown", {})
        if breakdown:
            lang_list = ", ".join(f"{k} ({v} files)" for k, v in list(breakdown.items())[:6])
            lang_info = f"\n- Primary Language: {primary}\n- Language Breakdown: {lang_list}"

        top_complex_files_info = ""
        if metrics.get("top_complex_files"):
            top_complex_files_info = "\n### Source Code for Analysis (Most Complex Files)\n"
            for file_data in metrics["top_complex_files"]:
                top_complex_files_info += f"\nFile: {file_data['filename']}\n"
                lines = (file_data.get("content_excerpt") or "").splitlines()[:250]
                numbered = [f"{i+1}: {line}" for i, line in enumerate(lines)]
                top_complex_files_info += "```\n" + "\n".join(numbered) + "\n```\n"

        return f"""
Please analyze the following project data and generate a comprehensive health report.

### 1. Code Metrics
- Lines of Code: {metrics.get('total_loc')}
- Cyclomatic Complexity: {metrics.get('avg_complexity')}
- Code Duplication: {metrics.get('duplication_percentage')}%{lang_info}

Project Metrics: {json.dumps(metrics)}
Estimations: {json.dumps(estimations)}
Risks: {json.dumps(risks)}
Optimizations: {json.dumps(optimizations)}
{top_complex_files_info}

Generate a professional executive summary. Tailor advice to the detected languages.
IMPORTANT: All currency mentions MUST be in Indian Rupees (₹). Use Lakhs (L) or Crores (Cr).

Generate a report with these sections in Markdown:

1. **## 🔧 Code Optimizations** — specific file-level refactoring suggestions with line numbers
2. **## 💰 Cost Analysis** — total cost, detailed breakdown by category
3. **## 📅 Project Timeline** — phased timeline breakdown
4. **## 🐛 Bugs & Security** — potential bugs, edge cases, security vulnerabilities
5. **## 💡 Additional Insights** — team recommendations and project health observations

Keep tone professional and advice actionable.
"""

    def _fmt_inr(self, amount: int) -> str:
        if amount >= 10_000_000:
            return f"₹{amount/10_000_000:.1f}Cr"
        elif amount >= 100_000:
            return f"₹{amount/100_000:.1f}L"
        elif amount >= 1000:
            return f"₹{amount/1000:.1f}K"
        else:
            return f"₹{amount:,}"

    def _local_fallback_generation(
        self,
        metrics: dict,
        estimations: dict,
        risks: list,
        optimizations: list,
    ) -> str:
        """Rich, data-driven local fallback report — works for any language/framework."""

        loc         = metrics.get("total_loc", 0) or 0
        file_count  = metrics.get("file_count", 0) or 0
        avg_cx      = metrics.get("avg_complexity", 0) or 0
        duplication = metrics.get("duplication_percentage", 0) or 0
        top_files   = metrics.get("top_complex_files", []) or []
        primary_lang = metrics.get("primary_language", "Unknown")
        lang_breakdown = metrics.get("language_breakdown", {})

        effort_hours = estimations.get("predicted_effort_hours", 0) or 0
        cost         = estimations.get("predicted_cost_inr", 0) or 0
        time_days    = estimations.get("predicted_time_days", 0) or 0
        team_size    = estimations.get("assumed_team_size", 1) or 1

        loc_per_file = round(loc / file_count, 1) if file_count else 0
        complexity_label = (
            "Low ✅" if avg_cx < 3 else
            "Moderate ⚠️" if avg_cx < 7 else
            "High 🔴"
        )
        duplication_label = (
            "Excellent ✅" if duplication < 5 else
            "Acceptable ⚠️" if duplication < 15 else
            "Needs Attention 🔴"
        )
        maintainability = (
            "A (Excellent)" if avg_cx < 3 and duplication < 5 else
            "B (Good)"      if avg_cx < 5 else
            "C (Fair)"      if avg_cx < 8 else
            "D (Poor)"
        )

        dev_cost   = round(cost * 0.60)
        qa_cost    = round(cost * 0.20)
        infra_cost = round(cost * 0.10)
        mgmt_cost  = round(cost * 0.10)

        init_days   = max(1, round(time_days * 0.10))
        dev_days    = max(1, round(time_days * 0.55))
        test_days   = max(1, round(time_days * 0.25))
        deploy_days = max(1, round(time_days * 0.10))

        critical_risks = [r for r in risks if r.get("score", 0) >= 8]
        warn_risks     = [r for r in risks if 5 <= r.get("score", 0) < 8]
        safe_risks     = [r for r in risks if r.get("score", 0) < 5]

        # ── Language-specific tool recommendations ────────────────────────────
        lint_tool = {
            "Python": "Pylint / Ruff / Flake8",
            "JavaScript": "ESLint + Prettier",
            "TypeScript": "ESLint (TypeScript rules) + Prettier",
            "React": "ESLint (react-hooks + jsx-a11y) + Prettier",
            "React/JSX": "ESLint (react-hooks + jsx-a11y) + Prettier",
            "React/TSX": "ESLint (TypeScript + react-hooks) + Prettier",
            "Java": "Checkstyle / SpotBugs / SonarQube",
            "Kotlin": "Detekt / KtLint",
            "C#": "Roslyn Analyzers / SonarQube",
            "Go": "golangci-lint / staticcheck",
            "Rust": "Clippy + rustfmt",
            "Swift": "SwiftLint + SwiftFormat",
            "Dart": "dart analyze + flutter_lints",
            "Ruby": "RuboCop",
            "PHP": "PHPStan / Psalm / PHPCS",
        }.get(primary_lang, "SonarQube / language-specific linter")

        test_framework = {
            "Python": "pytest (aim for ≥80% coverage via pytest-cov)",
            "React": "Jest + React Testing Library",
            "JavaScript": "Jest (or Mocha/Chai if preferred)",
            "TypeScript": "Jest + ts-jest",
            "Java": "JUnit 5 + Mockito",
            "Kotlin": "JUnit 5 + MockK",
            "C#": "xUnit / NUnit + Moq",
            "Go": "go test + testify",
            "Rust": "cargo test + proptest",
            "Swift": "XCTest + Quick/Nimble",
            "Dart": "flutter_test",
            "Ruby": "RSpec / Minitest",
            "PHP": "PHPUnit",
        }.get(primary_lang, "framework-appropriate test suite")

        # ── Build Report ──────────────────────────────────────────────────────
        report = "## 📊 AI Project Health Report\n\n"
        report += f"> **Analysis Date:** {self._today()} | "
        report += f"**Codebase Size:** {loc:,} lines across {file_count} files | "
        report += f"**Primary Language:** {primary_lang} | "
        report += f"**Maintainability Grade:** {maintainability}\n\n"

        # Language breakdown
        if lang_breakdown:
            lang_items = list(lang_breakdown.items())[:8]
            report += "**🗂️ Language Breakdown:**\n"
            for lang, count in lang_items:
                report += f"- {lang}: {count} file(s)\n"
            report += "\n"

        report += "---\n\n"

        # === SECTION 1: OPTIMIZATIONS ===
        report += "## 🔧 Code Optimizations\n\n"
        if top_files:
            report += f"The static analysis identified **{len(top_files)} high-complexity files** "
            report += "that are prime candidates for refactoring:\n\n"
            for i, f in enumerate(top_files, 1):
                fname   = f.get("filename", "unknown")
                comp    = round(f.get("complexity", 0), 2)
                content = f.get("content_excerpt", "")
                lines   = content.splitlines()
                line_count = len(lines)
                file_lang = f.get("language", primary_lang)

                comp_level = "🟢 Low" if comp < 3 else "🟡 Medium" if comp < 7 else "🔴 High"
                report += f"### {i}. `{fname}`\n"
                report += f"- **Language:** {file_lang}\n"
                report += f"- **Complexity Score:** {comp} ({comp_level})\n"
                report += f"- **Lines of Code:** {line_count}\n"

                long_fn_lines  = [j + 1 for j, line in enumerate(lines) if len(line) > 120]
                dup_patterns   = len([l for l in lines if lines.count(l) > 2 and l.strip()])

                if comp >= 5:
                    report += "- **Action:** Decompose complex logic into smaller, single-responsibility functions. Consider extracting helper utilities.\n"
                if long_fn_lines[:3]:
                    report += f"- **Long lines detected at:** lines {', '.join(map(str, long_fn_lines[:3]))} — consider wrapping or refactoring.\n"
                if dup_patterns > 0:
                    report += f"- **Potential duplication:** ~{dup_patterns} repeated patterns found — extract to reusable modules.\n"
                if loc_per_file > 300:
                    report += f"- **File size concern:** Average {loc_per_file} LOC/file — consider splitting into smaller modules.\n"
                report += "\n"
        else:
            report += "No complex files detected. Code structure appears lean and manageable.\n\n"

        report += "**📌 General Recommendations:**\n"
        report += f"- Average complexity of **{avg_cx}** is {complexity_label}\n"
        report += f"- Code duplication at **{duplication}%** — {duplication_label}\n"
        if avg_cx > 5:
            report += f"- Consider adopting **{lint_tool}** to enforce complexity limits.\n"
        report += "\n---\n\n"

        # === SECTION 2: COST ===
        report += "## 💰 Cost Analysis\n\n"
        report += f"### Total Estimated Budget: **{self._fmt_inr(int(cost))}**\n\n"
        report += "| Category | Allocation | Estimated Cost |\n"
        report += "|----------|-----------|----------------|\n"
        report += f"| 👨‍💻 Development & Engineering | 60% | **{self._fmt_inr(int(dev_cost))}** |\n"
        report += f"| 🧪 Quality Assurance & Testing | 20% | **{self._fmt_inr(int(qa_cost))}** |\n"
        report += f"| ☁️ Infrastructure & DevOps | 10% | **{self._fmt_inr(int(infra_cost))}** |\n"
        report += f"| 📋 Project Management | 10% | **{self._fmt_inr(int(mgmt_cost))}** |\n"
        report += f"| **Total** | **100%** | **{self._fmt_inr(int(cost))}** |\n\n"

        report += "**💡 Cost Drivers:**\n"
        report += f"- Estimated **{effort_hours:,.0f} developer hours** at an average blended rate.\n"
        report += f"- Team of **{team_size} developer(s)** assumed.\n"
        if cost > 50000:
            report += "- Budget is substantial — phased delivery (MVP first) is strongly recommended.\n"
        elif cost < 5000:
            report += "- Low-cost project — suitable for a small team or solo developer sprint.\n"
        report += "\n---\n\n"

        # === SECTION 3: TIMELINE ===
        report += "## 📅 Project Timeline\n\n"
        report += f"### Total Estimated Duration: **{time_days} days** (~{round(time_days/7)} weeks)\n\n"
        report += "| Phase | Duration | Key Deliverable |\n"
        report += "|-------|----------|-----------------|\n"
        report += f"| 🚀 Setup & Planning | {init_days} day(s) | Tech spec, environment setup, architecture decisions |\n"
        report += f"| ⚙️ Core Development | {dev_days} day(s) | Working features, API integrations, core business logic |\n"
        report += f"| 🧪 Testing & QA | {test_days} day(s) | Unit tests, integration tests, bug fixes, code reviews |\n"
        report += f"| 📦 Deployment & Handover | {deploy_days} day(s) | CI/CD setup, staging → production, documentation |\n\n"

        report += "**⚠️ Timeline Risks:**\n"
        report += "- Add a **15–20% buffer** to account for scope creep and unforeseen blockers.\n"
        if time_days < 5:
            report += "- Very short timeline — ensure requirements are crystal clear before starting.\n"
        if team_size == 1:
            report += "- Solo developer — consider the risk of single point of failure; code reviews and backups are essential.\n"
        report += "\n---\n\n"

        # === SECTION 4: BUGS & SECURITY ===
        report += "## 🐛 Bugs & Security Analysis\n\n"

        if top_files:
            report += "Based on static analysis of the codebase:\n\n"
            bug_found = False
            for f in top_files:
                content = f.get("content_excerpt", "")
                fname   = f.get("filename", "")
                findings = []

                if "eval(" in content:
                    findings.append("🔴 **Critical:** `eval()` usage detected — high security risk, can execute arbitrary code.")
                if "innerHTML" in content:
                    findings.append("🟡 **Warning:** `innerHTML` assignment found — potential XSS vulnerability, use `textContent` instead.")
                if "TODO" in content or "FIXME" in content:
                    count = content.count("TODO") + content.count("FIXME")
                    findings.append(f"🟡 **Warning:** {count} TODO/FIXME comment(s) — unresolved technical debt.")
                if "password" in content.lower() and "=" in content and ('"' in content or "'" in content):
                    findings.append("🔴 **Critical:** Possible hardcoded credential detected — move to environment variables.")
                if "catch" not in content and ("try" in content or "async" in content):
                    findings.append("🟡 **Warning:** Async operations may lack proper error handling (`try/catch`).")
                if "console.log" in content:
                    count = content.count("console.log")
                    findings.append(f"🟢 **Info:** {count} `console.log` statement(s) — remove before production deployment.")
                # Language-specific checks
                if primary_lang in ("Python",) and "print(" in content:
                    count = content.count("print(")
                    findings.append(f"🟢 **Info:** {count} `print()` statement(s) — consider using a proper logging library.")
                if primary_lang in ("Java", "Kotlin", "C#") and "System.out.print" in content:
                    findings.append("🟢 **Info:** `System.out.println` usage — replace with a logging framework (SLF4J/Log4j).")

                if findings:
                    bug_found = True
                    report += f"**`{fname}`:**\n"
                    for finding in findings:
                        report += f"- {finding}\n"
                    report += "\n"

            if not bug_found:
                report += "✅ No critical security vulnerabilities detected in the analyzed files.\n\n"
        else:
            report += "✅ No files analyzed for bug detection in this run.\n\n"

        report += "**🔒 General Security Checklist:**\n"
        report += "- [ ] All API keys stored in environment variables (not hardcoded)\n"
        report += "- [ ] Input validation on all user-facing endpoints\n"
        report += "- [ ] Authentication & authorization on protected routes\n"
        report += "- [ ] Rate limiting implemented on public APIs\n"
        report += "- [ ] Dependencies audited for known CVEs (`npm audit` / `pip-audit` / language equivalent)\n"
        report += "\n---\n\n"

        # === SECTION 5: RISKS ===
        if risks:
            report += "## ⚠️ Risk Assessment\n\n"
            if critical_risks:
                report += f"**🔴 Critical Risks ({len(critical_risks)}):**\n"
                for r in critical_risks:
                    report += f"- **{r.get('type', 'Unknown')}** (Score: {r.get('score', 0)}/10) — {r.get('reason', '')}\n"
                report += "\n"
            if warn_risks:
                report += f"**🟡 Warnings ({len(warn_risks)}):**\n"
                for r in warn_risks:
                    report += f"- **{r.get('type', 'Unknown')}** (Score: {r.get('score', 0)}/10) — {r.get('reason', '')}\n"
                report += "\n"
            if safe_risks:
                report += f"**🟢 Low Risk ({len(safe_risks)}):**\n"
                for r in safe_risks:
                    report += f"- **{r.get('type', 'Unknown')}** — {r.get('reason', '')}\n"
                report += "\n"
            report += "---\n\n"

        # === SECTION 6: ADDITIONAL INSIGHTS ===
        report += "## 💡 Additional Insights & Recommendations\n\n"
        report += "**Project Health Summary:**\n"
        report += f"- 📁 **Codebase:** {loc:,} lines across {file_count} file(s) | ~{loc_per_file} LOC/file average\n"
        report += f"- 🗂️ **Primary Language:** {primary_lang}\n"
        report += f"- ⚡ **Complexity:** {avg_cx} avg cyclomatic complexity ({complexity_label})\n"
        report += f"- 🔁 **Duplication:** {duplication}% ({duplication_label})\n"
        report += f"- 🎯 **Maintainability Grade:** {maintainability}\n\n"

        report += "**Actionable Next Steps:**\n"
        step = 1
        if avg_cx > 6:
            report += f"{step}. 🔧 **Refactor high-complexity modules** — break large functions into smaller units (<20 lines each).\n"
            step += 1
        if duplication > 10:
            report += f"{step}. 🔁 **Eliminate code duplication** — extract shared logic into utility libraries.\n"
            step += 1
        report += f"{step}. 🧪 **Increase test coverage** — aim for ≥80% unit test coverage using {test_framework}.\n"
        step += 1
        report += f"{step}. 📖 **Document public APIs** — add docstrings / JSDoc / XML doc comments to all exported functions.\n"
        step += 1
        report += f"{step}. 🚀 **Set up CI/CD pipeline** — automate testing and deployment to catch regressions early.\n"
        step += 1
        if avg_cx > 5:
            report += f"{step}. 🔍 **Enable static analysis** — configure **{lint_tool}** in your CI pipeline.\n"
            step += 1
        if team_size > 1:
            report += f"{step}. 👥 **Team of {team_size}** — establish clear code review processes and branching strategy (e.g., GitFlow).\n"

        return report

    def _today(self) -> str:
        from datetime import date
        return date.today().strftime("%B %d, %Y")
