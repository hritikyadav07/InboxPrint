const puppeteer = require("puppeteer");
const { fetchFilteredEmails } = require("./gmail.filter"); // ✅ Reusing function

async function generateEmailPDF(accessToken, emailId) {
  // ✅ Fetch the email using the existing helper function
  // console.log("Fetching email with ID:", emailId);
  const email = await fetchFilteredEmails(accessToken, { id: emailId });
  // console.log("Email fetched:", email);


  if (!email || email.length === 0) {
    throw new Error("Email not found");
  }

  const message = email[0]; // Get the first email
  // console.log("Message:", message);


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
  console.log("Generating PDF for emails:", emailIds);

  // ✅ Fetch all emails at once
  const emails = await Promise.all(
    emailIds.map(async (id) => await fetchFilteredEmails(accessToken, { id }))
  );

  if (!emails || emails.length === 0) {
    throw new Error("No emails found");
  }

  // console.log("Emails fetched:", emails);

  // ✅ Generate HTML content with multiple emails
  let emailContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Multiple Emails PDF</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h2 { color: #333; }
        hr { border: 1px solid #ddd; margin: 20px 0; }
        .email { margin-bottom: 40px; }
      </style>
    </head>
    <body>
      <h1>Emails Report</h1>
  `;

  emails.forEach((email, index) => {
    // console.log("Processing email:", email[0]);
    // console.log("Email index:", index);
    email = email[0];
    if (!email || !email.id) return;

    emailContent += `
      <div class="email">
        <h2>Email ${index + 1}</h2>
        <p><b>Subject:</b> ${email.subject || "No Subject"}</p>
        <p><b>From:</b> ${email.from || "Unknown Sender"}</p>
        <p><b>Snippet:</b> ${email.snippet || "No preview available"}</p>
        <hr>
        <p>${email.body || "No body available"}</p>
      </div>
    `;
  });

  emailContent += `</body></html>`;

  console.log("Email content generated");
  console.log(emailContent);

  // ✅ Generate the PDF with all emails in a single document
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


module.exports = { generateEmailPDF, generateNEmailsPDF };
