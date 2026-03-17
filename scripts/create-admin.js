
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function createAdminUser() {
  const email = getArgValue('--email') || process.env.ADMIN_EMAIL;
  const password = getArgValue('--password') || process.env.ADMIN_PASSWORD;
  const role = getArgValue('--role') || process.env.ADMIN_ROLE || 'admin';

  if (!email) {
    console.error('Missing --email (or ADMIN_EMAIL)');
    process.exit(1);
  }

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
    console.log('User already exists, updating metadata...');
    userId = existingUser.id;
    
    const updatePayload = {
      app_metadata: { ...(existingUser.app_metadata || {}), role },
      user_metadata: { ...(existingUser.user_metadata || {}), full_name: 'Admin User' },
      email_confirm: true
    };

    if (password) {
      updatePayload.password = password;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, updatePayload);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return;
    }
  } else {
    console.log('Creating new user...');
    if (!password) {
      console.error('User does not exist. Provide --password (or ADMIN_PASSWORD) to create it.');
      process.exit(1);
    }

    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
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
  console.log(`Role set to: ${role}`);
}

createAdminUser();
