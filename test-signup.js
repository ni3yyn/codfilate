require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUri = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUri, supabaseKey);

async function testSignup() {
  console.log('Testing signup...');
  const { data, error } = await supabase.auth.signUp({
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    options: {
      data: {
        role: 'merchant',
        full_name: 'Test Merchant'
      }
    }
  });

  if (error) {
    console.error('ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS:', JSON.stringify(data, null, 2));
  }
}

testSignup();
