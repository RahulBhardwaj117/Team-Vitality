/**
 * Chatbot Service
 * Handles AI-powered responses for farmer queries with climate and crop context
 */

const ChatMessage = require('../models/ChatMessage');
const FarmerProfile = require('../models/FarmerProfile');
const Weather = require('../models/Weather');

class ChatbotService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-3.5-turbo';
    
    // Fallback responses when AI is unavailable
    this.fallbackResponses = {
      weather: "I can help you with weather information. Please provide your location (village/district) and I'll fetch the latest forecast.",
      irrigation: "For irrigation advice, I need to know your crop type and current soil moisture. What crop are you growing?",
      fertilizer: "I can provide fertilizer recommendations. Please tell me your crop type and growth stage.",
      pest_control: "For pest control advice, please describe the symptoms you're seeing on your crops.",
      crop_advice: "I'm here to help with crop-related questions. What would you like to know?",
      alert: "I'll keep you updated with important weather and crop alerts for your area.",
      general: "Hello! I'm your AgriUrban AI assistant. I can help with weather forecasts, irrigation advice, fertilizer recommendations, and crop guidance. How can I assist you today?",
      unknown: "I'm not sure I understood that. Could you please rephrase your question? I can help with weather, irrigation, fertilizer, pest control, and crop advice."
    };
  }

  /**
   * Detect intent from user message
   */
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    const intentPatterns = {
      weather: /weather|rain|temperature|forecast|climate|sunny|cloudy|wind|storm|heatwave|cold/i,
      irrigation: /water|irrigat|moisture|drip|sprinkler|pump|wet|dry/i,
      fertilizer: /fertilizer|fertiliser|nutrient|urea|npk|manure|compost|organic/i,
      pest_control: /pest|insect|disease|fungus|worm|bug|spray|pesticide/i,
      crop_advice: /crop|plant|sow|harvest|seed|variety|yield|grow/i,
      alert: /alert|warning|notify|update|inform/i
    };

    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(lowerMessage)) {
        return intent;
      }
    }

    return 'general';
  }

  /**
   * Get farmer context from profile and recent weather
   */
  async getFarmerContext(userId) {
    try {
      const profile = await FarmerProfile.findOne({ userId }).lean();
      
      if (!profile) {
        return null;
      }

      // Get recent weather data if location is available
      let weatherData = null;
      if (profile.location?.coordinates?.latitude) {
        weatherData = await Weather.findOne({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [
                  profile.location.coordinates.longitude,
                  profile.location.coordinates.latitude
                ]
              },
              $maxDistance: 50000 // 50km radius
            }
          }
        }).sort({ timestamp: -1 }).lean();
      }

      return {
        profile,
        weather: weatherData
      };
    } catch (error) {
      console.error('Error fetching farmer context:', error);
      return null;
    }
  }

  /**
   * Build system prompt with farmer context
   */
  buildSystemPrompt(context) {
    let prompt = `You are AgriUrban AI, a friendly and knowledgeable agricultural assistant for Indian farmers. 
Your role is to provide accurate, actionable advice on weather, irrigation, fertilizers, pest control, and crop management.

Guidelines:
- Be concise, friendly, and professional
- Provide step-by-step actionable advice
- Use simple language that farmers can understand
- Always consider local climate and soil conditions
- Proactively warn about extreme weather events
- Ask for missing information politely when needed
- Use Indian agricultural context (crops, seasons, practices)
`;

    if (context?.profile) {
      const { location, farmDetails } = context.profile;
      
      prompt += `\n\nFarmer Context:`;
      
      if (location?.district) {
        prompt += `\n- Location: ${location.village || ''} ${location.district}, ${location.state || ''}`;
      }
      
      if (farmDetails?.crops?.length > 0) {
        const crops = farmDetails.crops.map(c => c.cropType).join(', ');
        prompt += `\n- Current Crops: ${crops}`;
      }
      
      if (farmDetails?.soilType) {
        prompt += `\n- Soil Type: ${farmDetails.soilType}`;
      }
      
      if (farmDetails?.totalLandArea) {
        prompt += `\n- Farm Size: ${farmDetails.totalLandArea} acres`;
      }
    }

    if (context?.weather) {
      const w = context.weather;
      prompt += `\n\nCurrent Weather Data:`;
      prompt += `\n- Temperature: ${w.temperature}°C`;
      prompt += `\n- Humidity: ${w.humidity}%`;
      if (w.rainfall) prompt += `\n- Recent Rainfall: ${w.rainfall}mm`;
      if (w.forecast) prompt += `\n- Forecast: ${w.forecast}`;
    }

    return prompt;
  }

  /**
   * Generate AI response using OpenAI API
   */
  async generateAIResponse(userMessage, conversationHistory, context) {
    // If no API key, use fallback
    if (!this.apiKey) {
      return this.generateFallbackResponse(userMessage, context);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Build messages array for conversation context
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Add recent conversation history (last 5 messages)
      const recentHistory = conversationHistory.slice(-5);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.message
        });
      });

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      const startTime = Date.now();

      // Call OpenAI API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 300,
          top_p: 1,
          frequency_penalty: 0.5,
          presence_penalty: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      return {
        message: data.choices[0].message.content.trim(),
        metadata: {
          responseTime,
          aiModel: this.model,
          tokens: data.usage?.total_tokens || 0
        }
      };

    } catch (error) {
      console.error('AI Response Error:', error);
      return this.generateFallbackResponse(userMessage, context);
    }
  }

  /**
   * Generate fallback response when AI is unavailable
   */
  generateFallbackResponse(userMessage, context) {
    const intent = this.detectIntent(userMessage);
    let response = this.fallbackResponses[intent] || this.fallbackResponses.unknown;

    // Enhance response with context if available
    if (context?.weather && intent === 'weather') {
      const w = context.weather;
      response = `Current weather in your area: Temperature ${w.temperature}°C, Humidity ${w.humidity}%. `;
      
      if (w.rainfall > 0) {
        response += `Recent rainfall: ${w.rainfall}mm. `;
      }
      
      if (w.forecast) {
        response += `Forecast: ${w.forecast}`;
      }
    }

    return {
      message: response,
      metadata: {
        responseTime: 0,
        aiModel: 'fallback',
        tokens: 0
      }
    };
  }

  /**
   * Process user message and generate response
   */
  async processMessage(userId, sessionId, userMessage) {
    try {
      // Get farmer context
      const context = await this.getFarmerContext(userId);

      // Get conversation history
      const conversationHistory = await ChatMessage.getConversationHistory(userId, sessionId, 10);

      // Detect intent
      const intent = this.detectIntent(userMessage);

      // Save user message
      const userMsg = await ChatMessage.create({
        userId,
        sessionId,
        message: userMessage,
        sender: 'user',
        intent,
        context: context?.profile ? {
          location: context.profile.location,
          cropType: context.profile.farmDetails?.crops?.[0]?.cropType,
          soilType: context.profile.farmDetails?.soilType,
          fieldSize: context.profile.farmDetails?.totalLandArea,
          weatherData: context.weather
        } : {}
      });

      // Generate AI response
      const aiResponse = await this.generateAIResponse(userMessage, conversationHistory, context);

      // Save bot response
      const botMsg = await ChatMessage.create({
        userId,
        sessionId,
        message: aiResponse.message,
        sender: 'bot',
        intent,
        metadata: aiResponse.metadata,
        context: context?.profile ? {
          location: context.profile.location,
          cropType: context.profile.farmDetails?.crops?.[0]?.cropType,
          soilType: context.profile.farmDetails?.soilType,
          fieldSize: context.profile.farmDetails?.totalLandArea,
          weatherData: context.weather
        } : {}
      });

      return {
        success: true,
        userMessage: userMsg,
        botMessage: botMsg,
        intent
      };

    } catch (error) {
      console.error('Process Message Error:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  async getHistory(userId, sessionId, limit = 50) {
    try {
      return await ChatMessage.getConversationHistory(userId, sessionId, limit);
    } catch (error) {
      console.error('Get History Error:', error);
      throw error;
    }
  }

  /**
   * Generate proactive alert message
   */
  async generateAlert(userId, alertType, alertData) {
    try {
      const context = await this.getFarmerContext(userId);
      
      let alertMessage = '';
      
      switch (alertType) {
        case 'heavy_rain':
          alertMessage = `⚠️ Heavy Rainfall Alert: ${alertData.rainfall}mm expected in the next ${alertData.hours} hours. `;
          if (context?.profile?.farmDetails?.crops) {
            alertMessage += `Protect your ${context.profile.farmDetails.crops[0]?.cropType} crops and ensure proper drainage.`;
          }
          break;
          
        case 'drought':
          alertMessage = `⚠️ Drought Warning: No significant rainfall expected for ${alertData.days} days. `;
          alertMessage += `Plan irrigation accordingly and conserve water.`;
          break;
          
        case 'heatwave':
          alertMessage = `⚠️ Heatwave Alert: Temperature expected to reach ${alertData.maxTemp}°C. `;
          alertMessage += `Increase irrigation frequency and provide shade for sensitive crops.`;
          break;
          
        case 'frost':
          alertMessage = `⚠️ Frost Warning: Temperature may drop to ${alertData.minTemp}°C. `;
          alertMessage += `Protect sensitive crops with covers or mulching.`;
          break;
          
        default:
          alertMessage = `⚠️ Weather Alert: ${alertData.message}`;
      }

      return alertMessage;
    } catch (error) {
      console.error('Generate Alert Error:', error);
      return `⚠️ Weather Alert: ${alertData.message}`;
    }
  }
}

module.exports = new ChatbotService();
