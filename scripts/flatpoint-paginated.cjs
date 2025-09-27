/* Flatpoint (flatpoint.co.kr) Cafe24 product list crawler
   - Categories via URLs provided
   - Paginate with &page=
   - Extract: title, discounted price (or coupon/normal), productUrl, imageUrl
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
if (process.env.FLATPOINT_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.FLATPOINT_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch {}
}
if (categories.length === 0) {
  categories = [
    { key: '테이블', url: 'https://flatpoint.co.kr/category/%ED%85%8C%EC%9D%B4%EB%B8%94/49/' },
    { key: '체어', url: 'https://flatpoint.co.kr/category/%EC%B2%B4%EC%96%B4/248/' },
    { key: '패브릭소파', url: 'https://flatpoint.co.kr/category/%ED%8C%A8%EB%B8%8C%EB%A6%AD%EC%86%8C%ED%8C%8C/134/' },
    { key: '가죽소파', url: 'https://flatpoint.co.kr/category/%EA%B0%80%EC%A3%BD%EC%86%8C%ED%8C%8C/351/' },
    { key: '침대&매트리스', url: 'https://flatpoint.co.kr/category/%EC%B9%A8%EB%8C%80%EB%A7%A4%ED%8A%B8%EB%A6%AC%EC%8A%A4/354/' },
    { key: 'DOB', url: 'https://flatpoint.co.kr/category/dob/318/' },
    { key: '사이드테이블', url: 'https://flatpoint.co.kr/category/%EC%82%AC%EC%9D%B4%EB%93%9C%ED%85%8C%EC%9D%B4%EB%B8%94/262/' },
    { key: '선반', url: 'https://flatpoint.co.kr/category/%EC%84%A0%EB%B0%98/51/' },
    { key: '조명&홈데코', url: 'https://flatpoint.co.kr/category/%EC%A1%B0%EB%AA%85%ED%99%88%EB%8D%B0%EC%BD%94/284/' },
    { key: '키즈', url: 'https://flatpoint.co.kr/category/%ED%82%A4%EC%A6%88/169/' },
  ];
}

async function collectList(page) {
  const base = page.url();
  const items = await page.$$eval('ul.prdList li, li[class*="item"]', (cards) => {
    const results = [];
    for (const card of cards) {
      // anchor: ensure it's a product detail, not list/board links
      let a = card.querySelector('strong.name a, a[href*="/product/"]');
      if (!a) continue;
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href.includes('/list.html') || href.includes('/board/')) continue;
      // title
      let title = '';
      const anchorName = card.querySelector('strong.name a');
      if (anchorName) {
        const directSpans = Array.from(anchorName.querySelectorAll(':scope > span'));
        const mainSpan = directSpans.find(sp => !sp.classList.contains('title') && (sp.textContent || '').trim().length > 0);
        if (mainSpan) {
          title = (mainSpan.textContent || '').trim();
        } else {
          title = (anchorName.textContent || '').trim();
        }
      }
      if (!title) {
        const tEl = card.querySelector('p.name a, p.name span, .name a, .name span, .name, .description, h3, strong');
        if (tEl) title = (tEl.textContent || '').trim().replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ');
      }
      // cleanup any labels accidentally included
      if (title) {
        title = title
          .replace(/^상품명\s*:?\s*/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
      }
      // price prefer sale/discount then normal
      let priceText = '';
      const saleSel = 'li.sale-price, li[class*="sale-price"], .plp-sale, .price .sale, .spec .sale, .xans-product .price .sale, .price_area .sale';
      const normalSel = 'li.price, .prd-info-first, .price .pay, .spec .pay, .price strong, .price em, .price';
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
      if (!title) continue; // skip unknown non-product rows
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

async function crawlCategory(context, cat, maxPages = 5, perCategoryLimit = 600) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
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
    const list = await collectList(page);
    let added = 0;
    for (const it of list) {
      if (!it.productUrl || seen.has(it.productUrl)) continue;
      seen.add(it.productUrl);
      out.push({
        title: it.title || null,
        price: it.price ?? null,
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

  const maxPages = parseInt(process.env.FLATPOINT_MAX_PAGES || '5', 10);
  const perCategoryLimit = parseInt(process.env.FLATPOINT_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxPages, perCategoryLimit);
    const safeKey = sanitize(String(cat.key));
    const outPath = path.join(outDir, `flatpoint-${safeKey}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved Flatpoint files under data/');
})();


