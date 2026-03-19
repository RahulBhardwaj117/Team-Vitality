# How to Use AgriUrbanAI as a Mobile App

We have converted the web application into a Progressive Web App (PWA). This allows it to be installed on mobile devices and behave like a native app.

## Features Added
1.  **App Manifest**: Defines the app name, icons, and theme colors.
2.  **Service Worker**: Caches the application files to work faster and potentially offline (UI only).
3.  **Installable**: You can now install this app to your home screen.

## How to Test

### On Desktop
1.  Open the application in Chrome (e.g., `http://localhost:3000` or wherever you serve it).
2.  You should see an "Install" icon in the address bar (looks like a computer monitor with a down arrow).
3.  Click it to install the desktop version of the app.
4.  Alternatively, open DevTools (F12) -> Application -> Manifest to see the configuration.

### On Mobile (Same Network)
To test on a real phone:
1.  Connect your phone and computer to the same Wi-Fi.
2.  Find your computer's local IP address (e.g., `192.168.1.5`).
    *   **Windows**: Open terminal and run `ipconfig`. Look for "IPv4 Address".
3.  Update the API URLs in `dashboard.js`:
    *   Change `http://localhost:5000` to `http://YOUR_IP:5000`
    *   Change `http://localhost:8000` to `http://YOUR_IP:8000`
4.  Serve the `AU` folder using a web server (e.g., `npx http-server .` or via VS Code Live Server).
5.  Open `http://YOUR_IP:PORT` in Chrome on Android or Safari on iOS.
6.  **Android**: Tap the menu (three dots) -> "Add to Home Screen" or "Install App".
7.  **iOS**: Tap the Share button -> "Add to Home Screen".

## Notes
*   **Backend Connectivity**: Since the AI and Backend run on your computer, the mobile app needs to be on the same network to fetch live data. If you are outside your home network, the app will load (thanks to the PWA cache) but may show default/cached data unless you host the backend on the cloud.
*   **Offline Support**: The UI will load even without internet, but live weather updates require a connection.
