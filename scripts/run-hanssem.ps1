$ErrorActionPreference = 'Stop'

# 1) Install Playwright Chromium (safe to re-run)
npx --yes playwright install chromium | Out-Host

# 2) Set environment variables for this session
$env:HANSSEM_CATEGORIES = '[{"key":"침실","url":"https://store.hanssem.com/category/20070"},{"key":"거실","url":"https://store.hanssem.com/category/20071"},{"key":"다이닝","url":"https://store.hanssem.com/category/20072"},{"key":"옷장, 드레스룸","url":"https://store.hanssem.com/category/20073"},{"key":"키즈룸","url":"https://store.hanssem.com/category/20074"},{"key":"홈오피스","url":"https://store.hanssem.com/category/20076"}]'
$env:HANSSEM_MAX_PAGES = '3'
$env:HANSSEM_PER_CATEGORY_LIMIT = '120'

# 3) Run scraper and organizer
npm run scrape:hanssem:multi | Out-Host
npm run organize:hanssem | Out-Host

# 4) List outputs
if (Test-Path 'data/한샘') {
  Get-ChildItem -Name 'data/한샘' | Out-Host
  if (Test-Path 'data/한샘/products.json') {
    (Get-Item 'data/한샘/products.json' | Select-Object Name,Length | Format-Table -AutoSize | Out-String).Trim() | Out-Host
  }
} else {
  Write-Host 'data/한샘 not found'
}



