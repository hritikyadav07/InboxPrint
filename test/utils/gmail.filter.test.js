const { google } = require('googleapis');

// Mock the Gmail API
jest.mock('googleapis', () => {
  const mockMessagesGet = jest.fn();
  const mockMessagesList = jest.fn();
  
  // Mock email data
  mockMessagesGet.mockImplementation(({ id }) => {
    if (id === '1') {
      return Promise.resolve({
        data: {
          id: '1',
          payload: {
            headers: [
              { name: 'From', value: 'test1@example.com' },
              { name: 'Subject', value: 'Test Email 1' },
              { name: 'Date', value: 'Mon, 14 Apr 2025 10:00:00 GMT' }
            ],
            parts: [
              {
                mimeType: 'text/html',
                body: { data: Buffer.from('<p>Test Email 1 Body</p>').toString('base64') }
              }
            ],
            body: { data: '' }
          },
          snippet: 'This is test email 1.'
        }
      });
    } else {
      return Promise.resolve({
        data: {
          id: '2',
          payload: {
            headers: [
              { name: 'From', value: 'test2@example.com' },
              { name: 'Subject', value: 'Test Email 2' },
              { name: 'Date', value: 'Tue, 15 Apr 2025 11:00:00 GMT' }
            ],
            parts: [
              {
                mimeType: 'text/html',
                body: { data: Buffer.from('<p>Test Email 2 Body</p>').toString('base64') }
              }
            ],
            body: { data: '' }
          },
          snippet: 'This is test email 2.'
        }
      });
    }
  });
  
  mockMessagesList.mockImplementation(() => {
    return Promise.resolve({
      data: {
        messages: [
          { id: '1' },
          { id: '2' }
        ],
        nextPageToken: null
      }
    });
  });
  
  return {
    google: {
      gmail: jest.fn(() => ({
        users: {
          messages: {
            list: mockMessagesList,
            get: mockMessagesGet
          }
        }
      })),
      auth: {
        OAuth2: jest.fn(() => ({
          setCredentials: jest.fn()
        }))
      }
    }
  };
});

// Import the functions to test
const { fetchFilteredEmails, fetchFilteredEmailIds } = require('../../utils/gmail.filter');

describe('Gmail Filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchFilteredEmails', () => {
    it('should fetch all emails when no filters are provided', async () => {
      const accessToken = 'test-access-token';
      const emails = await fetchFilteredEmails(accessToken, {});
      
      expect(emails).toBeInstanceOf(Array);
      expect(emails.length).toBe(2);
      expect(emails[0]).toHaveProperty('id');
      expect(emails[0]).toHaveProperty('subject');
      expect(emails[0]).toHaveProperty('from');
    });

    it('should filter emails by sender', async () => {
      const accessToken = 'test-access-token';
      await fetchFilteredEmails(accessToken, { from: 'test1@example.com' });
      
      const gmailClient = google.gmail();
      const listSpy = gmailClient.users.messages.list;
      
      expect(listSpy).toHaveBeenCalled();
      // Check if the 'from:' query was used
      const callArgs = listSpy.mock.calls[0][0];
      expect(callArgs.q).toContain('from:');
    });

    it('should filter emails by date range', async () => {
      const accessToken = 'test-access-token';
      const afterTimestamp = 1681430400; // April 14, 2025
      const beforeTimestamp = 1681516800; // April 15, 2025
      
      await fetchFilteredEmails(accessToken, { 
        after: afterTimestamp,
        before: beforeTimestamp
      });
      
      const gmailClient = google.gmail();
      const listSpy = gmailClient.users.messages.list;
      
      expect(listSpy).toHaveBeenCalled();
      // Check if both after: and before: were included in the query
      const callArgs = listSpy.mock.calls[0][0];
      expect(callArgs.q).toContain('after:');
      expect(callArgs.q).toContain('before:');
    });

    it('should filter emails by ID', async () => {
      const accessToken = 'test-access-token';
      const emails = await fetchFilteredEmails(accessToken, { id: '1' });
      
      const gmailClient = google.gmail();
      const getSpy = gmailClient.users.messages.get;
      
      expect(getSpy).toHaveBeenCalled();
      expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({
        id: '1'
      }));
      
      expect(emails).toBeInstanceOf(Array);
      expect(emails.length).toBe(1);
      expect(emails[0]).toHaveProperty('id', '1');
    });

    it('should handle API errors gracefully', async () => {
      const accessToken = 'test-access-token';
      
      // Mock API error for this test only
      const gmailClient = google.gmail();
      gmailClient.users.messages.list.mockRejectedValueOnce(
        new Error('API Error')
      );
      
      await expect(fetchFilteredEmails(accessToken, {}))
        .rejects.toThrow();
    });
  });

  describe('fetchFilteredEmailIds', () => {
    it('should return only the IDs of filtered emails', async () => {
      const accessToken = 'test-access-token';
      const emailIds = await fetchFilteredEmailIds(accessToken, {});
      
      expect(emailIds).toBeInstanceOf(Array);
      expect(emailIds.length).toBeGreaterThan(0);
      // IDs should be strings
      expect(typeof emailIds[0]).toBe('string');
    });
  });
});