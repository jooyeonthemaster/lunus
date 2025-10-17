require('dotenv').config({path:'.env.local'});
const {createClient} = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('products').select('storage_image_url').limit(1).then(r => {
  console.log('Column exists:', !r.error);
  if (r.error) console.log('Error:', r.error.message);
  process.exit(0);
});
