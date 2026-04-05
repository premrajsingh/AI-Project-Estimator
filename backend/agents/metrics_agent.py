import os
import re
import shutil
import tempfile
import zipfile
import hashlib
from collections import Counter
from git import Repo
from radon.complexity import cc_visit
from pypdf import PdfReader

GITHUB_URL_RE = re.compile(
    r'^https?://(www\.)?github\.com/[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+'
)

# Files that are auto-generated / lock files — NEVER analyze these
EXCLUDED_FILENAMES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',
    'Gemfile.lock', 'poetry.lock', 'Pipfile.lock', 'cargo.lock',
    'packages.lock.json', 'shrinkwrap.json', 'npm-shrinkwrap.json',
    'pubspec.lock', 'Package.resolved', 'go.sum',
}

# Maps extension → language name
EXT_LANGUAGE_MAP = {
    # Web
    '.js': 'JavaScript', '.jsx': 'React/JSX', '.ts': 'TypeScript', '.tsx': 'React/TSX',
    '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.sass': 'SASS', '.less': 'LESS',
    '.vue': 'Vue', '.svelte': 'Svelte',
    # Python
    '.py': 'Python',
    # JVM
    '.java': 'Java', '.kt': 'Kotlin', '.kts': 'Kotlin Script', '.groovy': 'Groovy', '.scala': 'Scala',
    # .NET
    '.cs': 'C#', '.vb': 'VB.NET', '.fs': 'F#',
    # Systems
    '.c': 'C', '.cpp': 'C++', '.h': 'C/C++ Header', '.hpp': 'C++ Header',
    '.rs': 'Rust', '.go': 'Go',
    # Mobile
    '.swift': 'Swift', '.m': 'Objective-C', '.dart': 'Dart',
    # Scripting
    '.rb': 'Ruby', '.php': 'PHP', '.pl': 'Perl', '.sh': 'Shell', '.bash': 'Bash',
    '.lua': 'Lua', '.r': 'R', '.R': 'R',
    # Data / Config
    '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.toml': 'TOML',
    '.xml': 'XML', '.csv': 'CSV', '.sql': 'SQL',
    # Docs
    '.md': 'Markdown', '.mdx': 'MDX', '.rst': 'reStructuredText',
    # Config
    '.env': 'Env Config', '.ini': 'INI', '.cfg': 'Config',
    # Functional / Other
    '.ex': 'Elixir', '.exs': 'Elixir Script', '.erl': 'Erlang',
    '.hs': 'Haskell', '.clj': 'Clojure', '.lisp': 'Lisp',
    '.tf': 'Terraform', '.hcl': 'HCL',
}

ANALYZABLE_EXTENSIONS = set(EXT_LANGUAGE_MAP.keys())

# Extensions that get complexity scoring
COMPLEXITY_EXTENSIONS = {
    '.py',
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
    '.java', '.kt', '.kts', '.scala', '.groovy',
    '.cs', '.vb', '.fs',
    '.c', '.cpp', '.h', '.hpp',
    '.rs', '.go',
    '.rb', '.php', '.swift', '.dart',
    '.ex', '.exs',
    '.sh', '.bash',
    '.sql',
}

# Generic branch/loop/condition keywords for cyclomatic proxy
GENERIC_COMPLEXITY_KEYWORDS = re.compile(
    r'\b(if|else\s+if|elif|for|while|do\b|switch|case\b|catch|when\b|'
    r'unless|until|rescue|ensure|match\b|guard\b|loop\b)\b|'
    r'(&&|\|\||\band\b|\bor\b)',
    re.MULTILINE
)

# Universal function definition pattern
UNIVERSAL_FN_PATTERN = re.compile(
    r'\b(?:def|function|fn|func|fun|sub|method|proc)\s+\w+\s*[\(\{]|'
    r'(?:public|private|protected|internal|static|async|override|abstract|'
    r'open|sealed|data)\s+(?:fun|func|def|void|int|str|bool|string|'
    r'Task|List|Map|Set|Optional|Result)\s+\w+\s*\(|'
    r'(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>',
    re.MULTILINE
)


class MetricsAgent:
    def __init__(self):
        self.supported_extensions = ANALYZABLE_EXTENSIONS

    def _is_excluded_file(self, filepath: str) -> bool:
        basename = os.path.basename(filepath)
        if basename in EXCLUDED_FILENAMES:
            return True
        if basename.endswith('.min.js') or basename.endswith('.min.css'):
            return True
        if basename.endswith('.map'):
            return True
        if basename.endswith('_pb.js') or basename.endswith('_pb2.py') or basename.endswith('.pb.go'):
            return True
        return False

    def _detect_language(self, filepath: str, content: str = "") -> str:
        ext = os.path.splitext(filepath)[1].lower()
        lang = EXT_LANGUAGE_MAP.get(ext, 'Unknown')
        
        # Smart React detection for .js files
        if ext == '.js' and content:
            react_patterns = [
                r"import\s+React",
                r"from\s+'react'",
                r'from\s+"react"',
                r"useState\(",
                r"useEffect\(",
                r"useContext\(",
                r"useReducer\(",
                r"useCallback\(",
                r"useMemo\(",
                r"useRef\(",
                r"useImperativeHandle\(",
                r"useLayoutEffect\(",
                r"useDebugValue\(",
                r"<[A-Z][A-Za-z0-9]*", # Component-like tag
                r"className=",
            ]
            for pattern in react_patterns:
                if re.search(pattern, content):
                    return "React"
        
        return lang

    def _generic_complexity(self, content: str) -> float:
        """
        Language-agnostic cyclomatic complexity proxy.
        Works for Java, Kotlin, C#, Go, Swift, Dart, Ruby, PHP, Rust, etc.
        """
        fn_count = max(1, len(UNIVERSAL_FN_PATTERN.findall(content)))
        branches = len(GENERIC_COMPLEXITY_KEYWORDS.findall(content))
        return round(1.0 + (branches / fn_count), 2)

    def _compute_duplication(self, file_contents: list) -> float:
        """
        Real duplication estimate using line hashes.
        Excludes imports, boilerplate. Counts only lines appearing 3+ times.
        """
        SKIP_PATTERNS = re.compile(
            r'^(import\s|from\s+\S+\s+import|export\s+(default\s+)?(\{|function|class|const)|'
            r'use\s+(client|server|strict)|console\.(log|error|warn)|'
            r'module\.exports|require\(|#!|/\*\*?|\*\s|\*/|//|#\s|using\s)',
            re.IGNORECASE
        )
        SKIP_LITERALS = {
            '{', '}', '};', ');', '[]', '{}', '()', 'return;',
            'break;', 'continue;', 'null', 'undefined', 'true', 'false',
            'const', 'let', 'var', 'return null;', 'end', 'end;', 'pass',
        }

        all_lines = []
        for file_content in file_contents:
            for line in file_content.splitlines():
                stripped = line.strip()
                if (len(stripped) < 20
                        or stripped in SKIP_LITERALS
                        or SKIP_PATTERNS.match(stripped)):
                    continue
                all_lines.append(hashlib.md5(stripped.encode()).hexdigest())

        if not all_lines:
            return 0.0

        counts = Counter(all_lines)
        duplicate_lines = sum(v - 1 for v in counts.values() if v >= 3)
        dup_pct = (duplicate_lines / len(all_lines)) * 100
        return round(min(dup_pct, 60.0), 2)

    def analyze(self, github_url: str = None, zip_path: str = None) -> dict:
        """Extracts code and calculates metrics safely. Works for ANY language/framework."""

        temp_dir = tempfile.mkdtemp()

        metrics = {
            "total_loc": 0,
            "file_count": 0,
            "avg_complexity": 0.0,
            "duplication_percentage": 0.0,
            "functional_points": 0,
            "top_complex_files": [],
            "language_breakdown": {},
            "primary_language": "Unknown",
        }

        try:
            # PDF CASE
            if zip_path and zip_path.lower().endswith('.pdf'):
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
                        "complexity": 1.0,
                        "language": "Document",
                        "functional_points": 0,
                        "content_excerpt": text[:8000],
                    }]
                except Exception as e:
                    print(f"PDF error: {e}")
                return metrics

            # ZIP CASE
            if zip_path and os.path.exists(zip_path):
                print(f"Extracting {zip_path}...")
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                try:
                    os.remove(zip_path)
                except Exception:
                    pass

            # GITHUB CASE
            elif github_url:
                if not GITHUB_URL_RE.match(github_url.rstrip('/')):
                    raise ValueError(
                        "Only public GitHub repository URLs are supported. "
                        "Example: https://github.com/username/repository"
                    )
                print(f"Cloning repo: {github_url}")
                if not github_url.endswith(".git"):
                    github_url += ".git"
                Repo.clone_from(github_url, temp_dir, depth=1)

            else:
                raise ValueError("No input provided")

            total_complexity = 0.0
            functions_counted = 0
            file_complexities = []
            all_file_contents = []
            language_counter = Counter()

            SKIP_DIRS = {
                '.git', 'node_modules', 'venv', 'env', '__pycache__',
                'dist', 'build', '.next', 'coverage', '.cache', 'vendor',
                '.gradle', 'target', 'bin', 'obj', 'Pods', '.dart_tool',
                '.pub-cache', 'DerivedData', '.build', 'Carthage',
                '.svn', '.hg', 'bower_components', 'jspm_packages',
                '.terraform', 'tmp', 'temp', 'logs',
            }

            for root, dirs, files in os.walk(temp_dir):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext not in self.supported_extensions:
                        continue

                    filepath = os.path.join(root, file)
                    if self._is_excluded_file(filepath):
                        print(f"  Skipping (excluded): {file}")
                        continue

                    try:
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()

                        lines = content.splitlines()
                        file_loc = len(lines)

                        # Skip extremely large JSON (likely generated)
                        if file_loc > 5000 and ext == '.json':
                            print(f"  Skipping large JSON (likely generated): {file} ({file_loc} lines)")
                            continue

                        # Skip minified files (very long single lines)
                        if file_loc > 0 and (len(content) / file_loc) > 500:
                            print(f"  Skipping likely minified file: {file}")
                            continue

                        metrics["file_count"] += 1
                        metrics["total_loc"] += file_loc
                        all_file_contents.append(content)

                        lang = self._detect_language(filepath, content)
                        language_counter[lang] += 1

                        # ── Complexity ─────────────────────────────────────
                        avg_file_complexity = 1.0

                        if ext == '.py':
                            # Real cyclomatic complexity for Python via radon
                            func_count = 0
                            file_cx_sum = 0.0
                            blocks = cc_visit(content)
                            for block in blocks:
                                file_cx_sum += block.complexity
                                func_count += 1
                                total_complexity += block.complexity
                                functions_counted += 1
                            avg_file_complexity = (file_cx_sum / func_count) if func_count > 0 else 1.0

                        elif ext in COMPLEXITY_EXTENSIONS:
                            avg_file_complexity = self._generic_complexity(content)
                            fn_count = max(1, len(UNIVERSAL_FN_PATTERN.findall(content)))
                            branches = len(GENERIC_COMPLEXITY_KEYWORDS.findall(content))
                            per_fn_cx = 1.0 + (branches / fn_count)
                            for _ in range(fn_count):
                                total_complexity += per_fn_cx
                                functions_counted += 1

                        # ── Functional Points (universal) ──────────────────
                        fp = 1
                        fp += len(re.findall(
                            r'\b(?:def|function|fn|func|fun|sub)\s+\w+', content))
                        fp += len(re.findall(
                            r'(?:public|private|protected)\s+\w[\w<>]*\s+\w+\s*\(', content))
                        # REST / routing decorators / annotations
                        fp += len(re.findall(
                            r'@(?:app|router|blueprint|Route|Get|Post|Put|Delete|Patch|'
                            r'RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|'
                            r'Controller|RestController)\b',
                            content, re.IGNORECASE)) * 3
                        # DB / ORM
                        fp += len(re.findall(
                            r'\b(?:db\.|Collection|models\.|Schema|Table|Entity|Repository|'
                            r'ActiveRecord|Sequelize|Prisma|mongoose|orm\.|@Entity|@Table)\b',
                            content, re.IGNORECASE)) * 2
                        # HTTP clients
                        fp += len(re.findall(
                            r'\b(?:requests\.|httpx\.|axios|fetch\(|http\.get|http\.post|'
                            r'HttpClient|RestTemplate|WebClient|URLSession|Retrofit|Alamofire)\b',
                            content)) * 2

                        metrics["functional_points"] += fp

                        file_complexities.append({
                            "filename": os.path.relpath(filepath, temp_dir),
                            "complexity": avg_file_complexity,
                            "functional_points": fp,
                            "language": lang,
                            # Keep only a bounded excerpt to avoid huge DB payloads.
                            # Optimizer will work within this window.
                            "content_excerpt": content[:8000],
                        })

                    except Exception as e:
                        print(f"  Error reading {file}: {e}")
                        continue

            # ── Final calculations ────────────────────────────────────────────

            if functions_counted > 0:
                metrics["avg_complexity"] = round(total_complexity / functions_counted, 2)
            elif metrics["file_count"] > 0:
                metrics["avg_complexity"] = round(
                    min(5.0, metrics["total_loc"] / max(1, metrics["file_count"]) / 50), 2)

            metrics["duplication_percentage"] = self._compute_duplication(all_file_contents)
            metrics["language_breakdown"] = dict(language_counter.most_common(10))
            if language_counter:
                metrics["primary_language"] = language_counter.most_common(1)[0][0]

            # Top complex source files (keep more so we can generate per-file fixes)
            source_files = [f for f in file_complexities
                            if os.path.splitext(f["filename"])[1].lower() in COMPLEXITY_EXTENSIONS]
            other_files  = [f for f in file_complexities
                            if os.path.splitext(f["filename"])[1].lower() not in COMPLEXITY_EXTENSIONS]

            source_files.sort(key=lambda x: x["complexity"], reverse=True)
            other_files.sort(key=lambda x: x["complexity"], reverse=True)

            combined = source_files + other_files
            metrics["top_complex_files"] = combined[:10]

            return metrics

        except Exception as e:
            print(f"Metrics extraction failed: {e}")
            return metrics

        finally:
            print(f"Cleaning up {temp_dir}")
            shutil.rmtree(temp_dir, ignore_errors=True)
