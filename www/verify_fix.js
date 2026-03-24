const fetch = require('node-fetch'); // NOTE: Assuming node-fetch is available or using built-in fetch in newer Node
// If node-fetch isn't available, we'll use http
const http = require('http');

async function verifyIt() {
    const postData = JSON.stringify({
        user: 'Demo User',
        role: 'farmer',
        location: { lat: 28.61, lng: 77.20, address: 'Script Test' },
        severity: 'medium',
        resources: 'Verification Script Test',
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
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log("Sending Request to localhost:5000/api/disaster-reports...");

    const req = http.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`BODY: ${responseBody}`);
            
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log("✅ SUCCESS: Report submitted successfully.");
            } else {
                console.log("❌ FAILURE: Server returned error.");
            }
        });
    });

    req.on('error', (e) => {
        console.error(`❌ ERROR: Could not connect to server. ${e.message}`);
    });

    req.write(postData);
    req.end();
}

// Check if server is up first by hitting health
const healthOpts = {
    hostname: 'localhost',
    port: 5000,
    path: '/health',
    method: 'GET'
};

const healthReq = http.request(healthOpts, (res) => {
    console.log(`Health Check Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
        verifyIt();
    } else {
        console.log("Health check failed, not running verification.");
    }
});

healthReq.on('error', (e) => {
    console.log("Health check connection failed, waiting 5 seconds and trying again...");
    setTimeout(() => {
        verifyIt(); // Try anyway after delay
    }, 5000);
});

healthReq.end();
