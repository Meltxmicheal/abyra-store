import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function test() {
  console.log('Checking cart table...');
  try {
    const { data, error } = await supabase.from('cart').select('*').limit(1);
    if (error) throw error;
    console.log('Cart table accessible!');
  } catch (err: any) {
    console.error('Cart table error:', err.message);
  }
}

test();
