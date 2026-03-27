const mongoose = require('mongoose');
const CommunityReport = require('./models/CommunityReport');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas!');
    
    const sampleReport = {
      type: 'flood',
      description: 'System Test - Please ignore. Water level rising fast.',
      reporter: 'AI Assistant',
      location: {
        latitude: 28.5355,
        longitude: 77.3910,
        address: 'Noida Sector 62'
      },
      status: 'active'
    };
    
    const report = await CommunityReport.create(sampleReport);
    console.log('✅ Sample report successfully stored in MongoDB Atlas!');
    console.log('Report ID:', report._id);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed to store report:', err.message);
    process.exit(1);
  });
