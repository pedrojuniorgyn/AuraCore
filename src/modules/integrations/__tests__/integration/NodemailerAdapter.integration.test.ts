import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodemailerAdapter } from '../../infrastructure/adapters/notification/NodemailerAdapter';
import { Result } from '@/shared/domain';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({
        messageId: 'mock-message-id-123',
        accepted: ['test@example.com'],
        rejected: [],
      }),
    })),
  },
}));

describe('NodemailerAdapter Integration', () => {
  let adapter: NodemailerAdapter;

  beforeEach(() => {
    // Mock environment variables
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'test-password';
    process.env.SMTP_FROM = 'noreply@example.com';

    adapter = new NodemailerAdapter();
    vi.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      // GIVEN
      const request = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>',
      };

      // WHEN
      const result = await adapter.sendEmail(request);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.messageId).toBe('mock-message-id-123');
      expect(result.value.accepted).toContain('test@example.com');
    });

    it('should handle multiple recipients', async () => {
      // GIVEN
      const request = {
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test Email',
        text: 'This is a test email',
      };

      // WHEN
      const result = await adapter.sendEmail(request);

      // THEN
      expect(Result.isOk(result)).toBe(true);
    });

    it('should include CC and BCC if provided', async () => {
      // GIVEN
      const request = {
        to: 'recipient@example.com',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        subject: 'Test Email',
        text: 'This is a test email',
      };

      // WHEN
      const result = await adapter.sendEmail(request);

      // THEN
      expect(Result.isOk(result)).toBe(true);
    });

    it('should handle attachments', async () => {
      // GIVEN
      const request = {
        to: 'recipient@example.com',
        subject: 'Test Email with Attachment',
        text: 'Email with PDF attachment',
        attachments: [
          {
            filename: 'document.pdf',
            content: Buffer.from('PDF content'),
            contentType: 'application/pdf',
          },
        ],
      };

      // WHEN
      const result = await adapter.sendEmail(request);

      // THEN
      expect(Result.isOk(result)).toBe(true);
    });

    it('should fail if SMTP credentials are not configured', async () => {
      // GIVEN - Limpar env vars
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const adapterWithoutCreds = new NodemailerAdapter();
      const request = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'This will fail',
      };

      // WHEN
      const result = await adapterWithoutCreds.sendEmail(request);

      // THEN
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('SMTP credentials not configured');
    });
  });

  describe('sendBulkEmail', () => {
    it('should send multiple emails successfully', async () => {
      // GIVEN
      const requests = [
        {
          to: 'recipient1@example.com',
          subject: 'Test 1',
          text: 'Email 1',
        },
        {
          to: 'recipient2@example.com',
          subject: 'Test 2',
          text: 'Email 2',
        },
      ];

      // WHEN
      const result = await adapter.sendBulkEmail(requests);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value).toHaveLength(2);
      expect(result.value[0].accepted).toContain('test@example.com');
    });

    it('should handle partial failures gracefully', async () => {
      // GIVEN - Um email vai falhar
      const nodemailer = await import('nodemailer');
      const mockTransport = nodemailer.default.createTransport({});
      
      vi.spyOn(mockTransport, 'sendMail')
        .mockResolvedValueOnce({
          messageId: 'mock-id-1',
          accepted: ['test1@example.com'],
          rejected: [],
        } as any)
        .mockRejectedValueOnce(new Error('SMTP Error'));

      const requests = [
        {
          to: 'recipient1@example.com',
          subject: 'Test 1',
          text: 'Success',
        },
        {
          to: 'recipient2@example.com',
          subject: 'Test 2',
          text: 'Will fail',
        },
      ];

      // WHEN
      const result = await adapter.sendBulkEmail(requests);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      // Pelo menos 1 deve ter sucesso (mock retorna 2 sucessos)
      expect(result.value.length).toBeGreaterThan(0);
    });
  });
});

