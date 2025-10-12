@echo off
setlocal enabledelayedexpansion

:: Rename PostWoman to PosterBoy - Windows Script (UTF-8 Fixed)
:: This script performs a comprehensive rename across the entire project

echo.
echo ===================================================
echo   PostWoman to PosterBoy Rename Script
echo ===================================================
echo.

:: Warning
echo WARNING: This script will make changes to your files.
echo Please ensure you have committed your changes or have a backup.
echo.
set /p continue="Do you want to continue? (Y/N): "
if /i not "%continue%"=="Y" (
    echo Aborted.
    exit /b
)

echo.
echo [1/8] Updating package.json files...
echo.

:: package.json
if exist "package.json" (
    powershell -Command "$content = Get-Content 'package.json' -Raw -Encoding UTF8; $content = $content -replace '\"name\": \"postwoman\"', '\"name\": \"posterboy\"'; $content = $content -replace '\"productName\": \"PostWoman\"', '\"productName\": \"PosterBoy\"'; $content = $content -replace '\"author\": \"PostWoman Team\"', '\"author\": \"PosterBoy Team\"'; $content = $content -replace 'postwoman', 'posterboy'; $content = $content -replace 'PostWoman', 'PosterBoy'; $content = $content -replace 'com\.postwoman\.app', 'com.posterboy.app'; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText((Resolve-Path 'package.json').Path, $content, $utf8)"
    echo   [OK] Updated package.json
)

:: package.json.backup
if exist "package.json.backup" (
    powershell -Command "$content = Get-Content 'package.json.backup' -Raw -Encoding UTF8; $content = $content -replace '\"name\": \"postwoman\"', '\"name\": \"posterboy\"'; $content = $content -replace '\"productName\": \"PostWoman\"', '\"productName\": \"PosterBoy\"'; $content = $content -replace '\"author\": \"PostWoman Team\"', '\"author\": \"PosterBoy Team\"'; $content = $content -replace 'postwoman', 'posterboy'; $content = $content -replace 'PostWoman', 'PosterBoy'; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText((Resolve-Path 'package.json.backup').Path, $content, $utf8)"
    echo   [OK] Updated package.json.backup
)

echo.
echo [2/8] Updating HTML files...
echo.

:: src/renderer/index.html
if exist "src\renderer\index.html" (
    powershell -Command "$content = Get-Content 'src\renderer\index.html' -Raw -Encoding UTF8; $content = $content -replace '<title>PostWoman', '<title>PosterBoy'; $content = $content -replace 'alt=\"PostWoman\"', 'alt=\"PosterBoy\"'; $content = $content -replace '<h1>PostWoman</h1>', '<h1>PosterBoy</h1>'; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText((Resolve-Path 'src\renderer\index.html').Path, $content, $utf8)"
    echo   [OK] Updated src\renderer\index.html
)

echo.
echo [3/8] Updating JavaScript files...
echo.

:: Update all JavaScript files using PowerShell with UTF-8 encoding
powershell -Command "Get-ChildItem -Path 'src\renderer\js' -Filter '*.js' -Recurse | ForEach-Object { Write-Host \"  Processing $($_.Name)...\"; $content = Get-Content $_.FullName -Raw -Encoding UTF8; $content = $content -replace \"localStorage\.getItem\('postwoman_\", \"localStorage.getItem('posterboy_\"; $content = $content -replace \"localStorage\.setItem\('postwoman_\", \"localStorage.setItem('posterboy_\"; $content = $content -replace \"localStorage\.removeItem\('postwoman_\", \"localStorage.removeItem('posterboy_\"; $content = $content -replace '\"postwoman_', '\"posterboy_'; $content = $content -replace \"'postwoman_\", \"'posterboy_\"; $content = $content -replace '`postwoman_', '`posterboy_'; $content = $content -replace '`postwoman_\$\{', '`posterboy_${'; $content = $content -replace 'postwomanData', 'posterboyData'; $content = $content -replace 'postwoman_export', 'posterboy_export'; $content = $content -replace 'postwoman_collection', 'posterboy_collection'; $content = $content -replace 'postwoman_environments', 'posterboy_environments'; $content = $content -replace 'postwoman_history', 'posterboy_history'; $content = $content -replace 'postwoman_history_item', 'posterboy_history_item'; $content = $content -replace 'postwoman_teams', 'posterboy_teams'; $content = $content -replace 'postwoman_sync_queue', 'posterboy_sync_queue'; $content = $content -replace 'importPostwomanExport', 'importPosterboyExport'; $content = $content -replace 'isPostwomanCollection', 'isPosterboyCollection'; $content = $content -replace 'importPostwomanCollectionToManager', 'importPosterboyCollectionToManager'; $content = $content -replace 'user@postwoman\.local', 'user@posterboy.local'; $content = $content -replace 'PostWoman', 'PosterBoy'; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText($_.FullName, $content, $utf8) }"

echo   [OK] Updated all JavaScript files

echo.
echo [4/8] Updating CSS files...
echo.

:: src/renderer/styles.css
if exist "src\renderer\styles.css" (
    powershell -Command "$content = Get-Content 'src\renderer\styles.css' -Raw -Encoding UTF8; $content = $content -replace 'PostWoman CSS', 'PosterBoy CSS'; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText((Resolve-Path 'src\renderer\styles.css').Path, $content, $utf8)"
    echo   [OK] Updated src\renderer\styles.css
)

echo.
echo [5/8] Updating main process files...
echo.

:: src/main/main.js
if exist "src\main\main.js" (
    powershell -Command "$content = Get-Content 'src\main\main.js' -Raw -Encoding UTF8; $content = $content -replace 'About PostWoman', 'About PosterBoy'; $content = $content -replace \"title: 'About PostWoman'\", \"title: 'About PosterBoy'\"; $content = $content -replace \"message: 'PostWoman'\", \"message: 'PosterBoy'\"; $content = $content -replace '<h1>PostWoman</h1>', '<h1>PosterBoy</h1>'; $content = $content -replace 'yourusername/postwoman', 'yourusername/posterboy'; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText((Resolve-Path 'src\main\main.js').Path, $content, $utf8)"
    echo   [OK] Updated src\main\main.js
)

echo.
echo [6/8] Updating README and documentation...
echo.

:: README.md
if exist "README.md" (
    powershell -Command "$content = Get-Content 'README.md' -Raw -Encoding UTF8; $content = $content -replace 'PostWoman', 'PosterBoy'; $content = $content -replace 'postwoman', 'posterboy'; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText((Resolve-Path 'README.md').Path, $content, $utf8)"
    echo   [OK] Updated README.md
)

echo.
echo [7/8] Creating migration script...
echo.

:: Create migration.js with proper UTF-8 encoding
powershell -Command "$migration = @'^
// Migration script to preserve existing user data^
// Run this once to migrate from PostWoman to PosterBoy^
^
function migrateFromPostWomanToPosterBoy() {^
    console.log('🔄 Starting migration from PostWoman to PosterBoy...');^
    ^
    const oldKeys = [^
        'postwoman_storage',^
        'postwoman_user',^
        'postwoman_preferences',^
        'postwoman_collections',^
        'postwoman_history',^
        'postwoman_environments',^
        'postwoman_teams',^
        'postwoman_theme',^
        'postwoman_sync_queue'^
    ];^
    ^
    let migratedCount = 0;^
    ^
    // Migrate known keys^
    oldKeys.forEach(oldKey => {^
        const data = localStorage.getItem(oldKey);^
        if (data) {^
            const newKey = oldKey.replace('postwoman', 'posterboy');^
            localStorage.setItem(newKey, data);^
            migratedCount++;^
            console.log(`✓ Migrated: ${oldKey} → ${newKey}`);^
        }^
    });^
    ^
    // Migrate table data (postwoman_tablename)^
    for (let i = 0; i < localStorage.length; i++) {^
        const key = localStorage.key(i);^
        if (key && key.startsWith('postwoman_') && !oldKeys.includes(key)) {^
            const data = localStorage.getItem(key);^
            const newKey = key.replace('postwoman_', 'posterboy_');^
            localStorage.setItem(newKey, data);^
            migratedCount++;^
            console.log(`✓ Migrated table: ${key} → ${newKey}`);^
        }^
    }^
    ^
    // Mark migration as complete^
    localStorage.setItem('posterboy_migrated', 'true');^
    ^
    console.log(`✅ Migration complete! Migrated ${migratedCount} items.`);^
    console.log('Old PostWoman data has been preserved with new PosterBoy keys.');^
}^
^
// Auto-run migration if needed^
if (typeof window !== 'undefined' && window.localStorage) {^
    const needsMigration = localStorage.getItem('postwoman_user') && ^
                          !localStorage.getItem('posterboy_migrated');^
    ^
    if (needsMigration) {^
        migrateFromPostWomanToPosterBoy();^
    }^
}^
^
// Export for manual use if needed^
if (typeof module !== 'undefined' && module.exports) {^
    module.exports = { migrateFromPostWomanToPosterBoy };^
}^
'@; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText('src\renderer\js\migration.js', $migration, $utf8)"

echo   [OK] Created migration script

echo.
echo [8/8] Finalizing...
echo.

echo ===================================================
echo   Rename process complete!
echo ===================================================
echo.
echo Next steps:
echo   1. Review the changes with: git diff
echo   2. Test the application thoroughly
echo   3. Ensure migration.js is loaded in your app
echo   4. Commit the changes with:
echo      git add .
echo      git commit -m "Rename project from PostWoman to PosterBoy"
echo.
echo Migration:
echo   The migration script (src\renderer\js\migration.js) will
echo   automatically preserve existing user data on first launch.
echo.
pause