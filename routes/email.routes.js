const express = require('express');
const router = express.Router();
const { google } = require("googleapis");
const puppeteer = require("puppeteer");
// const fs = require("fs");
const stream = require("stream");
const { fetchFilteredEmails , fetchFilteredEmailIds } = require("../utils/gmail.filter");
const { checkAuth } = require("../middlewares/auth.middleware");
const { generateEmailPDF, generateNEmailsPDF } = require("../utils/pdf.downloader");


router.get("/get-all-emails", checkAuth, async (req, res) => {
  try {
    const emails = await fetchFilteredEmails(req.accessToken, {});
    res.json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).send("Error fetching emails.");
  }
});

router.get('/get-all-email-ids', checkAuth, async (req, res) => {
  try {
    const emailIds = await fetchFilteredEmailIds(req.accessToken, {});
    res.json(emailIds);
  } catch (error) {
    console.error("Error fetching email IDs:", error);
    res.status(500).send("Error fetching email IDs.");
  }
});


// ✅ Route: Get emails from a specific sender
router.get("/get-emails-from", checkAuth, async (req, res) => {
  if (!req.query.from) {
    return res.status(400).send("Missing required query parameter: 'from'");
  }

  try {
    const emails = await fetchFilteredEmails(req.accessToken, {
      from: req.query.from,
    });
    res.json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).send("Error fetching emails.");
  }
});

router.get("/get-email-ids-from", checkAuth, async (req, res) => {
  if (!req.query.from) {
    return res.status(400).send("Missing required query parameter: 'from'");
  }

  try {
    const emailIds = await fetchFilteredEmailIds(req.accessToken, {
      from: req.query.from,
    });
    res.json(emailIds);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).send("Error fetching emails.");
  }
});


// ✅ Route: Get emails within a date range
router.get("/get-emails-date-range", checkAuth, async (req, res) => {
  if (!req.query.after || !req.query.before) {
    return res
      .status(400)
      .send("Missing required query parameters: 'after' and 'before'");
  }

  try {
    const emails = await fetchFilteredEmails(req.accessToken, {
      after: req.query.after,
      before: req.query.before,
    });
    res.json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).send("Error fetching emails.");
  }
});

router.get("/get-email-ids-date-range", checkAuth, async (req, res) => {
  if (!req.query.after || !req.query.before) {
    return res
      .status(400)
      .send("Missing required query parameters: 'after' and 'before'");
  }

  try {
    const emailIds = await fetchFilteredEmailIds(req.accessToken, {
      after: req.query.after,
      before: req.query.before,
    });
    res.json(emailIds);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).send("Error fetching emails.");
  }
});


router.get("/download-pdf/:id", checkAuth, async (req, res) => {
  try {
    
    const pdfBuffer = await generateEmailPDF(req.accessToken, req.params.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="email_${req.params.id}.pdf"`
    );

    const pdfStream = new require("stream").PassThrough();
    pdfStream.end(pdfBuffer);
    pdfStream.pipe(res);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF.");
  }
});

router.get('/download-pdf-email-from', checkAuth, async (req, res) => {
  if (!req.query.from) {
    return res.status(400).send("Missing required query parameter: 'from'");
  }

  try {
    const emailIds = await fetchFilteredEmailIds(req.accessToken, {
      from: req.query.from,
    });

    if (!emailIds || emailIds.length === 0) {
      return res.status(400).send("No email found from the specified sender.");
    }

    const pdfBuffer = await generateNEmailsPDF(req.accessToken, emailIds);
    // console.log(pdfBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="emails_from_${req.query.from}.pdf"`
    );

    const pdfStream = new stream.PassThrough();
    pdfStream.end(pdfBuffer);
    pdfStream.pipe(res);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF.");
  }
});

router.get('/download-pdf-emails-date-range', checkAuth, async (req, res) => {
  if (!req.query.after || !req.query.before) {
    return res
      .status(400)
      .send("Missing required query parameters: 'after' and 'before'");
  }

  try {
    const emailIds = await fetchFilteredEmailIds(req.accessToken, {
      after: req.query.after,
      before: req.query.before,
    });

    const pdfBuffer = await generateNEmailsPDF(req.accessToken, emailIds);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="emails_${req.query.after}_to_${req.query.before}.pdf"`
    );

    const pdfStream = new stream.PassThrough();
    pdfStream.end(pdfBuffer);
    pdfStream.pipe(res);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF.");
  }
});

module.exports = router;