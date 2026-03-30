import os
import shutil
import tempfile
import zipfile
from git import Repo
from radon.complexity import cc_visit
from pypdf import PdfReader

class MetricsAgent:
    def __init__(self):
        self.supported_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.go', '.rb', '.php'}
        
    def analyze(self, github_url: str = None, zip_path: str = None) -> dict:
        """Extracts code, calculates metrics, finds complex files, and cleans up."""
        temp_dir = tempfile.mkdtemp()
        metrics = {
            "total_loc": 0,
            "file_count": 0,
            "avg_complexity": 0.0,
            "duplication_percentage": 5.0,  # Placeholder
            "top_complex_files": [] # list of {"filename": str, "complexity": float, "content": str}
        }
        
        try:
            is_pdf = zip_path and zip_path.lower().endswith('.pdf')
            
            if is_pdf:
                print(f"Analyzing PDF document: {zip_path}")
                try:
                    reader = PdfReader(zip_path)
                    text = ""
                    for i, page in enumerate(reader.pages):
                        if i >= 10: break # Max 10 pages
                        text += page.extract_text() + "\n"
                    
                    metrics["total_loc"] = len(text.splitlines())
                    metrics["file_count"] = 1
                    metrics["top_complex_files"] = [{
                        "filename": os.path.basename(zip_path),
                        "complexity": 5.0,
                        "content": text
                    }]
                    # Cleanup the PDF after analysis
                    try: os.remove(zip_path)
                    except: pass
                except Exception as e:
                    print(f"Error reading PDF: {e}")
                
                return metrics

            if zip_path and os.path.exists(zip_path):
                print(f"Extracting {zip_path} to {temp_dir}...")
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                # Remove the uploaded zip after extraction to save space, assuming it's unneeded
                try:
                   os.remove(zip_path)
                except:
                   pass
            elif github_url:
                print(f"Cloning {github_url} to {temp_dir}...")
                Repo.clone_from(github_url, temp_dir, depth=1)
            else:
                raise ValueError("Neither github_url nor zip_path provided.")
            
            total_complexity = 0
            functions_counted = 0
            
            # For tracking file-level complexities
            file_complexities = []
            
            for root, dirs, files in os.walk(temp_dir):
                # Skip common ignore dirs
                dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'venv', 'env', '__pycache__', 'dist', 'build']]
                
                for file in files:
                    ext = os.path.splitext(file)[1]
                    if ext in self.supported_extensions:
                        filepath = os.path.join(root, file)
                        metrics["file_count"] += 1
                        
                        try:
                            with open(filepath, 'r', encoding='utf-8') as f:
                                content = f.read()
                                lines = content.splitlines()
                                file_loc = len(lines)
                                metrics["total_loc"] += file_loc
                                
                                file_total_complexity = 0
                                file_functions_counted = 0
                                
                                # If it's python, use radon to get actual complexity
                                if ext == '.py':
                                    blocks = cc_visit(content)
                                    for block in blocks:
                                        file_total_complexity += block.complexity
                                        file_functions_counted += 1
                                        
                                        total_complexity += block.complexity
                                        functions_counted += 1
                                
                                # Estimate file complexity
                                file_avg_complexity = 0
                                if file_functions_counted > 0:
                                    file_avg_complexity = file_total_complexity / file_functions_counted
                                else:
                                    # Fallback LOC based complexity for other languages
                                    file_avg_complexity = (file_loc / 1000) * 1.5
                                    
                                file_complexities.append({
                                    "filename": os.path.relpath(filepath, temp_dir),
                                    "complexity": file_avg_complexity,
                                    "content": content
                                })
                                
                        except Exception as e:
                            # Skip files that can't be read (e.g. binary disguised as text)
                            pass
            
            if functions_counted > 0:
                metrics["avg_complexity"] = round(total_complexity / functions_counted, 2)
            else:
                metrics["avg_complexity"] = round((metrics["total_loc"] / 1000) * 1.5, 2)
                
            # Sort by complexity and get top 3
            file_complexities.sort(key=lambda x: x["complexity"], reverse=True)
            metrics["top_complex_files"] = file_complexities[:3]
                
            return metrics
            
        finally:
            # Cleanup
            print(f"Cleaning up {temp_dir}...")
            shutil.rmtree(temp_dir, ignore_errors=True)
