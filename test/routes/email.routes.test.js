const request = require('supertest');
const express = require('express');
const stream = require('stream');
const { fetchFilteredEmails, fetchFilteredEmailIds } = require('../../utils/gmail.filter');
const { generateEmailPDF, generateNEmailsPDF } = require('../../utils/pdf.downloader');
const EmailRoutes = require('../../routes/email.routes');

// Mock dependencies
jest.mock('../../utils/gmail.filter', () => ({
  fetchFilteredEmails: jest.fn(),
  fetchFilteredEmailIds: jest.fn()
}));

jest.mock('../../utils/pdf.downloader', () => ({
  generateEmailPDF: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
  generateNEmailsPDF: jest.fn().mockResolvedValue(Buffer.from('Multiple emails PDF content'))
}));

jest.mock('../../middlewares/auth.middleware', () => ({
  checkAuth: (req, res, next) => {
    req.accessToken = 'mock-access-token';
    next();
  }
}));

describe('Email Routes', () => {
  let app;
  const mockEmails = [
    { id: '1', subject: 'Test Email 1', from: 'test1@example.com', snippet: 'This is test email 1.' },
    { id: '2', subject: 'Test Email 2', from: 'test2@example.com', snippet: 'This is test email 2.' }
  ];

  beforeEach(() => {
    app = express();
    app.use('/email', EmailRoutes);

    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    fetchFilteredEmails.mockResolvedValue(mockEmails);
    fetchFilteredEmailIds.mockResolvedValue(['1', '2']);
  });

  describe('GET /get-all-emails', () => {
    it('should return all emails', async () => {
      const response = await request(app).get('/email/get-all-emails');
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(fetchFilteredEmails).toHaveBeenCalledWith('mock-access-token', {});
    });

    it('should handle errors when fetching emails fails', async () => {
      fetchFilteredEmails.mockRejectedValueOnce(new Error('Failed to fetch emails'));
      
      const response = await request(app).get('/email/get-all-emails');
      
      expect(response.status).toBe(500);
    });
  });

  describe('GET /get-emails-from', () => {
    it('should return emails from a specific sender', async () => {
      const sender = 'test@example.com';
      
      const response = await request(app)
        .get(`/email/get-emails-from?from=${sender}`);
      
      expect(response.status).toBe(200);
      expect(fetchFilteredEmails).toHaveBeenCalledWith('mock-access-token', { from: sender });
    });
  });

  describe('GET /get-emails-date-range', () => {
    it('should return emails within a date range in MMDDYYYY format', async () => {
      const response = await request(app)
        .get('/email/get-emails-date-range?after=04152025&before=04202025');
      
      expect(response.status).toBe(200);
      
      // April 15, 2025 and April 20, 2025 in unix timestamp
      const april15_2025 = Math.floor(new Date(2025, 3, 15).getTime() / 1000);
      const april20_2025 = Math.floor(new Date(2025, 3, 20).getTime() / 1000);
      
      // Verify correct date conversion
      expect(fetchFilteredEmails).toHaveBeenCalledWith(
        'mock-access-token', 
        expect.objectContaining({
          after: april15_2025,
          before: april20_2025
        })
      );
    });

    it('should handle invalid date format', async () => {
      const response = await request(app)
        .get('/email/get-emails-date-range?after=2025-04-15&before=2025-04-20');
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid date format');
    });

    it('should require both after and before parameters', async () => {
      const response = await request(app)
        .get('/email/get-emails-date-range?after=04152025');
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Missing required query parameters');
    });
  });

  describe('GET /download-pdf/:id', () => {
    it('should generate and return a PDF for a specific email', async () => {
      const response = await request(app)
        .get('/email/download-pdf/12345');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('email_12345.pdf');
      expect(generateEmailPDF).toHaveBeenCalledWith('mock-access-token', '12345');
    });

    it('should handle errors during PDF generation', async () => {
      generateEmailPDF.mockRejectedValueOnce(new Error('PDF generation failed'));
      
      const response = await request(app)
        .get('/email/download-pdf/12345');
      
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error generating PDF');
    });
  });

  describe('GET /download-pdf-email-from', () => {
    it('should generate a PDF with all emails from a specific sender', async () => {
      const sender = 'test@example.com';
      
      const response = await request(app)
        .get(`/email/download-pdf-email-from?from=${sender}`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain(`emails_from_${sender}.pdf`);
    });

    it('should return 400 when sender is not provided', async () => {
      const response = await request(app)
        .get('/email/download-pdf-email-from');
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Missing required query parameter');
    });

    it('should handle no emails found from the sender', async () => {
      fetchFilteredEmailIds.mockResolvedValueOnce([]);
      
      const response = await request(app)
        .get('/email/download-pdf-email-from?from=nobody@example.com');
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('No email found from the specified sender');
    });
  });

  describe('GET /download-pdf-emails-date-range', () => {
    it('should generate a PDF with all emails in a date range', async () => {
      const response = await request(app)
        .get('/email/download-pdf-emails-date-range?after=04152025&before=04202025');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('emails_04152025_to_04202025.pdf');
      expect(generateNEmailsPDF).toHaveBeenCalledWith('mock-access-token', ['1', '2']);
    });
  });
});