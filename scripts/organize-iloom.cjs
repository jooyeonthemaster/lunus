/*
  Organize ILOOM category files:
  - Move data/iloom-*.json to data/일룸/
  - Create data/일룸/products.json with merged array and source metadata
*/

const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');
const brandDir = path.join(dataDir, '일룸');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function isIloomCategoryFile(name) {
	return /^iloom-[^/]+\.json$/.test(name) && !['iloom-products-xhr.json', 'iloom-products-multi.json'].includes(name);
}

(function main(){
	ensureDir(brandDir);
	const entries = fs.readdirSync(dataDir).filter(isIloomCategoryFile);
	const merged = [];
	for (const file of entries) {
		const src = path.join(dataDir, file);
		const dest = path.join(brandDir, file);
		const arr = JSON.parse(fs.readFileSync(src, 'utf8'));
		for (const it of arr) merged.push({ ...it, source: 'iloom' });
		// move file
		fs.renameSync(src, dest);
		console.log(`moved: ${file} -> 일룸/`);
	}
	// write merged
	const out = path.join(brandDir, 'products.json');
	fs.writeFileSync(out, JSON.stringify(merged, null, 2), 'utf8');
	console.log(`merged -> ${out} (count=${merged.length})`);
})();

