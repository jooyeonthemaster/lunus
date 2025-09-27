/*
  Playwright crawler for Inart (inartshop.com) categories
  - Paginated via ?page= param; iterate up to 5 pages
  - DOM-first extraction; real product anchors only
  - Output: data/inart-<category>.json with { title, price, productUrl, imageUrl }
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

let categories = [];
if (process.env.INART_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.INART_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) { console.error('Failed to parse INART_CATEGORIES:', e.message); }
}
if (categories.length === 0) {
  categories = [
    { key: '테이블', url: 'https://www.inartshop.com/goods/catalog?page=1&searchMode=catalog&category=c00390001&per=40&code=00390001' },
    { key: '의자', url: 'https://www.inartshop.com/goods/catalog?page=1&searchMode=catalog&category=c00390002&per=40&code=00390002' },
    { key: '소파', url: 'https://www.inartshop.com/goods/catalog?page=1&searchMode=catalog&category=c00390003&per=40&code=00390003' },
    { key: '옷장, 수납장', url: 'https://www.inartshop.com/goods/catalog?page=1&searchMode=catalog&category=c00390004&per=40&code=00390004' },
    { key: '침대', url: 'https://www.inartshop.com/goods/catalog?page=1&searchMode=catalog&category=c00390005&per=40&code=00390005' },
  ];
}

function absoluteUrl(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }

async function collectFromDom(page, out, seen, perCategoryLimit) {
  const base = page.url();
  const items = await page.$$eval('a[href*="/goods/view"], .goods_list .gd_name a[href], .gd_list a[href*="/goods/view"]', (anchors) => {
    const results = [];
    const hangul = /[\uAC00-\uD7A3]/;
    const cards = anchors.length ? anchors : Array.from(document.querySelectorAll('.goods_list li a[href*="/goods/view"], .pd_box a[href*="/goods/view"]'));
    for (const a of cards) {
      const href = a.getAttribute('href') || '';
      if (!/\/goods\/view/.test(href)) continue;
      const root = a.closest('li, .pd_box, .goods_list_item') || a.parentElement || a;
      // title
      const tEl = root.querySelector('.gd_name, .goods_name, .name, .tit, .title, h3, strong, .goods_info .name a') || a;
      let title = (tEl.textContent || '').trim();
      if (!hangul.test(title)) {
        const alt = root.querySelector('img[alt]')?.getAttribute('alt') || '';
        if (hangul.test(alt)) title = alt.trim();
      }
      title = title.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/\s*\d+%\s*$/u, '').trim();
      // price (prefer sale if present)
      let price = null;
      const priceScope = root.querySelector('.sale_price, .price, .goods_price, [class*="price"]') || root;
      const nodes = Array.from(priceScope.querySelectorAll('*'));
      const cand = [];
      for (const el of nodes) {
        const txt = (el.textContent || '').replace(/[\t\n\r]+/g, ' ');
        if (!txt || !/원/.test(txt)) continue;
        const m = txt.match(/\d{1,3}(?:[\.,]\d{3})+|\d{4,9}/g);
        if (!m) continue;
        for (const n of m) {
          const v = parseInt(n.replace(/[^0-9]/g, ''), 10);
          if (v >= 1000 && v <= 100000000) cand.push(v);
        }
      }
      if (cand.length) price = Math.min(...cand);
      // image
      const img = root.querySelector('img[data-src], img[data-original], img[src]') || a.querySelector('img');
      let imgSrc = img?.getAttribute('data-src') || img?.getAttribute('data-original') || img?.getAttribute('src') || '';
      results.push({ href, title, price, imgSrc });
    }
    return results;
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
  return added;
}

async function crawlCategory(context, cat, maxPages = 5, perCategoryLimit = 600) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);

  const out = [];
  const seen = new Set();

  for (let pg = 1; pg <= maxPages && out.length < perCategoryLimit; pg++) {
    const url = cat.url.replace(/([?&])page=\d+/, '$1page=' + pg);
    for (let i = 0; i < 3; i++) {
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); break; }
      catch (e) { if (i === 2) throw e; await page.waitForTimeout(1200 * (i + 1)); }
    }
    await page.waitForTimeout(800);
    const added = await collectFromDom(page, out, seen, perCategoryLimit);
    console.log(`[cat=${cat.key}] page=${pg} (+${added}) total=${out.length}`);
    if (added === 0) break;
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

  const maxPages = Math.max(5, parseInt(process.env.INART_MAX_PAGES || '5', 10));
  const perCategoryLimit = parseInt(process.env.INART_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxPages, perCategoryLimit);
    const outPath = path.join(outDir, `inart-${cat.key}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved per-category Inart files under data/');
})();



