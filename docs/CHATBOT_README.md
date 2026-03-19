# AgriUrban AI Chatbot - Complete Integration Guide

## Overview
This document provides complete instructions for integrating the AI-powered farmer chatbot into the AgriUrban Climate Predictor dashboard.

## Features
✅ **Hyperlocal Climate Forecasts** - Context-aware weather predictions  
✅ **Crop-Specific Guidance** - Tailored advice based on crop type and soil  
✅ **Actionable Alerts** - Proactive notifications for extreme weather  
✅ **Conversational Memory** - Session-based chat history  
✅ **Responsive Design** - Works on desktop and mobile  
✅ **AI Integration** - OpenAI GPT-3.5 with fallback responses  
✅ **Secure & Private** - Encrypted communication, minimal data collection  

---

## Files Created

### Backend Files
1. **`backend/models/ChatMessage.js`** - Database model for chat messages
2. **`backend/models/FarmerProfile.js`** - Extended user profile for farmers
3. **`backend/services/chatbotService.js`** - AI chatbot logic and NLP
4. **`backend/controllers/chatbotController.js`** - HTTP request handlers
5. **`backend/routes/chatbotRoutes.js`** - API route definitions

### Frontend Files
6. **`chatbot.css`** - Chatbot widget styles
7. **`chatbot.js`** - Chatbot frontend logic

---

## Installation Steps

### Step 1: Install Required Dependencies

```bash
cd AU
npm install uuid
```

### Step 2: Add Chatbot Routes to Server

The chatbot routes have already been added to `backend/server.js`:
- Import: `const chatbotRoutes = require('./routes/chatbotRoutes');`
- Route: `app.use('/api/chat', chatbotRoutes);`

### Step 3: Add Chatbot to HTML

Add these lines to `index.html`:

**In the `<head>` section** (after other CSS files):
```html
<link rel="stylesheet" href="chatbot.css">
```

**Before closing `</body>` tag** (after other scripts):
```html
<!-- Chatbot Widget -->
<script src="chatbot.js"></script>
```

### Step 4: Configure Environment Variables

Add to your `.env` file (optional - chatbot works without it using fallback responses):
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 5: Start the Backend Server

```bash
# Start MongoDB (if not running)
mongod

# Start the backend server
cd AU
node backend/server.js
```

### Step 6: Test the Chatbot

1. Open the application
2. Log in to the dashboard
3. Look for the floating chatbot button in the bottom-right corner (green circle with chat icon)
4. Click to open and start chatting!

---

## API Endpoints

### POST `/api/chat/send`
Send a message to the chatbot
```json
{
  "message": "Will it rain tomorrow?",
  "sessionId": "optional-session-id"
}
```

### GET `/api/chat/history/:sessionId`
Get chat history for a session

### GET `/api/chat/sessions`
Get all chat sessions for the user

### POST `/api/chat/profile`
Create or update farmer profile
```json
{
  "personalInfo": {
    "name": "Farmer Name",
    "language": "en"
  },
  "location": {
    "village": "Village Name",
    "district": "District",
    "state": "State"
  },
  "farmDetails": {
    "totalLandArea": 5,
    "crops": [{
      "cropType": "wheat",
      "area": 3
    }],
    "soilType": "loamy"
  }
}
```

### GET `/api/chat/profile`
Get farmer profile

### GET `/api/chat/suggestions`
Get quick reply suggestions

### POST `/api/chat/alert`
Send proactive alert (system/admin only)

---

## Database Schema

### ChatMessage Collection
```javascript
{
  userId: ObjectId,
  sessionId: String,
  message: String,
  sender: 'user' | 'bot',
  intent: 'weather' | 'irrigation' | 'fertilizer' | 'pest_control' | 'crop_advice' | 'alert' | 'general',
  context: {
    location: { village, district, coordinates },
    cropType: String,
    soilType: String,
    weatherData: Object
  },
  confidence: Number,
  metadata: {
    responseTime: Number,
    aiModel: String,
    tokens: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### FarmerProfile Collection
```javascript
{
  userId: ObjectId,
  personalInfo: {
    name: String,
    phone: String,
    language: String
  },
  location: {
    village: String,
    district: String,
    state: String,
    coordinates: { latitude, longitude }
  },
  farmDetails: {
    totalLandArea: Number,
    crops: [{ cropType, area, sowingDate, variety }],
    soilType: String,
    irrigationType: String
  },
  preferences: {
    alertTypes: [String],
    notificationTime: String
  },
  isProfileComplete: Boolean
}
```

---

## Example Conversations

### Weather Query
**User:** "Will it rain tomorrow?"  
**Bot:** "There is a 70% chance of rain tomorrow in your village. You may postpone irrigation for wheat crops."

### Irrigation Advice
**User:** "Should I water my maize crop today?"  
**Bot:** "Soil moisture is low, but heavy rain is expected in the next 24 hours. You can wait to water your crop."

### Crop Guidance
**User:** "When should I apply fertilizer to wheat?"  
**Bot:** "For wheat crops at the tillering stage, apply nitrogen fertilizer (urea) at 50kg per acre. Best time is early morning."

### Proactive Alert
**Bot:** "⚠️ Heavy Rainfall Alert: 80mm expected in the next 12 hours. Protect your wheat crops and ensure proper drainage."

---

## Customization

### Change Chatbot Appearance
Edit `chatbot.css`:
- Colors: Search for `#00b09b` and `#96c93d` (primary gradient)
- Position: Modify `.chatbot-container` bottom/right values
- Size: Adjust `.chatbot-window` width/height

### Modify AI Behavior
Edit `backend/services/chatbotService.js`:
- `buildSystemPrompt()` - Change AI personality and instructions
- `detectIntent()` - Add new intent patterns
- `fallbackResponses` - Customize offline responses

### Add Quick Replies
Edit `chatbotController.js` in `getQuickReplies()`:
```javascript
suggestions.push({
  id: 7,
  text: "Custom question",
  icon: "🌟",
  intent: "custom"
});
```

---

## Troubleshooting

### Chatbot Not Appearing
1. Check if `chatbot.css` and `chatbot.js` are loaded in browser console
2. Verify user is logged in (chatbot requires authentication)
3. Check browser console for JavaScript errors

### Messages Not Sending
1. Verify backend server is running on port 5000
2. Check if `authToken` is set in localStorage
3. Verify MongoDB is running and connected
4. Check network tab for API errors

### AI Responses Not Working
1. Check if `OPENAI_API_KEY` is set in `.env`
2. Verify API key is valid
3. Chatbot will use fallback responses if AI fails

### Styling Issues
1. Clear browser cache
2. Check if `chatbot.css` is loaded after other CSS files
3. Verify no CSS conflicts with existing styles

---

## Security Considerations

✅ **Authentication Required** - All endpoints protected with JWT  
✅ **Input Validation** - Message length limited to 500 characters  
✅ **Rate Limiting** - Prevents abuse via express-rate-limit  
✅ **Data Encryption** - HTTPS for all communications  
✅ **Minimal Data Collection** - Only agricultural data, no sensitive info  
✅ **Session Management** - Secure session IDs with UUID  

---

## Performance Optimization

### Frontend
- Lazy load chatbot widget (loads after 1 second)
- Debounced textarea auto-resize
- Virtual scrolling for long chat histories
- Compressed CSS with minification

### Backend
- Indexed database queries (userId, sessionId)
- Limited conversation history (last 10 messages)
- Response caching for common queries
- Async/await for non-blocking operations

---

## Future Enhancements

🔮 **Planned Features:**
- [ ] Voice input/output support
- [ ] Multi-language support (Hindi, Telugu, Tamil, etc.)
- [ ] Image upload for crop disease detection
- [ ] Integration with weather APIs for real-time data
- [ ] Crop calendar and reminders
- [ ] Market price information
- [ ] Government scheme recommendations
- [ ] Offline mode with service workers

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review backend logs in `backend/server.js`
- Check browser console for frontend errors
- Verify all dependencies are installed

---

## License

MIT License - Feel free to modify and use in your projects.

---

## Credits

**Developed for:** AgriUrban Climate Predictor  
**Technology Stack:** Node.js, Express, MongoDB, OpenAI GPT-3.5  
**UI Framework:** Vanilla JavaScript with modern CSS  
**Icons:** Phosphor Icons  

---

**Last Updated:** November 28, 2025  
**Version:** 1.0.0
