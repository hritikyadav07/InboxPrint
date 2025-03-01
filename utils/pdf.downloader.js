const puppeteer = require("puppeteer");
const { fetchFilteredEmails } = require("./gmail.filter"); // ✅ Reusing function

async function generateEmailPDF(accessToken, emailId) {
  // ✅ Fetch the email using the existing helper function
  const email = await fetchFilteredEmails(accessToken, { id: emailId });


  if (!email || email.length === 0) {
    throw new Error("Email not found");
  }

  const message = email; // Get the first email


  const subject = message.subject || "No Subject";
  const from = message.from || "Unknown Sender";
  const snippet = message.snippet || "No preview available";
  const emailBody = message.body || "No body available";

  // ✅ Creating structured HTML for PDF
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

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(emailContent, { waitUntil: "domcontentloaded" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "10mm", right: "10mm" },
  });

  await browser.close();
  return pdfBuffer;
}

async function generateNEmailsPDF(accessToken, emailIds) {
const pdfBuffers = [];
await Promise.all(
    emailIds.map(async (id) => {
        const pdfBuffer = await generateEmailPDF(accessToken, id);
        pdfBuffers.push(pdfBuffer);
    })
);
  return Buffer.concat(pdfBuffers);
}

module.exports = { generateEmailPDF, generateNEmailsPDF };
