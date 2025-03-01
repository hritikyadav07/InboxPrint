const { google } = require("googleapis");

async function fetchFilteredEmails(accessToken, filters) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  let query = "";
  if (filters.from) query += `from:${filters.from} `;
  if (filters.to) query += `to:${filters.to} `;
  if (filters.after) query += `after:${filters.after} `;
  if (filters.before) query += `before:${filters.before} `;
  if (filters.id) {
    const email = await fetchEmailById(gmail, filters.id);
    return [email]; // wrap in an array for consistency
  }

  const response = await gmail.users.messages.list({
    userId: "me",
    q: query.trim(),
    maxResults: 20,
  });

  const messages = response.data.messages || [];
  if (messages.length === 0) return [];

  return await Promise.all(messages.map(async (msg) => fetchEmailById(gmail, msg.id)));
}

// ✅ New function to fetch a single email by ID
async function fetchEmailById(gmail, emailId) {
  const message = await gmail.users.messages.get({
    userId: "me",
    id: emailId,
  });

  const headers = message.data.payload.headers;
  const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
  const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender";
  const snippet = message.data.snippet || "No preview available";

  let emailBody = "No body available";
  if (message.data.payload.parts) {
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
