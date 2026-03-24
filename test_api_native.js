const http = require('http');

const data = JSON.stringify({
  user: "Demo User", 
  role: "farmer",
  location: { lat: 28.6139, lng: 77.2090, address: "Est. Location (NCR)" },
  severity: "high", 
  resources: "Water", 
  sos: false
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/disaster-reports',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer electron-user-demo',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', (error) => { console.error(error); });
req.write(data);
req.end();
