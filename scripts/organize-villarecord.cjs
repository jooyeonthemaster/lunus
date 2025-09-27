/*
  Organize VillaRecord category files:
  - Move data/villarecord-*.json to data/빌라레코드/
  - Create data/빌라레코드/products.json with merged array
*/

const fs = require('fs');
const path = require('path');

const brandName = '빌라레코드';
const sourceDir = path.join(process.cwd(), 'data');
const targetDir = path.join(sourceDir, brandName);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let allProducts = [];
const files = fs.readdirSync(sourceDir);

for (const file of files) {
  if (file.startsWith('villarecord-') && file.endsWith('.json')) {
    const filePath = path.join(sourceDir, file);
    try {
      const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(products)) {
        allProducts.push(...products);
      }
    } catch (e) {
      console.error(`Skip invalid JSON: ${file} - ${e.message}`);
    }

    const newPath = path.join(targetDir, file);
    fs.renameSync(filePath, newPath);
    console.log(`moved: ${file} -> ${brandName}/`);
  }
}

const mergedFilePath = path.join(targetDir, 'products.json');
fs.writeFileSync(mergedFilePath, JSON.stringify(allProducts, null, 2), 'utf8');
console.log(`merged -> ${mergedFilePath} (count=${allProducts.length})`);