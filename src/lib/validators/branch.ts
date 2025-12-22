import { z } from "zod";

// === ENUMS ===
export const CrtEnum = z.enum(["1", "2", "3"]); // 1=Simples Nacional, 2=Simples Excesso, 3=Normal
export const BranchStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);
export const EnvironmentEnum = z.enum(["HOMOLOGATION", "PRODUCTION"]);

// === VALIDADORES AUXILIARES ===

/**
 * Valida CNPJ (apenas formato - validação de dígito verificador pode ser adicionada)
 */
const cnpjValidator = z
  .string()
  .min(14, "CNPJ deve ter no mínimo 14 caracteres")
  .max(18, "CNPJ deve ter no máximo 18 caracteres (com formatação)")
  .regex(/^[\d./-]+$/, "CNPJ deve conter apenas números e caracteres de formatação")
  .transform((val) => val.replace(/\D/g, "")) // Remove formatação
  .refine((val) => val.length === 14, {
    message: "CNPJ deve ter exatamente 14 dígitos",
  });

/**
 * Valida Código IBGE de Município (7 dígitos)
 */
const cityCodeValidator = z
  .string()
  .length(7, "Código IBGE deve ter exatamente 7 dígitos")
  .regex(/^\d{7}$/, "Código IBGE deve conter apenas números");

/**
 * Valida UF (Unidade Federativa)
 */
const stateValidator = z
  .string()
  .length(2, "UF deve ter 2 letras")
  .regex(/^[A-Z]{2}$/, "UF deve ser composta por 2 letras maiúsculas")
  .refine(
    (val) =>
      [
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
        "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
        "RS", "RO", "RR", "SC", "SP", "SE", "TO",
      ].includes(val),
    { message: "UF inválida" }
  );

/**
 * Valida CEP brasileiro
 */
const zipCodeValidator = z
  .string()
  .regex(/^\d{5}-?\d{3}$/, "CEP deve estar no formato 00000-000")
  .transform((val) => val.replace("-", ""));

/**
 * Valida Inscrição Estadual
 */
const ieValidator = z
  .string()
  .min(1, "Inscrição Estadual é obrigatória para filiais")
  .refine(
    (val) => {
      if (val.toUpperCase() === "ISENTO") return true;
      return /^\d+$/.test(val.replace(/\D/g, ""));
    },
    { message: "IE deve ser 'ISENTO' ou conter apenas números" }
  );

/**
 * Valida Email
 */
const emailValidator = z.string().email("Email inválido");

/**
 * Valida Telefone
 */
const phoneValidator = z
  .string()
  .regex(
    /^(\+55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
    "Telefone deve estar no formato (00) 00000-0000"
  );

/**
 * Valida TimeZone
 */
const timeZoneValidator = z
  .string()
  .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, "TimeZone inválido (ex: America/Sao_Paulo)")
  .default("America/Sao_Paulo");

// === SCHEMA PRINCIPAL ===

/**
 * Schema de Validação para Criação de Filial (Branch)
 */
export const createBranchSchema = z.object({
  // === IDENTIFICAÇÃO ===
  name: z.string().min(3, "Razão Social deve ter no mínimo 3 caracteres").max(255),
  tradeName: z.string().min(3, "Nome Fantasia deve ter no mínimo 3 caracteres").max(255),
  document: cnpjValidator,
  email: emailValidator,
  phone: phoneValidator,
  // === INTEGRAÇÃO (LEGADO) ===
  // CodigoEmpresaFilial no banco legado (GlobalTCL), usado para integrações e migrações.
  // Aceita string vazia no front e converte para undefined.
  legacyCompanyBranchCode: z
    .preprocess(
      (v) => {
        if (v === "" || v === null || v === undefined) return undefined;
        const n = typeof v === "number" ? v : Number(String(v));
        return Number.isFinite(n) ? n : undefined;
      },
      z.number().int().min(1).max(32767)
    )
    .optional(),

  // === FISCAL ===
  ie: ieValidator,
  im: z.string().max(20).optional().or(z.literal("")),
  cClassTrib: z.string().max(10).optional().or(z.literal("")),
  crt: CrtEnum.default("1"), // Default: Simples Nacional

  // === ENDEREÇO ===
  zipCode: zipCodeValidator,
  street: z.string().min(3, "Logradouro deve ter no mínimo 3 caracteres").max(255),
  number: z.string().min(1, "Número é obrigatório").max(20),
  complement: z.string().max(100).optional().or(z.literal("")),
  district: z.string().min(3, "Bairro deve ter no mínimo 3 caracteres").max(100),
  cityCode: cityCodeValidator,
  cityName: z.string().min(3, "Nome da cidade deve ter no mínimo 3 caracteres").max(100),
  state: stateValidator,

  // === CONFIGURAÇÕES ===
  timeZone: timeZoneValidator,
  logoUrl: z.string().url("URL inválida").max(500).optional().or(z.literal("")),

  // === SEFAZ (Certificado Digital & Automação) ===
  environment: EnvironmentEnum.default("HOMOLOGATION").optional(),
  lastNsu: z.string().max(15).default("0").optional(),

  // === STATUS ===
  status: BranchStatusEnum.default("ACTIVE"),
});

/**
 * Schema de Validação para Atualização de Filial
 */
export const updateBranchSchema = createBranchSchema.partial().extend({
  id: z.number().int().positive().optional(), // ID é opcional no body, virá da URL
});

/**
 * Type Inference
 */
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

