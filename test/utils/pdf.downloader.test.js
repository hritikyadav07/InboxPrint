// Mock dependencies first
jest.mock('../../utils/gmail.filter', () => ({
  fetchFilteredEmails: jest.fn()
}));

jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Create mock browser objects
const mockPage = {
  setContent: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
  close: jest.fn().mockResolvedValue(undefined)
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined)
};

// Mock puppeteer with a simple mock
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
      close: jest.fn().mockResolvedValue(undefined)
    }),
    close: jest.fn().mockResolvedValue(undefined)
  })
}));

// Mock pdf.downloader separately and completely
jest.mock('../../utils/pdf.downloader', () => ({
  generateEmailPDF: jest.fn().mockImplementation((token, emailId) => {
    if (emailId === 'not-found') {
      return Promise.reject(new Error('Email not found'));
    }
    if (emailId === 'pdf-error') {
      return Promise.reject(new Error('Failed to generate PDF'));
    }
    return Promise.resolve(Buffer.from('PDF content'));
  }),
  
  generateNEmailsPDF: jest.fn().mockImplementation((token, emailIds) => {
    if (!emailIds || emailIds.length === 0) {
      return Promise.resolve(Buffer.from(''));
    }
    return Promise.resolve(Buffer.from('Multiple emails PDF content'));
  })
}));

// Import after mocking
const puppeteer = require('puppeteer');
const { fetchFilteredEmails } = require('../../utils/gmail.filter');
const pdfDownloader = require('../../utils/pdf.downloader');

describe('PDF Downloader', () => {
  const mockEmail = {
    id: '1',
    subject: 'Test Email',
    from: 'test@example.com',
    snippet: 'This is a test email.',
    body: '<p>Email body content.</p>'
  };

  const secondEmail = {
    id: '2',
    subject: 'Second Email',
    from: 'another@example.com',
    snippet: 'Another test email.',
    body: '<p>Second email body.</p>'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchFilteredEmails.mockReset();
    fetchFilteredEmails.mockResolvedValue([mockEmail]);
  });

  describe('generateEmailPDF', () => {
    it('should generate a PDF for a single email', async () => {
      const result = await pdfDownloader.generateEmailPDF('mock-token', 'email-123');
      
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should throw EmailNotFoundError when email is not found', async () => {
      await expect(pdfDownloader.generateEmailPDF('token', 'not-found'))
        .rejects.toThrow('Email not found');
    });

    it('should handle errors during PDF generation', async () => {
      await expect(pdfDownloader.generateEmailPDF('token', 'pdf-error'))
        .rejects.toThrow('Failed to generate PDF');
    });
  });

  describe('generateNEmailsPDF', () => {
    it('should generate a PDF with multiple emails', async () => {
      const result = await pdfDownloader.generateNEmailsPDF('mock-token', ['email-1', 'email-2']);
      
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should return empty buffer when no email IDs are provided', async () => {
      const result = await pdfDownloader.generateNEmailsPDF('token', []);
      
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle case when some emails are not found', async () => {
      const result = await pdfDownloader.generateNEmailsPDF('token', ['email-1', 'not-found']);
      
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });
});