/**
 * UploadDocumentCommand - Use Case para upload de documentos
 * 
 * Faz upload do arquivo para S3 e registra metadados no banco.
 * Opcionalmente cria job de processamento.
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { Document } from '../../domain/entities/Document';
import { DocumentJob } from '../../domain/entities/DocumentJob';
import type {
  IUploadDocumentUseCase,
  UploadDocumentInput,
  UploadDocumentOutput,
} from '../../domain/ports/input/IUploadDocumentUseCase';
import type { IStorageProvider } from '../../domain/ports/output/IStorageProvider';
import type { IDocumentRepository } from '../../domain/ports/output/IDocumentRepository';
import type { IDocumentJobRepository } from '../../domain/ports/output/IDocumentJobRepository';
import type { JobTypeValue } from '../../domain/value-objects/JobType';

@injectable()
export class UploadDocumentCommand implements IUploadDocumentUseCase {
  constructor(
    @inject('IStorageProvider') private readonly storageProvider: IStorageProvider,
    @inject('IDocumentRepository') private readonly documentRepository: IDocumentRepository,
    @inject('IDocumentJobRepository') private readonly jobRepository: IDocumentJobRepository,
  ) {}

  async execute(input: UploadDocumentInput): Promise<Result<UploadDocumentOutput, string>> {
    // Validar input
    if (!input.organizationId || input.organizationId <= 0) {
      return Result.fail('organizationId é obrigatório');
    }
    if (!input.branchId || input.branchId <= 0) {
      return Result.fail('branchId é obrigatório');
    }
    if (!input.content || input.content.length === 0) {
      return Result.fail('content é obrigatório');
    }

    // Verificar se storage está configurado
    if (!this.storageProvider.isConfigured()) {
      return Result.fail('Storage S3 não está configurado');
    }

    // Gerar key única para o arquivo
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${input.organizationId}/${input.branchId}/${input.docType}/${timestamp}_${randomSuffix}_${sanitizedFileName}`;

    // Upload para S3
    const uploadResult = await this.storageProvider.upload({
      key: storageKey,
      body: input.content,
      contentType: input.mimeType,
      metadata: {
        organizationId: String(input.organizationId),
        branchId: String(input.branchId),
        docType: input.docType,
        originalFileName: input.fileName,
      },
    });

    if (Result.isFail(uploadResult)) {
      return Result.fail(`Erro ao fazer upload: ${uploadResult.error}`);
    }

    // Criar Document entity
    const documentResult = Document.create({
      organizationId: input.organizationId,
      branchId: input.branchId,
      docType: input.docType,
      entityTable: input.entityTable,
      entityId: input.entityId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.content.length,
      storagePath: uploadResult.value.url,
      metadata: input.metadata,
      createdBy: input.createdBy,
    });

    if (Result.isFail(documentResult)) {
      // Rollback: deletar arquivo do S3
      await this.storageProvider.delete(storageKey);
      return Result.fail(`Erro ao criar documento: ${documentResult.error}`);
    }

    const document = documentResult.value;

    // Salvar documento no banco
    const saveResult = await this.documentRepository.save(document);
    if (Result.isFail(saveResult)) {
      // Rollback: deletar arquivo do S3
      await this.storageProvider.delete(storageKey);
      return Result.fail(`Erro ao salvar documento: ${saveResult.error}`);
    }

    let jobId: string | undefined;

    // Criar job de processamento se solicitado
    if (input.createProcessingJob && input.jobType) {
      const jobResult = DocumentJob.create({
        organizationId: input.organizationId,
        branchId: input.branchId,
        documentId: document.id,
        jobType: input.jobType as JobTypeValue,
        payload: input.jobPayload,
      });

      if (Result.isOk(jobResult)) {
        const job = jobResult.value;
        const saveJobResult = await this.jobRepository.save(job);
        if (Result.isOk(saveJobResult)) {
          jobId = job.id;

          // Atualizar status do documento para QUEUED
          document.updateStatus('QUEUED');
          await this.documentRepository.save(document);
        }
      }
    }

    return Result.ok({
      documentId: document.id,
      storageUrl: uploadResult.value.url,
      jobId,
    });
  }
}
