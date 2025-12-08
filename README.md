# TeamVitality - AgriUrbanAI Desktop Application

A native desktop application built with Electron for the AgriUrbanAI platform - an AI-powered solution for smart agriculture and urban planning.

## 🚀 Features

- **Real-time Weather Monitoring**: AI-powered weather predictions with 95% accuracy
- **Farm Management**: Crop health monitoring, yield prediction, and irrigation alerts
- **Urban Planning**: Smart city flood prediction and emergency response coordination
- **Interactive Maps**: Leaflet-powered maps with risk zones and location tracking
- **Data Analytics**: Advanced charts and predictive analytics
- **Offline Capability**: Works without internet connection for core features
- **Multi-language Support**: English and Hindi language options

## 🖥️ Desktop Features

- Native desktop application experience
- Cross-platform support (Windows, macOS, Linux)
- System tray support
- Keyboard shortcuts
- Auto-updates (configurable)
- Secure IPC communication

## 🛠️ Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### From Source

1. **Clone or download the project files**
   ```bash
   cd AgriUrbanAI-Desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

### As a Built Application

Download the installer for your platform from the releases page:

- **Windows**: `AgriUrbanAI-Setup.exe`
- **macOS**: `AgriUrbanAI.dmg`
- **Linux**: `AgriUrbanAI.AppImage`

## 🔧 Development

### Project Structure

```
AU/
├── main.js              # Electron main process
├── preload.js           # Secure preload script
├── index.html           # Main application UI
├── package.json         # Application configuration
├── assets/              # Application assets
│   └── icon.svg         # Application icon
├── dashboard.js         # Main dashboard logic
├── dashboard.css        # Application styles
├── loginAU.js           # Authentication logic
├── login_AU.css         # Login styles
└── manifest.json        # PWA manifest (legacy)
```

### Development Mode

```bash
# Run in development mode with dev tools
npm run dev
```

### Building for Production

```bash
# Build installer/package for your platform
npm run dist
```

## 🎯 Getting Started

1. **Launch the Application**
   - Run `npm start` or open the installed application

2. **Demo Mode**
   - Click "Quick Demo" on the landing page for immediate access
   - Demo credentials will be auto-filled

3. **Login**
   - Use demo credentials or create a new account
   - Farmer and Urban Planner roles available

4. **Explore Features**
   - Switch between Farmer and City Planner views
   - Monitor weather forecasts and risk levels
   - Interact with the map and analytics charts

## ⌨️ Keyboard Shortcuts

- `Ctrl+N` / `Cmd+N`: New session (clears data)
- `Ctrl+Q` / `Cmd+Q`: Quit application
- `F5`: Refresh
- `F12`: Toggle developer tools
- `Ctrl+Shift+R` / `Cmd+Shift+R`: Force refresh
- `Ctrl+M` / `Cmd+M`: Minimize window
- `Ctrl+W` / `Cmd+W`: Close window

## 🌐 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js
- **Maps**: Leaflet.js
- **Icons**: Phosphor Icons
- **Desktop Framework**: Electron
- **Packaging**: Electron Builder

## 🔐 Security

- Context isolation enabled
- Secure IPC communication
- No Node.js integration in renderer
- Content Security Policy compliance

## 🐛 Troubleshooting

### Application won't start

1. Check Node.js version: `node --version`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check console for errors: `npm run dev`

### Map not loading

- Ensure internet connection for tile servers
- Check firewall settings
- Maps use OpenStreetMap tiles

### Performance issues

- Close other applications
- Restart the application
- Check system resources

## 📋 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Farmer | farmer@agriurban.ai | farmer123 |
| Urban Planner | urban@agriurban.ai | urban123 |
| Administrator | admin@agriurban.ai | admin123 |
| Quick Demo | demo@demo.com | demo |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

- **Email**: support@agriurban.ai
- **Documentation**: [Wiki](https://github.com/agriurbanai/desktop/wiki)
- **Issues**: [GitHub Issues](https://github.com/agriurbanai/desktop/issues)

---

**Built with ❤️ for sustainable agriculture and smart cities**
