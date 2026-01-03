/**
 * INotificationService - Port para notificações
 * 
 * E7.9 Integrações - Semana 1
 * 
 * Abstrai envio de notificações:
 * - Email (SMTP via Nodemailer)
 * - SMS (futuro)
 * - Push (futuro)
 * 
 * Princípios Hexagonais:
 * - Domain NÃO conhece qual provedor de email está sendo usado
 * - Implementations: NodemailerAdapter (real), MockNotificationService (teste)
 */

import { Result } from '@/shared/domain';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailResponse {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

/**
 * INotificationService - Port para notificações
 * 
 * IMPORTANTE: Todas as operações retornam Result<T> ou Result<T, string>
 * NUNCA Result<T, Error> (regra MCP ENFORCE-012)
 */
export interface INotificationService {
  sendEmail(request: EmailRequest): Promise<Result<EmailResponse, string>>;
  sendBulkEmail(requests: EmailRequest[]): Promise<Result<EmailResponse[], string>>;
}

