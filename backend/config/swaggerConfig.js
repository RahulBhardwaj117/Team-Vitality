/**
 * Swagger Configuration
 * API documentation setup for AgriUrbanAI
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgriUrbanAI API',
      version: '1.0.0',
      description: 'A comprehensive API for smart agriculture and urban planning with AI-powered insights',
      contact: {
        name: 'AgriUrbanAI Support',
        email: 'support@agriurban.ai',
        url: 'https://agriurban.ai'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.agriurban.ai',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for external service authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'Full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address'
            },
            role: {
              type: 'string',
              enum: ['farmer', 'urban', 'admin', 'demo'],
              description: 'User role'
            },
            phone: {
              type: 'string',
              description: 'Phone number'
            },
            profile: {
              $ref: '#/components/schemas/UserProfile'
            },
            farm: {
              $ref: '#/components/schemas/FarmProfile'
            },
            urbanProfile: {
              $ref: '#/components/schemas/UrbanProfile'
            },
            preferences: {
              $ref: '#/components/schemas/UserPreferences'
            },
            status: {
              $ref: '#/components/schemas/UserStatus'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            avatar: {
              type: 'string',
              description: 'Profile picture URL'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other']
            },
            address: {
              $ref: '#/components/schemas/Address'
            },
            emergencyContact: {
              $ref: '#/components/schemas/EmergencyContact'
            }
          }
        },
        FarmProfile: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Farm name'
            },
            location: {
              $ref: '#/components/schemas/Location'
            },
            area: {
              $ref: '#/components/schemas/Area'
            },
            cropType: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            soilType: {
              type: 'string'
            },
            irrigationType: {
              type: 'string'
            },
            farmingMethod: {
              type: 'string',
              enum: ['traditional', 'organic', 'modern', 'mixed']
            }
          }
        },
        UrbanProfile: {
          type: 'object',
          properties: {
            zone: {
              type: 'string',
              description: 'Urban zone name'
            },
            department: {
              type: 'string',
              description: 'Department name'
            },
            jurisdiction: {
              type: 'string',
              description: 'Jurisdiction area'
            },
            emergencyContact: {
              type: 'string'
            },
            reportingAuthority: {
              type: 'string'
            }
          }
        },
        UserPreferences: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'kn']
            },
            theme: {
              type: 'string',
              enum: ['light', 'dark', 'auto']
            },
            notifications: {
              $ref: '#/components/schemas/NotificationSettings'
            },
            units: {
              $ref: '#/components/schemas/UnitPreferences'
            }
          }
        },
        UserStatus: {
          type: 'object',
          properties: {
            isActive: {
              type: 'boolean'
            },
            isVerified: {
              type: 'boolean'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time'
            },
            loginCount: {
              type: 'number'
            }
          }
        },
        WeatherData: {
          type: 'object',
          properties: {
            location: {
              $ref: '#/components/schemas/Location'
            },
            current: {
              $ref: '#/components/schemas/CurrentWeather'
            },
            forecast: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ForecastWeather'
              }
            },
            alerts: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/WeatherAlert'
              }
            },
            metadata: {
              $ref: '#/components/schemas/WeatherMetadata'
            }
          }
        },
        CurrentWeather: {
          type: 'object',
          properties: {
            temperature: {
              $ref: '#/components/schemas/Temperature'
            },
            humidity: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            pressure: {
              $ref: '#/components/schemas/Pressure'
            },
            windSpeed: {
              $ref: '#/components/schemas/WindSpeed'
            },
            windDirection: {
              type: 'number',
              minimum: 0,
              maximum: 360
            },
            visibility: {
              $ref: '#/components/schemas/Visibility'
            },
            uvIndex: {
              type: 'number',
              minimum: 0,
              maximum: 11
            },
            condition: {
              type: 'string',
              enum: ['clear', 'partly-cloudy', 'cloudy', 'overcast', 'rain', 'drizzle', 'heavy-rain', 'thunderstorm', 'snow', 'sleet', 'hail', 'fog', 'mist']
            },
            icon: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            feelsLike: {
              $ref: '#/components/schemas/Temperature'
            }
          }
        },
        ForecastWeather: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date'
            },
            temperature: {
              type: 'object',
              properties: {
                min: {
                  $ref: '#/components/schemas/Temperature'
                },
                max: {
                  $ref: '#/components/schemas/Temperature'
                }
              }
            },
            humidity: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            precipitation: {
              $ref: '#/components/schemas/Precipitation'
            },
            condition: {
              type: 'string',
              enum: ['clear', 'partly-cloudy', 'cloudy', 'overcast', 'rain', 'drizzle', 'heavy-rain', 'thunderstorm', 'snow', 'sleet', 'hail', 'fog', 'mist']
            },
            icon: {
              type: 'string'
            },
            description: {
              type: 'string'
            }
          }
        },
        Alert: {
          type: 'object',
          properties: {
            title: {
              type: 'string'
            },
            message: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['weather', 'crop', 'flood', 'drought', 'pest', 'disease', 'urban', 'traffic', 'emergency', 'maintenance', 'system']
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical', 'emergency']
            },
            severity: {
              type: 'string',
              enum: ['info', 'warning', 'error', 'critical']
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'resolved', 'expired', 'cancelled']
            },
            target: {
              $ref: '#/components/schemas/AlertTarget'
            },
            schedule: {
              $ref: '#/components/schemas/AlertSchedule'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Location: {
          type: 'object',
          properties: {
            name: {
              type: 'string'
            },
            coordinates: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['Point']
                },
                coordinates: {
                  type: 'array',
                  items: {
                    type: 'number'
                  },
                  minItems: 2,
                  maxItems: 2
                }
              }
            },
            district: {
              type: 'string'
            },
            state: {
              type: 'string'
            },
            country: {
              type: 'string'
            }
          }
        },
        Address: {
          type: 'object',
          properties: {
            street: {
              type: 'string'
            },
            city: {
              type: 'string'
            },
            state: {
              type: 'string'
            },
            pincode: {
              type: 'string'
            },
            country: {
              type: 'string'
            }
          }
        },
        EmergencyContact: {
          type: 'object',
          properties: {
            name: {
              type: 'string'
            },
            phone: {
              type: 'string'
            },
            relationship: {
              type: 'string'
            }
          }
        },
        Area: {
          type: 'object',
          properties: {
            value: {
              type: 'number'
            },
            unit: {
              type: 'string',
              enum: ['hectares', 'acres', 'sq_meters']
            }
          }
        },
        Temperature: {
          type: 'object',
          properties: {
            value: {
              type: 'number'
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit']
            }
          }
        },
        Pressure: {
          type: 'object',
          properties: {
            value: {
              type: 'number'
            },
            unit: {
              type: 'string',
              enum: ['hPa', 'mb', 'atm']
            }
          }
        },
        WindSpeed: {
          type: 'object',
          properties: {
            value: {
              type: 'number'
            },
            unit: {
              type: 'string',
              enum: ['kmh', 'mph', 'ms']
            }
          }
        },
        Visibility: {
          type: 'object',
          properties: {
            value: {
              type: 'number'
            },
            unit: {
              type: 'string',
              enum: ['km', 'miles']
            }
          }
        },
        Precipitation: {
          type: 'object',
          properties: {
            probability: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            amount: {
              type: 'object',
              properties: {
                value: {
                  type: 'number'
                },
                unit: {
                  type: 'string',
                  enum: ['mm', 'inches']
                }
              }
            },
            type: {
              type: 'string',
              enum: ['rain', 'snow', 'sleet', 'hail', 'none']
            }
          }
        },
        WeatherAlert: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['heat', 'cold', 'wind', 'rain', 'storm', 'flood', 'drought', 'frost', 'hail', 'snow', 'fog']
            },
            severity: {
              type: 'string',
              enum: ['minor', 'moderate', 'severe', 'extreme']
            },
            title: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            startTime: {
              type: 'string',
              format: 'date-time'
            },
            endTime: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        WeatherMetadata: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              enum: ['openweathermap', 'weatherapi', 'accuweather', 'custom', 'sensor']
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time'
            },
            updateFrequency: {
              type: 'number'
            },
            dataQuality: {
              type: 'string',
              enum: ['excellent', 'good', 'fair', 'poor']
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 100
            }
          }
        },
        NotificationSettings: {
          type: 'object',
          properties: {
            email: {
              type: 'boolean'
            },
            sms: {
              type: 'boolean'
            },
            push: {
              type: 'boolean'
            },
            weather: {
              type: 'boolean'
            },
            alerts: {
              type: 'boolean'
            },
            marketing: {
              type: 'boolean'
            }
          }
        },
        UnitPreferences: {
          type: 'object',
          properties: {
            temperature: {
              type: 'string',
              enum: ['celsius', 'fahrenheit']
            },
            area: {
              type: 'string',
              enum: ['hectares', 'acres', 'sq_meters']
            },
            rainfall: {
              type: 'string',
              enum: ['mm', 'inches']
            }
          }
        },
        AlertTarget: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['farmer', 'urban', 'admin', 'demo']
              }
            },
            locations: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Location'
              }
            },
            crops: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            departments: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        },
        AlertSchedule: {
          type: 'object',
          properties: {
            startTime: {
              type: 'string',
              format: 'date-time'
            },
            endTime: {
              type: 'string',
              format: 'date-time'
            },
            duration: {
              type: 'number'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string'
            },
            details: {
              type: 'object'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string'
            },
            data: {
              type: 'object'
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
