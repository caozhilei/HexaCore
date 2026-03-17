
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testAgentsAPI() {
  const envPath = path.join(__dirname, '../apps/web/.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const apiUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const apiKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  
  const url = `${apiUrl}/rest/v1/agents?select=*`;
  
  console.log(`Testing API: ${url}`);
  // console.log(`API Key: ${apiKey.substring(0, 10)}...`);

  try {
    const response = await axios.get(url, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Request Successful!');
    console.log('Status:', response.status);
    console.log('Data count:', response.data.length);
    console.log('First agent:', response.data[0]?.name);
  } catch (error) {
    console.error('API Request Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAgentsAPI();
