import { z } from 'zod';

/**
 * AURACORE - Schemas de Validação Fiscais Reutilizáveis
 * 
 * Este arquivo contém validators específicos para o módulo Fiscal,
 * seguindo legislação brasileira (ICMS, SPED, NFe, CTe, MDFe).
 * 
 * Refs: 
 * - Lei Complementar 87/96 (ICMS)
 * - Manual CTe 3.0 (SEFAZ)
 * - Manual MDFe 3.0 (SEFAZ)
 * 
 * @module lib/validation/fiscal-schemas
 * @version 2.0.0
 */

/**
 * Validação de CNPJ (14 dígitos)
 * 
 * Aceita com ou sem formatação, remove caracteres não numéricos
 */
export const cnpjSchema = z
  .string()
  .min(14, 'CNPJ deve ter 14 dígitos')
  .max(18, 'CNPJ inválido') // 14 dígitos + 4 caracteres de formatação
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 14, { message: 'CNPJ deve ter 14 dígitos' });

/**
 * Validação de CPF (11 dígitos)
 * 
 * Aceita com ou sem formatação, remove caracteres não numéricos
 */
export const cpfSchema = z
  .string()
  .min(11, 'CPF deve ter 11 dígitos')
  .max(14, 'CPF inválido') // 11 dígitos + 3 caracteres de formatação
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 11, { message: 'CPF deve ter 11 dígitos' });

/**
 * Validação de CPF ou CNPJ
 * 
 * Aceita ambos, remove formatação
 */
export const cpfCnpjSchema = z
  .string()
  .min(11, 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos')
  .max(18, 'Documento inválido')
  .transform((val) => val.replace(/\D/g, ''))
  .refine(
    (val) => val.length === 11 || val.length === 14,
    { message: 'Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)' }
  );

/**
 * Validação de UF (Unidade Federativa - 2 letras)
 * 
 * Aceita apenas UFs válidas do Brasil
 */
export const ufSchema = z
  .string()
  .length(2, 'UF deve ter 2 caracteres')
  .toUpperCase()
  .refine(
    (val) => [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ].includes(val),
    { message: 'UF inválida. Use sigla de estado brasileiro válida' }
  );

/**
 * Validação de NCM (Nomenclatura Comum do Mercosul - 8 dígitos)
 * 
 * Ref: Decreto 8.950/2016
 */
export const ncmSchema = z
  .string()
  .regex(/^\d{8}$/, 'NCM deve ter exatamente 8 dígitos numéricos');

/**
 * Validação de CFOP (Código Fiscal de Operações - 4 dígitos)
 * 
 * Ref: Convênio SINIEF s/n de 15/12/1970
 */
export const cfopSchema = z
  .string()
  .regex(/^\d{4}$/, 'CFOP deve ter exatamente 4 dígitos numéricos')
  .refine(
    (val) => ['1', '2', '3', '5', '6', '7'].includes(val[0]),
    { message: 'CFOP inválido. Primeiro dígito deve ser 1,2,3,5,6 ou 7' }
  );

/**
 * Validação de Chave de Acesso (44 dígitos)
 * 
 * Usada em NFe, CTe, MDFe
 * Ref: Manual NFe 4.0
 */
export const chaveAcessoSchema = z
  .string()
  .regex(/^\d{44}$/, 'Chave de acesso deve ter exatamente 44 dígitos numéricos');

/**
 * Validação de CEP (8 dígitos)
 * 
 * Aceita com ou sem formatação (xxxxx-xxx)
 */
export const cepSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 8, { message: 'CEP deve ter 8 dígitos' });

/**
 * Status de documento fiscal (padrão SEFAZ)
 */
export const fiscalDocumentStatusSchema = z.enum([
  'DRAFT',           // Rascunho (não enviado)
  'PENDING_AUTHORIZATION', // Enviado, aguardando retorno
  'AUTHORIZED',      // Autorizado pela SEFAZ
  'CANCELLED',       // Cancelado
  'DENIED',          // Denegado pela SEFAZ
  'CONTINGENCY',     // Contingência
  'SUBMITTED',       // Submetido (alias para PENDING_AUTHORIZATION)
  'REJECTED'         // Rejeitado pela SEFAZ
], { message: 'Status de documento fiscal inválido' });

/**
 * Tipo de documento fiscal
 */
export const fiscalDocumentTypeSchema = z.enum([
  'NFE',    // Nota Fiscal Eletrônica (modelo 55)
  'NFCE',   // Nota Fiscal de Consumidor Eletrônica (modelo 65)
  'CTE',    // Conhecimento de Transporte Eletrônico (modelo 57)
  'MDFE',   // Manifesto de Documentos Fiscais Eletrônicos (modelo 58)
  'NFSE'    // Nota Fiscal de Serviço Eletrônica (municipal)
], { message: 'Tipo de documento fiscal inválido' });

/**
 * CST (Código de Situação Tributária) - ICMS
 * 
 * Ref: Convênio s/n de 15/12/1970
 */
export const cstIcmsSchema = z
  .string()
  .regex(/^\d{2}$/, 'CST ICMS deve ter 2 dígitos')
  .refine(
    (val) => ['00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'].includes(val),
    { message: 'CST ICMS inválido' }
  );

/**
 * CST PIS/COFINS
 * 
 * Ref: Lei 10.833/2003
 */
export const cstPisCofinsSchema = z
  .string()
  .regex(/^\d{2}$/, 'CST PIS/COFINS deve ter 2 dígitos')
  .refine(
    (val) => {
      const code = parseInt(val, 10);
      return (code >= 1 && code <= 9) || [49, 50, 51, 52, 53, 54, 55, 56, 60, 61, 62, 63, 64, 65, 66, 67, 70, 71, 72, 73, 74, 75, 98, 99].includes(code);
    },
    { message: 'CST PIS/COFINS inválido' }
  );

/**
 * Modal de transporte (CTe)
 * 
 * Ref: Manual CTe 3.0
 */
export const modalTransporteSchema = z.enum([
  '01', // Rodoviário
  '02', // Aéreo
  '03', // Aquaviário
  '04', // Ferroviário
  '05', // Dutoviário
  '06'  // Multimodal
], { message: 'Modal de transporte inválido. Use: 01=Rodoviário, 02=Aéreo, 03=Aquaviário, 04=Ferroviário, 05=Dutoviário, 06=Multimodal' });

/**
 * Tipo de serviço (CTe)
 * 
 * Ref: Manual CTe 3.0
 */
export const tipoServicoSchema = z.enum([
  '0', // Normal
  '1', // Subcontratação
  '2', // Redespacho
  '3', // Redespacho Intermediário
  '4'  // Serviço Vinculado à Multimodal
], { message: 'Tipo de serviço inválido. Use: 0=Normal, 1=Subcontratação, 2=Redespacho, 3=Redespacho Intermediário, 4=Vinculado Multimodal' });

/**
 * Finalidade de emissão (NFe/CTe)
 */
export const finalidadeEmissaoSchema = z.enum([
  '1', // Normal
  '2', // Complementar
  '3', // Ajuste
  '4'  // Devolução/Retorno
], { message: 'Finalidade de emissão inválida. Use: 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução' });

/**
 * Código de município IBGE (7 dígitos)
 * 
 * Ref: IBGE
 */
export const codigoMunicipioSchema = z
  .string()
  .regex(/^\d{7}$/, 'Código município IBGE deve ter 7 dígitos');

/**
 * Helper: Validar se string é UUID válido
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Schema UUID (usado para IDs de entities)
 */
export const uuidFiscalSchema = z
  .string()
  .uuid('ID deve ser um UUID válido');
