
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const email = 'caozhilei@gmail.com';
  const password = 'Cao13352896595';

  console.log(`Creating admin user: ${email}`);

  // 1. Check if user exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const existingUser = users.find(u => u.email === email);
  let userId;

  if (existingUser) {
    console.log('User already exists, updating password and metadata...');
    userId = existingUser.id;
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        password: password,
        app_metadata: { role: 'admin' },
        user_metadata: { full_name: 'Admin User' },
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('Error updating user:', updateError);
      return;
    }
  } else {
    console.log('Creating new user...');
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
      user_metadata: { full_name: 'Admin User' }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return;
    }
    
    if (!user) {
        console.error('User creation returned no data');
        return;
    }
    userId = user.id;
  }

  console.log('User created/updated successfully!');
  console.log(`User ID: ${userId}`);
  console.log('Role set to: admin');
}

createAdminUser();
