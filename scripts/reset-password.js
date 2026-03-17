
const axios = require('axios');

async function resetPassword() {
  const url = 'http://localhost:8000/auth/v1/user';
  const loginUrl = 'http://localhost:8000/auth/v1/token?grant_type=password';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzcyMjY1MjE4LCJleHAiOjIwODc2MjUyMTh9.yj_jtZtYtFf29HhTl8qiXQrjiq0LJEz2WTj6f6pyfMs';
  
  try {
    // 1. Login to get access token
    console.log('Logging in with old password...');
    const loginResponse = await axios.post(loginUrl, {
      email: 'caozhilei@gmail.com',
      password: 'Cao13352896595'
    }, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const accessToken = loginResponse.data.access_token;
    console.log('Login successful, got access token.');

    // 2. Update password
    console.log('Updating password to "password123"...');
    const updateResponse = await axios.put(url, {
      password: 'password123'
    }, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Password updated successfully!');
    console.log('New User Data:', updateResponse.data.id);

  } catch (error) {
    console.error('Operation Failed:', error.response?.data || error.message);
  }
}

resetPassword();
