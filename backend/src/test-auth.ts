import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function test() {
  console.log('Testing Auth connectivity...');
  const start = Date.now();
  try {
    // This will hit the Auth endpoint
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    console.log('Connected! Users found:', data.users.length);
    console.log('Time taken:', Date.now() - start, 'ms');
  } catch (err) {
    console.error('Auth connection failed:', err);
  }
}

test();
