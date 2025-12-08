# AgriUrbanAI Setup Instructions

To enable MongoDB Cloud storage for user credentials, please follow these steps:

1.  **Create a `.env` file** in the `AU` directory (`c:\Users\sambh\.vscode\TeamVitality\AU\.env`).
2.  **Add your MongoDB Connection String** and other configuration to the `.env` file.

   **Example `.env` content:**

   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/agriurbanai?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_change_this
   PORT=5000
   ```

   *   Replace `<username>`, `<password>`, and `<cluster>` with your actual MongoDB Atlas credentials.
   *   Ensure your IP address is whitelisted in MongoDB Atlas Network Access.

3.  **Restart the Application**
    *   If the server is running, stop it and start it again (`npm start` or `node server.js`).

## Troubleshooting

*   **Connection Error:** Check if your IP is allowed in MongoDB Atlas.
*   **Authentication Failed:** Ensure the `MONGO_URI` is correct and the database user has read/write permissions.
