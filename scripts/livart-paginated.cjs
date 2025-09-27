/*
  Playwright crawler for Hyundai Livart categories
  - Tries page param (?page=) up to 5; also supports clicking pagination or load-more if needed
  - XHR-first is not standardized here, so DOM-first with robust selectors
  - Output: data/livart-<category>.json, schema { title, price, productUrl, imageUrl }
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

let categories = [];
if (process.env.LIVART_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.LIVART_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) { console.error('Failed to parse LIVART_CATEGORIES:', e.message); }
}
// Fallback to built-in list so it works without env variables
if (categories.length === 0) {
  categories = [
    { key: '책상, 책장', url: 'https://living.hyundailivart.co.kr/c/C200000064' },
    { key: '소파', url: 'https://living.hyundailivart.co.kr/c/C200000059' },
    { key: '의자', url: 'https://living.hyundailivart.co.kr/c/C200000309' },
    { key: '거실장, 거실 테이블', url: 'https://living.hyundailivart.co.kr/c/C400001913' },
    { key: '키즈, 주니어', url: 'https://living.hyundailivart.co.kr/c/C200000063' },
    { key: '식탁', url: 'https://living.hyundailivart.co.kr/c/C200000061' },
    { key: '조명', url: 'https://living.hyundailivart.co.kr/c/C200000391' },
    { key: '침대, 메트리스', url: 'https://living.hyundailivart.co.kr/c/C200000062' },
    { key: '옷장, 드레스룸', url: 'https://living.hyundailivart.co.kr/c/C200000060' },
    { key: '화장대, 거울, 스툴', url: 'https://living.hyundailivart.co.kr/c/C400001914' },
    { key: '수납장, 서랍', url: 'https://living.hyundailivart.co.kr/c/C400001915' },
  ];
}

function absoluteUrl(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }

async function collectFromDom(page, out, seen, perCategoryLimit) {
  const base = page.url();
  const items = await page.$$eval('a[href*="/goods/"][href*="detail"], a.goods-item__link, a[href*="/p/"]', (anchors) => {
    const res = [];
    const hangul = /[\uAC00-\uD7A3]/;
    const cards = anchors.length ? anchors : Array.from(document.querySelectorAll('[data-goods-no] a[href]'));
    for (const a of cards) {
      const href = a.getAttribute('href') || '';
      // title: pick from specific title nodes; avoid CTA like '장바구니 바로구매'
      const root = a.closest('.product-item, .goods-item, .product, li, .item') || a.parentElement || a;
      const selectors = [
        '.product-item__name', '.goods-item__name', '.goods-name', '.name', '.title', '.tit', '.pname', 'h3', 'strong'
      ];
      const bad = /(장바구니|바로구매|일시품절)/;
      let title = '';
      for (const sel of selectors) {
        const el = root.querySelector(sel) || a.querySelector(sel);
        const txt = (el?.textContent || '').trim();
        if (txt && hangul.test(txt) && !bad.test(txt)) { title = txt; break; }
      }
      if (!title) {
        const imgAlt = a.querySelector('img[alt]')?.getAttribute('alt') || '';
        if (imgAlt && hangul.test(imgAlt) && !bad.test(imgAlt)) title = imgAlt.trim();
      }
      if (!title) {
        const fallback = (root.textContent || a.textContent || '').trim();
        const cleaned = fallback.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ');
        // split by spaces to find a Hangul segment that is not CTA
        const parts = cleaned.split(/\s{1,}/).filter(p => hangul.test(p) && !bad.test(p));
        title = parts.join(' ').slice(0, 120).trim();
      }
      title = title.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/\s*\d+%\s*$/u, '').trim();
      // price (prefer sale)
      let price = null;
      const priceScope = root.querySelector('.product-item-price, .goods-price, [class*="price"]') || root;
      const nodes = Array.from(priceScope.querySelectorAll('*'));
      const cand = [];
      for (const el of nodes) {
        const txt = (el.textContent || '').replace(/[\t\n\r]+/g, ' ');
        if (!txt) continue;
        const m = txt.match(/\d{1,3}(?:[\.,]\d{3})+|\d{3,9}/g);
        if (!m) continue;
        for (const n of m) {
          const v = parseInt(n.replace(/[^0-9]/g, ''), 10);
          if (v >= 1000 && v <= 100000000) cand.push(v);
        }
      }
      if (cand.length) price = Math.min(...cand);
      // image
      const img = a.querySelector('img[data-src], img[data-original], img[src]');
      let imgSrc = img?.getAttribute('data-src') || img?.getAttribute('data-original') || img?.getAttribute('src') || '';
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
  return added;
}

async function crawlCategory(context, cat, maxPages = 5, perCategoryLimit = 600) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  await page.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      window.chrome = { runtime: {}, csi: () => {}, loadTimes: () => {} };
    } catch {}
  });
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'font' || type === 'media' || type === 'stylesheet') return route.abort();
    return route.continue();
  });

  const out = [];
  const seen = new Set();

  for (let pg = 1; pg <= maxPages && out.length < perCategoryLimit; pg++) {
    const url = cat.url + (cat.url.includes('?') ? '&' : '?') + 'page=' + pg;
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

  const maxPages = Math.max(5, parseInt(process.env.LIVART_MAX_PAGES || '5', 10));
  const perCategoryLimit = parseInt(process.env.LIVART_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  if (categories.length === 0) {
    console.warn('No Livart categories provided. Set LIVART_CATEGORIES env to JSON array [{ key, url }].');
  }

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxPages, perCategoryLimit);
    const outPath = path.join(outDir, `livart-${cat.key}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved per-category Livart files under data/');
})();


