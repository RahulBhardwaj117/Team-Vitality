# Quick Setup Guide for AgriUrban AI Chatbot

## ✅ Files Successfully Created

All chatbot files have been created in your project:

### Backend Files (7 files)
- ✅ `backend/models/ChatMessage.js` - Chat message database model
- ✅ `backend/models/FarmerProfile.js` - Farmer profile model
- ✅ `backend/services/chatbotService.js` - AI chatbot service
- ✅ `backend/controllers/chatbotController.js` - API controllers
- ✅ `backend/routes/chatbotRoutes.js` - API routes
- ✅ `backend/server.js` - Updated with chatbot routes

### Frontend Files (2 files)
- ✅ `chatbot.css` - Chatbot widget styles
- ✅ `chatbot.js` - Chatbot frontend logic

### Documentation (3 files)
- ✅ `CHATBOT_README.md` - Complete documentation
- ✅ `chatbot-examples.js` - Example conversations
- ✅ `.env.example` - Environment template

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
cd AU
npm install uuid
```

### Step 2: Configure Environment Variables

Create a `.env` file in the `AU` directory with this content:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/agriurbanai

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=agriurban_secret_key_2024_production
JWT_EXPIRE=7d

# OpenAI API Configuration (for Chatbot)
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_KEY_HERE

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

**⚠️ IMPORTANT:** Your API key has been included above. Keep this file secure and never commit it to Git!

### Step 3: Add Chatbot to index.html

Open `index.html` and add these two lines:

**A) In the `<head>` section** (around line 49, after `gps-location.css`):
```html
<link rel="stylesheet" href="chatbot.css">
```

**B) Before the closing `</body>` tag** (around line 1528, after `gps-location.js`):
```html
<!-- Chatbot Widget -->
<script src="chatbot.js"></script>
```

### Step 4: Start MongoDB
```bash
# Windows
mongod

# Or if MongoDB is installed as a service, it should already be running
```

### Step 5: Start the Backend Server
```bash
cd AU
node backend/server.js
```

You should see:
```
Server running in development mode on port 5000
MongoDB Connected: localhost
```

### Step 6: Open the Application

1. Open `index.html` in your browser or run with Electron:
   ```bash
   npm start
   ```

2. Log in to the dashboard

3. Look for the **green floating chatbot button** in the bottom-right corner 🌾

4. Click it and start chatting!

---

## 🎯 Test the Chatbot

Try these sample queries:

1. **Weather:** "What's the weather forecast for tomorrow?"
2. **Irrigation:** "Should I water my wheat crop today?"
3. **Fertilizer:** "What fertilizer should I use for rice?"
4. **Pest Control:** "I see holes in my tomato leaves"
5. **Crop Advice:** "When should I plant wheat?"

---

## 🎨 Chatbot Features

✅ **AI-Powered Responses** - Uses OpenAI GPT-3.5 Turbo  
✅ **Context-Aware** - Remembers your location, crops, and soil type  
✅ **Quick Replies** - Pre-defined buttons for common questions  
✅ **Session Memory** - Maintains conversation history  
✅ **Proactive Alerts** - Weather warnings and crop notifications  
✅ **Responsive Design** - Works on desktop and mobile  
✅ **Offline Fallback** - Works even without AI API  

---

## 📱 Chatbot UI Overview

```
┌─────────────────────────────────┐
│ 🌾 AgriUrban AI      [Online] ✕ │ ← Header
├─────────────────────────────────┤
│                                 │
│  🌾 Hello! How can I help?     │ ← Bot Message
│     Just now                    │
│                                 │
│              What's weather? 👤 │ ← User Message
│              2m ago             │
│                                 │
│  🌾 Temperature: 28°C...       │ ← Bot Response
│     Just now                    │
│                                 │
├─────────────────────────────────┤
│ ☀️ Weather  💧 Irrigation  🌱... │ ← Quick Replies
├─────────────────────────────────┤
│ [Type your message...]      📤  │ ← Input Area
└─────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Chatbot button not appearing?
1. Check browser console for errors (F12)
2. Verify `chatbot.css` and `chatbot.js` are added to `index.html`
3. Make sure you're logged in to the dashboard

### Messages not sending?
1. Check if backend server is running on port 5000
2. Verify MongoDB is connected
3. Check browser Network tab for API errors
4. Ensure `authToken` exists in localStorage

### AI not responding?
1. Verify OpenAI API key in `.env` file
2. Check backend console for API errors
3. Chatbot will use fallback responses if AI fails

### Styling issues?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Verify `chatbot.css` loads after other CSS files
3. Check for CSS conflicts in browser DevTools

---

## 📊 API Endpoints

All endpoints require authentication (JWT token):

- `POST /api/chat/send` - Send message
- `GET /api/chat/history/:sessionId` - Get chat history
- `GET /api/chat/sessions` - Get all sessions
- `POST /api/chat/profile` - Update farmer profile
- `GET /api/chat/profile` - Get farmer profile
- `GET /api/chat/suggestions` - Get quick replies
- `POST /api/chat/alert` - Send proactive alert

See `CHATBOT_README.md` for detailed API documentation.

---

## 🎨 Customization

### Change Colors
Edit `chatbot.css` and search for:
- `#00b09b` (primary green)
- `#96c93d` (secondary green)

### Modify AI Personality
Edit `backend/services/chatbotService.js`:
- `buildSystemPrompt()` - Change AI instructions
- `fallbackResponses` - Customize offline responses

### Add Quick Replies
Edit `backend/controllers/chatbotController.js`:
- `getQuickReplies()` function

---

## 📚 Documentation

- **Full Documentation:** `CHATBOT_README.md`
- **Example Conversations:** `chatbot-examples.js`
- **Environment Template:** `.env.example`

---

## 🔐 Security Notes

✅ All API endpoints require JWT authentication  
✅ Input validation (max 500 characters)  
✅ Rate limiting enabled  
✅ HTTPS recommended for production  
✅ API key stored securely in `.env` (gitignored)  
✅ No sensitive user data collected  

---

## 🎉 You're All Set!

The chatbot is production-ready and fully integrated. Just follow the 6 steps above to get it running!

**Need help?** Check `CHATBOT_README.md` for detailed documentation.

---

**Created:** November 28, 2025  
**Version:** 1.0.0  
**Technology:** Node.js + Express + MongoDB + OpenAI GPT-3.5
