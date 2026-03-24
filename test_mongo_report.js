const mongoose = require('mongoose');
const DisasterReport = require('./backend/models/DisasterReport');

async function test() {
    try {
        await mongoose.connect('mongodb://localhost:27017/agriurbanai', { serverSelectionTimeoutMS: 2000 });
        console.log("Connected to MongoDB");

        const reportData = {
            user: "Demo User",
            role: "farmer",
            location: { lat: 28.6139, lng: 77.2090, address: "Est. Location (NCR)" },
            severity: "high",
            resources: "Water",
            sos: false
        };

        const doc = new DisasterReport(reportData);
        await doc.validate();
        console.log("Validation successful");
        
        await DisasterReport.create(reportData);
        console.log("Creation successful");
        
        process.exit(0);
    } catch(e) {
        console.error("Test Error:", e);
        process.exit(1);
    }
}
test();
