/*
  Playwright crawler for Jangin Furniture categories with page param (?pg=)
  - Iterates up to 5 pages per category (configurable)
  - Captures only real products (anchors to /view.php)
  - Schema: { title, price, productUrl, imageUrl }
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

let categories = [];
if (process.env.JANGIN_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.JANGIN_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) { console.error('Failed to parse JANGIN_CATEGORIES:', e.message); }
}
if (categories.length === 0) {
  categories = [
    { key: '침실', url: 'https://www.jangin.com/list.php?cate=1' },
    { key: '거실', url: 'https://www.jangin.com/list.php?cate=2' },
    { key: '주방', url: 'https://www.jangin.com/list.php?cate=3' },
    { key: '키즈오피스', url: 'https://www.jangin.com/list.php?cate=4' },
    { key: '소가구클로이', url: 'https://www.jangin.com/list.php?cate=5' },
  ];
}

function absoluteUrl(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }

async function crawlCategory(context, cat, maxPages = 5, perCategoryLimit = 600) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);

  const out = [];
  const seen = new Set();

  for (let pg = 1; pg <= maxPages && out.length < perCategoryLimit; pg++) {
    const url = cat.url + (cat.url.includes('?') ? '&' : '?') + 'pg=' + pg;
    for (let i = 0; i < 3; i++) {
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); break; }
      catch (e) { if (i === 2) throw e; await page.waitForTimeout(1200 * (i + 1)); }
    }

    const base = page.url();
    const items = await page.$$eval('div.list ul li a[href^="/view.php"]', (anchors) => {
      const res = [];
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        const h3 = a.querySelector('h3');
        const title = (h3?.textContent || '').trim();
        // Prefer sale price2, else price
        let price = null;
        const sale = a.querySelector('span.price2');
        const list = a.querySelector('span.price');
        const txt = (sale?.textContent || list?.textContent || '').replace(/[^0-9]/g, '');
        if (txt) price = parseInt(txt, 10);
        const img = a.querySelector('img[src]');
        const imgSrc = img?.getAttribute('src') || '';
        res.push({ href, title, price, imgSrc });
      }
      return res;
    });

    let added = 0;
    for (const it of items) {
      const detail = absoluteUrl(it.href, base);
      if (!detail || seen.has(detail)) continue;
      seen.add(detail);
      const image = it.imgSrc ? absoluteUrl(it.imgSrc, base) : null;
      out.push({ title: it.title || null, price: it.price ?? null, productUrl: detail, imageUrl: image });
      added++;
      if (out.length >= perCategoryLimit) break;
    }
    console.log(`[cat=${cat.key}] page=${pg} (+${added}) total=${out.length}`);
    if (added === 0) break; // no more products
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

  const maxPages = Math.max(5, parseInt(process.env.JANGIN_MAX_PAGES || '5', 10));
  const perCategoryLimit = parseInt(process.env.JANGIN_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxPages, perCategoryLimit);
    const outPath = path.join(outDir, `jangin-${cat.key}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved per-category Jangin files under data/');
})();



