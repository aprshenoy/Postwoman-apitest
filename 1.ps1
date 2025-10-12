# Remove scrollbar styling from styles.css
$file = "src\renderer\styles.css"
$content = Get-Content $file -Raw
$content = $content -replace '(?s)/\* Scrollbar Styling \*/.*?::-webkit-scrollbar-thumb:hover \{[^}]+\}', '/* Use browser default scrollbars */'
Set-Content $file $content