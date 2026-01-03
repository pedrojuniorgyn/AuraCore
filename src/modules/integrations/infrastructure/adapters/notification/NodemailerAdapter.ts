import { injectable } from 'tsyringe';
import nodemailer, { Transporter } from 'nodemailer';
import { Result } from '@/shared/domain';
import type {
  INotificationService,
  EmailRequest,
  EmailResponse,
} from '../../../domain/ports/output/INotificationService';

/**
 * NodemailerAdapter - Implementação real do envio de emails
 * 
 * E7.9 Integrações - Semana 2
 * 
 * Usa Nodemailer para envio de emails via SMTP.
 * Configuração via variáveis de ambiente.
 */
@injectable()
export class NodemailerAdapter implements INotificationService {
  private transporter: Transporter;

  constructor() {
    // Configurar transporter com variáveis de ambiente
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true para port 465, false para outras portas
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async sendEmail(request: EmailRequest): Promise<Result<EmailResponse, string>> {
    try {
      // Validar configuração SMTP
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return Result.fail('SMTP credentials not configured');
      }

      // Construir email
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: Array.isArray(request.to) ? request.to.join(', ') : request.to,
        cc: request.cc ? (Array.isArray(request.cc) ? request.cc.join(', ') : request.cc) : undefined,
        bcc: request.bcc ? (Array.isArray(request.bcc) ? request.bcc.join(', ') : request.bcc) : undefined,
        subject: request.subject,
        text: request.text,
        html: request.html,
        attachments: request.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      // Enviar email
      const info = await this.transporter.sendMail(mailOptions);

      return Result.ok({
        messageId: info.messageId,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`EMAIL_SEND_FAILED: ${message}`);
    }
  }

  async sendBulkEmail(requests: EmailRequest[]): Promise<Result<EmailResponse[], string>> {
    const results: EmailResponse[] = [];
    const errors: string[] = [];

    for (const request of requests) {
      const result = await this.sendEmail(request);
      
      if (Result.isOk(result)) {
        results.push(result.value);
      } else {
        errors.push(`Failed to send to ${request.to}: ${result.error}`);
      }
    }

    // Se todos falharam, retornar erro
    if (results.length === 0 && errors.length > 0) {
      return Result.fail(`All emails failed: ${errors.join('; ')}`);
    }

    // Se alguns falharam, incluir no resultado mas não falhar
    return Result.ok(results);
  }
}
