const puppeteer = require("puppeteer");
const { fetchFilteredEmails } = require("./gmail.filter"); // ✅ Reusing function
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/pdf_downloader.log' })
  ]
});

// Shared Puppeteer browser instance
let browserInstance = null;

async function getBrowserInstance() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch();
  }
  return browserInstance;
}

async function closeBrowserInstance() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

class EmailNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "EmailNotFoundError";
  }
}

class PDFGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PDFGenerationError";
  }
}

async function generateEmailPDF(accessToken, emailId) {
  try {
    logger.info(`Starting PDF generation for emailId: ${emailId}`);
    const email = await fetchFilteredEmails(accessToken, { id: emailId });

    if (!email || email.length === 0) {
      logger.warn(`Email not found for emailId: ${emailId}`);
      throw new EmailNotFoundError("Email not found");
    }

    logger.info(`Email fetched successfully for emailId: ${emailId}`);
    const message = email[0];
    const subject = message.subject || "No Subject";
    const from = message.from || "Unknown Sender";
    const snippet = message.snippet || "No preview available";
    const emailBody = message.body || "No body available";

    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email PDF</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h2 { color: #333; }
          hr { border: 1px solid #ddd; }
          p { font-size: 14px; }
        </style>
      </head>
      <body>
        <h2>Email Details</h2>
        <p><b>Subject:</b> ${subject}</p>
        <p><b>From:</b> ${from}</p>
        <p><b>Snippet:</b> ${snippet}</p>
        <hr>
        <p>${emailBody}</p>
      </body>
      </html>
    `;

    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    await page.setContent(emailContent, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "10mm", right: "10mm" },
    });

    logger.info(`PDF generated successfully for emailId: ${emailId}`);
    await page.close();
    return pdfBuffer;
  } catch (error) {
    logger.error(`Error generating PDF for emailId: ${emailId} - ${error.message}`);
    if (error instanceof EmailNotFoundError) {
      throw error;
    }
    throw new PDFGenerationError("Failed to generate PDF: " + error.message);
  }
}

async function generateNEmailsPDF(accessToken, emailIds) {
  try {
    if (!emailIds || emailIds.length === 0) {
      return Buffer.from("", "utf-8"); // Return an empty PDF buffer
    }

    logger.info(`Starting PDF generation for ${emailIds.length} emails`);
    const browser = await getBrowserInstance();

    // Fetch all emails first
    const emails = await Promise.all(
      emailIds.map(async (id) => {
        const result = await fetchFilteredEmails(accessToken, { id });
        return result && result.length > 0 ? result[0] : null;
      })
    );

    // Filter out any null results
    const validEmails = emails.filter(email => email !== null);
    
    if (validEmails.length === 0) {
      logger.warn("No valid emails found to generate PDF");
      return Buffer.from("", "utf-8");
    }

    // Create a single HTML document with all emails
    const emailsContent = validEmails.map(message => {
      const subject = message.subject || "No Subject";
      const from = message.from || "Unknown Sender";
      const snippet = message.snippet || "No preview available";
      const emailBody = message.body || "No body available";

      return `
        <div class="email-container">
          <h2>Email Details</h2>
          <p><b>Subject:</b> ${subject}</p>
          <p><b>From:</b> ${from}</p>
          <p><b>Snippet:</b> ${snippet}</p>
          <hr>
          <p>${emailBody}</p>
        </div>
        <div class="page-break"></div>
      `;
    }).join('');

    const page = await browser.newPage();
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Emails PDF</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h2 { color: #333; }
          hr { border: 1px solid #ddd; }
          p { font-size: 14px; }
          .email-container { margin-bottom: 30px; }
          .page-break { page-break-after: always; break-after: page; height: 0; }
        </style>
      </head>
      <body>
        ${emailsContent}
      </body>
      </html>
    `, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "10mm", right: "10mm" },
    });

    logger.info(`PDF generated successfully for ${validEmails.length} emails`);
    await page.close();
    return pdfBuffer;
  } catch (error) {
    logger.error(`Error generating multiple PDFs: ${error.message}`);
    throw new PDFGenerationError("Failed to generate PDF: " + error.message);
  }
}

process.on("exit", closeBrowserInstance);
process.on("SIGINT", closeBrowserInstance);
process.on("SIGTERM", closeBrowserInstance);

module.exports = { generateEmailPDF, generateNEmailsPDF };
