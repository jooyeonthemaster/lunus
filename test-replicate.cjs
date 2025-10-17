const Replicate = require('replicate');
require('dotenv').config({ path: '.env.local' });

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function test() {
  // Use a successful product's image URL from the vectorization log
  const imageUrl = 'https://malltr0083.cdn-nhncommerce.com/data/goods/24/12/52/1000006823/1000006823_detail_043.jpg';

  console.log('Testing with URL:', imageUrl);
  console.log('');

  // Test 1: inputs as string
  console.log('\n=== Test 1: inputs as string ===');
  try {
    const output = await replicate.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: {
          inputs: imageUrl
        }
      }
    );
    console.log('✅ Success! Embedding dimensions:', output[0]?.embedding?.length);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  // Test 2: inputs with newline
  console.log('\n=== Test 2: inputs with explicit newline ===');
  try {
    const output = await replicate.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: {
          inputs: imageUrl + '\n'
        }
      }
    );
    console.log('✅ Success! Embedding dimensions:', output[0]?.embedding?.length);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  // Test 3: Different model API (predictions API)
  console.log('\n=== Test 3: Using predictions.create instead ===');
  try {
    const prediction = await replicate.predictions.create({
      version: "75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      input: {
        inputs: imageUrl
      }
    });
    console.log('Prediction created:', prediction.id);
    console.log('Status:', prediction.status);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

test();
