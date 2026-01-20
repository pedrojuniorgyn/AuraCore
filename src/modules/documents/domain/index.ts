// Entities
export { Document, type CreateDocumentProps } from './entities/Document';
export { DocumentJob, type CreateDocumentJobProps } from './entities/DocumentJob';

// Value Objects
export { StoragePath } from './value-objects/StoragePath';
export { JobStatus, type JobStatusType } from './value-objects/JobStatus';
export { JobType, type JobTypeValue } from './value-objects/JobType';
export { DocumentStatus, type DocumentStatusType } from './value-objects/DocumentStatus';

// Events
export { DocumentUploadedEvent } from './events/DocumentUploadedEvent';
export { DocumentStatusChangedEvent } from './events/DocumentStatusChangedEvent';
export { JobCreatedEvent } from './events/JobCreatedEvent';
export { JobCompletedEvent } from './events/JobCompletedEvent';

// Errors
export {
  DocumentNotFoundError,
  DocumentUploadError,
  DocumentDownloadError,
  JobNotFoundError,
  JobProcessingError,
  StorageNotConfiguredError,
} from './errors/DocumentErrors';

// Ports - Input
export type {
  IUploadDocumentUseCase,
  UploadDocumentInput,
  UploadDocumentOutput,
  IGetDocumentByIdUseCase,
  GetDocumentByIdInput,
  GetDocumentByIdOutput,
  IProcessJobUseCase,
  ProcessJobInput,
  ProcessJobOutput,
} from './ports/input';

// Ports - Output
export type {
  IStorageProvider,
  UploadParams,
  DownloadResult,
  StorageInfo,
  IDocumentRepository,
  DocumentFilter,
  DocumentListResult,
  IDocumentJobRepository,
  DocumentJobFilter,
  DocumentJobListResult,
  ClaimJobResult,
} from './ports/output';
