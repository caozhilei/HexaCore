
async function verifyLogin() {
  const url = 'http://localhost:8000/auth/v1/token?grant_type=password';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzcyMjY1MjE4LCJleHAiOjIwODc2MjUyMTh9.yj_jtZtYtFf29HhTl8qiXQrjiq0LJEz2WTj6f6pyfMs';
  
  try {
    console.log('Verifying new password "password123"...');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'caozhilei@gmail.com',
        password: 'password123'
      })
    });

    if (!res.ok) {
        throw new Error(`Login failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Login successful! User ID:', data.user.id);

  } catch (error) {
    console.error('Verification Failed:', error.message);
  }
}

verifyLogin();
