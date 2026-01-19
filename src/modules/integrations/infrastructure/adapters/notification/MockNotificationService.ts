/**
 * MockNotificationService - Mock para testes
 * E7.9 Integrações - Semana 1
 */

import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { INotificationService } from '../../../domain/ports/output/INotificationService';

@injectable()
export class MockNotificationService implements INotificationService {
  private shouldFail = false;
  private failureMessage = 'Mock failure';
  private sentEmails: Array<{ to: string | string[]; subject: string }> = [];

  setFailure(message: string): void {
    this.shouldFail = true;
    this.failureMessage = message;
  }

  resetFailure(): void {
    this.shouldFail = false;
  }

  getSentEmails(): Array<{ to: string | string[]; subject: string }> {
    return this.sentEmails;
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }

  async sendEmail(request: { to: string | string[]; cc?: string | string[]; bcc?: string | string[]; subject: string; html?: string; text?: string; attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }> }): Promise<Result<{ messageId: string; accepted: string[]; rejected: string[] }, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    this.sentEmails.push({ to: request.to, subject: request.subject });

    const recipients = Array.isArray(request.to) ? request.to : [request.to];

    return Result.ok({
      messageId: `MOCK-EMAIL-${Date.now()}@mock.aura.com`,
      accepted: recipients,
      rejected: [],
    });
  }

  async sendBulkEmail(requests: Array<{ to: string | string[]; cc?: string | string[]; bcc?: string | string[]; subject: string; html?: string; text?: string; attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }> }>): Promise<Result<Array<{ messageId: string; accepted: string[]; rejected: string[] }>, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    const responses = requests.map((req, index) => {
      this.sentEmails.push({ to: req.to, subject: req.subject });

      const recipients = Array.isArray(req.to) ? req.to : [req.to];

      return {
        messageId: `MOCK-EMAIL-${Date.now()}-${index}@mock.aura.com`,
        accepted: recipients,
        rejected: [],
      };
    });

    return Result.ok(responses);
  }
}

