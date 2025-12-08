# MongoDB Setup Guide for AgriUrbanAI

## Current Issue
Your backend server cannot connect to MongoDB, which is required for:
- User authentication
- Chatbot message history
- Farmer profiles
- Weather data storage
- Alert management

## Quick Fix Options

### Option 1: Start MongoDB Manually (Recommended for Development)

1. **Check if MongoDB is installed:**
   ```powershell
   mongod --version
   ```

2. **If MongoDB is installed, start it:**
   ```powershell
   # Create data directory if it doesn't exist
   mkdir C:\data\db -Force
   
   # Start MongoDB
   mongod --dbpath C:\data\db
   ```
   
   Keep this terminal window open while developing.

3. **In a new terminal, start the backend:**
   ```powershell
   cd C:\Users\sambh\.vscode\TeamVitality-1\AU\backend
   npm start
   ```

### Option 2: Install MongoDB (If Not Installed)

1. **Download MongoDB Community Server:**
   - Visit: https://www.mongodb.com/try/download/community
   - Select Windows version
   - Download and run the installer

2. **During installation:**
   - Choose "Complete" installation
   - Install MongoDB as a Service (recommended)
   - Install MongoDB Compass (GUI tool, optional but helpful)

3. **After installation:**
   ```powershell
   # Start MongoDB service
   net start MongoDB
   
   # Or if not installed as service:
   mongod --dbpath C:\data\db
   ```

### Option 3: Use MongoDB Atlas (Cloud Database - No Local Install)

1. **Create free account:**
   - Visit: https://www.mongodb.com/cloud/atlas/register
   - Create a free cluster (M0 tier)

2. **Get connection string:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

3. **Update your `.env` file:**
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/agriurbanai?retryWrites=true&w=majority
   ```

### Option 4: Run Without Database (Limited Functionality)

The server will run in "offline mode" but with limited features:
- ❌ No user authentication
- ❌ No chatbot history
- ❌ No data persistence
- ✅ Basic UI works
- ✅ Weather forecasts work (cached)

## Verifying MongoDB Connection

1. **Check if MongoDB is running:**
   ```powershell
   # Try to connect
   mongosh
   # or
   mongo
   ```

2. **Check connection from Node.js:**
   ```powershell
   cd C:\Users\sambh\.vscode\TeamVitality-1\AU\backend
   node -e "require('mongoose').connect('mongodb://localhost:27017/agriurbanai').then(() => console.log('✅ Connected')).catch(e => console.log('❌ Failed:', e.message))"
   ```

## Environment Variables

Make sure your `backend/.env` file has:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/agriurbanai

# JWT Secret (for authentication)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Server Port
PORT=5000

# OpenAI API Key (for chatbot)
OPENAI_API_KEY=your-openai-api-key-here

# Weather API
OPENWEATHER_API_KEY=your-openweather-api-key-here
```

## Troubleshooting

### Error: "Port 5000 already in use"
```powershell
# Kill process on port 5000
npx kill-port 5000

# Or use different port
$env:PORT=5001; npm start
```

### Error: "connect ECONNREFUSED 127.0.0.1:27017"
- MongoDB is not running
- Start MongoDB using one of the methods above

### Error: "Authentication failed"
- Check MongoDB username/password in connection string
- Make sure user has proper permissions

## Next Steps

1. Choose one of the options above
2. Start MongoDB
3. Restart your backend server
4. Test the chatbot

## Quick Start Script

I've created `start-dev.ps1` that will:
- Check if MongoDB is running
- Start MongoDB if needed
- Start the backend server
- Show helpful status messages

Run it with:
```powershell
.\start-dev.ps1
```
