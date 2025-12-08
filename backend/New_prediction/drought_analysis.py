import torch
import torch.nn as nn
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import accuracy_score, f1_score

# Data Loading and Preprocessing (Delhi-exclusive: soil and weather)
sm_df = pd.read_csv('sm_Delhi_2020.csv')  # Primary soil moisture
weather_df = pd.read_csv('comprehensive_weather_drought_data.csv')
sm_df['Date'] = pd.to_datetime(sm_df['Date'], format='%Y/%m/%d')
weather_df['Date'] = pd.to_datetime(weather_df['Date'])
df = sm_df.merge(weather_df[['Date', 'Evapotranspiration']], on='Date', how='left')
df = df[df['DistrictName'].isin(['CENTRAL', 'NORTH WEST', 'SOUTH'])]  # Delhi districts
df = df.fillna(df.mean(numeric_only=True))
features = ['Average Soilmoisture Level (at 15cm)', 'Average SoilMoisture Volume (at 15cm)',
            'Aggregate Soilmoisture Percentage (at 15cm)', 'Volume Soilmoisture percentage (at 15cm)', 'Evapotranspiration']
# Create labels: 0=low, 1=med, 2=high risk (thresholds based on <0.2 high, etc.)
df['risk'] = np.where(df['Average Soilmoisture Level (at 15cm)'] < 0.2, 2,
                      np.where(df['Average Soilmoisture Level (at 15cm)'] < 0.4, 1, 0))
X = df[features].values
y = df['risk'].values
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)
X_tensor = torch.tensor(X_scaled, dtype=torch.float32)
y_tensor = torch.tensor(y, dtype=torch.long)
train_size = int(0.8 * len(X))
X_train, X_test = X_tensor[:train_size], X_tensor[train_size:]
y_train, y_test = y_tensor[:train_size], y_tensor[train_size:]

# Model Definition
class DroughtClassifier(nn.Module):
    def __init__(self, input_size, hidden_size, num_classes):
        super(DroughtClassifier, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, num_classes)
    
    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x

model = DroughtClassifier(input_size=len(features), hidden_size=30, num_classes=3)

# Training
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
for epoch in range(70):
    model.train()
    optimizer.zero_grad()
    outputs = model(X_train)
    loss = criterion(outputs, y_train)
    loss.backward()
    optimizer.step()
    if epoch % 20 == 0:
        print(f'Epoch {epoch}, Loss: {loss.item()}')

# Evaluation
model.eval()
with torch.no_grad():
    preds = torch.argmax(model(X_test), dim=1).numpy()
    acc = accuracy_score(y_test.numpy(), preds)
    f1 = f1_score(y_test.numpy(), preds, average='weighted')
    print(f'Accuracy: {acc}, F1: {f1}')

# Inference Example (classify risk for sample)
sample_input = torch.tensor(scaler.transform(np.array([[0.1, 5.0, 0.5, 10.0, 5.0]])))
pred = torch.argmax(model(sample_input), dim=1).item()
print('Predicted Risk (0=low,1=med,2=high):', pred)