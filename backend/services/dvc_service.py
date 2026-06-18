import subprocess
import os
import re
import logging

logger = logging.getLogger("forecast_ai.dvc_service")

class DvcService:
    @staticmethod
    def get_versions():
        """
        Parses Git commits modifying backend/data/historical_aqi.csv.dvc
        to track dataset versions dynamically without mock database fallbacks.
        """
        dvc_file_relative = "backend/data/historical_aqi.csv.dvc"
        # Project root is two levels up from this file's directory
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        
        try:
            # Retrieve Git commit history for the DVC pointer file
            # Format: commit_hash|commit_date_iso|commit_subject
            cmd = ["git", "log", "--follow", "--format=%H|%cI|%s", "--", dvc_file_relative]
            res = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True, check=True)
            log_lines = res.stdout.strip().split("\n")
            
            versions = []
            for line in log_lines:
                if not line:
                    continue
                parts = line.split("|", 2)
                if len(parts) < 2:
                    continue
                commit_hash = parts[0]
                commit_date = parts[1]
                
                # Fetch DVC file contents at this specific git commit
                show_cmd = ["git", "show", f"{commit_hash}:{dvc_file_relative}"]
                show_res = subprocess.run(show_cmd, cwd=project_root, capture_output=True, text=True, check=True)
                dvc_content = show_res.stdout
                
                # Use regex to parse md5 and size (dependency-free parsing of YAML)
                md5_match = re.search(r"md5:\s*([a-fA-F0-9]+)", dvc_content)
                size_match = re.search(r"size:\s*(\d+)", dvc_content)
                
                md5_hash = md5_match.group(1) if md5_match else "—"
                size_bytes = int(size_match.group(1)) if size_match else 0
                
                row_count = 0
                if md5_hash != "—":
                    # Locate DVC cache file locally to count lines
                    cache_path = os.path.join(project_root, ".dvc", "cache", "files", "md5", md5_hash[:2], md5_hash[2:])
                    if os.path.exists(cache_path):
                        try:
                            with open(cache_path, "r", encoding="utf-8", errors="ignore") as f:
                                # Count rows (excluding CSV header line)
                                row_count = max(0, sum(1 for _ in f) - 1)
                        except Exception as e:
                            logger.warning(f"Failed to read DVC cache file {cache_path}: {e}")
                            row_count = max(0, int(size_bytes / 65))
                    else:
                        # Estimate rows if the cache file is not present locally (approx 65 bytes per row)
                        row_count = max(0, int(size_bytes / 65))
                        
                versions.append({
                    "hash": md5_hash[:7] if md5_hash != "—" else commit_hash[:7],
                    "rows": row_count,
                    "pushedAt": commit_date,
                    "remote": "DagsHub"
                })
                
            return versions
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git execution failed in DvcService: {e.stderr}")
            raise RuntimeError(f"Failed to query dataset version history: {e.stderr}")
        except Exception as e:
            logger.error(f"Unexpected error in DvcService: {e}")
            raise RuntimeError(f"Error querying dataset versions: {e}")
