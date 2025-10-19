$ErrorActionPreference = "Stop"

Write-Host "🔧 Creating layout.css..." -ForegroundColor Cyan

$cssPath = "src\renderer\css"
if (-not (Test-Path $cssPath)) {
    New-Item -ItemType Directory -Path $cssPath -Force | Out-Null
}

$layoutCssPath = Join-Path $cssPath "layout.css"

# Notice: @' must be at the END of a line, and '@ must be at the START of a line
$layoutCss = @'
/* ============================================
   POSTERBOY - ENHANCED LAYOUT SYSTEM
   Optimized for 13"+ screens - No inner scrollbars
   Google Material Design Principles
   ============================================ */

/* Main App Container - Full Viewport Control */
.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--bg-primary);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

/* Header - Fixed Height */
.app-header {
    flex: 0 0 64px;
    height: 64px;
    min-height: 64px;
    max-height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    z-index: 1000;
}

/* Main Layout Container */
.main-layout {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
    height: calc(100vh - 64px);
}

/* Sidebar - Fixed Width with Scroll */
.app-sidebar {
    flex: 0 0 280px;
    width: 280px;
    min-width: 280px;
    max-width: 280px;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    overflow: hidden;
}

.sidebar-header {
    flex: 0 0 auto;
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px;
    min-height: 0;
}

.sidebar-footer {
    flex: 0 0 auto;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-primary);
}

/* Main Content Area */
.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    background: var(--bg-primary);
}

/* Content Sections - Tab Based Navigation */
.content-section {
    display: none;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.content-section.active {
    display: flex;
}

/* Section Header - Fixed */
.section-header {
    flex: 0 0 auto;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.section-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
}

.section-actions {
    display: flex;
    gap: 8px;
}

/* Section Body - Scrollable */
.section-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px;
    min-height: 0;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}

/* Firefox Scrollbar */
* {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

[data-theme="dark"] * {
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

/* Responsive Grid System */
.grid {
    display: grid;
    gap: 16px;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

/* Card Layout */
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    padding: 0;
}

/* Responsive Breakpoints */
@media (max-width: 1366px) {
    .app-sidebar {
        flex: 0 0 260px;
        width: 260px;
        min-width: 260px;
        max-width: 260px;
    }
    
    .section-body {
        padding: 20px;
    }
}

@media (max-width: 1024px) {
    .app-sidebar {
        flex: 0 0 240px;
        width: 240px;
        min-width: 240px;
        max-width: 240px;
    }
    
    .card-grid {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }
}

/* Prevent any overflow issues */
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 0;
    overflow: hidden;
}
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($layoutCssPath, $layoutCss, $utf8NoBom)

Write-Host "✅ layout.css created successfully!" -ForegroundColor Green
pause