
async function createTempUser() {
  const url = 'http://localhost:8000/auth/v1/signup';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzcyMjY1MjE4LCJleHAiOjIwODc2MjUyMTh9.yj_jtZtYtFf29HhTl8qiXQrjiq0LJEz2WTj6f6pyfMs';
  
  try {
    console.log('Creating temp user...');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'temp@example.com',
        password: 'password123'
      })
    });

    if (!res.ok) {
        throw new Error(`Signup failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Temp user created:', data.user?.id);

  } catch (error) {
    console.error('Operation Failed:', error.message);
  }
}

createTempUser();
