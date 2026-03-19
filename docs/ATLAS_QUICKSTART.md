# Quick Start - MongoDB Atlas Setup

## ✅ You're Using MongoDB Atlas (Cloud) - Great Choice!

### Step 1: Get Your Connection String

1. **Login to MongoDB Atlas**: https://cloud.mongodb.com/
2. **Click "Connect"** on your cluster
3. **Choose "Connect your application"**
4. **Copy the connection string** - it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

### Step 2: Update Your Connection String

Replace these placeholders:
- `<username>` → Your MongoDB Atlas username
- `<password>` → Your MongoDB Atlas password
- `<dbname>` → `agriurbanai` (or your preferred database name)

**Example:**
```
mongodb+srv://myuser:MyP@ssw0rd@cluster0.abc123.mongodb.net/agriurbanai?retryWrites=true&w=majority
```

### Step 3: Configure Your Backend

**Option A: Use the Setup Script (Recommended)**
```powershell
.\setup-mongodb-atlas.ps1
```
This script will:
- Check your current configuration
- Test the connection
- Update the .env file if needed
- Start the backend server

**Option B: Manual Configuration**

1. Open `backend/.env` file
2. Find the line: `MONGODB_URI=...`
3. Replace it with your Atlas connection string:
   ```env
   MONGODB_URI=mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/agriurbanai?retryWrites=true&w=majority
   ```
4. Save the file
5. Start the backend:
   ```powershell
   cd backend
   npm start
   ```

### Step 4: Whitelist Your IP Address

⚠️ **Important**: MongoDB Atlas requires IP whitelisting

1. Go to MongoDB Atlas Dashboard
2. Click **Network Access** (left sidebar)
3. Click **Add IP Address**
4. Choose one:
   - **Add Current IP Address** (for your current location)
   - **Allow Access from Anywhere** (0.0.0.0/0) - for development only!

### Troubleshooting

#### Error: "Authentication failed"
- ✅ Check username and password in connection string
- ✅ Make sure password doesn't contain special characters (or URL-encode them)
- ✅ Verify database user exists in MongoDB Atlas

#### Error: "Connection timeout"
- ✅ Check if your IP is whitelisted
- ✅ Verify your internet connection
- ✅ Check if firewall is blocking MongoDB ports

#### Error: "Invalid connection string"
- ✅ Make sure you're using `mongodb+srv://` (not `mongodb://`)
- ✅ Check for typos in the connection string
- ✅ Ensure no extra spaces before or after the string

### Quick Test

Test your connection without starting the server:
```powershell
cd backend
node -e "require('mongoose').connect('YOUR_CONNECTION_STRING').then(() => console.log('✅ Connected!')).catch(e => console.log('❌ Failed:', e.message))"
```

### Current Status

Run this to check if everything is configured:
```powershell
.\setup-mongodb-atlas.ps1
```

### Next Steps After Connection

Once connected, the backend will:
1. ✅ Create necessary database collections automatically
2. ✅ Enable user authentication
3. ✅ Store chatbot conversation history
4. ✅ Save farmer profiles and weather data

### Need Help?

Common MongoDB Atlas tasks:
- **Create a new database user**: Database Access → Add New Database User
- **Whitelist IP**: Network Access → Add IP Address
- **View connection string**: Clusters → Connect → Connect your application
- **Monitor usage**: Metrics tab on your cluster

---

**Ready to start?** Run:
```powershell
.\setup-mongodb-atlas.ps1
```
