require('dotenv').config({path:'.env.local'});
const {createClient} = require('@supabase/supabase-js');
const axios = require('axios');

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testCDN() {
  // Get one URL from each CDN
  const { data: products } = await s
    .from('products')
    .select('image_url')
    .not('image_url', 'is', null)
    .limit(100);

  const cdnUrls = {};
  products.forEach(p => {
    const hostname = new URL(p.image_url).hostname;
    if (!cdnUrls[hostname]) {
      cdnUrls[hostname] = p.image_url;
    }
  });

  console.log('Testing CDN accessibility...\n');

  for (const [hostname, url] of Object.entries(cdnUrls)) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000,
        maxRedirects: 5
      });

      const size = response.data.length;
      const isValid = size > 5000; // 5KB 이상이면 유효한 이미지로 간주

      console.log(`${isValid ? '✅' : '❌'} ${hostname}`);
      console.log(`   Size: ${(size / 1024).toFixed(1)}KB`);
      console.log(`   URL: ${url.substring(0, 80)}...`);
      console.log('');
    } catch (error) {
      console.log(`❌ ${hostname}`);
      console.log(`   Error: ${error.message}`);
      console.log(`   URL: ${url.substring(0, 80)}...`);
      console.log('');
    }
  }
}

testCDN().then(() => process.exit(0));
