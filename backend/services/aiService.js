const axios = require('axios');
const { logger } = require('../middleware/loggingMiddleware');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC3Dsf6Kb6XPe51waZ94jBsmgCUPWhH6Zw';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Fetch comprehensive prediction from Python AI Microservice
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {String} district 
 */
const getComprehensivePrediction = async (startDate, endDate, district = 'Gautam Buddha Nagar') => {
  try {
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
      logger.error('AI Service Response:', error.response.data);
    }
    return null;
  }
};

/**
 * Generate AI Recommendations using Gemini
 * @param {Object} data - The prediction data (flood, drought, heatwave risks)
 */
const getGeminiRecommendation = async (data) => {
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

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }

    return "Unable to generate AI recommendations at this time.";

  } catch (error) {
    logger.error('Error calling Gemini API:', error.message);
    return "AI Recommendation service temporarily unavailable.";
  }
};

module.exports = {
  getComprehensivePrediction,
  getGeminiRecommendation
};
