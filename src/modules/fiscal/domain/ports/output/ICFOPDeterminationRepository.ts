/**
 * 📋 ICFOPDeterminationRepository - Output Port (REPO-001)
 * 
 * Interface de repositório para CFOPDetermination.
 * F3.3: CFOP Determination
 */
import type { CFOPDetermination } from '../../entities/CFOPDetermination';

export interface CFOPDeterminationFilter {
  organizationId: number;
  operationType?: string;
  direction?: 'ENTRY' | 'EXIT';
  scope?: 'INTRASTATE' | 'INTERSTATE' | 'FOREIGN';
  documentType?: string;
  status?: string;
}

export interface ICFOPDeterminationRepository {
  findById(id: string, organizationId: number): Promise<CFOPDetermination | null>;
  findByLookup(
    organizationId: number,
    operationType: string,
    direction: 'ENTRY' | 'EXIT',
    scope: 'INTRASTATE' | 'INTERSTATE' | 'FOREIGN'
  ): Promise<CFOPDetermination[]>;
  findMany(filter: CFOPDeterminationFilter): Promise<CFOPDetermination[]>;
  save(entity: CFOPDetermination): Promise<void>;
  delete(id: string, organizationId: number): Promise<void>;
}
