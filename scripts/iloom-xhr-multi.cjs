/*
  Multi-category XHR-first crawler for ILOOM.
  - Categories provided via env or hardcoded defaults
  - Up to 100 items per category (deduped by productUrl)
  - Saves to data/iloom-products-multi.json with {categoryKey, items: [...]}
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DEFAULT_CATEGORIES = [
  { key: '옷장', url: 'https://www.iloom.com/product/list.do?categoryNo=844' },
  { key: '거실', url: 'https://www.iloom.com/product/list.do?categoryNo=3' },
  { key: '주방', url: 'https://www.iloom.com/product/list.do?categoryNo=4' },
  { key: '키즈룸', url: 'https://www.iloom.com/product/list.do?categoryNo=5' },
  { key: '학생방', url: 'https://www.iloom.com/product/list.do?categoryNo=6' },
  { key: '서재', url: 'https://www.iloom.com/product/list.do?categoryNo=7' },
  { key: '조명', url: 'https://www.iloom.com/product/list.do?categoryNo=1055' },
];

const MAX_PAGES = Number(process.env.ILOOM_MAX_PAGES || 10); // 충분히 큰 값
const PER_CATEGORY_LIMIT = Number(process.env.ILOOM_PER_CATEGORY || 100);

function toAbs(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }
function parsePrice(text) {
	if (!text) return null;
	const cleaned = String(text).replace(/[^0-9]/g, '');
	return cleaned ? parseInt(cleaned, 10) : null;
}

function mapFromJsonPayload(payload, baseUrl) {
	const items = [];
	const list = Array.isArray(payload?.items) ? payload.items
		: Array.isArray(payload?.data?.items) ? payload.data.items
		: Array.isArray(payload?.data) ? payload.data
		: Array.isArray(payload?.list) ? payload.list
		: Array.isArray(payload?.contents) ? payload.contents
		: [];
	for (const it of list) {
		const title = (it.name || it.title || '').toString().trim();
		const price = parsePrice(it.price ?? it.salePrice ?? it.finalPrice ?? it.minPrice ?? it.lowPrice);
		const productUrl = toAbs(it.url || it.link || it.productUrl || it.pcUrl, baseUrl || 'https://www.iloom.com');
		const imageUrl = toAbs(it.image || it.thumbnail || it.imageUrl || it.thumbUrl, baseUrl || 'https://www.iloom.com');
		if (!title || !productUrl) continue;
		items.push({ title, price: price ?? 0, productUrl, imageUrl: imageUrl || null });
	}
	return items;
}

async function extractFromDom(page, baseUrl) {
	try {
		await page.waitForSelector('.proUl li[data-product-cd], a[href*="product/"]', { timeout: 12000 });
	} catch {}
	const liResults = await page.$$eval('.proUl li[data-product-cd]', (nodes) => nodes.map(li => {
		const code = li.getAttribute('data-product-cd');
		const titleSeries = li.querySelector('.series_name')?.textContent?.trim() || '';
		const titleName = li.querySelector('.product_name')?.textContent?.trim() || '';
		const title = [titleSeries, titleName].filter(Boolean).join(' ');
		const priceText = li.querySelector('.price')?.textContent || li.textContent || '';
		const img = li.querySelector('img');
		const imgSrc = img?.getAttribute('src') || img?.getAttribute('data-src') || '';
		return { code, title, priceText, imgSrc };
	}));
	let out = [];
	const seen = new Set();
	for (const it of liResults) {
		const productUrl = it.code ? `${new URL('/product/detail.do?productCd=' + encodeURIComponent(it.code), baseUrl)}` : null;
		if (!productUrl || seen.has(productUrl)) continue; seen.add(productUrl);
		const imageUrl = it.imgSrc ? `${new URL(it.imgSrc, baseUrl)}` : null;
		const price = parsePrice(it.priceText);
		if (!it.title && !price) continue;
		out.push({ title: it.title || null, price: price ?? 0, productUrl, imageUrl });
	}
	if (out.length === 0) {
		const anchorResults = await page.$$eval('a', (nodes) => nodes
			.filter(a => /product\/(detail|view|\w+\.do)/.test(a.getAttribute('href') || ''))
			.map(a => {
				const href = a.getAttribute('href');
				const img = a.querySelector('img');
				const title = (a.textContent || '').trim() || (img?.getAttribute('alt') || '');
				const priceText = a.closest('li,div,article,section')?.textContent || '';
				const imgSrc = img?.getAttribute('src') || img?.getAttribute('data-src') || '';
				return { href, imgSrc, title, priceText };
			})
		);
		for (const it of anchorResults) {
			const productUrl = toAbs(it.href, baseUrl);
			if (!productUrl || seen.has(productUrl)) continue; seen.add(productUrl);
			const imageUrl = toAbs(it.imgSrc, baseUrl);
			const price = parsePrice(it.priceText);
			if (!it.title && !price) continue;
			out.push({ title: it.title || null, price: price ?? 0, productUrl, imageUrl: imageUrl || null });
		}
	}
	return out;
}

async function crawlCategory(context, category) {
	const base = new URL(category.url).origin;
	const page = await context.newPage();
	await page.route('**/*', (route) => {
		const type = route.request().resourceType();
		if (type === 'image' || type === 'font' || type === 'media') return route.abort();
		return route.continue();
	});
	let captured = [];
	page.on('response', async (res) => {
		const ct = res.headers()['content-type'] || '';
		if (!ct.includes('application/json')) return;
		try {
			const json = await res.json();
			const items = mapFromJsonPayload(json, base);
			if (items.length) captured.push(...items);
		} catch {}
	});
	async function visit(url) {
		try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
		catch { try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch {} }
		await page.waitForTimeout(900 + Math.floor(Math.random() * 500));
		const domItems = await extractFromDom(page, url);
		if (domItems.length) captured.push(...domItems);
	}
	await visit(category.url);
	for (let p = 2; p <= MAX_PAGES && captured.length < PER_CATEGORY_LIMIT; p++) {
		await visit(category.url + (category.url.includes('?') ? '&' : '?') + `pageNo=${p}`);
		if (captured.length >= PER_CATEGORY_LIMIT) break;
		await visit(category.url + (category.url.includes('?') ? '&' : '?') + `page=${p}`);
	}
	await page.close();
	// Dedup + limit
	const dedup = new Map();
	for (const it of captured) {
		if (dedup.size >= PER_CATEGORY_LIMIT) break;
		dedup.set(it.productUrl, it);
	}
	return Array.from(dedup.values());
}

(async () => {
	const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] });
	const context = await browser.newContext({
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
		locale: 'ko-KR',
		timezoneId: 'Asia/Seoul',
		viewport: { width: 1366, height: 900 },
		extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
		ignoreHTTPSErrors: true,
	});
	await context.addInitScript(() => {
		Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
		Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
		Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
		window.chrome = window.chrome || { runtime: {} };
	});

	const categories = DEFAULT_CATEGORIES;
	const outDir = path.join(process.cwd(), 'data');
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

	for (const cat of categories) {
		console.log(`[cat] ${cat.key} start`);
		const items = await crawlCategory(context, cat);
		const kebab = cat.key.replace(/\s+/g, '-');
		const file = path.join(outDir, `iloom-${kebab}.json`);
		fs.writeFileSync(file, JSON.stringify(items, null, 2), 'utf8');
		console.log(`[cat] ${cat.key} done: ${items.length} -> ${file}`);
	}

	await context.close();
	await browser.close();

	console.log('Saved per-category files under data/');
})().catch((err) => { console.error(err); process.exit(1); });
