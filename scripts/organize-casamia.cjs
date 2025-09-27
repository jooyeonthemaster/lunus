const fs = require('fs');
const path = require('path');

const brandName = '까사미아';
const sourceDir = path.join(process.cwd(), 'data');
const targetDir = path.join(sourceDir, brandName);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let allProducts = [];
for (const file of fs.readdirSync(sourceDir)) {
  if (file.startsWith('casamia-') && file.endsWith('.json')) {
    const filePath = path.join(sourceDir, file);
    try {
      const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(products)) allProducts.push(...products);
    } catch (e) {
      console.error(`Skip invalid JSON: ${file}`);
    }
    fs.renameSync(filePath, path.join(targetDir, file));
    console.log(`moved: ${file} -> ${brandName}/`);
  }
}

const mergedFilePath = path.join(targetDir, 'products.json');
fs.writeFileSync(mergedFilePath, JSON.stringify(allProducts, null, 2), 'utf8');
console.log(`merged -> ${mergedFilePath} (count=${allProducts.length})`);



