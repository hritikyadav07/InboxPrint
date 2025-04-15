const { google } = require("googleapis");
const winston = require('winston');

const MAX_RESULTS = process.env.MAX_RESULTS || 20; // Default to 20 if not set

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/gmail_filter.log' })
  ]
});

async function fetchFilteredEmails(accessToken, filters, maxResults = MAX_RESULTS) {
  logger.info(`Fetching emails with filters: ${JSON.stringify(filters)}`);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  let query = "";
  if (filters.from) query += `from:${filters.from} `;
  if (filters.to) query += `to:${filters.to} `;
  if (filters.after) query += `after:${filters.after} `;
  if (filters.before) query += `before:${filters.before} `;
  if (filters.id) {
    logger.info(`Fetching email by ID: ${filters.id}`);
    const email = await fetchEmailById(gmail, filters.id);
    logger.info(`Email fetched successfully for ID: ${filters.id}`);
    return [email]; // wrap in an array for consistency
  }

  const response = await gmail.users.messages.list({
    userId: "me",
    q: query.trim(),
    maxResults: parseInt(maxResults, 10),
  });

  const messages = response.data.messages || [];
  if (messages.length === 0) {
    logger.warn(`No emails found with the provided filters.`);
    return [];
  }

  logger.info(`Found ${messages.length} emails. Fetching details...`);
  return await Promise.all(messages.map(async (msg) => fetchEmailById(gmail, msg.id)));
}

// ✅ New function to fetch a single email by ID
async function fetchEmailById(gmail, emailId) {
  const message = await gmail.users.messages.get({
    userId: "me",
    id: emailId,
  });
  // console.log("Message fetched:", message.data);

  const headers = message.data.payload.headers;
  const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
  const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender";
  const snippet = message.data.snippet || "No preview available";

  // ✅ Extracting email body
  // Nowadays body is stored in parts, so we need to find the right part
  // these parts can be text/plain, text/html, images, pdfs, etc.
  let emailBody = "No body available";
  if (message.data.payload.parts) {
    // console.log("Message parts:", message.data.payload.parts);
    const part = message.data.payload.parts.find((p) => p.mimeType === "text/html");
    if (part && part.body && part.body.data) {
      emailBody = Buffer.from(part.body.data, "base64").toString("utf-8");
    }
  }

  return {
    id: emailId,
    subject,
    from,
    snippet,
    body: emailBody,
  };
}

async function fetchFilteredEmailIds(accessToken, filters) {
  const emails = await fetchFilteredEmails(accessToken, filters);

  const emailIds = emails.map((m) => m.id);

  return emailIds;
}

module.exports = { fetchFilteredEmails, fetchFilteredEmailIds };
