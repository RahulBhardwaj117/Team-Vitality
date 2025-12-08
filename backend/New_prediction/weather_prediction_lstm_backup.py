import torch
import torch.nn as nn
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import r2_score

# Data Loading and Preprocessing (Delhi-exclusive: use weather data)
df = pd.read_csv('comprehensive_weather_drought_data.csv')  # Primary dataset
# Supplement with temp data
temp_df = pd.read_csv('delhi-temperature.csv')
df = df.merge(temp_df[['Date', 'Temp Max', 'Temp Min']], on='Date', how='left')
df = df.fillna(df.mean(numeric_only=True))  # Handle NaNs
features = ['MaxTemp', 'MinTemp', 'Rainfall', 'Evapotranspiration', 'AvgTemp']
data = df[features].values
scaler = MinMaxScaler()
data_scaled = scaler.fit_transform(data)

# Create sequences (30 days input, 7 days output)
seq_length = 30
pred_length = 7
X, y = [], []
for i in range(len(data_scaled) - seq_length - pred_length):
    X.append(data_scaled[i:i+seq_length])
    y.append(data_scaled[i+seq_length:i+seq_length+pred_length].flatten())
X = np.array(X)
y = np.array(y)
train_size = int(0.8 * len(X))
X_train, X_test = torch.tensor(X[:train_size], dtype=torch.float32), torch.tensor(X[train_size:], dtype=torch.float32)
y_train, y_test = torch.tensor(y[:train_size], dtype=torch.float32), torch.tensor(y[train_size:], dtype=torch.float32)

# Model Definition
class WeatherLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(WeatherLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

model = WeatherLSTM(input_size=len(features), hidden_size=50, output_size=len(features)*pred_length)

# Training
criterion = nn.MSELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.0005)
for epoch in range(30):
    model.train()
    optimizer.zero_grad()
    outputs = model(X_train)
    loss = criterion(outputs, y_train)
    loss.backward()
    optimizer.step()
    if epoch % 10 == 0:
        print(f'Epoch {epoch}, Loss: {loss.item()}')

# Evaluation
model.eval()
with torch.no_grad():
    preds = model(X_test)
    r2 = r2_score(y_test.numpy(), preds.numpy())
    print(f'R2 Score: {r2}')

# Inference Example (predict next 7 days from last sequence)
last_seq = torch.tensor(data_scaled[-seq_length:]).unsqueeze(0)
pred_scaled = model(last_seq).detach().numpy()
pred = scaler.inverse_transform(pred_scaled.reshape(-1, len(features)))
print('Predicted 7-day weather (flattened):', pred.flatten())