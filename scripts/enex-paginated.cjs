/* Enex (enex.co.kr) GodoMall product list crawler
   - Categories via cateCd= param
   - Paginate with &page=
   - Extract discounted price if present, else normal; title, productUrl, imageUrl
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');
const { chromium } = require('playwright');

function absoluteUrl(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }
function parsePrice(txt) {
  if (!txt) return null;
  const nums = (txt.match(/\d{1,3}(?:[.,]\d{3})+|\d{4,9}/g) || [])
    .map(x => parseInt(x.replace(/[^0-9]/g, ''), 10))
    .filter(n => n >= 1000 && n <= 100000000);
  return nums.length ? Math.min(...nums) : null;
}

let categories = [];
if (process.env.ENEX_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.ENEX_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch {}
}
if (categories.length === 0) {
  categories = [
    { key: '리모델링/주방', url: 'https://www.enex.co.kr/goods/goods_list.php?cateCd=127' },
    { key: '붙박이장', url: 'https://www.enex.co.kr/goods/goods_list.php?cateCd=122' },
    { key: '중문', url: 'https://www.enex.co.kr/goods/goods_list.php?cateCd=124' },
    { key: '옷장/드레스룸', url: 'https://www.enex.co.kr/goods/goods_list.php?cateCd=129' },
    { key: '침실가구', url: 'https://www.enex.co.kr/goods/goods_list.php?cateCd=128' },
    { key: '소파/거실', url: 'https://www.enex.co.kr/goods/goods_list.php?cateCd=003' },
    { key: '식탁/다이닝', url: 'https://www.enex.co.kr/goods/goods_list.php?cateCd=004' },
    { key: '서재/오피스', url: 'https://www.enex.co.kr/goods/goods_list.php?cateCd=005' },
  ];
}

async function collectList(page) {
  const base = page.url();
  const items = await page.$$eval('.item_info_cont', (cards) => {
    const results = [];
    for (const card of cards) {
      const a = card.querySelector('.item_tit_box a[href*="goods_view.php"], a[href*="goods_view.php"]');
      if (!a) continue;
      const href = a.getAttribute('href') || '';
      if (!href.includes('goods_view.php')) continue;
      // Title: strictly from .item_name
      let title = '';
      const nameEl = card.querySelector('.item_tit_box .item_name, .item_name');
      if (nameEl) title = (nameEl.textContent || '').trim();
      title = title
        .replace(/^상품명\s*:?\s*/g, '')
        .replace(/[\t\n\r]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (!title || /^\[.+\]$/.test(title)) continue;
      // Price: prefer discounted in list
      let priceText = '';
      const priceEl = card.querySelector('.item_money_box .item_price span');
      if (priceEl && priceEl.textContent) priceText = priceEl.textContent.trim();
      if (!priceText) {
        const sale = card.querySelector('.time_sale_cost, .sale_price, .price .sale, .price_area .sale');
        if (sale && sale.textContent) priceText = sale.textContent.trim();
      }
      if (!priceText) continue;
      // Image
      let imgSrc = '';
      const root = card.closest('li, .goods_item, .prd_item, .item, .product, .box') || card;
      const imgs = Array.from(root.querySelectorAll('img[ec-data-src], img[data-src], img[data-original], img[src]'));
      for (const im of imgs) {
        const s = im.getAttribute('ec-data-src') || im.getAttribute('data-src') || im.getAttribute('data-original') || im.getAttribute('src') || '';
        if (!s) continue;
        if (s.includes('/web/product') || s.includes('/data/goods') || s.includes('/goods/')) { imgSrc = s; break; }
        if (!imgSrc) imgSrc = s;
      }
      if (href && title && priceText && imgSrc) results.push({ href, title, priceText, imgSrc });
    }
    return results;
  });
  return items
    .filter(it => it.href && it.title && it.priceText && it.imgSrc)
    .map(it => ({
      productUrl: absoluteUrl(it.href, base),
      title: it.title,
      price: parsePrice(it.priceText),
      imageUrl: it.imgSrc ? absoluteUrl(it.imgSrc, base) : null,
    }));
}

async function fetchDetailPrice(context, url) {
  let dp;
  try {
    dp = await context.newPage();
    dp.setDefaultNavigationTimeout(60000);
    await dp.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dp.waitForTimeout(400);
    const priceText = await dp.evaluate(() => {
      const digits = (s) => (s || '').replace(/[^0-9]/g, '');
      const trySel = (sel) => {
        const el = document.querySelector(sel);
        if (el && el.textContent) return digits(el.textContent);
        return '';
      };
      // Prefer explicit discount/sale
      let t = '';
      t = trySel('.sale_price, .time_sale_cost, .price .sale, .price_area .sale, .goods_price .sale, .xans-product .price .sale, .goodsView .price .sale');
      if (t) return t;
      // Coupon or membership applied
      t = trySel('#span_product_coupon_dc_price, .coupon_price, .member_price');
      if (t) return t;
      // Normal price
      t = trySel('#goods_price, #span_product_price_text, .price .pay, .price_area .pay, .goods_price, .price');
      if (t) return t;
      // Fallback: scan text nodes containing '원'
      const cand = Array.from(document.querySelectorAll('body *'))
        .map(el => el.textContent || '')
        .filter(tx => /\d[\d,\.]*\s*원/.test(tx))
        .map(tx => tx.match(/\d[\d,\.]*/g) || [])
        .flat();
      if (cand.length) return digits(cand[0]);
      return '';
    });
    const n = parseInt(priceText, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  } finally { if (dp) await dp.close(); }
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
    let url;
    try {
      const u = new URL(cat.url);
      u.searchParams.set('page', String(pg));
      url = u.href;
    } catch {
      const base = cat.url.split('#')[0];
      url = base.includes('?') ? `${base}&page=${pg}` : `${base}?page=${pg}`;
    }
    for (let i = 0; i < 3; i++) {
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); break; }
      catch (e) { if (i === 2) throw e; await page.waitForTimeout(1000 * (i + 1)); }
    }
    try { await page.waitForSelector('a[href*="goods_view.php"]', { timeout: 7000 }); } catch {}
    // wait until enough products rendered or timeout
    try {
      await page.waitForFunction(() => document.querySelectorAll('a[href*="goods_view.php"]').length >= 12, { timeout: 4000 });
    } catch {}
    await page.waitForTimeout(500 + Math.floor(Math.random() * 500));
    const list = await collectList(page);
    let added = 0;
    let detailFetched = 0;
    for (const it of list) {
      if (!it.productUrl || seen.has(it.productUrl)) continue;
      seen.add(it.productUrl);
      let price = it.price ?? null;
      if (price == null && detailFetched < 30) {
        try {
          const dp = await fetchDetailPrice(context, it.productUrl);
          if (dp != null) price = dp;
        } catch {}
        detailFetched++;
      }
      out.push({ title: it.title || null, price, productUrl: it.productUrl, imageUrl: it.imageUrl || null });
      added++;
      if (out.length >= perCategoryLimit) break;
    }
    console.log(`[cat=${cat.key}] page=${pg} (+${added}) total=${out.length}`);
    // do not break early; attempt fixed 5 pages
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

  const maxPages = parseInt(process.env.ENEX_MAX_PAGES || '5', 10);
  const perCategoryLimit = parseInt(process.env.ENEX_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxPages, perCategoryLimit);
    const safeKey = sanitize(String(cat.key));
    const outPath = path.join(outDir, `enex-${safeKey}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved Enex files under data/');
})();


