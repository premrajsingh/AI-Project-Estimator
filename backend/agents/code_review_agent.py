"""
CodeReviewAgent  (replaces optimization_agent.py)
Detects bugs, bad practices, and inefficient logic in user-supplied code.
Returns structured: issues + optimized_code + improvements.
"""
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from agents.gemini_client import GeminiClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Max chars sent to LLM to control token cost
MAX_CODE_CHARS = 6_000


class CodeReviewAgent:
    def __init__(self):
        self.gemini = None
        key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if key:
            self.gemini = GeminiClient(
                model=os.getenv("GEMINI_MODEL_CODE_REVIEW") or os.getenv("GEMINI_MODEL") or None,
                timeout_seconds=int(os.getenv("GEMINI_TIMEOUT_SECONDS") or "120"),
            )

    # ── Code Review Entry Point ──────────────────────────────────────────────

    # Common language extensions map for auto-detection
    LANG_BY_EXT = {
        '.py': 'Python', '.js': 'JavaScript', '.jsx': 'React/JSX',
        '.ts': 'TypeScript', '.tsx': 'React/TSX', '.java': 'Java',
        '.kt': 'Kotlin', '.cs': 'C#', '.go': 'Go', '.rs': 'Rust',
        '.rb': 'Ruby', '.php': 'PHP', '.swift': 'Swift', '.dart': 'Dart',
        '.cpp': 'C++', '.c': 'C', '.scala': 'Scala', '.ex': 'Elixir',
        '.vue': 'Vue', '.svelte': 'Svelte', '.r': 'R', '.sh': 'Shell',
    }

    async def review(self, code: str, language: str = "auto") -> dict:
        """
        Args:
            code: raw source code string
            language: programming language hint (default "auto")
        Returns:
            {
              "issues": [{"severity": "error|warning|info", "line": int|null, "message": str}],
              "optimized_code": str,
              "improvements": [str],
              "complexity_before": str,
              "complexity_after":  str,
            }
        """
        if not code or not code.strip():
            return self._empty_result("No code provided.")

        truncated = code[:MAX_CODE_CHARS]
        truncated_note = len(code) > MAX_CODE_CHARS

        if self.gemini:
            return await self._ai_review(truncated, language, truncated_note)

        return self._rule_based_review(truncated)

    # ── Optimizations from metrics pipeline (backward-compat) ────────────────

    async def suggest(self, metrics: dict, risks: list) -> list:
        """Enhanced: Returns AI-powered specific optimization suggestions with code fixes."""
        top_files = metrics.get("top_complex_files") or []
        
        if self.gemini and top_files:
            try:
                # Prepare context: focus on a few complex files with bounded excerpts.
                complex_context = []
                for f in top_files[:5]:
                    complex_context.append(
                        {
                            "filename": f.get("filename"),
                            "language": f.get("language"),
                            "complexity": f.get("complexity"),
                            "content_excerpt": (f.get("content_excerpt") or "")[:8000],
                        }
                    )

                prompt = (
                    "Given the following complex code files and detected project risks, suggest specific engineering optimizations.\n\n"
                    f"Risks JSON:\n{json.dumps(risks, indent=2)}\n\n"
                    f"Complex Files Context:\n{json.dumps(complex_context, indent=2)}\n\n"
                    "Return ONLY valid JSON with exactly this format:\n"
                    '{\n  "optimizations": [\n    {\n'
                    '      "title": "Short Descriptive Title",\n'
                    '      "type": "Refactoring|Architecture|Tech Debt",\n'
                    '      "action": "Specific imperative action string",\n'
                    '      "filename": "string",\n'
                    '      "explanation": "Why this change matters",\n'
                    '      "patches": [\n'
                    '        {\n'
                    '          "description": "what this patch does",\n'
                    '          "original_code": "The EXACT snippet to REPLACE (must exist verbatim in content_excerpt)",\n'
                    '          "suggested_code": "The NEW snippet to use instead (plain code, no markdown fences)"\n'
                    '        }\n'
                    '      ]\n'
                    '    }\n  ]\n}\n\n'
                    "Rules:\n"
                    "- Provide 3 to 8 optimizations total, spanning multiple files when possible.\n"
                    "- For each optimization, choose a specific file from the context.\n"
                    "- Each optimization must include 1 to 3 patches.\n"
                    "- Each patch.original_code MUST be a real snippet from that file's content_excerpt (verbatim match).\n"
                    "- Each patch.suggested_code MUST be a direct replacement for that snippet.\n"
                    "- Focus on readability, performance, and best practices.\n"
                    "- Make the suggestions feel like a 'Replace X with Y' refactoring.\n"
                )
                system_instruction = (
                    "You are an expert senior architect providing actionable code improvements. "
                    "Return concrete file-by-file patches with exact before/after snippets."
                )
                data = await self.gemini.generate_json(
                    system_instruction=system_instruction,
                    user_prompt=prompt,
                    temperature=0.35,
                    max_output_tokens=1500,
                )
                opts = data.get("optimizations") or []
                normalized = []
                for o in opts:
                    patches = o.get("patches") or []
                    patches = [
                        p for p in patches
                        if (p.get("original_code") or "").strip()
                        and (p.get("suggested_code") or "").strip()
                    ]
                    if not patches:
                        continue
                    first = patches[0]
                    normalized.append(
                        {
                            "title": o.get("title") or o.get("type") or "Optimization",
                            "type": o.get("type") or "Refactoring",
                            "action": o.get("action") or o.get("title") or "Apply suggested refactor.",
                            "filename": o.get("filename") or "",
                            "explanation": o.get("explanation") or o.get("action") or "",
                            # Backward-compat fields used by current UI
                            "original_code": first.get("original_code"),
                            "suggested_code": first.get("suggested_code"),
                            "patches": patches,
                        }
                    )
                return normalized
            except Exception as e:
                print(f"Gemini interactive suggestion failed: {e}")

        # Fallback: deterministic, file-wise patches from excerpts
        file_patches = self._rule_based_file_patches(top_files)
        if file_patches:
            return file_patches

        # Fallback to high-level suggestions
        suggestions = []
        risk_types = [r.get("type", "") for r in risks]

        if "Code Quality" in risk_types or metrics.get("avg_complexity", 0) > 10:
            suggestions.append({
                "title":  "Complexity Reduction",
                "type":   "Refactoring",
                "action": "Break top-5 complex functions into smaller units ≤ 20 LOC each.",
                "explanation": "High average complexity detected. Smaller functions are easier to test and maintain.",
            })

        if metrics.get("duplication_percentage", 0) > 15:
            suggestions.append({
                "title":  "DRY Principles",
                "type":   "Tech Debt Reduction",
                "action": "Extract duplicated blocks into shared utility modules.",
                "explanation": "High duplication percentage creates maintenance overhead and bug surface area.",
            })

        if not suggestions:
            suggestions.append({
                "title":  "Code Hygiene",
                "type":   "General",
                "action": "Codebase looks healthy. Maintain test coverage above 80%.",
                "explanation": "No critical architectural flaws detected from high-level metrics.",
            })

        return suggestions

    def _rule_based_file_patches(self, top_files: list) -> list:
        """
        Creates concrete 'replace this → with this' suggestions without an LLM.
        Works on the excerpt only, so patches target small, safe refactors.
        """
        if not top_files:
            return []

        optimizations = []

        # Express async handler wrapper (common in complex JS route files)
        async_handler_snippet = (
            "const asyncHandler = (fn) => (req, res, next) =>\n"
            "  Promise.resolve(fn(req, res, next)).catch(next);\n"
        )

        route_re = re.compile(r"(router\.(get|post|put|delete|patch)\(\s*['\"][^'\"]+['\"]\s*,\s*)async\s*\(")

        for f in top_files[:8]:
            filename = f.get("filename") or ""
            content = (f.get("content_excerpt") or "")
            if not filename or not content.strip():
                continue

            # Heuristic: only patch JS/TS-ish files
            if not any(filename.endswith(ext) for ext in (".js", ".jsx", ".ts", ".tsx")):
                continue

            patches = []

            # Patch 1: add asyncHandler helper if file looks like an Express router module
            if "express" in content and "router" in content and "asyncHandler" not in content:
                # Find a stable insertion point: after the last require(...) line near the top
                lines = content.splitlines()
                last_require_idx = -1
                for i, line in enumerate(lines[:40]):
                    if "require(" in line:
                        last_require_idx = i
                if last_require_idx != -1:
                    original_block = "\n".join(lines[max(0, last_require_idx-2):last_require_idx+1])
                    suggested_block = original_block + "\n\n" + async_handler_snippet.rstrip()
                    patches.append({
                        "description": "Add a shared async error wrapper to reduce repeated try/catch blocks.",
                        "original_code": original_block,
                        "suggested_code": suggested_block,
                    })

            # Patch 2: wrap the first async router handler with asyncHandler (small, copy/paste patch)
            m = route_re.search(content)
            if m:
                # Take just the matched prefix for an exact replacement
                original = m.group(1) + "async ("
                suggested = m.group(1) + "asyncHandler(async ("
                patches.append({
                    "description": "Wrap route handler with asyncHandler for consistent error propagation.",
                    "original_code": original,
                    "suggested_code": suggested,
                })

                # Also patch the corresponding closing '});' if present in excerpt
                if "asyncHandler(async (" in suggested and "));" not in content:
                    # This one is advisory; keep it conservative and skip if we can't match cleanly.
                    pass

            # Patch 3: remove noisy console.log in production routes (safe replacement)
            if "console.log(" in content:
                # Replace a single instance to keep patch small
                idx = content.find("console.log(")
                line_start = content.rfind("\n", 0, idx) + 1
                line_end = content.find("\n", idx)
                if line_end == -1:
                    line_end = len(content)
                log_line = content[line_start:line_end]
                if log_line.strip().startswith("console.log("):
                    patches.append({
                        "description": "Remove console.log noise from server routes (use structured logging if needed).",
                        "original_code": log_line,
                        "suggested_code": "// " + log_line,
                    })

            # Only emit if we have at least one concrete patch
            if patches:
                first = patches[0]
                optimizations.append({
                    "title": "File-level refactor",
                    "type": "Refactoring",
                    "action": "Apply targeted refactors in this file using the patches below.",
                    "filename": filename,
                    "explanation": "These are small, safe replacements generated from the analyzed code excerpt.",
                    "original_code": first.get("original_code"),
                    "suggested_code": first.get("suggested_code"),
                    "patches": patches,
                })

        return optimizations

    # ── Private: AI path ─────────────────────────────────────────────────────

    async def _ai_review(self, code: str, language: str, truncated: bool) -> dict:
        note = "(Note: code was truncated to fit context)" if truncated else ""
        system_instruction = (
            "You are a senior code reviewer and refactoring expert. "
            "Be strict but constructive. Focus on real bugs and actual improvements."
        )
        prompt = f"""
Review the following {language} code. {note}

```
{code}
```

Return ONLY valid JSON with exactly these keys:
{{
  "issues": [
    {{"severity": "error|warning|info", "line": null_or_int, "message": "concise 1-line description"}}
  ],
  "optimized_code": "the fully rewritten improved version of the code",
  "improvements": ["1-line improvement description", ...],
  "complexity_before": "e.g. O(n²)",
  "complexity_after":  "e.g. O(n log n)"
}}

Rules:
- issues: real bugs first, then bad practices, then style. Max 8 issues.
- optimized_code: must be runnable. Include all original logic. Do NOT omit any function.
- improvements: max 5, each 1 sentence, start with an action verb.
- If no bugs found, return empty issues list — do not invent problems.
- severity "error" = crashes or data loss; "warning" = bad practice; "info" = style/optimization.
"""
        try:
            data = await self.gemini.generate_json(
                system_instruction=system_instruction,
                user_prompt=prompt,
                temperature=0.2,
                max_output_tokens=2000,
            )
            return self._normalize(data)
        except Exception as e:
            print(f"CodeReviewAgent AI failed: {e}")
            return self._rule_based_review(code)

    # ── Private: Rule-based fallback ─────────────────────────────────────────

    def _rule_based_review(self, code: str) -> dict:
        issues = []
        lines  = code.splitlines()

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if "except:" in stripped or "except Exception:" in stripped:
                issues.append({"severity": "warning", "line": i, "message": "Bare except swallows all errors — catch specific exceptions."})
            if "eval(" in stripped:
                issues.append({"severity": "error", "line": i, "message": "eval() is a security risk — avoid or sanitize input."})
            if "TODO" in stripped or "FIXME" in stripped:
                issues.append({"severity": "info", "line": i, "message": f"Unresolved TODO/FIXME marker."})
            if "password" in stripped.lower() and "=" in stripped and '"' in stripped:
                issues.append({"severity": "error", "line": i, "message": "Hardcoded password detected — use environment variables."})
            if "SELECT *" in stripped.upper():
                issues.append({"severity": "warning", "line": i, "message": "SELECT * fetches unnecessary columns — specify fields explicitly."})

        improvements = [
            "Add type annotations to all function signatures for better IDE support.",
            "Extract magic numbers into named constants.",
            "Add docstrings to public functions.",
        ]

        return {
            "issues":             issues[:8],
            "optimized_code":     code,
            "improvements":       improvements,
            "complexity_before":  "unknown",
            "complexity_after":   "unknown",
        }

    def _normalize(self, data: dict) -> dict:
        return {
            "issues":            data.get("issues") or [],
            "optimized_code":    data.get("optimized_code") or "",
            "improvements":      data.get("improvements") or [],
            "complexity_before": data.get("complexity_before") or "unknown",
            "complexity_after":  data.get("complexity_after") or "unknown",
        }

    @staticmethod
    def _empty_result(reason: str) -> dict:
        return {
            "issues":            [{"severity": "info", "line": None, "message": reason}],
            "optimized_code":    "",
            "improvements":      [],
            "complexity_before": "N/A",
            "complexity_after":  "N/A",
        }
