# 🚀 AgriUrbanAI - Team Vitality

**AgriUrbanAI** is an AI-powered platform designed for smart agriculture and urban planning. It provides real-time weather monitoring, flood/drought risk forecasting, and AI-driven recommendations to help farmers and urban planners make data-informed decisions.

---

## 🛠️ Architecture & Tech Stack

This project uses a hybrid microservice architecture to balance real-time web responsiveness with complex AI computations.

### **Flowchart**

```mermaid
graph TD
    subgraph Frontend_Layer ["🎨 Frontend (React 19 + Vite)"]
        UI["User Interface (React Components)"]
        Charts["Data Visualization (Chart.js)"]
        Maps["Geographic Maps (Leaflet)"]
    end

    subgraph Backend_Gateway ["⚙️ Backend Gateway (Node.js/Express)"]
        API["RESTful API (Primary Gateway)"]
        Auth["Authentication & Security (JWT)"]
        Socket["Real-time Alerts (Socket.io)"]
    end

    subgraph AI_Microservice ["🧠 AI Service (Python FastAPI)"]
        FastAPI["FastAPI Predictions"]
        LSTM["Flood/Drought LSTM Models"]
        Gemini["AI Recommendations (Gemini)"]
    end

    subgraph Data_Persistence ["💾 Data & Storage"]
        DB[(MongoDB Database)]
        Redis[(Redis Cache)]
    end

    subgraph External_Services ["🌐 External Cloud APIs"]
        GeminiCloud([Google Gemini API])
        WeatherCloud([OpenWeather API])
        TwilioCloud([Twilio SMS Alerts])
    end

    %% Connections
    UI <--> API
    API <--> DB
    API <--> Redis
    API <--> FastAPI
    
    FastAPI --- LSTM
    FastAPI --- GeminiCloud
    API --- WeatherCloud
    FastAPI --- TwilioCloud

    style Frontend_Layer fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Backend_Gateway fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style AI_Microservice fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style Data_Persistence fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style External_Services fill:#fce4ec,stroke:#c2185b,stroke-width:2px
```

### **Core Technologies**

**Frontend**
*   **React 19**: Modern UI library for a responsive dashboard.
*   **Vite**: Fast build tool for optimized performance.
*   **Vanilla CSS**: For precise, premium aesthetics.
*   **Chart.js**: For visualizing weather and prediction data.
*   **Leaflet**: For spatial and geographic mapping.

**Backend**
*   **Node.js / Express**: Primary API and security gateway.
*   **FastAPI (Python)**: High-performance microservice for AI model inference.
*   **Socket.io**: Powers real-time alerting systems.
*   **JWT & BcryptJS**: Standardized secure authentication.

**AI & Machine Learning**
*   **Google Gemini Pro**: Generative AI for tailored agricultural recommendations.
*   **TensorFlow (LSTM)**: Time-series forecasting for flood and drought risk.
*   **Scikit-learn**: Data preprocessing and modeling.

**Database & Infrastructure**
*   **MongoDB**: Primary NoSQL persistence layer.
*   **Redis**: High-speed caching (optional/scaling).
*   **Capacitor**: Cross-platform mobile (Android) deployment support.
*   **Twilio**: Automated SMS emergency alert integration.

---

## 🚀 Getting Started

1.  **Environment Setup**: Copy `.env.example` to `.env` in the `backend/` folder and add your API keys.
2.  **Install Dependencies**:
    *   Root: `npm install`
    *   Frontend: `cd frontend && npm install`
    *   Python AI Service: `cd backend && pip install -r requirements.txt`
3.  **Run Development**:
    *   Backend: `npm run dev`
    *   Frontend: `npm run frontend-dev` (if configured) or `cd frontend && npm run dev`
    *   AI Service: `cd backend && uvicorn main:app --reload`

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
