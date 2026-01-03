/**
 * INotificationService Tests
 * E7.9 Integrações - Semana 1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockNotificationService } from '../infrastructure/adapters/notification/MockNotificationService';
import { Result } from '@/shared/domain';

describe('INotificationService (Mock)', () => {
  let service: MockNotificationService;

  beforeEach(() => {
    service = new MockNotificationService();
    service.resetFailure();
    service.clearSentEmails();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Hello World</p>',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.messageId).toContain('MOCK-EMAIL');
      expect(result.value.accepted).toContain('test@example.com');
      expect(result.value.rejected).toEqual([]);
    });

    it('should send email to multiple recipients', async () => {
      const result = await service.sendEmail({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Email',
        text: 'Hello World',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.accepted).toHaveLength(2);
      expect(result.value.accepted).toContain('test1@example.com');
      expect(result.value.accepted).toContain('test2@example.com');
    });

    it('should fail when configured to fail', async () => {
      service.setFailure('SMTP connection failed');

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Hello World</p>',
      });

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toBe('SMTP connection failed');
    });
  });

  describe('sendBulkEmail', () => {
    it('should send bulk emails successfully', async () => {
      const result = await service.sendBulkEmail([
        {
          to: 'user1@example.com',
          subject: 'Email 1',
          text: 'Hello User 1',
        },
        {
          to: 'user2@example.com',
          subject: 'Email 2',
          text: 'Hello User 2',
        },
        {
          to: 'user3@example.com',
          subject: 'Email 3',
          text: 'Hello User 3',
        },
      ]);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(result.value[0].accepted).toContain('user1@example.com');
      expect(result.value[1].accepted).toContain('user2@example.com');
      expect(result.value[2].accepted).toContain('user3@example.com');

      const sentEmails = service.getSentEmails();
      expect(sentEmails).toHaveLength(3);
    });
  });
});

