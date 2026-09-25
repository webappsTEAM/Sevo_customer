# CalServices Agent Guidelines

## Codebase Backup & Zip Update Rule
Whenever the user says **"update zip"**, **"refresh zip"**, or asks to update the backup/zip archive:
1. **TARGET ARCHIVE ONLY**:
   - Update ONLY the existing archive at `C:\Users\user\Desktop\sevo backup\calservices_latest.zip`.
2. **DO NOT CREATE NEW / TIMESTAMPED ZIP FILES**:
   - NEVER create new zip archives with timestamps or alternate names (e.g., `calservices_archive_*.zip` or `calservices_backup_*.zip`).
   - The backup directory (`C:\Users\user\Desktop\sevo backup\`) must contain only `calservices_latest.zip`.
3. **EXECUTION COMMAND**:
   - Run the packaging script:
     ```powershell
     python zip_codebase.py
     ```
   - This atomically updates `calservices_latest.zip` in-place, keeping both Customer and Vendor codebases synchronized.
