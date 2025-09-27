/*
  XHR-first Playwright crawler for ILOOM product list pages.
  - Opens the category page
  - Intercepts JSON responses (XHR/fetch)
  - Extracts product fields: title, price, productUrl, imageUrl
  - Falls back to DOM parsing per page if needed
  - Saves results to data/iloom-products-xhr.json
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const CATEGORY_URL = process.env.ILOOM_CATEGORY_URL || 'https://www.iloom.com/product/list.do?categoryNo=1';
const MAX_PAGES = Number(process.env.ILOOM_MAX_PAGES || 5);

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
	// Primary: li[data-product-cd]
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
	// Fallback: legacy anchor-based
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
	const page = await context.newPage();

	// Block heavy resources
	await page.route('**/*', (route) => {
		const type = route.request().resourceType();
		if (type === 'image' || type === 'font' || type === 'media') return route.abort();
		return route.continue();
	});

	const all = [];
	const base = new URL(CATEGORY_URL).origin;

	// Broad JSON interception + verbose logging once
	let loggedOnce = false;
	page.on('response', async (res) => {
		const ct = res.headers()['content-type'] || '';
		if (!ct.includes('application/json')) return;
		try {
			const json = await res.json();
			const items = mapFromJsonPayload(json, base);
			if (items.length) all.push(...items);
			else if (!loggedOnce) {
				loggedOnce = true;
				console.log('[JSON no-map]', res.url());
			}
		} catch {}
	});

	async function visitAndCollect(url) {
		try {
			await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
		} catch {
			try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch {}
		}
		await page.waitForTimeout(1100 + Math.floor(Math.random() * 600));
		// Per-page DOM fallback merge
		const domItems = await extractFromDom(page, url);
		if (domItems.length) all.push(...domItems);
	}

	// Page 1
	await visitAndCollect(CATEGORY_URL);

	// Next pages: try pageNo then page
	for (let p = 2; p <= MAX_PAGES; p++) {
		const withPageNo = CATEGORY_URL + (CATEGORY_URL.includes('?') ? '&' : '?') + `pageNo=${p}`;
		await visitAndCollect(withPageNo);
		const withPage = CATEGORY_URL + (CATEGORY_URL.includes('?') ? '&' : '?') + `page=${p}`;
		await visitAndCollect(withPage);
	}

	await context.close();
	await browser.close();

	const dedup = new Map();
	for (const it of all) dedup.set(it.productUrl, it);
	const arr = Array.from(dedup.values());

	const outDir = path.join(process.cwd(), 'data');
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
	const outPath = path.join(outDir, 'iloom-products-xhr.json');
	fs.writeFileSync(outPath, JSON.stringify(arr, null, 2), 'utf8');
	console.log(`Saved ${arr.length} items -> ${outPath}`);
})().catch((err) => { console.error(err); process.exit(1); });
