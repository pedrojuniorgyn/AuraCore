/**
 * @module agent/integrations/google
 * @description Integrações com Google Cloud e Google Workspace
 */

// Clientes
export { GoogleCloudClient, type NFeExtractedData } from './GoogleCloudClient';
export { GoogleWorkspaceClient, type TokenResponse } from './GoogleWorkspaceClient';

// Tipos
export type {
  // Gemini
  GeminiResponse,
  GeminiContent,
  GeminiPart,
  GenerationOptions,
  // Document AI
  ProcessedDocument,
  DocumentEntity,
  DocumentPage,
  TextBlock,
  BoundingBox,
  // Speech
  TranscriptionResult,
  TranscribedWord,
  SynthesisResult,
  // Gmail
  GmailMessage,
  GmailAttachment,
  // Drive
  DriveFile,
  // Calendar
  CalendarEvent,
  CalendarAttendee,
  // Sheets
  SheetData,
  SheetUpdateResult,
} from './types';
