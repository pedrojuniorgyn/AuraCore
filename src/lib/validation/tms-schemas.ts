import { z } from 'zod';
import { ufSchema } from './fiscal-schemas';

/**
 * TMS Module - Zod Validation Schemas
 * 
 * Schemas de validação para módulo TMS (Transportation Management System)
 * 
 * @see Sprint Blindagem S1.1 Batch 3
 */

// ============================================================
// ENUMS E TIPOS BASE
// ============================================================

/**
 * Status de viagem
 */
export const tripStatusSchema = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'DELAYED'
], {
  message: 'Status de viagem inválido'
});

/**
 * Tipo de veículo
 */
export const vehicleTypeSchema = z.enum([
  'TRUCK',
  'VAN',
  'PICKUP',
  'MOTORCYCLE',
  'TRAILER',
  'SEMI_TRAILER'
], {
  message: 'Tipo de veículo inválido'
});

/**
 * Status do veículo
 */
export const vehicleStatusSchema = z.enum([
  'AVAILABLE',
  'IN_USE',
  'MAINTENANCE',
  'INACTIVE'
], {
  message: 'Status do veículo inválido'
});

/**
 * Categoria CNH
 */
export const cnhCategorySchema = z.enum(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'], {
  message: 'Categoria CNH inválida'
});

/**
 * Tipo de combustível
 */
export const fuelTypeSchema = z.enum([
  'DIESEL',
  'GASOLINE',
  'ETHANOL',
  'FLEX',
  'ELECTRIC',
  'HYBRID'
], {
  message: 'Tipo de combustível inválido'
});

// ============================================================
// VALIDAÇÕES CUSTOMIZADAS
// ============================================================

/**
 * Validação de placa (padrão Mercosul ou antigo)
 */
export const vehiclePlateSchema = z
  .string()
  .regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, 'Placa inválida (ex: ABC1D23 ou ABC1234)')
  .transform((val) => val.toUpperCase());

/**
 * Validação de RENAVAM (11 dígitos)
 */
export const renavamSchema = z
  .string()
  .regex(/^\d{11}$/, 'RENAVAM deve ter 11 dígitos');

/**
 * Validação de CNH (11 dígitos)
 */
export const cnhSchema = z
  .string()
  .regex(/^\d{11}$/, 'CNH deve ter 11 dígitos');

/**
 * Validação de CPF (11 dígitos)
 */
export const cpfSchema = z
  .string()
  .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
  .or(z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'))
  .transform((val) => val.replace(/\D/g, ''));

/**
 * Validação de telefone (10 ou 11 dígitos)
 */
export const phoneSchema = z
  .string()
  .regex(/^\d{10,11}$/, 'Telefone deve ter 10-11 dígitos')
  .optional();

/**
 * Validação de chassi (VIN - 17 caracteres)
 */
export const chassisNumberSchema = z
  .string()
  .length(17, 'Chassi (VIN) deve ter 17 caracteres')
  .optional();

// ============================================================
// SUB-SCHEMAS (OBJETOS ANINHADOS)
// ============================================================

/**
 * Schema para endereço de origem/destino
 */
const locationSchema = z.object({
  address: z.string().min(5).max(255),
  city: z.string().min(2).max(100),
  uf: ufSchema,
  zipCode: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos').optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// ============================================================
// SCHEMAS DE CRIAÇÃO (POST)
// ============================================================

/**
 * Schema para criar viagem
 */
export const createTripSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  vehicleId: z.string().uuid('ID do veículo inválido'),
  driverId: z.string().uuid('ID do motorista inválido'),
  origin: locationSchema,
  destination: locationSchema,
  plannedDepartureAt: z.string().datetime({ message: 'Data de partida inválida (ISO 8601)' }),
  plannedArrivalAt: z.string().datetime({ message: 'Data de chegada inválida (ISO 8601)' }),
  cargoDescription: z.string().max(500).optional(),
  cargoWeight: z.number().positive().optional(), // kg
  cargoVolume: z.number().positive().optional(), // m³
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => new Date(data.plannedDepartureAt) < new Date(data.plannedArrivalAt),
  { message: 'Data de partida deve ser anterior à chegada', path: ['plannedDepartureAt'] }
);

/**
 * Schema para criar veículo
 */
export const createVehicleSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  plate: vehiclePlateSchema,
  renavam: renavamSchema.optional(),
  type: vehicleTypeSchema,
  brand: z.string().min(2).max(50).trim(),
  model: z.string().min(2).max(50).trim(),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().max(30).optional(),
  capacity: z.number().positive().optional(), // kg
  volumeCapacity: z.number().positive().optional(), // m³
  fuelType: fuelTypeSchema.optional(),
  chassisNumber: chassisNumberSchema,
  fleetNumber: z.string().max(20).optional(),
  status: vehicleStatusSchema.default('AVAILABLE'),
});

/**
 * Schema para criar motorista
 */
export const createDriverSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  name: z.string().min(3).max(100).trim(),
  cpf: cpfSchema,
  cnh: cnhSchema,
  cnhCategory: cnhCategorySchema,
  cnhExpiry: z.string().datetime({ message: 'Validade CNH inválida (ISO 8601)' }),
  phone: phoneSchema,
  email: z.string().email('Email inválido').optional(),
  address: z.string().max(255).optional(),
  hireDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Schema para criar romaneio
 */
export const createRomaneioSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  tripId: z.string().uuid('ID da viagem inválido').optional(),
  remetenteId: z.string().uuid('ID do remetente inválido'),
  destinatarioId: z.string().uuid('ID do destinatário inválido'),
  transportadorId: z.string().uuid().optional(),
  dataEmissao: z.string().datetime({ message: 'Data de emissão inválida (ISO 8601)' }),
  cteNumbers: z.array(z.string()).default([]),
  nfeNumbers: z.array(z.string()).default([]),
  totalVolumes: z.number().int().nonnegative().default(0),
  pesoLiquidoTotal: z.number().nonnegative().default(0),
  pesoBrutoTotal: z.number().nonnegative().default(0),
  observacoes: z.string().max(2000).optional(),
});

/**
 * Schema para criar ordem de coleta
 */
export const createPickupOrderSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  customerId: z.string().uuid('ID do cliente inválido'),
  pickupAddress: locationSchema,
  deliveryAddress: locationSchema,
  scheduledAt: z.string().datetime({ message: 'Data agendada inválida (ISO 8601)' }),
  cargoDescription: z.string().max(500).optional(),
  cargoWeight: z.number().positive().optional(),
  cargoVolume: z.number().positive().optional(),
  specialInstructions: z.string().max(1000).optional(),
});

// ============================================================
// SCHEMAS DE ATUALIZAÇÃO (PUT/PATCH)
// ============================================================

/**
 * Schema para atualizar viagem
 */
export const updateTripSchema = createTripSchema.partial().omit({ organizationId: true, branchId: true });

/**
 * Schema para atualizar veículo
 */
export const updateVehicleSchema = createVehicleSchema.partial().omit({ organizationId: true, branchId: true });

/**
 * Schema para atualizar motorista
 */
export const updateDriverSchema = createDriverSchema.partial().omit({ organizationId: true, branchId: true });

// ============================================================
// SCHEMAS DE QUERY (GET com filtros)
// ============================================================

/**
 * Schema para query de viagens
 */
export const queryTripsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: tripStatusSchema.optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  originUf: ufSchema.optional(),
  destinationUf: ufSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate deve ser anterior ou igual a endDate', path: ['startDate'] }
);

/**
 * Schema para query de veículos
 */
export const queryVehiclesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: vehicleStatusSchema.optional(),
  type: vehicleTypeSchema.optional(),
  plate: z.string().optional(),
  fleetNumber: z.string().optional(),
});

/**
 * Schema para query de motoristas
 */
export const queryDriversSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  name: z.string().optional(),
  cpf: z.string().optional(),
  cnhCategory: cnhCategorySchema.optional(),
});

// ============================================================
// TYPES EXPORTADOS
// ============================================================

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type CreateRomaneioInput = z.infer<typeof createRomaneioSchema>;
export type CreatePickupOrderInput = z.infer<typeof createPickupOrderSchema>;

export type QueryTripsInput = z.infer<typeof queryTripsSchema>;
export type QueryVehiclesInput = z.infer<typeof queryVehiclesSchema>;
export type QueryDriversInput = z.infer<typeof queryDriversSchema>;
