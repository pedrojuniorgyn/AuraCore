import { z } from "zod";

/**
 * 📦 ZOD SCHEMA: PRODUCTS
 * 
 * Validação robusta para cadastro de produtos com:
 * - Regras fiscais brasileiras (NCM obrigatório)
 * - Validação de SKU (sem espaços)
 * - Unidades de medida padronizadas
 * - Precificação e peso para logística
 */

export const createProductSchema = z.object({
  // Identificação
  sku: z
    .string()
    .min(1, "SKU é obrigatório")
    .max(50, "SKU deve ter no máximo 50 caracteres")
    .regex(/^\S+$/, "SKU não pode conter espaços")
    .transform((val) => val.toUpperCase()),
  
  name: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(255, "Nome deve ter no máximo 255 caracteres"),
  
  description: z
    .string()
    .max(5000, "Descrição muito longa")
    .optional()
    .nullable(),
  
  unit: z
    .enum(["UN", "KG", "CX", "LT", "M", "M2", "M3", "TON"], {
      errorMap: () => ({ message: "Unidade inválida" }),
    })
    .default("UN"),
  
  // Fiscal (NFe Compliance)
  ncm: z
    .string()
    .length(8, "NCM deve ter exatamente 8 dígitos")
    .regex(/^\d{8}$/, "NCM deve conter apenas números"),
  
  origin: z
    .enum(["0", "1", "2", "3", "4", "5", "6", "7", "8"], {
      errorMap: () => ({ message: "Origem inválida (0=Nacional, 1=Importada...)" }),
    })
    .default("0"),
  
  // Logística & Precificação
  weightKg: z
    .number()
    .positive("Peso deve ser positivo")
    .max(99999, "Peso máximo: 99.999 kg")
    .optional()
    .nullable()
    .transform((val) => (val === null ? undefined : val)),
  
  priceCost: z
    .number()
    .nonnegative("Preço de custo não pode ser negativo")
    .max(9999999999.99, "Preço de custo muito alto")
    .optional()
    .nullable()
    .transform((val) => (val === null ? undefined : val)),
  
  priceSale: z
    .number()
    .nonnegative("Preço de venda não pode ser negativo")
    .max(9999999999.99, "Preço de venda muito alto")
    .optional()
    .nullable()
    .transform((val) => (val === null ? undefined : val)),
  
  // Status
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  
  // Multi-Tenant (injetado pela API)
  organizationId: z.number().positive().optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  version: z.number().int().positive().optional(), // Optimistic Lock
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;




















