import { Result } from '@/shared/domain';
import { AliquotaIBS, AliquotaCBS } from '../../tax/value-objects';

/**
 * Alíquotas regionais de IBS
 * 
 * O IBS será diferenciado por UF e Município, permitindo
 * que cada ente defina sua própria alíquota dentro dos
 * limites estabelecidos pela LC 214/2025.
 */
export interface IBSRegionalRates {
  ufCode: string;
  municipioCode?: string;
  ibsUfRate: AliquotaIBS;
  ibsMunRate: AliquotaIBS;
  effectiveDate: Date;
  expirationDate?: Date;
}

/**
 * Alíquotas de CBS (federal, uniforme)
 * 
 * A CBS é federal e uniforme em todo território nacional,
 * mas pode variar conforme o ano (período de transição).
 */
export interface CBSRates {
  cbsRate: AliquotaCBS;
  effectiveDate: Date;
  expirationDate?: Date;
  year: number;
}

/**
 * Alíquotas do Imposto Seletivo
 * 
 * O IS incide sobre produtos específicos (bebidas alcoólicas,
 * cigarros, veículos, etc.) com alíquotas definidas por categoria.
 */
export interface ISRates {
  productCategory: string;
  ncmCode?: string;
  isRate: number; // Percentual
  effectiveDate: Date;
  expirationDate?: Date;
}

/**
 * Port: Repositório de Alíquotas Tributárias
 * 
 * Define contrato para consulta de alíquotas regionais e temporais
 * dos novos impostos (IBS/CBS/IS).
 * 
 * Implementação deve consultar:
 * - Tabelas de alíquotas por UF/Município
 * - Tabelas de alíquotas por período (transição 2026-2032)
 * - Regras específicas por produto/serviço
 */
export interface ITaxRateRepository {
  /**
   * Busca alíquotas de IBS para UF e Município específicos
   * 
   * @param ufCode - Código IBGE da UF (2 dígitos)
   * @param municipioCode - Código IBGE do Município (7 dígitos, opcional)
   * @param referenceDate - Data de referência para alíquotas vigentes
   * @returns Alíquotas IBS UF e Municipal
   */
  findIBSRates(
    ufCode: string,
    municipioCode: string | undefined,
    referenceDate: Date
  ): Promise<Result<IBSRegionalRates, string>>;

  /**
   * Busca alíquota de CBS para determinado período
   * 
   * @param referenceDate - Data de referência para alíquota vigente
   * @returns Alíquota CBS do período
   */
  findCBSRate(referenceDate: Date): Promise<Result<CBSRates, string>>;

  /**
   * Busca alíquota de Imposto Seletivo para produto específico
   * 
   * @param ncmCode - Código NCM do produto
   * @param referenceDate - Data de referência
   * @returns Alíquota IS do produto (ou 0% se não sujeito)
   */
  findISRate(
    ncmCode: string,
    referenceDate: Date
  ): Promise<Result<ISRates | undefined, string>>;

  /**
   * Busca alíquotas padrão para período de transição
   * 
   * Retorna alíquotas de teste/transição conforme cronograma oficial:
   * - 2026: IBS 0.1%, CBS 0.9%
   * - 2027: IBS 0.1%, CBS 8.8%
   * - 2029-2032: Progressão gradual
   * - 2033+: IBS 17.7%, CBS 8.8%
   * 
   * @param year - Ano de referência
   * @returns Alíquotas do ano
   */
  findTransitionRates(year: number): Promise<Result<{
    ibsRate: AliquotaIBS;
    cbsRate: AliquotaCBS;
  }, string>>;
}

