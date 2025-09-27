const fs = require('fs');
const path = require('path');

const brandName = '리바트';
const sourceDir = path.join(process.cwd(), 'data');
const targetDir = path.join(sourceDir, brandName);

if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

let all = [];
for (const file of fs.readdirSync(sourceDir)) {
  if (file.startsWith('livart-') && file.endsWith('.json')) {
    const p = path.join(sourceDir, file);
    try {
      const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (Array.isArray(arr)) all.push(...arr);
    } catch {}
    fs.renameSync(p, path.join(targetDir, file));
    console.log(`moved: ${file} -> ${brandName}/`);
  }
}

const merged = path.join(targetDir, 'products.json');
fs.writeFileSync(merged, JSON.stringify(all, null, 2), 'utf8');
console.log(`merged -> ${merged} (count=${all.length})`);



