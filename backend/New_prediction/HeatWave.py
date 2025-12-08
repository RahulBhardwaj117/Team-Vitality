import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, r2_score
from itertools import groupby
import os
import sys

# Fix paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Global variables
model = None
scaler = None
scaled_df = None
features = None

def initialize_model():
    global model, scaler, scaled_df, features
    
    print("Initializing Heatwave Model...")
    try:
        # Load datasets
        temp_df = pd.read_csv(os.path.join(BASE_DIR, 'delhi-temperature.csv'))
        temp_df['Date'] = pd.to_datetime(temp_df['Date'].str.replace('T00:00:00', ''))
        temp_df = temp_df[['Date', 'Temp Max', 'Temp Min', 'Rain']]
        temp_df.columns = ['date', 'max_temp', 'min_temp', 'precip']

        weather_df = pd.read_csv(os.path.join(BASE_DIR, 'delhi_weather.csv'), index_col=0)
        weather_df['DATE'] = pd.to_datetime(weather_df['DATE'])
        weather_df = weather_df[['DATE', 'tempmax', 'tempmin', 'precip']]
        weather_df.columns = ['date', 'max_temp', 'min_temp', 'precip']

        full_df = pd.concat([temp_df[temp_df['date'] < '2013-01-01'], weather_df], ignore_index=True)
        full_df = full_df.sort_values('date').drop_duplicates('date')
        full_df = full_df[full_df['date'] >= '2000-01-01']

        final_weather = pd.read_csv(os.path.join(BASE_DIR, 'final_weather.csv'))
        final_weather['Date'] = pd.to_datetime(final_weather['Date'])
        final_weather = final_weather[['Date', 'sunshine_duration', 'Evapotranspiration']]
        final_weather.columns = ['date', 'sunshine', 'et0']

        full_df = full_df.merge(final_weather, on='date', how='left')

        hum_df = pd.read_csv(os.path.join(BASE_DIR, 'humidity.csv'), skiprows=9)
        hum_df = hum_df[(hum_df['LAT'].between(28, 29.5)) & (hum_df['LON'].between(76.875, 78.125))]
        hum_df = hum_df.groupby('YEAR')[['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']].mean().reset_index()
        hum_df = hum_df.melt(id_vars='YEAR', var_name='month', value_name='humidity')
        hum_df['month'] = hum_df['month'].map({'JAN':1, 'FEB':2, 'MAR':3, 'APR':4, 'MAY':5, 'JUN':6, 'JUL':7, 'AUG':8, 'SEP':9, 'OCT':10, 'NOV':11, 'DEC':12})
        hum_df['date'] = pd.to_datetime(hum_df['YEAR'].astype(str) + '-' + hum_df['month'].astype(str) + '-01')
        hum_df = hum_df[['date', 'humidity']].sort_values('date')

        full_df['month_start'] = full_df['date'].dt.to_period('M').dt.to_timestamp()
        full_df = full_df.merge(hum_df, left_on='month_start', right_on='date', how='left', suffixes=('', '_monthly'))
        full_df['humidity'] = full_df['humidity'].ffill().bfill()
        full_df.drop(['month_start', 'date_monthly'], axis=1, inplace=True)

        full_df = full_df.fillna(method='ffill').fillna(method='bfill')

        full_df['is_heatwave'] = (full_df['max_temp'] >= 40).astype(int)

        full_df['month'] = full_df['date'].dt.month
        full_df['month_sin'] = np.sin(2 * np.pi * full_df['month']/12)
        full_df['month_cos'] = np.cos(2 * np.pi * full_df['month']/12)

        for lag in range(1,8):
            full_df[f'max_lag{lag}'] = full_df['max_temp'].shift(lag)

        full_df = full_df.dropna()

        features = ['min_temp', 'precip', 'humidity', 'sunshine', 'et0', 'month_sin', 'month_cos'] + [f'max_lag{lag}' for lag in range(1,8)] + ['max_temp']
        scaler = MinMaxScaler()
        scaled = scaler.fit_transform(full_df[features])
        scaled_df = pd.DataFrame(scaled, columns=features, index=full_df.index)

        scaled_df['target'] = scaled_df['max_temp'].shift(-1)
        scaled_df = scaled_df.dropna()

        train = scaled_df.iloc[:-730]
        test = scaled_df.iloc[-730:]
        
        train_dataset = TimeSeriesDataset(train)
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        
        input_size = len(train.drop(['target', 'max_temp'], axis=1).columns)
        hidden_size = 64
        num_layers = 2
        output_size = 1

        model = LSTMModel(input_size, hidden_size, num_layers, output_size)
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
        
        # Train briefly if imported, or fully if main
        epochs = 50 if __name__ == "__main__" else 5
        print(f"Training for {epochs} epochs...")
        
        for epoch in range(epochs):
            model.train()
            for inputs, targets in train_loader:
                optimizer.zero_grad()
                outputs = model(inputs)
                loss = criterion(outputs.squeeze(), targets)
                loss.backward()
                optimizer.step()
                
        model.eval()
        print("Heatwave Model Initialized Successfully.")
        
    except Exception as e:
        print(f"Error initializing model: {e}")
        import traceback
        traceback.print_exc()

class TimeSeriesDataset(Dataset):
    def __init__(self, data, seq_len=7):
        self.data = data.drop(['target', 'max_temp'], axis=1).values
        self.target = data['target'].values
        self.seq_len = seq_len
    
    def __len__(self):
        return len(self.data) - self.seq_len
    
    def __getitem__(self, idx):
        return torch.tensor(self.data[idx:idx+self.seq_len], dtype=torch.float32), torch.tensor(self.target[idx+self.seq_len-1], dtype=torch.float32)

class LSTMModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])

def forecast_heatwave(days=30, start_date=datetime.now()):
    if model is None: initialize_model()
    
    last_data = scaled_df.iloc[-7:].drop(['target', 'max_temp'], axis=1).values
    forecast_dates = [start_date + timedelta(days=i+1) for i in range(days)]
    forecasts = []
    
    # We need features index
    max_temp_idx = features.index('max_temp')
    
    for i in range(days):
        input_tensor = torch.tensor(last_data.reshape(1, 7, -1), dtype=torch.float32)
        with torch.no_grad():
            pred = model(input_tensor).item()
        forecasts.append(pred)
        next_month = forecast_dates[i].month
        month_sin = np.sin(2 * np.pi * next_month/12)
        month_cos = np.cos(2 * np.pi * next_month/12)
        
        # Construct new row
        # Features: min_temp, precip, humidity, sunshine, et0, month_sin, month_cos, max_lag1..7, max_temp
        # We reuse last row's exogenous vars as a simple heuristic
        new_row = np.array([last_data[-1,0], 0, last_data[-1,2], last_data[-1,3], last_data[-1,4], month_sin, month_cos, pred] + list(last_data[-1,7:13]))
        last_data = np.append(last_data[1:], new_row.reshape(1,-1), axis=0)
        
    dummy = np.zeros((days, len(features)))
    dummy[:, max_temp_idx] = forecasts
    forecast_temps = scaler.inverse_transform(dummy)[:, max_temp_idx]
    
    heat_days = np.where(forecast_temps >= 40)[0]
    heatwaves = []
    if len(heat_days) > 0:
        for k, g in groupby(enumerate(heat_days), lambda x: x[0] - x[1]):
            group = list(map(lambda x: x[1], g))
            if len(group) >= 2:
                start = forecast_dates[group[0]].strftime('%Y-%m-%d')
                end = forecast_dates[group[-1]].strftime('%Y-%m-%d')
                duration = len(group)
                peak = max(forecast_temps[group])
                heatwaves.append({'start': start, 'end': end, 'duration_days': duration, 'peak_temp': round(peak,1)})
                
    return forecast_temps, heatwaves

def predict_from_forecast(forecast_data):
    """
    Analyzes forecast data for heatwave risk.
    """
    try:
        df = pd.DataFrame(forecast_data)
        
        # Simple analysis of the provided forecast
        # Since we can't easily inject this into the LSTM without history
        
        peak_temp = df['max_temp'].max()
        heat_days = df[df['max_temp'] >= 40]
        duration = len(heat_days)
        
        risk_level = "Low"
        if peak_temp >= 45:
            risk_level = "High"
        elif peak_temp >= 40:
            risk_level = "Medium"
            
        return {
            "risk_level": risk_level,
            "peak_temp": float(peak_temp),
            "duration": int(duration),
            "confidence": 90
        }
    except Exception as e:
        print(f"Prediction error: {e}")
        return {"risk_level": "Low", "peak_temp": 0, "duration": 0, "confidence": 0}

# Run initialization if main
if __name__ == "__main__":
    initialize_model()
    forecast_temps, heatwaves = forecast_heatwave(days=30, start_date=datetime(2025, 12, 3))
    print('Forecast temps:', forecast_temps)
    print('Heatwaves:', heatwaves)
else:
    # Auto-initialize on import
    initialize_model()