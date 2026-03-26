import os
import shutil
import tempfile
import zipfile
from git import Repo
from radon.complexity import cc_visit
from pypdf import PdfReader


class MetricsAgent:
    def __init__(self):
        self.supported_extensions = {
            '.py', '.js', '.jsx', '.ts', '.tsx',
            '.java', '.cpp', '.c', '.go', '.rb', '.php'
        }

    def analyze(self, github_url: str = None, zip_path: str = None) -> dict:
        """Extracts code and calculates metrics safely."""

        temp_dir = tempfile.mkdtemp()

        # ✅ Always define metrics first
        metrics = {
            "total_loc": 0,
            "file_count": 0,
            "avg_complexity": 0.0,
            "duplication_percentage": 5.0,
            "top_complex_files": []
        }

        try:
            # 📄 PDF CASE
            if zip_path and zip_path.lower().endswith('.pdf'):
                print(f"Analyzing PDF: {zip_path}")

                try:
                    reader = PdfReader(zip_path)
                    text = ""

                    for i, page in enumerate(reader.pages):
                        if i >= 10:
                            break
                        text += page.extract_text() + "\n"

                    metrics["total_loc"] = len(text.splitlines())
                    metrics["file_count"] = 1
                    metrics["top_complex_files"] = [{
                        "filename": os.path.basename(zip_path),
                        "complexity": 5.0,
                        "content": text
                    }]

                except Exception as e:
                    print(f"PDF error: {e}")

                return metrics

            # 📦 ZIP CASE
            if zip_path and os.path.exists(zip_path):
                print(f"Extracting {zip_path}...")

                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)

                try:
                    os.remove(zip_path)
                except:
                    pass

            # 🌐 GITHUB CASE
            elif github_url:
                print(f"Cloning repo: {github_url}")

                if not github_url.endswith(".git"):
                    github_url += ".git"

                Repo.clone_from(github_url, temp_dir, depth=1)

            else:
                raise ValueError("No input provided")

            total_complexity = 0
            functions_counted = 0
            file_complexities = []

            # 🔍 WALK FILES
            for root, dirs, files in os.walk(temp_dir):
                dirs[:] = [d for d in dirs if d not in [
                    '.git', 'node_modules', 'venv', 'env',
                    '__pycache__', 'dist', 'build'
                ]]

                for file in files:
                    ext = os.path.splitext(file)[1]

                    if ext in self.supported_extensions:
                        filepath = os.path.join(root, file)
                        metrics["file_count"] += 1

                        try:
                            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                                lines = content.splitlines()

                                file_loc = len(lines)
                                metrics["total_loc"] += file_loc

                                file_complexity = 0
                                func_count = 0

                                # Python → real complexity
                                if ext == '.py':
                                    blocks = cc_visit(content)
                                    for block in blocks:
                                        file_complexity += block.complexity
                                        func_count += 1

                                        total_complexity += block.complexity
                                        functions_counted += 1

                                # fallback complexity
                                if func_count > 0:
                                    avg_file_complexity = file_complexity / func_count
                                else:
                                    avg_file_complexity = (file_loc / 1000) * 1.5

                                file_complexities.append({
                                    "filename": os.path.relpath(filepath, temp_dir),
                                    "complexity": avg_file_complexity,
                                    "content": content
                                })

                        except Exception:
                            continue

            # 📊 FINAL CALCULATIONS
            if functions_counted > 0:
                metrics["avg_complexity"] = round(total_complexity / functions_counted, 2)
            else:
                metrics["avg_complexity"] = round((metrics["total_loc"] / 1000) * 1.5, 2)

            # 📈 DUPLICATION (simple estimate)
            metrics["duplication_percentage"] = min(40, (metrics["file_count"] / 100) * 2)

            # 🔥 TOP FILES
            file_complexities.sort(key=lambda x: x["complexity"], reverse=True)
            metrics["top_complex_files"] = file_complexities[:3]

            return metrics

        except Exception as e:
            print(f"Metrics extraction failed: {e}")
            return metrics

        finally:
            print(f"Cleaning up {temp_dir}")
            shutil.rmtree(temp_dir, ignore_errors=True)