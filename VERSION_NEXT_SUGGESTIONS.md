# InboxPrint - Suggestions for Next Version

This document outlines proposed improvements and enhancements for consideration in future releases of InboxPrint.

## Architecture Improvements

### Puppeteer Instance Management
- The `utils/puppeteer.pool.js` provides a good way to manage a shared browser instance
- Ensure that error handling around `getBrowserInstance` and `closeBrowserInstance` is robust, especially in scenarios where the browser might crash unexpectedly
- Consider adding logging within the pool management functions

### Configuration Consistency
- The `MAX_RESULTS` environment variable is used in `gmail.filter.js`
- Ensure this is clearly documented in the `README.md` and `.env.sample` as controlling the maximum results per API call
- Note that this does not necessarily reflect the total results if pagination were implemented (though it isn't currently)

## Security Enhancements

### HTML Sanitization
- While the current HTML generation in `pdf.downloader.js` uses data fetched directly from the Gmail API (subject, from, snippet, body), there are potential security concerns
- If the email body contains complex HTML or potentially malicious scripts, rendering it directly with Puppeteer could pose a risk if Puppeteer's sandboxing were ever compromised or misconfigured
- For maximum security, consider using a sanitization library (like DOMPurify applied server-side before generating the HTML string) to clean the `email.body` before embedding it
- This adds an additional layer of defense against potential XSS or other injection attacks

## Feature Requests
- Add optional parameters for date range routes
- Implement additional email filtering options (by recipient, subject, content, etc.)