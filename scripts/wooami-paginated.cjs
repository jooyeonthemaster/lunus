/* Wooami Mall (wooamimall.com) product list crawler
   - Categories via ?cate_no=
   - Paginate with &page=
   - Extract: title, discounted price (or coupon/normal price), productUrl, imageUrl
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

function isGoodTitle(text) {
  if (!text) return false;
  const t = String(text).trim();
  if (t.length < 2) return false;
  if (/^\d+$/.test(t)) return false;
  if (t.includes('좋아요 등록')) return false;
  return true;
}

let categories = [];
if (process.env.WOOAMI_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.WOOAMI_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) { console.error('Failed to parse WOOAMI_CATEGORIES:', e.message); }
}
if (categories.length === 0) {
  categories = [
    { key: '거실소파', url: 'https://wooamimall.com/product/list.html?cate_no=57' },
    { key: '침대', url: 'https://wooamimall.com/product/list.html?cate_no=26' },
    { key: '매트리스', url: 'https://wooamimall.com/product/list.html?cate_no=76' },
    { key: '장롱', url: 'https://wooamimall.com/product/list.html?cate_no=50' },
    { key: '거실장', url: 'https://wooamimall.com/product/list.html?cate_no=43' },
    { key: '화장대', url: 'https://wooamimall.com/product/list.html?cate_no=47' },
    { key: '주방', url: 'https://wooamimall.com/product/list.html?cate_no=49' },
    { key: '서랍장', url: 'https://wooamimall.com/product/list.html?cate_no=51' },
    { key: '홈오피스', url: 'https://wooamimall.com/product/list.html?cate_no=78' },
  ];
}

async function collectList(page, perCategoryLimit) {
  const base = page.url();
  const items = await page.$$eval('ul.prdList li, li[class*="item"]', (cards) => {
    const results = [];
    for (const card of cards) {
      const a = card.querySelector('a[href*="product/detail.html"]');
      if (!a) continue;
      const href = a.getAttribute('href') || '';
      // title
      let title = '';
      const tEl = card.querySelector('p.name a, p.name span, .name a, .name span, .name, .description, h3, strong');
      if (tEl) title = (tEl.textContent || '').trim().replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ');
      // price prefer sale/discount then normal
      let priceText = '';
      const saleSel = '.price .sale, .spec .sale, .xans-product .price .sale, .price_area .sale';
      const normalSel = '.price .pay, .spec .pay, .price strong, .price em, .price';
      const sale = card.querySelector(saleSel);
      if (sale) priceText = (sale.textContent || '').trim(); else {
        const norm = card.querySelector(normalSel);
        if (norm) priceText = (norm.textContent || '').trim();
      }
      // image
      let img = '';
      const imgs = Array.from(card.querySelectorAll('img[ec-data-src], img[data-src], img[data-original], img[src]'));
      for (const im of imgs) {
        const s = im.getAttribute('ec-data-src') || im.getAttribute('data-src') || im.getAttribute('data-original') || im.getAttribute('src') || '';
        if (!s) continue;
        if (s.includes('ico_likeit') || s.includes('/skin/') || s.includes('icon_')) continue;
        if (s.includes('/product') || s.includes('/web/product')) { img = s; break; }
        if (!img) img = s;
      }
      const goodTitle = (t) => !!t && t.replace(/\s+/g, '').length > 1 && !/^\d+$/.test(t.trim()) && !String(t).includes('좋아요 등록');
      if (!goodTitle(title)) {
        const altImg = imgs.find(im => (im.getAttribute('alt') || '').trim().length > 1);
        if (altImg) title = (altImg.getAttribute('alt') || '').trim();
      }
      if (!goodTitle(title)) {
        const aTitle = a.getAttribute('title') || '';
        if (aTitle) title = aTitle.trim();
      }
      // Do NOT drop here; allow detail page fallback to fix title later
      results.push({ href, title, priceText, img });
    }
    return results;
  });
  return items.map(it => ({
    productUrl: absoluteUrl(it.href, base),
    title: it.title,
    price: parsePrice(it.priceText),
    imageUrl: it.img ? absoluteUrl(it.img, base) : null,
  }));
}

async function fetchDetailMeta(context, url) {
  let dp;
  try {
    dp = await context.newPage();
    dp.setDefaultNavigationTimeout(60000);
    await dp.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dp.waitForTimeout(300);
    const { priceText, title } = await dp.evaluate(() => {
      const digits = (s) => (s || '').replace(/[^0-9]/g, '');
      const getTitle = () => {
        const tEl = document.querySelector('.infoArea .name, .xans-product-detail .name, h1, h2, h3, meta[property="og:title"]');
        if (tEl) {
          if (tEl.tagName === 'META') return tEl.getAttribute('content') || '';
          return (tEl.textContent || '').trim();
        }
        return (document.title || '').trim();
      };
      // Prefer explicit sale price
      const sale = document.querySelector('#span_product_price_sale, .infoArea .price .sale, .sale_price, .price .sale');
      if (sale) {
        const t = digits(sale.textContent || '');
        if (t) return { priceText: t, title: getTitle() };
      }
      // Coupon-applied price
      const coupon = document.querySelector('#span_product_coupon_dc_price, .coupon_price');
      if (coupon) {
        const t = digits(coupon.textContent || '');
        if (t) return { priceText: t, title: getTitle() };
      }
      // Normal price
      const normal = document.querySelector('#span_product_price_text, .price .pay, .price_area .pay');
      if (normal) {
        const t = digits(normal.textContent || '');
        if (t) return { priceText: t, title: getTitle() };
      }
      return { priceText: '', title: getTitle() };
    });
    const n = parseInt(priceText, 10);
    const price = Number.isFinite(n) ? n : null;
    return { price, title };
  } catch {
    return { price: null, title: null };
  } finally { if (dp) await dp.close(); }
}

async function crawlCategory(context, cat, maxPages = 5, perCategoryLimit = 600) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  // light stealth
  await page.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
      window.chrome = { runtime: {} };
    } catch {}
  });
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'font' || type === 'media') return route.abort();
    return route.continue();
  });

  const out = [];
  const seen = new Set();
  for (let pg = 1; pg <= maxPages && out.length < perCategoryLimit; pg++) {
    const url = cat.url.includes('page=') ? cat.url : `${cat.url}${cat.url.includes('?') ? '&' : '?'}page=${pg}`;
    for (let i = 0; i < 3; i++) {
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); break; }
      catch (e) { if (i === 2) throw e; await page.waitForTimeout(1000 * (i + 1)); }
    }
    await page.waitForTimeout(600);
    const list = await collectList(page, perCategoryLimit);
    let added = 0;
    let detailFetched = 0;
    for (const it of list) {
      if (!it.productUrl || seen.has(it.productUrl)) continue;
      seen.add(it.productUrl);
      let price = it.price;
      let title = it.title;
      if ((!isGoodTitle(title) || price == null) && detailFetched < 24) {
        const meta = await fetchDetailMeta(context, it.productUrl);
        if (price == null) price = meta.price;
        if (!isGoodTitle(title) && meta.title) title = meta.title.trim();
        detailFetched++;
      }
      out.push({
        title: isGoodTitle(title) ? title : (it.title || null),
        price: price ?? null,
        productUrl: it.productUrl,
        imageUrl: it.imageUrl || null,
      });
      added++;
      if (out.length >= perCategoryLimit) break;
    }
    console.log(`[cat=${cat.key}] page=${pg} (+${added}) total=${out.length}`);
    if (added === 0 && pg > 1) break;
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

  const maxPages = parseInt(process.env.WOOAMI_MAX_PAGES || '5', 10);
  const perCategoryLimit = parseInt(process.env.WOOAMI_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxPages, perCategoryLimit);
    const safeKey = sanitize(String(cat.key));
    const outPath = path.join(outDir, `wooami-${safeKey}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved per-category Wooami files under data/');
})();


