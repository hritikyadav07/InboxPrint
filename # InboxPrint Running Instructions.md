# InboxPrint Running Instructions

## Prerequisites
*   Node.js (LTS version recommended)
*   npm (usually included with Node.js)
*   Git
*   Access to a Google Account and Google Cloud Console

## Setup Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/hritikyadav07/InboxPrint # Or your repository URL
    cd InboxPrint
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Google Cloud Credentials:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project or select an existing one.
    *   Navigate to "APIs & Services" > "Credentials".
    *   Click "Create Credentials" > "OAuth client ID".
    *   Choose "Web application" as the application type.
    *   Give it a name (e.g., "InboxPrint Dev").
    *   Under "Authorized redirect URIs", add the callback URL your application will use. For local development, this is typically `http://localhost:5000/auth/google/callback` (assuming the default port 5000).
    *   Click "Create". You will be shown a **Client ID** and **Client Secret**. Keep these safe.
    *   Navigate to "APIs & Services" > "Library".
    *   Search for "Gmail API" and enable it for your project.

4.  **Create Environment File:**
    *   Make a copy of the `.env.sample` file and name it `.env`.
        ```bash
        # On Windows Command Prompt
        copy .env.sample .env

        # On Windows PowerShell or Linux/macOS bash
        cp .env.sample .env
        ```
    *   Open the `.env` file and fill in the values:
        ```dotenv
        # The port number on which the server will run (default is 5000)
        PORT=5000

        # Google Cloud OAuth 2.0 Client ID (from Step 3)
        GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID

        # Google Cloud OAuth 2.0 Client Secret (from Step 3)
        GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

        # The callback URL for Google OAuth 2.0 (must match Step 3)
        CALLBACK_URL=http://localhost:5000/auth/google/callback

        # A strong secret key for session management
        # Generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
        SESSION_SECRET=YOUR_GENERATED_SESSION_SECRET

        # Optional: Maximum results per Gmail API call (default is 20)
        # MAX_RESULTS=20
        ```
    *   Generate a strong `SESSION_SECRET` by running the following command in your terminal and pasting the output into the `.env` file:
        ```bash
        node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
        ```

5.  **Start the Server:**
    ```bash
    npm start
    ```
    You should see output indicating the server is running, e.g., `Server running on port 5000`.

## Usage

1.  **Authenticate:** Open your web browser and navigate to `http://localhost:5000/auth/google` (or your configured host/port). This will redirect you to Google to log in and authorize the application to access your Gmail (read-only). After successful authentication, Google will redirect you back to the application (specifically to the `CALLBACK_URL`, which redirects to `/`).
2.  **Access API Endpoints:** Once authenticated, your browser session will store the necessary credentials (or you can use the access token directly if building a separate frontend). You can now make requests to the API endpoints defined in the `README.md` or test them using tools like `curl` or Postman. Remember that routes under `/email/*` require authentication.

    *   **Example (Get all emails):** `http://localhost:5000/email/get-all-emails`
    *   **Example (Download PDF for one email):** `http://localhost:5000/email/download-pdf/YOUR_EMAIL_ID`
    *   **Example (Download PDF for emails from sender):** `http://localhost:5000/email/download-pdf-email-from?from=sender@example.com`

## Running Tests (Optional)

1.  **Configure Test Script:** Ensure the `scripts.test` value in `package.json` is set to run Jest:
    ```json
    // filepath: package.json
    {
      // ... other properties
      "scripts": {
        "start": "node server.js", // Assuming you have a start script
        "test": "jest" // Make sure this line exists or is updated
      },
      // ... other properties
    }
    ```
2.  **Run Tests:**
    ```bash
    npm test
    ```