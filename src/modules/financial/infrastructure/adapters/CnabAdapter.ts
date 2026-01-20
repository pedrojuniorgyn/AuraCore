/**
 * Adapter para cnab-generator legado
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { 
  ICnabGateway, 
  CnabGenerationParams,
  CnabResult,
} from '../../domain/ports/output/ICnabGateway';

// Import legado
import { generateCNAB240 } from '@/services/banking/cnab-generator';

@injectable()
export class CnabAdapter implements ICnabGateway {
  async generateCnab240(params: CnabGenerationParams): Promise<Result<CnabResult, string>> {
    try {
      // O serviço legado espera CNAB240Options com estrutura completa
      // Este adapter simplifica a interface - TODO (E10): refatorar completamente
      const cnabOptions = {
        bankAccount: {
          bankCode: params.bankCode,
          bankName: 'Banco',
          agency: params.bankAgency,
          accountNumber: params.bankAccount,
          accountDigit: '0',
          wallet: '09',
          agreementNumber: '',
          remittanceNumber: 1,
        },
        company: {
          document: '00000000000000',
          name: 'Empresa',
        },
        titles: params.payableIds.map(id => ({
          id,
          partnerId: 0,
          partnerDocument: '00000000000000',
          partnerName: 'Fornecedor',
          amount: 0,
          dueDate: params.paymentDate,
          documentNumber: `DOC${id}`,
        })),
        type: 'PAYMENT' as const,
      };
      const content = generateCNAB240(cnabOptions);
      return Result.ok({
        content,
        fileName: `CNAB_${Date.now()}.rem`,
        totalRecords: params.payableIds.length,
        totalValue: 0,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na geração CNAB: ${message}`);
    }
  }
}
