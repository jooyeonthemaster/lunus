/*
  Playwright crawler for Casamia categories with Load More handling
  - Outputs: data/casamia-<category>.json per category
  - Schema: { title, price, productUrl, imageUrl }
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Categories: prefer env-provided JSON; fallback to defaults provided by user
let categories = [];
if (process.env.CASAMIA_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.CASAMIA_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) {
    console.error('Failed to parse CASAMIA_CATEGORIES JSON:', e.message);
  }
}
if (categories.length === 0) {
  categories = [
    { key: '거실가구', url: 'https://www.guud.com/shop/index?IL_CTGRY_ID=5050' },
    { key: '침실가구', url: 'https://www.guud.com/shop/index?IL_CTGRY_ID=5076' },
    { key: '수납가구', url: 'https://www.guud.com/shop/index?IL_CTGRY_ID=5099' },
    { key: '주방가구', url: 'https://www.guud.com/shop/index?IL_CTGRY_ID=5113' },
    { key: '서재가구', url: 'https://www.guud.com/shop/index?IL_CTGRY_ID=5136' },
    { key: '유아아동가구', url: 'https://www.guud.com/shop/index?IL_CTGRY_ID=5158' },
    { key: '조명', url: 'https://www.guud.com/shop/goodsList?f_c=5036' },
  ];
}

function absoluteUrl(urlLike, base) { try { return new URL(urlLike, base).toString(); } catch { return null; } }

function extractMinPriceFromText(text) {
  if (!text) return null;
  const matches = String(text).match(/\d{1,3}(?:[\.,]\d{3})+|\d{4,9}/g);
  if (!matches) return null;
  const nums = matches.map(x => parseInt(x.replace(/[^0-9]/g, ''), 10)).filter(n => n >= 1000 && n <= 100000000);
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

async function crawlCategory(context, cat, maxLoads = 10, perCategoryLimit = 600) {
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

  // Navigate
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      break;
    } catch (e) {
      if (i === 2) throw e;
      await page.waitForTimeout(1500 * (i + 1));
    }
  }

  // Helper: collect items currently rendered
  async function collect() {
    const base = page.url();
    const items = await page.$$eval('a[href*="goods"], a[href*="goodsView"], li, div', (nodes) => {
      const results = [];
      const hangul = /[\uAC00-\uD7A3]/;
      for (const node of nodes) {
        const a = node.closest('a[href*="goodsView?itemId="]') || node.querySelector('a[href*="goodsView?itemId="]');
        if (!a) continue;
        const href = a.getAttribute('href');
        if (!/goodsView\?itemId=/.test(href || '')) continue; // exclude category/event links
        // Title: prefer explicit name, then img alt
        let title = '';
        const tEl = node.querySelector('.fb__goods__name, .fb__goods__tit, .goods_name, .name, .tit');
        const titleCand = (tEl?.textContent || a.textContent || '').trim();
        if (hangul.test(titleCand)) title = titleCand;
        if (!title) {
          const imgAlt = (node.querySelector('img[alt]') || a.querySelector('img[alt]'))?.getAttribute('alt') || '';
          if (hangul.test(imgAlt)) title = imgAlt.trim();
        }
        if (title) {
          title = title
            .replace(/[\t\n\r]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/\s*\d{1,3}(?:[\.,]\d{3})+\s*원?\s*$/u, '')
            .replace(/\s*\d+%\s*$/u, '')
            .trim();
        }
        // Prices: prefer nodes containing '원'
        let price = null;
        const priceNodes = Array.from(node.querySelectorAll('*')).filter(el => /원/.test((el.textContent || '')));
        const candidates = [];
        for (const el of priceNodes) {
          const txt = (el.textContent || '').replace(/[\t\n\r]+/g, ' ');
          const nums = txt.match(/\d{1,3}(?:[\.,]\d{3})+|\d{4,9}/g);
          if (!nums) continue;
          for (const n of nums) {
            const v = parseInt(n.replace(/[^0-9]/g, ''), 10);
            if (v >= 10000 && v <= 100000000) candidates.push(v);
          }
        }
        if (candidates.length) price = Math.min(...candidates);
        // Image src: prefer data-src/item path
        const img = node.querySelector('img[data-src], img[data-original], img[src]') || a.querySelector('img[data-src], img[data-original], img[src]');
        let imgSrc = img?.getAttribute('data-src') || img?.getAttribute('data-original') || img?.getAttribute('src') || '';
        if (imgSrc && !/\/item\//.test(imgSrc) && img?.getAttribute('src')) {
          const altSrc = img.getAttribute('src');
          if (/\/item\//.test(altSrc)) imgSrc = altSrc;
        }
        results.push({ href, title, price, imgSrc });
      }
      return results;
    });
    for (const it of items) {
      if (!it.href) continue;
      const detail = absoluteUrl(it.href, base);
      if (!detail || seen.has(detail)) continue;
      seen.add(detail);
      const image = it.imgSrc ? absoluteUrl(it.imgSrc, base) : null;
      out.push({
        title: it.title || null,
        price: it.price ?? null,
        productUrl: detail,
        imageUrl: image,
      });
      if (out.length >= perCategoryLimit) break;
    }
  }

  // Initial collect
  await page.waitForTimeout(800);
  await collect();

  // Click Load More up to maxLoads (or until no button/ no growth)
  for (let load = 1; load <= maxLoads && out.length < perCategoryLimit; load++) {
    const before = out.length;
    const btn = page.locator('button:has-text("더보기"), .fb__more button');
    const exists = await btn.count();
    if (!exists) break;
    const isDisabled = await btn.first().isDisabled().catch(() => false);
    if (isDisabled) break;
    await btn.first().click({ trial: false }).catch(() => {});
    await page.waitForTimeout(1000 + Math.floor(Math.random() * 600));
    await collect();
    const added = out.length - before;
    if (added <= 0) break;
  }

  await page.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1366, height: 768 },
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
  });

  const maxLoads = parseInt(process.env.CASAMIA_MAX_LOADS || '10', 10);
  const perCategoryLimit = parseInt(process.env.CASAMIA_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxLoads, perCategoryLimit);
    const outPath = path.join(outDir, `casamia-${cat.key}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved per-category Casamia files under data/');
})();


