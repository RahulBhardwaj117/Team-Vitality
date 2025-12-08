import torch
import torch.nn as nn
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import r2_score

# Data Loading and Preprocessing (Delhi-exclusive: district-level GW)
gw_df = pd.read_csv('ground_water.csv')  # Primary
detailed_df = pd.read_csv('detailed_ground_water.csv')
gw_df = gw_df.merge(detailed_df[['District', 'Extractable_Resource', 'Total_Extraction']], left_on='Name of District', right_on='District', how='left')
gw_df = gw_df.dropna(subset=['Name of District'])  # Delhi districts only
features = ['Monsoon season recharge from rainfall', 'Monsoon season recharge from other sources',
            'Non-monsoon season recharge from rainfall', 'Non-monsoon season recharge from other sources']
target = 'Total_Extraction'
X = gw_df[features].values
y = gw_df[target].values.reshape(-1, 1)
scaler_X = MinMaxScaler()
scaler_y = MinMaxScaler()
X_scaled = scaler_X.fit_transform(X)
y_scaled = scaler_y.fit_transform(y)
X_tensor = torch.tensor(X_scaled, dtype=torch.float32)
y_tensor = torch.tensor(y_scaled, dtype=torch.float32)
train_size = int(0.8 * len(X))
X_train, X_test = X_tensor[:train_size], X_tensor[train_size:]
y_train, y_test = y_tensor[:train_size], y_tensor[train_size:]

# Model Definition
class GWNet(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(GWNet, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.dropout = nn.Dropout(0.1)
        self.fc2 = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x

model = GWNet(input_size=len(features), hidden_size=20, output_size=1)

# Training
criterion = nn.MSELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
for epoch in range(100):
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
    preds = model(X_test)
    r2 = r2_score(y_test.numpy(), preds.numpy())
    print(f'R2 Score: {r2}')

# Inference Example (predict extraction for sample input)
sample_input = torch.tensor(scaler_X.transform(np.array([[100, 200, 50, 300]])))  # Example recharge values
pred_scaled = model(sample_input).detach().numpy()
pred = scaler_y.inverse_transform(pred_scaled)
print('Predicted Extraction:', pred[0][0])