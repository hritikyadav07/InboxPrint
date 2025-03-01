# InboxPrint

## Project Description
InboxPrint is a backend server built with Node.js and Express that fetches emails from a Gmail account, applies various filters, and generates PDFs for individual or multiple emails. The application uses the Gmail API for email retrieval and Puppeteer for PDF creation. User authentication is handled through Google OAuth.

## Features
- Fetch all emails or filter by sender, date range, etc.
- Generate a PDF for a single email.
- Combine multiple emails into one PDF.
- User authentication via Google OAuth.

## Installation and Running the Project
1. Clone the repository:
   ```bash
   git clone [<repository-url>](https://github.com/hritikyadav07/InboxPrint)
   ```
2. Navigate to the project directory:
   ```bash
   cd /InboxPrint
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the project root with the following content:
   ```properties
   PORT = 5000
   GOOGLE_CLIENT_ID = YOUR_GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET = YOUR_GOOGLE_CLIENT_SECRET
   CALLBACK_URL = http://localhost:5000/auth/google/callback
   SESSION_SECRET = YOUR_SECRET_KEY
   ```
5. Start the server:
   ```bash
   npm start
   ```
6. Open your browser and visit `http://localhost:5000` to access the app.

## API Routes

### Authentication Routes
- **GET /auth/google**  
  Initiates Google OAuth.  
  **Input:** None  
  **Response:** Redirects to Google’s OAuth consent screen.

- **GET /auth/google/callback**  
  Callback for Google OAuth.  
  **Input:** OAuth callback parameters  
  **Response:** On success, redirects to the home/dashboard; on failure, redirects to `/`.

- **GET /auth/logout**  
  Logs out the user.  
  **Input:** None  
  **Response:** Redirects to the homepage.

### Email Routes
- **GET /email/get-all-emails**  
  Retrieves all emails.  
  **Input:** Requires an access token (via `Authorization` header or session).  
  **Response:** JSON array of emails (each with `id`, `subject`, `from`, `snippet`, and `body`).

- **GET /email/get-all-email-ids**  
  Retrieves IDs of all emails.  
  **Input:** Requires an access token.  
  **Response:** JSON array of email IDs.

- **GET /email/get-emails-from**  
  Retrieves emails from a specific sender.  
  **Input:** Query parameter `from` e.g., `/email/get-emails-from?from=example@gmail.com`  
  **Response:** JSON array of emails from that sender.

- **GET /email/get-email-ids-from**  
  Retrieves email IDs from a specific sender.  
  **Input:** Query parameter `from`  
  **Response:** JSON array of email IDs.

- **GET /email/get-emails-date-range**  
  Retrieves emails within a date range.  
  **Input:** Query parameters `after` and `before` e.g., `/email/get-emails-date-range?after=1609459200&before=1612137600`  
  **Response:** JSON array of emails in the specified date range.

- **GET /email/get-email-ids-date-range**  
  Retrieves email IDs within a date range.  
  **Input:** Query parameters `after` and `before`  
  **Response:** JSON array of email IDs.

- **GET /email/download-pdf/:id**  
  Generates a PDF for a single email using its ID.  
  **Input:** URL parameter `id` and valid access token.  
  **Response:** PDF file download (e.g., `email_12345.pdf`).

- **GET /email/download-pdf-email-from**  
  Generates one PDF for all emails from a specific sender.  
  **Input:** Query parameter `from`  
  **Response:** PDF file download (e.g., `emails_from_sender@example.com.pdf`).

- **GET /email/download-pdf-emails-date-range**  
  Generates one PDF for all emails within a specific date range.  
  **Input:** Query parameters `after` and `before`  
  **Response:** PDF file download (e.g., `emails_1609459200_to_1612137600.pdf`).

## Examples

### Fetch All Emails
Request:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:5000/email/get-all-emails
```
Response:
```json
[
  {
    "id": "12345",
    "subject": "Test Email",
    "from": "sender@example.com",
    "snippet": "This is a test email...",
    "body": "<p>Full email content here</p>"
  }
]
```

### Generate PDF for a Single Email
Request:
```bash
curl -O -J http://localhost:5000/email/download-pdf/12345
```
Response:
Downloads a PDF file named `email_12345.pdf`.

### Generate PDF for Emails from a Specific Sender
Request:
```bash
curl -O -J "http://localhost:5000/email/download-pdf-email-from?from=sender@example.com"
```
Response:
Downloads a PDF file named `emails_from_sender@example.com.pdf`.

### Generate PDF for Emails in a Date Range
Request:
```bash
curl -O -J "http://localhost:5000/email/download-pdf-emails-date-range?after=1609459200&before=1612137600"
```
Response:
Downloads a PDF file named `emails_1609459200_to_1612137600.pdf`.

## Project Structure
- **/server.js** – Main server initialization with Express.
- **/routes/** – Contains route definitions for authentication and email functionalities.
- **/utils/** – Contains helper functions for interacting with the Gmail API and generating PDFs.
- **/middlewares/** – Contains middleware for authentication.
- **/config/** – Contains Passport configuration for Google OAuth.
- **/.env** – Environment variable configuration.

## License
MIT

