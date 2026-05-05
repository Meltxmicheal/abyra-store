import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function test() {
  console.log('Testing connectivity...');
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('categories').select('name').limit(1);
    if (error) throw error;
    console.log('Connected! Categories found:', data.length);
    console.log('Time taken:', Date.now() - start, 'ms');
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

test();
