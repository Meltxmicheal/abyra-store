import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '' // Using service role to check if we can reach auth
);

async function test() {
  console.log('Testing signInWithPassword connectivity...');
  const start = Date.now();
  try {
    // We try a fake login to see if it responds quickly
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });
    console.log('Auth responded! Error expected:', error?.message);
    console.log('Time taken:', Date.now() - start, 'ms');
  } catch (err) {
    console.error('Auth call failed:', err);
  }
}

test();
