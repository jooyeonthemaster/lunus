const fs = require('fs');
const path = require('path');

const brandName = '한샘';
const sourceDir = path.join(process.cwd(), 'data');
const targetDir = path.join(sourceDir, brandName);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let allProducts = [];
const files = fs.readdirSync(sourceDir);

for (const file of files) {
  if (file.startsWith('hanssem-') && file.endsWith('.json')) {
    const filePath = path.join(sourceDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    try {
      const products = JSON.parse(fileContent);
      if (Array.isArray(products)) allProducts.push(...products);
    } catch (e) {
      console.error(`skip invalid JSON: ${file} - ${e.message}`);
    }

    const newPath = path.join(targetDir, file);
    fs.renameSync(filePath, newPath);
    console.log(`moved: ${file} -> ${brandName}/`);
  }
}

const mergedFilePath = path.join(targetDir, 'products.json');
fs.writeFileSync(mergedFilePath, JSON.stringify(allProducts, null, 2), 'utf8');
console.log(`merged -> ${mergedFilePath} (count=${allProducts.length})`);



