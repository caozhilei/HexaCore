
const axios = require('axios');

async function testLogin() {
  const url = 'http://localhost:8000/auth/v1/token?grant_type=password';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzcyMjY1MjE4LCJleHAiOjIwODc2MjUyMTh9.yj_jtZtYtFf29HhTl8qiXQrjiq0LJEz2WTj6f6pyfMs';
  
  try {
    const response = await axios.post(url, {
      email: 'caozhilei@gmail.com',
      password: 'Cao13352896595'
    }, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login Successful!');
    console.log('Access Token:', response.data.access_token ? 'Present' : 'Missing');
    console.log('User ID:', response.data.user?.id);
  } catch (error) {
    console.error('Login Failed:', error.response?.data || error.message);
  }
}

testLogin();
