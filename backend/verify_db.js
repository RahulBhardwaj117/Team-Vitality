const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const checkLocalAlerts = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/agriurbanai';
    console.log('Connecting to:', uri);
    
    try {
        await mongoose.connect(uri);
        
        // Define a minimal schema for testing
        const alertSchema = new mongoose.Schema({
            title: String,
            message: String,
            type: String,
            createdAt: { type: Date, default: Date.now }
        }, { collection: 'alerts' });

        const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);
        
        const count = await Alert.countDocuments();
        console.log('Total alerts in local database:', count);
        
        const latest = await Alert.find().sort({ createdAt: -1 }).limit(3);
        console.log('Latest 3 alerts:', JSON.stringify(latest, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkLocalAlerts();
