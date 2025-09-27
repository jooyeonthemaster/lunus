/* Emons (mall.emons.co.kr) product list crawler
   - Categories via ?group=PRIx
   - Load by incremental scroll (maxLoads), collect items each step
   - Extract: title, discounted price, productUrl, imageUrl
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

let categories = [];
if (process.env.EMONS_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.EMONS_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) { console.error('Failed to parse EMONS_CATEGORIES:', e.message); }
}
if (categories.length === 0) {
  categories = [
    { key: '침대/매트리스', url: 'https://mall.emons.co.kr/product/_list.php?group=PRI1' },
    { key: '소파', url: 'https://mall.emons.co.kr/product/_list.php?group=PRI2' },
    { key: '식탁', url: 'https://mall.emons.co.kr/product/_list.php?group=PRI3' },
    { key: '수납가구', url: 'https://mall.emons.co.kr/product/_list.php?group=PRI9' },
    { key: '학생/서재', url: 'https://mall.emons.co.kr/product/_list.php?group=PRI4' },
    { key: '중문', url: 'https://mall.emons.co.kr/product/_list.php?group=PRI10' },
  ];
}

function absoluteUrl(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }
function parsePrice(txt) {
  if (!txt) return null;
  const nums = (txt.match(/\d{1,3}(?:[\.,]\d{3})+|\d{4,9}/g) || [])
    .map(x => parseInt(x.replace(/[^0-9]/g, ''), 10))
    .filter(n => n >= 1000 && n <= 100000000);
  return nums.length ? Math.min(...nums) : null;
}

async function collect(page, out, seen, perCategoryLimit) {
  const base = page.url();
  const items = await page.$$eval('li > a[href*="/product/_view.php"]', (links) => {
    const results = [];
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      const root = a.closest('li') || a;
      const titleEl = root.querySelector('.tit p');
      const priceEl = root.querySelector('.prod-sale-price') || root.querySelector('._detail-origin-price');
      const imgEl = root.querySelector('.img img[src]');
      const title = (titleEl?.textContent || '').trim();
      const priceText = (priceEl?.textContent || '').trim();
      const imgSrc = imgEl?.getAttribute('src') || '';
      if (!href || !title) continue;
      results.push({ href, title, priceText, imgSrc });
    }
    return results;
  });

  let added = 0;
  for (const it of items) {
    const detail = absoluteUrl(it.href, base);
    if (!detail || seen.has(detail)) continue;
    seen.add(detail);
    const image = it.imgSrc ? absoluteUrl(it.imgSrc, base) : null;
    const price = parsePrice(it.priceText);
    out.push({ title: it.title || null, price: price ?? null, productUrl: detail, imageUrl: image });
    added++;
    if (out.length >= perCategoryLimit) break;
  }
  return added;
}

async function crawlCategory(context, cat, maxLoads = 12, perCategoryLimit = 600) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  const out = [];
  const seen = new Set();

  for (let i = 0; i < 3; i++) {
    try { await page.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: 90000 }); break; }
    catch (e) { if (i === 2) throw e; await page.waitForTimeout(1000 * (i + 1)); }
  }

  await page.waitForTimeout(800);
  let added = await collect(page, out, seen, perCategoryLimit);
  console.log(`[cat=${cat.key}] load=0 (+${added}) total=${out.length}`);

  let lastTotal = out.length;
  for (let load = 1; load <= maxLoads && out.length < perCategoryLimit; load++) {
    await page.evaluate(() => new Promise(resolve => {
      const y = document.body.scrollHeight;
      window.scrollTo(0, y);
      setTimeout(resolve, 900);
    }));
    await page.waitForTimeout(400);
    const just = await collect(page, out, seen, perCategoryLimit);
    console.log(`[cat=${cat.key}] load=${load} (+${just}) total=${out.length}`);
    if (out.length === lastTotal) break;
    lastTotal = out.length;
  }

  await page.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR', viewport: { width: 1366, height: 768 }, timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
  });

  const maxLoads = parseInt(process.env.EMONS_MAX_LOADS || '12', 10);
  const perCategoryLimit = parseInt(process.env.EMONS_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxLoads, perCategoryLimit);
    const safeKey = String(cat.key).replace(/[\\\/]/g, ',');
    const outPath = path.join(outDir, `emons-${safeKey}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved per-category Emons files under data/');
})();


