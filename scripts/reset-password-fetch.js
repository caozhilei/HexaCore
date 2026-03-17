
async function resetPassword() {
  const url = 'http://localhost:8000/auth/v1/user';
  const loginUrl = 'http://localhost:8000/auth/v1/token?grant_type=password';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzcyMjY1MjE4LCJleHAiOjIwODc2MjUyMTh9.yj_jtZtYtFf29HhTl8qiXQrjiq0LJEz2WTj6f6pyfMs';
  
  try {
    // 1. Login to get access token
    console.log('Logging in with old password...');
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'caozhilei@gmail.com',
        password: 'Cao13352896595'
      })
    });

    if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
    }

    const loginData = await loginRes.json();
    const accessToken = loginData.access_token;
    console.log('Login successful, got access token.');

    // 2. Update password
    console.log('Updating password to "password123"...');
    const updateRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: 'password123'
      })
    });

    if (!updateRes.ok) {
        throw new Error(`Update failed: ${updateRes.status} ${updateRes.statusText}`);
    }

    const updateData = await updateRes.json();
    console.log('Password updated successfully!');
    console.log('New User Data:', updateData.id);

  } catch (error) {
    console.error('Operation Failed:', error.message);
  }
}

resetPassword();
