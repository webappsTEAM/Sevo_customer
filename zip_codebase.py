"""
Codebase Zipper Script
Compresses the project into a clean zip archive while intelligently excluding 
unnecessary, sensitive, and heavy files (node_modules, .git, venvs, cache, etc.).
"""

import argparse
import fnmatch
import os
from datetime import datetime
from pathlib import Path
import sys
import zipfile

# Determine project root directory (directory where this script is located)
SCRIPT_DIR = Path(__file__).resolve().parent

# Default directory patterns to exclude
DEFAULT_EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    "dist",
    "build",
    ".next",
    ".cache",
    ".vscode",
    ".idea",
    ".gemini",
    ".claude",
    ".system_generated",
    "scratch",
    "mnt",
    "staticfiles",
}

# Default file patterns to exclude (fnmatch patterns)
DEFAULT_EXCLUDE_FILES = {
    "*.pyc",
    "*.pyo",
    "*.pyd",
    "*.log",
    "*.tmp",
    "*.bak",
    "*.zip",
    "*.tar",
    "*.gz",
    "*.rar",
    "*.7z",
    "temp_booking*.jsx",
    "restore_log.txt",
    "test_workflow_results.log",
}

# Sensitive files to exclude by default unless overridden
SENSITIVE_FILES = {
    ".env",
    ".env.local",
    ".env.*.local",
    "*.pem",
    "*.key",
    "*.pfx",
}


def parse_args():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    default_output = SCRIPT_DIR / f"calservices_backup_{timestamp}.zip"

    parser = argparse.ArgumentParser(
        description="Pack the codebase into a clean, portable zip archive.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "-o", "--output",
        default=str(default_output),
        help="Name or path of the output zip file",
    )
    parser.add_argument(
        "--root",
        default=str(SCRIPT_DIR),
        help="Root directory of the codebase to zip",
    )
    parser.add_argument(
        "--include-git",
        action="store_true",
        help="Include .git directory",
    )
    parser.add_argument(
        "--include-venv",
        action="store_true",
        help="Include virtual environments (.venv, venv, env)",
    )
    parser.add_argument(
        "--include-node-modules",
        action="store_true",
        help="Include node_modules folders",
    )
    parser.add_argument(
        "--include-env",
        action="store_true",
        help="Include .env configuration/secret files",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List files that would be archived without creating the zip file",
    )
    return parser.parse_args()


def is_matching(filename: str, patterns: set) -> bool:
    for pattern in patterns:
        if fnmatch.fnmatch(filename, pattern):
            return True
    return False


def format_size(size_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def main():
    args = parse_args()
    root_dir = Path(args.root).resolve()
    output_path = Path(args.output).resolve()

    if not root_dir.exists():
        print(f"Error: Root directory '{root_dir}' does not exist.")
        sys.exit(1)

    exclude_dirs = set(DEFAULT_EXCLUDE_DIRS)
    exclude_files = set(DEFAULT_EXCLUDE_FILES)

    if not args.include_env:
        exclude_files.update(SENSITIVE_FILES)
    if args.include_git:
        exclude_dirs.discard(".git")
    if args.include_venv:
        exclude_dirs.difference_update({".venv", "venv", "env"})
    if args.include_node_modules:
        exclude_dirs.discard("node_modules")

    print("\n" + "=" * 60)
    print("         CalServices Codebase Packaging Utility")
    print("=" * 60)
    print(f" Source Root : {root_dir}")
    print(f" Destination : {output_path}")
    print(f" Dry Run     : {'Enabled' if args.dry_run else 'Disabled'}")
    print("-" * 60)

    files_to_zip = []
    total_uncompressed_bytes = 0
    skipped_dirs_count = 0
    skipped_files_count = 0

    for current_root, dirs, files in os.walk(root_dir):
        current_path = Path(current_root)

        # Filter out directories to avoid descending into them
        filtered_dirs = []
        for d in dirs:
            if d in exclude_dirs or is_matching(d, exclude_dirs):
                skipped_dirs_count += 1
            else:
                filtered_dirs.append(d)
        dirs[:] = filtered_dirs

        for f in files:
            file_path = current_path / f
            try:
                rel_file_path = file_path.relative_to(root_dir)
            except ValueError:
                continue

            # Never zip the output zip file itself or any existing zip backups
            if file_path.resolve() == output_path or f.endswith(".zip"):
                continue

            # Check exclusions
            if is_matching(f, exclude_files):
                skipped_files_count += 1
                continue

            # Special case for .env: allow .env.example
            if f.startswith(".env") and not args.include_env:
                if f in {".env.example", ".env.sample", ".env.template"}:
                    pass
                else:
                    skipped_files_count += 1
                    continue

            try:
                file_size = file_path.stat().st_size
            except OSError:
                file_size = 0

            files_to_zip.append((file_path, rel_file_path, file_size))
            total_uncompressed_bytes += file_size

    print(f" Files Found  : {len(files_to_zip):,} files to pack")
    print(f" Source Size  : {format_size(total_uncompressed_bytes)}")
    print(f" Filtered Out : {skipped_dirs_count} folders, {skipped_files_count} excluded files")
    print("-" * 60)

    if args.dry_run:
        print(" Preview of files to include (first 30 shown):")
        for idx, (_, rel_path, size) in enumerate(files_to_zip[:30], start=1):
            print(f"   {idx:3d}. {rel_path} ({format_size(size)})")
        if len(files_to_zip) > 30:
            print(f"   ... and {len(files_to_zip) - 30} more files.")
        print("\n [OK] Dry run completed. No archive was generated.")
        return

    # Ensure parent folder for output zip exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(" [1/2] Archiving files into compressed zip...")
    start_time = datetime.now()

    with zipfile.ZipFile(output_path, mode="w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        total_files = len(files_to_zip)
        step = max(1, total_files // 10)
        for index, (abs_path, rel_path, _) in enumerate(files_to_zip, start=1):
            zipf.write(abs_path, arcname=str(rel_path))
            if index % step == 0 or index == total_files:
                pct = (index / total_files) * 100
                print(f"   -> Progress: {pct:5.1f}% ({index:,}/{total_files:,} files)")

    elapsed = (datetime.now() - start_time).total_seconds()
    zip_size = output_path.stat().st_size
    saved_pct = ((total_uncompressed_bytes - zip_size) / total_uncompressed_bytes * 100) if total_uncompressed_bytes > 0 else 0

    print(" [2/2] Archive successfully generated!")
    print("=" * 60)
    print("                    Archive Summary")
    print("=" * 60)
    print(f" Archive Name    : {output_path.name}")
    print(f" Saved Location  : {output_path}")
    print(f" Compressed Size : {format_size(zip_size)}")
    print(f" Space Reduction : {saved_pct:.1f}% saved")
    print(f" Total Duration  : {elapsed:.2f}s")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()

