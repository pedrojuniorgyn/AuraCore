import { z } from "zod";

// === ENUMS ===
export const PlanEnum = z.enum(["FREE", "PRO", "ENTERPRISE"]);
export const OrganizationStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "CANCELED"]);

// === VALIDADORES AUXILIARES ===

/**
 * Valida Slug (URL amigável)
 * - Apenas letras minúsculas, números e hífens
 * - Não pode começar ou terminar com hífen
 */
const slugValidator = z
  .string()
  .min(3, "Slug deve ter no mínimo 3 caracteres")
  .max(100, "Slug deve ter no máximo 100 caracteres")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug deve conter apenas letras minúsculas, números e hífens (não pode começar/terminar com hífen)"
  );

/**
 * Valida CNPJ
 */
const cnpjValidator = z
  .string()
  .min(14, "CNPJ deve ter no mínimo 14 caracteres")
  .max(18, "CNPJ deve ter no máximo 18 caracteres")
  .regex(/^[\d./-]+$/, "CNPJ deve conter apenas números e caracteres de formatação")
  .transform((val) => val.replace(/\D/g, ""))
  .refine((val) => val.length === 14, {
    message: "CNPJ deve ter exatamente 14 dígitos",
  });

// === SCHEMA PRINCIPAL ===

/**
 * Schema de Validação para Criação de Organização (Tenant)
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(255),
  slug: slugValidator,
  document: cnpjValidator,
  plan: PlanEnum.default("FREE"),
  stripeCustomerId: z.string().max(100).optional().or(z.literal("")),
  status: OrganizationStatusEnum.default("ACTIVE"),
});

/**
 * Schema de Validação para Atualização de Organização
 */
export const updateOrganizationSchema = createOrganizationSchema.partial();

/**
 * Type Inference
 */
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;












