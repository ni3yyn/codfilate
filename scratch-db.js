const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://akqcfnqkdsrkzhnongbi.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; 
// Wait, I can just grep the EXPO_PUBLIC_SUPABASE_ANON_KEY from appConfig.js or .env
