/**
 * JsonVectorStore - Infrastructure Implementation
 * 
 * Implementação simples de vector store usando arquivos JSON.
 * Para produção, considerar Pinecone, Weaviate, pgvector ou Chroma.
 * 
 * Esta implementação usa busca por texto (FTS simplificada) ao invés
 * de embeddings vetoriais, adequada para prototipagem e desenvolvimento.
 * 
 * @module knowledge/infrastructure/vector-store
 */

import { Result } from '@/shared/domain';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IVectorStore } from '../../domain/ports/output/IVectorStore';
import type {
  DocumentChunk,
  DocumentMetadata,
  SearchOptions,
  SearchResult,
} from '../../domain/types';
import { logger } from '@/shared/infrastructure/logging';

interface StorageData {
  documents: Record<string, DocumentMetadata>;
  chunks: Record<string, DocumentChunk>;
  version: string;
  updatedAt: string;
}

/**
 * Vector Store usando arquivos JSON para persistência
 * Implementação para desenvolvimento/prototipagem
 */
export class JsonVectorStore implements IVectorStore {
  private data: StorageData;
  private readonly storagePath: string;
  private isDirty: boolean = false;

  constructor(storagePath: string = 'data/knowledge/vectors.json') {
    this.storagePath = storagePath;
    this.data = this.loadOrCreate();
  }

  /**
   * Carrega dados do arquivo ou cria novo
   */
  private loadOrCreate(): StorageData {
    try {
      // Garantir que o diretório existe
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.storagePath)) {
        const content = fs.readFileSync(this.storagePath, 'utf-8');
        return JSON.parse(content) as StorageData;
      }
    } catch {
      // Ignorar erros de leitura, criar novo
    }

    return {
      documents: {},
      chunks: {},
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Salva dados no arquivo
   */
  private save(): void {
    if (!this.isDirty) return;

    try {
      this.data.updatedAt = new Date().toISOString();
      fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
      this.isDirty = false;
    } catch (error) {
      logger.error('Erro ao salvar vector store:', error);
    }
  }

  async upsert(chunks: DocumentChunk[]): Promise<Result<void, string>> {
    try {
      for (const chunk of chunks) {
        this.data.chunks[chunk.id] = chunk;
      }
      this.isDirty = true;
      this.save();
      return Result.ok(undefined);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao inserir chunks: ${msg}`);
    }
  }

  async search(options: SearchOptions): Promise<Result<SearchResult[], string>> {
    try {
      const { query, topK = 5, minScore = 0.3, filters } = options;
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

      const results: SearchResult[] = [];

      for (const chunk of Object.values(this.data.chunks)) {
        const document = this.data.documents[chunk.documentId];
        if (!document) continue;

        // Aplicar filtros
        if (filters) {
          if (filters.documentType && !filters.documentType.includes(document.type)) {
            continue;
          }
          if (filters.legislationType && document.legislationType && 
              !filters.legislationType.includes(document.legislationType)) {
            continue;
          }
          if (filters.organizationId !== undefined && 
              document.organizationId !== filters.organizationId) {
            continue;
          }
          if (filters.tags && filters.tags.length > 0 &&
              !filters.tags.some(tag => document.tags.includes(tag))) {
            continue;
          }
        }

        // Calcular score de similaridade (FTS simplificado)
        const score = this.calculateScore(queryWords, chunk.content);
        
        if (score >= minScore) {
          results.push({
            chunk,
            document,
            score,
            highlights: this.extractHighlights(query, chunk.content),
          });
        }
      }

      // Ordenar por score e limitar
      results.sort((a, b) => b.score - a.score);
      return Result.ok(results.slice(0, topK));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na busca: ${msg}`);
    }
  }

  async deleteByDocumentId(documentId: string): Promise<Result<void, string>> {
    try {
      // Remover chunks do documento
      const chunkIds = Object.keys(this.data.chunks)
        .filter(id => this.data.chunks[id]?.documentId === documentId);
      
      for (const id of chunkIds) {
        delete this.data.chunks[id];
      }

      // Remover documento
      delete this.data.documents[documentId];

      this.isDirty = true;
      this.save();
      return Result.ok(undefined);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao deletar documento: ${msg}`);
    }
  }

  async documentExists(documentId: string): Promise<boolean> {
    return documentId in this.data.documents;
  }

  async saveDocument(document: DocumentMetadata): Promise<Result<void, string>> {
    try {
      // Serializar datas para JSON
      const serialized = {
        ...document,
        createdAt: document.createdAt instanceof Date 
          ? document.createdAt.toISOString() 
          : document.createdAt,
        updatedAt: document.updatedAt instanceof Date 
          ? document.updatedAt.toISOString() 
          : document.updatedAt,
        effectiveDate: document.effectiveDate instanceof Date 
          ? document.effectiveDate.toISOString() 
          : document.effectiveDate,
        expirationDate: document.expirationDate instanceof Date 
          ? document.expirationDate.toISOString() 
          : document.expirationDate,
      };

      // Armazenamos com datas serializadas para JSON
      // O cast via unknown é necessário pois as datas são strings no storage
      this.data.documents[document.id] = serialized as unknown as DocumentMetadata;
      this.isDirty = true;
      this.save();
      return Result.ok(undefined);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao salvar documento: ${msg}`);
    }
  }

  async getDocument(documentId: string): Promise<Result<DocumentMetadata | null, string>> {
    try {
      const doc = this.data.documents[documentId];
      if (!doc) {
        return Result.ok(null);
      }

      // Deserializar datas
      return Result.ok({
        ...doc,
        createdAt: new Date(doc.createdAt as unknown as string),
        updatedAt: new Date(doc.updatedAt as unknown as string),
        effectiveDate: doc.effectiveDate 
          ? new Date(doc.effectiveDate as unknown as string) 
          : undefined,
        expirationDate: doc.expirationDate 
          ? new Date(doc.expirationDate as unknown as string) 
          : undefined,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar documento: ${msg}`);
    }
  }

  /**
   * Retorna estatísticas do vector store
   */
  getStats(): { documentCount: number; chunkCount: number; lastUpdated: string } {
    return {
      documentCount: Object.keys(this.data.documents).length,
      chunkCount: Object.keys(this.data.chunks).length,
      lastUpdated: this.data.updatedAt,
    };
  }

  /**
   * Calcula score de similaridade baseado em TF (Term Frequency)
   */
  private calculateScore(queryWords: string[], content: string): number {
    const contentLower = content.toLowerCase();
    let matches = 0;
    let totalWeight = 0;

    for (const word of queryWords) {
      // Palavras maiores têm mais peso
      const weight = Math.min(word.length / 5, 2);
      totalWeight += weight;

      // Contar ocorrências
      const regex = new RegExp(word, 'gi');
      const occurrences = (contentLower.match(regex) ?? []).length;
      
      if (occurrences > 0) {
        // Diminishing returns para múltiplas ocorrências
        matches += weight * Math.log2(occurrences + 1);
      }
    }

    if (totalWeight === 0) return 0;

    // Normalizar para 0-1
    const rawScore = matches / totalWeight;
    return Math.min(rawScore, 1);
  }

  /**
   * Extrai trechos destacados contendo a query
   */
  private extractHighlights(query: string, content: string): string[] {
    const highlights: string[] = [];
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const sentences = content.split(/[.!?]\s+/);

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      if (queryWords.some(word => sentenceLower.includes(word))) {
        if (sentence.length > 20 && sentence.length < 300) {
          highlights.push(sentence.trim());
        }
      }
      if (highlights.length >= 3) break;
    }

    return highlights;
  }
}
