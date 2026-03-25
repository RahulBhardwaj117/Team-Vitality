const fetch = require('node-fetch'); // or use native fetch if node >= 18
async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/disaster-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer electron-user-demo' },
      body: JSON.stringify({
        user: "Demo User", role: "farmer",
        location: { lat: 28.6139, lng: 77.2090, address: "Est. Location (NCR)" },
        severity: "high", resources: "Water", sos: false
      })
    });
    const data = await res.json();
    console.log("Response:", data);
  } catch(e) { console.error("Error:", e); }
}
test();
