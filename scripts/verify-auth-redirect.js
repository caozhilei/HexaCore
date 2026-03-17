
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/zh/dashboard',
  method: 'GET',
};

console.log(`Checking http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  if (res.statusCode === 307 || res.statusCode === 302) {
    console.log('Redirect detected, as expected.');
    if (res.headers.location && res.headers.location.includes('/login')) {
         console.log('Redirects to login page: YES');
    } else {
         console.log('Redirects to login page: NO (Check location header)');
    }
  } else {
    console.log('No redirect detected. Auth might be bypassed or configured incorrectly.');
  }

  res.on('data', () => {}); // Consume data to free memory
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
