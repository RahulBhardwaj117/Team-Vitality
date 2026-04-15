const axios = require('axios');
const { logger } = require('../middleware/loggingMiddleware');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use gemini-1.5-flash for better performance and more modern features
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Fetch comprehensive prediction from Python AI Microservice
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {String} district 
 */
const getComprehensivePrediction = async (startDate, endDate, district = 'Gautam Buddha Nagar') => {
  try {
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }

    // Format dates as YYYY-MM-DD
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    logger.info(`Fetching AI predictions from ${startStr} to ${endStr}`);

    const response = await axios.post(`${AI_SERVICE_URL}/predict/comprehensive/`, {
      start_date: startStr,
      end_date: endStr,
      location: "Delhi", // Default for now
      district: district
    });

    return response.data;
  } catch (error) {
    logger.error('Error fetching AI predictions:', error.message);
    if (error.response) {
      logger.error('AI Service Response Status:', error.response.status);
    }
    return null;
  }
};

/**
 * Generate AI Recommendations using Gemini 1.5 Flash
 * @param {Object} data - The prediction data (flood, drought, heatwave risks)
 */
const getGeminiRecommendation = async (data) => {
  if (!GEMINI_API_KEY) {
    logger.error('GEMINI_API_KEY is missing in environment variables');
    return "AI recommendation service is not configured (Missing API Key).";
  }

  try {
    const prompt = `
      You are an expert agricultural and urban planning consultant. 
      Analyze the following risk data for ${data.district || 'the region'} and provide actionable recommendations.
      
      Risk Data:
      - Flood Risk: ${data.floodRisk || 'Unknown'}
      - Drought Risk: ${data.droughtRisk || 'Unknown'}
      - Heatwave Risk: ${data.heatwaveRisk || 'Unknown'}
      
      Provide a concise response with:
      1. **Immediate Action**: What needs to be done right now?
      2. **Long-term Strategy**: How to mitigate this in the future?
      3. **Resource Allocation**: What resources (water, pumps, medical teams) are needed?
      
      Format the output as HTML with <h4> headers for sections and <ul> for lists. Keep it brief and professional.
    `;

    const response = await axios.post(GEMINI_URL, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });

    // Check for valid response structure (Gemini API v1beta)
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text;
    }

    logger.warn('Gemini API returned an unexpected response structure:', JSON.stringify(response.data));
    return "Unable to parse AI recommendations from the provider.";

  } catch (error) {
    logger.error('Error calling Gemini API:', error.message);
    if (error.response?.data?.error) {
      logger.error('Gemini API Error details:', error.response.data.error.message);
    }
    return "AI Recommendation service temporarily unavailable.";
  }
};

module.exports = {
  getComprehensivePrediction,
  getGeminiRecommendation
};
