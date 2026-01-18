/**
 * Input Ports - Accounting Module
 *
 * Exporta interfaces Input Port para o módulo Accounting.
 * Estas interfaces definem os contratos de entrada para os Use Cases.
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

// Commands
export type { ICreateJournalEntry } from './ICreateJournalEntry';
export type { IAddLineToEntry } from './IAddLineToEntry';
export type { IPostJournalEntry, PostJournalEntryInput, PostJournalEntryOutput } from './IPostJournalEntry';
export type { IReverseJournalEntry, ReverseJournalEntryInput, ReverseJournalEntryOutput } from './IReverseJournalEntry';

// Queries
export type { IListJournalEntries, ListJournalEntriesInput } from './IListJournalEntries';
export type { IGetJournalEntryById, GetJournalEntryByIdInput } from './IGetJournalEntryById';
