<#
.SYNOPSIS
    Compresses the codebase into a clean zip archive.
.DESCRIPTION
    Wraps the Python zip_codebase.py script or packages the files cleanly.
.EXAMPLE
    .\zip_codebase.ps1
.EXAMPLE
    .\zip_codebase.ps1 -Output "my_backup.zip"
#>

param(
    [string]$Output = "",
    [switch]$IncludeGit,
    [switch]$IncludeVenv,
    [switch]$IncludeNodeModules,
    [switch]$IncludeEnv,
    [switch]$DryRun
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pyScript = Join-Path $scriptDir "zip_codebase.py"

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue

if (-not $pythonCmd) {
    Write-Error "Python was not found in PATH. Please ensure Python is installed."
    exit 1
}

$argsList = @()
if ($Output) { $argsList += "-o", $Output }
if ($IncludeGit) { $argsList += "--include-git" }
if ($IncludeVenv) { $argsList += "--include-venv" }
if ($IncludeNodeModules) { $argsList += "--include-node-modules" }
if ($IncludeEnv) { $argsList += "--include-env" }
if ($DryRun) { $argsList += "--dry-run" }

& python $pyScript @argsList
