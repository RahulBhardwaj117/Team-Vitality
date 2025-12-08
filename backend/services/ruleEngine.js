/**
 * Rule Engine (Expert System Layer)
 * Converts raw AI predictions into simple human advice.
 */

const { logger } = require('../middleware/loggingMiddleware');

// Define Rules
const AGRICULTURE_RULES = [
    {
        id: 'irrigation_needed',
        condition: (data) => {
            // Check for low rainfall streak
            // We look at the drought forecast which has 'Consecutive_Dry' or 'Rain_7d'
            if (data.drought && data.drought.daily_forecast) {
                const recentDays = data.drought.daily_forecast.slice(0, 5);
                // If any day in the near future has high consecutive dry days or low 7-day rain
                return recentDays.some(day => day.Rain_7d < 5 || day.Consecutive_Dry >= 5);
            }
            return false;
        },
        insight: "Irrigate within 48 hours",
        priority: "high"
    },
    {
        id: 'drought_risk',
        condition: (data) => {
            // Check soil moisture
            // Available in flood forecast (daily) or drought forecast
            if (data.flood && data.flood.daily_forecast) {
                // Check if soil moisture drops below 20% in the next 3 days
                const next3Days = data.flood.daily_forecast.slice(0, 3);
                return next3Days.some(day => day.soil_moisture < 20);
            }
            return false;
        },
        insight: "High drought risk — consider drip irrigation",
        priority: "critical"
    },
    {
        id: 'avoid_sowing',
        condition: (data) => {
            // Check for heavy rain
            if (data.flood && data.flood.daily_forecast) {
                // If any day has heavy rain (>20mm) or high flood probability
                return data.flood.daily_forecast.some(day => day.rainfall > 20 || day.flood_probability > 0.6);
            }
            return false;
        },
        insight: "Avoid sowing for next 7 days",
        priority: "medium"
    }
];

const URBAN_RULES = [
    {
        id: 'drainage_overflow',
        condition: (data) => {
            // Rainfall > 50mm/day
            if (data.flood && data.flood.daily_forecast) {
                return data.flood.daily_forecast.some(day => day.rainfall > 50);
            }
            return false;
        },
        insight: "Drainage Zone likely to overflow — clear drains",
        priority: "critical"
    },
    {
        id: 'heatwave_advisory',
        condition: (data) => {
            // Heat index or Max Temp > 45
            if (data.heatwave && data.heatwave.daily_forecast) {
                return data.heatwave.daily_forecast.some(day => day.MaxTemp > 45);
            }
            return false;
        },
        insight: "Initiate heatwave advisory for hospital zones",
        priority: "high"
    }
];

/**
 * Evaluate rules against AI data
 * @param {Object} aiData - The comprehensive prediction response
 * @param {String} type - 'agriculture' or 'urban'
 */
const evaluateRules = (aiData, type = 'agriculture') => {
    const insights = [];
    const rules = type === 'urban' ? URBAN_RULES : AGRICULTURE_RULES;

    if (!aiData) return insights;

    try {
        rules.forEach(rule => {
            if (rule.condition(aiData)) {
                insights.push({
                    rule_id: rule.id,
                    insight: rule.insight,
                    priority: rule.priority,
                    timestamp: new Date()
                });
            }
        });
    } catch (error) {
        logger.error('Error evaluating rules:', error);
    }

    return insights;
};

module.exports = {
    evaluateRules
};
