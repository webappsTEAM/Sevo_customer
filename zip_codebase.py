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
    parser = argparse.ArgumentParser(
        description="Pack the codebase into a clean, portable zip archive.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    default_name = f"calservices_backup_{timestamp}.zip"

    parser.add_argument(
        "-o", "--output",
        default=default_name,
        help="Name or path of the output zip file",
    )
    parser.add_argument(
        "--root",
        default=".",
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

    print("=" * 60)
    print("Codebase Packaging Utility")
    print("=" * 60)
    print(f"Source Directory : {root_dir}")
    print(f"Output File      : {output_path}")
    print(f"Dry Run Mode     : {'Enabled' if args.dry_run else 'Disabled'}")
    print("-" * 60)

    files_to_zip = []
    total_uncompressed_bytes = 0
    skipped_dirs_count = 0
    skipped_files_count = 0

    for current_root, dirs, files in os.walk(root_dir):
        current_path = Path(current_root)
        rel_current_path = current_path.relative_to(root_dir)

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
            rel_file_path = file_path.relative_to(root_dir)

            # Never zip the output zip file itself
            if file_path.resolve() == output_path:
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

    print(f"Files found to archive : {len(files_to_zip):,}")
    print(f"Total uncompressed size: {format_size(total_uncompressed_bytes)}")
    print(f"Skipped items          : {skipped_dirs_count} dirs, {skipped_files_count} files")
    print("-" * 60)

    if args.dry_run:
        print("Files that would be included (first 50 shown):")
        for idx, (_, rel_path, size) in enumerate(files_to_zip[:50], start=1):
            print(f"  {idx:3d}. {rel_path} ({format_size(size)})")
        if len(files_to_zip) > 50:
            print(f"  ... and {len(files_to_zip) - 50} more files.")
        print("\nDry run completed. No zip file was created.")
        return

    # Ensure parent folder for output zip exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("Compressing files...")
    start_time = datetime.now()

    with zipfile.ZipFile(output_path, mode="w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for index, (abs_path, rel_path, _) in enumerate(files_to_zip, start=1):
            zipf.write(abs_path, arcname=str(rel_path))
            if index % 200 == 0 or index == len(files_to_zip):
                pct = (index / len(files_to_zip)) * 100
                print(f"  [{pct:5.1f}%] {index:,}/{len(files_to_zip):,} files processed...", end="\r")

    print("\nCompression complete!")
    elapsed = (datetime.now() - start_time).total_seconds()
    zip_size = output_path.stat().st_size
    saved_pct = ((total_uncompressed_bytes - zip_size) / total_uncompressed_bytes * 100) if total_uncompressed_bytes > 0 else 0

    print("=" * 60)
    print("Archive Summary")
    print("=" * 60)
    print(f"Created Archive  : {output_path.name}")
    print(f"Archive Location : {output_path}")
    print(f"Compressed Size  : {format_size(zip_size)}")
    print(f"Space Saved      : {saved_pct:.1f}%")
    print(f"Time Taken       : {elapsed:.2f} seconds")
    print("=" * 60)


if __name__ == "__main__":
    main()
