
-- Copy password hash from temp user to admin user
UPDATE auth.users
SET encrypted_password = (SELECT encrypted_password FROM auth.users WHERE email = 'temp@example.com')
WHERE email = 'caozhilei@gmail.com';

-- Delete temp user
DELETE FROM auth.users WHERE email = 'temp@example.com';
