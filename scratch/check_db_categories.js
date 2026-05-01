
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, name_ar, name_normalized');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Categories in DB:');
  console.table(data);
}

checkCategories();
