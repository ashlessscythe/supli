@echo off
setlocal enabledelayedexpansion

REM sync_public.bat - Windows equivalent of sync_public.sh

git checkout dev
if errorlevel 1 (
    echo Failed to checkout dev branch.
    exit /b 1
)

set "TAG="
set /p "TAG=Enter tag name (leave blank to skip): "
if not "!TAG!"=="" (
    git tag -a "!TAG!" -m "Release !TAG!"
    if errorlevel 1 (
        echo Failed to create tag.
        exit /b 1
    )
    git push --tags
    if errorlevel 1 (
        echo Failed to push tags.
        exit /b 1
    )
)

git switch public
if errorlevel 1 (
    echo Failed to switch to public branch.
    exit /b 1
)

git reset --hard dev
if errorlevel 1 (
    echo Failed to reset public to dev.
    exit /b 1
)

git push --force
if errorlevel 1 (
    echo Failed to push public branch.
    exit /b 1
)

git switch dev
if errorlevel 1 (
    echo Failed to switch back to dev branch.
    exit /b 1
)

echo Public branch synced with dev successfully!

endlocal
