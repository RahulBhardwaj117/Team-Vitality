/**
 * Test script to verify .env configuration
 */

require('dotenv').config();

console.log('\n🔍 Environment Variable Check\n');
console.log('================================\n');

console.log('✅ MONGODB_URI:', process.env.MONGODB_URI ? 
  (process.env.MONGODB_URI.includes('mongodb+srv') ? 
    '✅ MongoDB Atlas (Correct!)' : 
    '❌ localhost (WRONG! Should be Atlas)') : 
  '❌ NOT SET');

console.log('✅ PORT:', process.env.PORT || '❌ NOT SET');
console.log('✅ NODE_ENV:', process.env.NODE_ENV || '❌ NOT SET');
console.log('✅ JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('✅ OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET');

console.log('\n================================\n');

if (process.env.MONGODB_URI) {
  console.log('MongoDB Connection String:');
  // Mask password for security
  const maskedUri = process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
  console.log(maskedUri);
} else {
  console.log('❌ MONGODB_URI is not set in .env file!');
}

console.log('\n================================\n');

if (!process.env.MONGODB_URI || !process.env.MONGODB_URI.includes('mongodb+srv')) {
  console.log('⚠️  WARNING: MongoDB URI is incorrect!');
  console.log('   Expected: mongodb+srv://...');
  console.log('   Fix your .env file and restart.\n');
} else {
  console.log('✅ All environment variables look good!\n');
}
