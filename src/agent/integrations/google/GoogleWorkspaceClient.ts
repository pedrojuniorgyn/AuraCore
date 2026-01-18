/**
 * @description Cliente para Google Workspace (Gmail, Drive, Calendar, Sheets)
 * 
 * Este cliente abstrai o acesso aos serviços do Google Workspace:
 * - Gmail: Leitura e envio de emails
 * - Drive: Gestão de arquivos
 * - Calendar: Agendamentos
 * - Sheets: Planilhas
 */

import type { WorkspaceConfig } from '../../core/AgentConfig';
import type {
  GmailMessage,
  GmailAttachment,
  DriveFile,
  CalendarEvent,
  CalendarAttendee,
  SheetData,
  SheetUpdateResult,
} from './types';
import { Result } from '@/shared/domain';

/**
 * Cliente Google Workspace
 * 
 * @example
 * ```typescript
 * const client = new GoogleWorkspaceClient(config, accessToken);
 * 
 * // Buscar emails com anexos de NFe
 * const emails = await client.searchEmails('from:fornecedor has:attachment filename:xml');
 * 
 * // Criar evento no calendário
 * const event = await client.createCalendarEvent({
 *   summary: 'Reunião de kickoff',
 *   start: new Date('2026-01-20T10:00:00'),
 *   end: new Date('2026-01-20T11:00:00'),
 * });
 * ```
 */
export class GoogleWorkspaceClient {
  private readonly config: WorkspaceConfig;
  private accessToken: string;
  
  // Clientes lazy-loaded
  private oauth2Client: unknown = null;
  private gmailClient: unknown = null;
  private driveClient: unknown = null;
  private calendarClient: unknown = null;
  private sheetsClient: unknown = null;

  constructor(config: WorkspaceConfig, accessToken: string) {
    this.config = config;
    this.accessToken = accessToken;
  }

  /**
   * Atualiza o token de acesso
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    // Reset clients to use new token
    this.gmailClient = null;
    this.driveClient = null;
    this.calendarClient = null;
    this.sheetsClient = null;
  }

  // ============================================================================
  // OAUTH
  // ============================================================================

  /**
   * Obtém o cliente OAuth2
   */
  private async getOAuth2Client(): Promise<unknown> {
    if (!this.oauth2Client) {
      try {
        const { google } = await import('googleapis');
        this.oauth2Client = new google.auth.OAuth2(
          this.config.clientId,
          this.config.clientSecret,
          this.config.redirectUri
        );
        (this.oauth2Client as { setCredentials: (creds: { access_token: string }) => void })
          .setCredentials({ access_token: this.accessToken });
      } catch {
        throw new Error(
          'Pacote googleapis não instalado. Execute: npm install googleapis'
        );
      }
    }
    return this.oauth2Client;
  }

  /**
   * Gera URL de autorização OAuth
   */
  async getAuthUrl(state?: string): Promise<string> {
    const auth = await this.getOAuth2Client() as {
      generateAuthUrl: (options: {
        access_type: string;
        scope: string[];
        state?: string;
      }) => string;
    };
    
    return auth.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      state,
    });
  }

  /**
   * Troca código de autorização por tokens
   */
  async exchangeCode(code: string): Promise<Result<TokenResponse, string>> {
    try {
      const auth = await this.getOAuth2Client() as {
        getToken: (code: string) => Promise<{
          tokens: {
            access_token?: string;
            refresh_token?: string;
            expiry_date?: number;
          };
        }>;
      };
      
      const { tokens } = await auth.getToken(code);
      
      return Result.ok({
        accessToken: tokens.access_token ?? '',
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao trocar código: ${message}`);
    }
  }

  // ============================================================================
  // GMAIL
  // ============================================================================

  /**
   * Obtém cliente Gmail
   */
  private async getGmailClient(): Promise<unknown> {
    if (!this.gmailClient) {
      const { google } = await import('googleapis');
      const auth = await this.getOAuth2Client();
      this.gmailClient = google.gmail({ version: 'v1', auth: auth as never });
    }
    return this.gmailClient;
  }

  /**
   * Busca emails no Gmail
   * 
   * @param query - Query do Gmail (ex: "from:teste@email.com has:attachment")
   * @param maxResults - Número máximo de resultados (default: 10)
   */
  async searchEmails(
    query: string,
    maxResults = 10
  ): Promise<Result<GmailMessage[], string>> {
    try {
      const gmail = await this.getGmailClient() as {
        users: {
          messages: {
            list: (params: {
              userId: string;
              q: string;
              maxResults: number;
            }) => Promise<{
              data: {
                messages?: Array<{ id?: string; threadId?: string }>;
              };
            }>;
            get: (params: {
              userId: string;
              id: string;
              format: string;
            }) => Promise<{
              data: {
                id: string;
                threadId: string;
                payload?: {
                  headers?: Array<{ name: string; value: string }>;
                  parts?: Array<{
                    mimeType?: string;
                    filename?: string;
                    body?: { size?: number; attachmentId?: string };
                  }>;
                  body?: { data?: string };
                };
                snippet?: string;
              };
            }>;
          };
        };
      };

      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = listResponse.data.messages ?? [];
      const results: GmailMessage[] = [];

      for (const msg of messages) {
        if (!msg.id) continue;

        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const headers = fullMsg.data.payload?.headers ?? [];
        const getHeader = (name: string): string => 
          headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

        const attachments: GmailAttachment[] = [];
        const parts = fullMsg.data.payload?.parts ?? [];
        for (const part of parts) {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              id: part.body.attachmentId,
              filename: part.filename,
              mimeType: part.mimeType ?? 'application/octet-stream',
              size: part.body.size ?? 0,
            });
          }
        }

        results.push({
          id: fullMsg.data.id,
          threadId: fullMsg.data.threadId,
          from: getHeader('From'),
          to: getHeader('To').split(',').map(s => s.trim()),
          cc: getHeader('Cc') ? getHeader('Cc').split(',').map(s => s.trim()) : undefined,
          subject: getHeader('Subject'),
          snippet: fullMsg.data.snippet ?? '',
          date: new Date(getHeader('Date')),
          labels: [],
          attachments,
        });
      }

      return Result.ok(results);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar emails: ${message}`);
    }
  }

  /**
   * Obtém anexo de email
   */
  async getEmailAttachment(
    messageId: string,
    attachmentId: string
  ): Promise<Result<Buffer, string>> {
    try {
      const gmail = await this.getGmailClient() as {
        users: {
          messages: {
            attachments: {
              get: (params: {
                userId: string;
                messageId: string;
                id: string;
              }) => Promise<{
                data: { data?: string };
              }>;
            };
          };
        };
      };

      const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      });

      const data = response.data.data;
      if (!data) {
        return Result.fail('Anexo não encontrado');
      }

      // Base64 URL-safe para Buffer
      const buffer = Buffer.from(data, 'base64url');
      return Result.ok(buffer);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao obter anexo: ${message}`);
    }
  }

  /**
   * Envia email
   */
  async sendEmail(
    to: string[],
    subject: string,
    body: string,
    options?: {
      cc?: string[];
      bcc?: string[];
      isHtml?: boolean;
    }
  ): Promise<Result<string, string>> {
    try {
      const gmail = await this.getGmailClient() as {
        users: {
          messages: {
            send: (params: {
              userId: string;
              requestBody: { raw: string };
            }) => Promise<{
              data: { id: string };
            }>;
          };
        };
      };

      const mimeType = options?.isHtml ? 'text/html' : 'text/plain';
      const headers = [
        `To: ${to.join(', ')}`,
        options?.cc ? `Cc: ${options.cc.join(', ')}` : '',
        options?.bcc ? `Bcc: ${options.bcc.join(', ')}` : '',
        `Subject: ${subject}`,
        `Content-Type: ${mimeType}; charset=utf-8`,
        '',
        body,
      ].filter(Boolean).join('\r\n');

      const raw = Buffer.from(headers).toString('base64url');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });

      return Result.ok(response.data.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao enviar email: ${message}`);
    }
  }

  // ============================================================================
  // GOOGLE DRIVE
  // ============================================================================

  /**
   * Obtém cliente Drive
   */
  private async getDriveClient(): Promise<unknown> {
    if (!this.driveClient) {
      const { google } = await import('googleapis');
      const auth = await this.getOAuth2Client();
      this.driveClient = google.drive({ version: 'v3', auth: auth as never });
    }
    return this.driveClient;
  }

  /**
   * Lista arquivos do Drive
   */
  async listFiles(
    query?: string,
    maxResults = 10
  ): Promise<Result<DriveFile[], string>> {
    try {
      const drive = await this.getDriveClient() as {
        files: {
          list: (params: {
            q?: string;
            pageSize: number;
            fields: string;
          }) => Promise<{
            data: {
              files?: Array<{
                id: string;
                name: string;
                mimeType: string;
                size?: string;
                createdTime: string;
                modifiedTime: string;
                parents?: string[];
                webViewLink?: string;
                webContentLink?: string;
              }>;
            };
          }>;
        };
      };

      const response = await drive.files.list({
        q: query,
        pageSize: maxResults,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink)',
      });

      const files = (response.data.files ?? []).map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? parseInt(f.size, 10) : undefined,
        createdTime: new Date(f.createdTime),
        modifiedTime: new Date(f.modifiedTime),
        parents: f.parents,
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink,
      }));

      return Result.ok(files);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao listar arquivos: ${message}`);
    }
  }

  /**
   * Obtém conteúdo de arquivo do Drive
   */
  async getFileContent(fileId: string): Promise<Result<Buffer, string>> {
    try {
      const drive = await this.getDriveClient() as {
        files: {
          get: (params: {
            fileId: string;
            alt: string;
          }, options: { responseType: string }) => Promise<{
            data: NodeJS.ReadableStream;
          }>;
        };
      };

      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      const chunks: Buffer[] = [];
      for await (const chunk of response.data) {
        chunks.push(Buffer.from(chunk as Buffer));
      }

      return Result.ok(Buffer.concat(chunks));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao obter arquivo: ${message}`);
    }
  }

  // ============================================================================
  // GOOGLE CALENDAR
  // ============================================================================

  /**
   * Obtém cliente Calendar
   */
  private async getCalendarClient(): Promise<unknown> {
    if (!this.calendarClient) {
      const { google } = await import('googleapis');
      const auth = await this.getOAuth2Client();
      this.calendarClient = google.calendar({ version: 'v3', auth: auth as never });
    }
    return this.calendarClient;
  }

  /**
   * Lista eventos do calendário
   */
  async listEvents(
    calendarId = 'primary',
    timeMin?: Date,
    timeMax?: Date,
    maxResults = 10
  ): Promise<Result<CalendarEvent[], string>> {
    try {
      const calendar = await this.getCalendarClient() as {
        events: {
          list: (params: {
            calendarId: string;
            timeMin?: string;
            timeMax?: string;
            maxResults: number;
            singleEvents: boolean;
            orderBy: string;
          }) => Promise<{
            data: {
              items?: Array<{
                id: string;
                summary?: string;
                description?: string;
                start?: { dateTime?: string; date?: string };
                end?: { dateTime?: string; date?: string };
                location?: string;
                attendees?: Array<{
                  email: string;
                  displayName?: string;
                  responseStatus: string;
                }>;
                htmlLink: string;
                status: string;
              }>;
            };
          }>;
        };
      };

      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin?.toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = (response.data.items ?? []).map(e => ({
        id: e.id,
        summary: e.summary ?? '',
        description: e.description,
        start: new Date(e.start?.dateTime ?? e.start?.date ?? ''),
        end: new Date(e.end?.dateTime ?? e.end?.date ?? ''),
        location: e.location,
        attendees: e.attendees?.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus as CalendarAttendee['responseStatus'],
        })),
        htmlLink: e.htmlLink,
        status: e.status as CalendarEvent['status'],
      }));

      return Result.ok(events);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao listar eventos: ${message}`);
    }
  }

  /**
   * Cria evento no calendário
   */
  async createCalendarEvent(
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      location?: string;
      attendees?: string[];
    },
    calendarId = 'primary'
  ): Promise<Result<CalendarEvent, string>> {
    try {
      const calendar = await this.getCalendarClient() as {
        events: {
          insert: (params: {
            calendarId: string;
            requestBody: {
              summary: string;
              description?: string;
              start: { dateTime: string; timeZone: string };
              end: { dateTime: string; timeZone: string };
              location?: string;
              attendees?: Array<{ email: string }>;
            };
          }) => Promise<{
            data: {
              id: string;
              summary: string;
              description?: string;
              start: { dateTime: string };
              end: { dateTime: string };
              location?: string;
              attendees?: Array<{
                email: string;
                responseStatus: string;
              }>;
              htmlLink: string;
              status: string;
            };
          }>;
        };
      };

      const response = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: {
            dateTime: event.start.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          location: event.location,
          attendees: event.attendees?.map(email => ({ email })),
        },
      });

      const e = response.data;
      return Result.ok({
        id: e.id,
        summary: e.summary,
        description: e.description,
        start: new Date(e.start.dateTime),
        end: new Date(e.end.dateTime),
        location: e.location,
        attendees: e.attendees?.map(a => ({
          email: a.email,
          responseStatus: a.responseStatus as CalendarAttendee['responseStatus'],
        })),
        htmlLink: e.htmlLink,
        status: e.status as CalendarEvent['status'],
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao criar evento: ${message}`);
    }
  }

  // ============================================================================
  // GOOGLE SHEETS
  // ============================================================================

  /**
   * Obtém cliente Sheets
   */
  private async getSheetsClient(): Promise<unknown> {
    if (!this.sheetsClient) {
      const { google } = await import('googleapis');
      const auth = await this.getOAuth2Client();
      this.sheetsClient = google.sheets({ version: 'v4', auth: auth as never });
    }
    return this.sheetsClient;
  }

  /**
   * Lê dados de planilha
   */
  async readSheet(
    spreadsheetId: string,
    range: string
  ): Promise<Result<SheetData, string>> {
    try {
      const sheets = await this.getSheetsClient() as {
        spreadsheets: {
          values: {
            get: (params: {
              spreadsheetId: string;
              range: string;
            }) => Promise<{
              data: {
                spreadsheetId: string;
                range: string;
                values?: string[][];
              };
            }>;
          };
        };
      };

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return Result.ok({
        spreadsheetId: response.data.spreadsheetId,
        range: response.data.range,
        values: response.data.values ?? [],
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao ler planilha: ${message}`);
    }
  }

  /**
   * Atualiza dados em planilha
   */
  async updateSheet(
    spreadsheetId: string,
    range: string,
    values: string[][],
    mode: 'update' | 'append' = 'update'
  ): Promise<Result<SheetUpdateResult, string>> {
    try {
      const sheets = await this.getSheetsClient() as {
        spreadsheets: {
          values: {
            update: (params: {
              spreadsheetId: string;
              range: string;
              valueInputOption: string;
              requestBody: { values: string[][] };
            }) => Promise<{
              data: {
                spreadsheetId: string;
                updatedRange: string;
                updatedRows: number;
                updatedColumns: number;
                updatedCells: number;
              };
            }>;
            append: (params: {
              spreadsheetId: string;
              range: string;
              valueInputOption: string;
              insertDataOption: string;
              requestBody: { values: string[][] };
            }) => Promise<{
              data: {
                spreadsheetId: string;
                updates: {
                  updatedRange: string;
                  updatedRows: number;
                  updatedColumns: number;
                  updatedCells: number;
                };
              };
            }>;
          };
        };
      };

      if (mode === 'update') {
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values },
        });

        return Result.ok({
          spreadsheetId: response.data.spreadsheetId,
          updatedRange: response.data.updatedRange,
          updatedRows: response.data.updatedRows,
          updatedColumns: response.data.updatedColumns,
          updatedCells: response.data.updatedCells,
        });
      } else {
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values },
        });

        return Result.ok({
          spreadsheetId: response.data.spreadsheetId,
          updatedRange: response.data.updates.updatedRange,
          updatedRows: response.data.updates.updatedRows,
          updatedColumns: response.data.updates.updatedColumns,
          updatedCells: response.data.updates.updatedCells,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao atualizar planilha: ${message}`);
    }
  }
}

// ============================================================================
// TIPOS DE RESPOSTA
// ============================================================================

/**
 * Resposta de troca de código OAuth
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: Date;
}
