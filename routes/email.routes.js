const express = require('express');
const router = express.Router();
const { google } = require("googleapis");
const puppeteer = require("puppeteer");
const stream = require("stream");
const { fetchFilteredEmails , fetchFilteredEmailIds } = require("../utils/gmail.filter");
const { checkAuth } = require("../middlewares/auth.middleware");
const { generateEmailPDF, generateNEmailsPDF } = require("../utils/pdf.downloader");
const { query, validationResult } = require('express-validator');

// Middleware for validating query parameters
const validateQuery = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  next();
};

router.get("/get-all-emails", checkAuth, async (req, res) => {
  try {
    const emails = await fetchFilteredEmails(req.accessToken, {});
    res.json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).send("Error fetching emails.");
  }
});

// Removed fetchFilteredEmailIds usage and moved ID extraction logic directly into routes
router.get('/get-all-email-ids', checkAuth, async (req, res) => {
  try {
    const emails = await fetchFilteredEmails(req.accessToken, {});
    const emailIds = emails.map((email) => email.id);
    res.json(emailIds);
  } catch (error) {
    console.error("Error fetching email IDs:", error);
    res.status(500).send("Error fetching email IDs.");
  }
});


// ✅ Route: Get emails from a specific sender
router.get(
  "/get-emails-from",
  checkAuth,
  validateQuery([query("from").isEmail().withMessage("Invalid email address")]),
  async (req, res) => {
    try {
      const emails = await fetchFilteredEmails(req.accessToken, {
        from: req.query.from,
      });
      res.json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).send("Error fetching emails.");
    }
  }
);

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
    // Parse dates in MMDDYYYY format
    const afterParts = req.query.after.match(/^(\d{2})(\d{2})(\d{4})$/);
    const beforeParts = req.query.before.match(/^(\d{2})(\d{2})(\d{4})$/);

    if (!afterParts || !beforeParts) {
      return res.status(400).send("Invalid date format. Use MMDDYYYY format (e.g., 01012023 for Jan 1, 2023).");
    }

    // Create date objects from parts (month-1 because JS months are 0-indexed)
    const afterDate = new Date(
      parseInt(afterParts[3]), // year
      parseInt(afterParts[1]) - 1, // month (0-indexed)
      parseInt(afterParts[2]) // day
    );
    
    const beforeDate = new Date(
      parseInt(beforeParts[3]), // year
      parseInt(beforeParts[1]) - 1, // month (0-indexed)
      parseInt(beforeParts[2]) // day
    );

    // Convert to UNIX timestamps (seconds) for Gmail API
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);
    const beforeTimestamp = Math.floor(beforeDate.getTime() / 1000);

    const emails = await fetchFilteredEmails(req.accessToken, {
      after: afterTimestamp,
      before: beforeTimestamp,
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
    // Parse dates in MMDDYYYY format
    const afterParts = req.query.after.match(/^(\d{2})(\d{2})(\d{4})$/);
    const beforeParts = req.query.before.match(/^(\d{2})(\d{2})(\d{4})$/);

    if (!afterParts || !beforeParts) {
      return res.status(400).send("Invalid date format. Use MMDDYYYY format (e.g., 01012023 for Jan 1, 2023).");
    }

    // Create date objects from parts (month-1 because JS months are 0-indexed)
    const afterDate = new Date(
      parseInt(afterParts[3]), // year
      parseInt(afterParts[1]) - 1, // month (0-indexed)
      parseInt(afterParts[2]) // day
    );
    
    const beforeDate = new Date(
      parseInt(beforeParts[3]), // year
      parseInt(beforeParts[1]) - 1, // month (0-indexed)
      parseInt(beforeParts[2]) // day
    );

    // Convert to UNIX timestamps (seconds) for Gmail API
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);
    const beforeTimestamp = Math.floor(beforeDate.getTime() / 1000);

    const emailIds = await fetchFilteredEmailIds(req.accessToken, {
      after: afterTimestamp,
      before: beforeTimestamp,
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

    const pdfStream = new stream.PassThrough();
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
    // Parse dates in MMDDYYYY format
    const afterParts = req.query.after.match(/^(\d{2})(\d{2})(\d{4})$/);
    const beforeParts = req.query.before.match(/^(\d{2})(\d{2})(\d{4})$/);

    if (!afterParts || !beforeParts) {
      return res.status(400).send("Invalid date format. Use MMDDYYYY format (e.g., 01012023 for Jan 1, 2023).");
    }

    // Create date objects from parts (month-1 because JS months are 0-indexed)
    const afterDate = new Date(
      parseInt(afterParts[3]), // year
      parseInt(afterParts[1]) - 1, // month (0-indexed)
      parseInt(afterParts[2]) // day
    );
    
    const beforeDate = new Date(
      parseInt(beforeParts[3]), // year
      parseInt(beforeParts[1]) - 1, // month (0-indexed)
      parseInt(beforeParts[2]) // day
    );

    // Convert to UNIX timestamps (seconds) for Gmail API
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);
    const beforeTimestamp = Math.floor(beforeDate.getTime() / 1000);

    const emailIds = await fetchFilteredEmailIds(req.accessToken, {
      after: afterTimestamp,
      before: beforeTimestamp,
    });

    if (!emailIds || emailIds.length === 0) {
      return res.status(400).send("No emails found within the specified date range.");
    }

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