import { z } from "zod";

// === ENUMS ===
export const BusinessPartnerTypeEnum = z.enum(["CLIENT", "PROVIDER", "CARRIER", "BOTH"]);
export const TaxRegimeEnum = z.enum(["SIMPLE", "NORMAL", "PRESUMED"]);
export const IndIeDestEnum = z.enum(["1", "2", "9"]); // 1=Contribuinte, 2=Isento, 9=Não Contribuinte
export const DataSourceEnum = z.enum(["MANUAL", "XML_IMPORT"]); // Origem do cadastro
export const StatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

// === VALIDADORES AUXILIARES ===

/**
 * Valida CPF/CNPJ (apenas formato - validação de dígitos verificadores pode ser adicionada depois)
 */
const documentValidator = z
  .string()
  .min(11, "CPF/CNPJ deve ter no mínimo 11 caracteres")
  .max(18, "CPF/CNPJ deve ter no máximo 18 caracteres (com formatação)")
  .regex(/^[\d./-]+$/, "CPF/CNPJ deve conter apenas números e caracteres de formatação (. - /)")
  .transform((val) => val.replace(/\D/g, "")) // Remove formatação
  .refine((val) => val.length === 11 || val.length === 14, {
    message: "CPF deve ter 11 dígitos ou CNPJ 14 dígitos",
  });

/**
 * Valida Código IBGE de Município (7 dígitos)
 * Formato: UUXXXXX (UU = código UF, XXXXX = código município)
 */
const cityCodeValidator = z
  .string()
  .length(7, "Código IBGE do município deve ter exatamente 7 dígitos")
  .regex(/^\d{7}$/, "Código IBGE deve conter apenas números");

/**
 * Valida UF (Unidade Federativa - 2 letras maiúsculas)
 */
const stateValidator = z
  .string()
  .length(2, "UF deve ter 2 letras")
  .regex(/^[A-Z]{2}$/, "UF deve ser composta por 2 letras maiúsculas")
  .refine(
    (val) =>
      [
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
      ].includes(val),
    { message: "UF inválida" }
  );

/**
 * Valida CEP brasileiro
 */
const zipCodeValidator = z
  .string()
  .regex(/^\d{5}-?\d{3}$/, "CEP deve estar no formato 00000-000 ou 00000000")
  .transform((val) => val.replace("-", "")); // Remove hífen

/**
 * Valida Inscrição Estadual (IE)
 * Aceita 'ISENTO' ou números (validação específica por UF seria ideal)
 */
const ieValidator = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      if (val.toUpperCase() === "ISENTO") return true;
      return /^\d+$/.test(val.replace(/\D/g, ""));
    },
    { message: "IE deve ser 'ISENTO' ou conter apenas números" }
  );

/**
 * Valida Email (opcional mas se fornecido deve ser válido)
 */
const emailValidator = z
  .string()
  .email("Email inválido")
  .optional()
  .or(z.literal(""));

/**
 * Valida Telefone (formato brasileiro básico)
 */
const phoneValidator = z
  .string()
  .regex(
    /^(\+55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
    "Telefone deve estar no formato (00) 00000-0000 ou similar"
  )
  .optional()
  .or(z.literal(""));

// === SCHEMA PRINCIPAL ===

/**
 * Schema de Validação para Criação de Business Partner
 * Garante Compliance com NFe/CTe 4.0 e Reforma Tributária
 */
export const createBusinessPartnerSchema = z.object({
  // === IDENTIFICAÇÃO (Obrigatórios) ===
  type: BusinessPartnerTypeEnum,
  document: documentValidator,
  name: z.string().min(3, "Razão Social deve ter no mínimo 3 caracteres").max(255),
  tradeName: z.string().max(255).optional().or(z.literal("")),
  email: emailValidator,
  phone: phoneValidator,
  dataSource: DataSourceEnum.default("MANUAL"), // Origem: Manual ou importação XML

  // === FISCAL (Obrigatórios para Emissão de Notas) ===
  taxRegime: TaxRegimeEnum,
  ie: ieValidator,
  im: z.string().max(20).optional().or(z.literal("")),
  cClassTrib: z
    .string()
    .max(10)
    .optional()
    .or(z.literal("")), // Classificação Tributária (Reforma/eSocial)
  indIeDest: IndIeDestEnum.default("9"), // Default: Não Contribuinte

  // === ENDEREÇO (Obrigatórios - Crucial para Cálculo de Impostos) ===
  zipCode: zipCodeValidator,
  street: z.string().min(3, "Logradouro deve ter no mínimo 3 caracteres").max(255),
  number: z.string().min(1, "Número é obrigatório").max(20),
  complement: z.string().max(100).optional().or(z.literal("")),
  district: z.string().min(3, "Bairro deve ter no mínimo 3 caracteres").max(100),
  cityCode: cityCodeValidator,
  cityName: z.string().min(3, "Nome da cidade deve ter no mínimo 3 caracteres").max(100),
  state: stateValidator,

  // === STATUS (Opcional - Default: ACTIVE) ===
  status: StatusEnum.default("ACTIVE"),
});

/**
 * Schema de Validação para Atualização de Business Partner
 * Todos os campos são opcionais
 */
export const updateBusinessPartnerSchema = createBusinessPartnerSchema.partial();

/**
 * Type Inference para uso no TypeScript
 */
export type CreateBusinessPartnerInput = z.infer<typeof createBusinessPartnerSchema>;
export type UpdateBusinessPartnerInput = z.infer<typeof updateBusinessPartnerSchema>;

