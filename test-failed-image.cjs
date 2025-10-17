const Replicate = require('replicate');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });
const {createClient} = require('@supabase/supabase-js');

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  // Test with a FAILED image URL
  const imageUrl = 'https://malltr0083.cdn-nhncommerce.com/data/goods/24/11/46/1000006608/1000006608_detail_045.jpg';

  console.log('Testing FAILED image URL:', imageUrl);
  console.log('');

  try {
    // 1. Download image
    console.log('📥 Downloading image...');
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const buffer = Buffer.from(response.data);
    console.log(`✅ Downloaded: ${(buffer.length / 1024).toFixed(1)}KB`);

    // 2. Upload to Supabase Storage
    console.log('📤 Uploading to Supabase Storage...');
    const tempFileName = `temp/test-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(tempFileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return;
    }

    // 3. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(tempFileName);

    console.log('✅ Uploaded:', publicUrl);
    console.log('');

    // 4. Test with Replicate
    console.log('🔄 Calling Replicate API...');
    const output = await replicate.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: {
          inputs: publicUrl
        }
      }
    );

    console.log('✅ Success!');
    console.log('Response type:', typeof output);
    console.log('Is array:', Array.isArray(output));
    console.log('Length:', output?.length);

    if (Array.isArray(output) && output.length > 0) {
      console.log('First result:', output[0]);
      if (output[0].embedding) {
        console.log('Embedding dimensions:', output[0].embedding.length);
        console.log('First 5 values:', output[0].embedding.slice(0, 5));
      }
    }

    // Cleanup
    await supabase.storage.from('product-images').remove([tempFileName]);
    console.log('🗑️ Cleaned up temp file');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
