const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function generatePassword() {
  const raw = crypto.randomBytes(24).toString('base64url');
  return `HC-${raw}`;
}

async function main() {
  const email = getArgValue('--email') || process.env.ADMIN_EMAIL;
  if (!email) {
    console.error('Missing --email (or ADMIN_EMAIL)');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const user = users.find((u) => u.email === email);
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const password = generatePassword();
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    app_metadata: { ...(user.app_metadata || {}), role: 'super_admin' },
  });

  if (updateError) throw updateError;

  console.log('Temporary password set successfully.');
  console.log(`Email: ${email}`);
  console.log(`Temporary Password: ${password}`);
}

main().catch((err) => {
  console.error('Failed to reset password:', err);
  process.exitCode = 1;
});

