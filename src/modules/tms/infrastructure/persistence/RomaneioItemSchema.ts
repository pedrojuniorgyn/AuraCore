import { varchar, int, decimal } from 'drizzle-orm/mssql-core';
import { mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Drizzle Schema: romaneio_items
 * 
 * Persistence model para RomaneioItem
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * 1. Schema DEVE espelhar Domain Model COMPLETO
 * 2. Campos opcionais = .nullable()
 * 3. Decimals com precision e scale corretos:
 *    - Pesos: decimal(10, 3) para kg
 *    - Dimensões: decimal(10, 3) para metros
 *    - Cubagem: decimal(10, 6) para m³
 */
export const romaneioItems = mssqlTable('romaneio_items', {
  // Identificação
  id: varchar('id', { length: 36 }).primaryKey(),
  romaneioId: varchar('romaneio_id', { length: 36 }).notNull(),
  
  // Ordem e identificação física
  sequencia: int('sequencia').notNull(),
  marcacaoVolume: varchar('marcacao_volume', { length: 50 }).notNull(),
  especieEmbalagem: varchar('especie_embalagem', { length: 20 }).notNull(),
  quantidade: int('quantidade').notNull(),
  
  // Pesos (kg - decimal 10,3)
  pesoLiquido: decimal('peso_liquido', { precision: 10, scale: 3 }).notNull(),
  pesoBruto: decimal('peso_bruto', { precision: 10, scale: 3 }).notNull(),
  
  // Dimensões (metros - decimal 10,3)
  altura: decimal('altura', { precision: 10, scale: 3 }).notNull(),
  largura: decimal('largura', { precision: 10, scale: 3 }).notNull(),
  comprimento: decimal('comprimento', { precision: 10, scale: 3 }).notNull(),
  
  // Cubagem calculada (m³ - decimal 10,6)
  cubagem: decimal('cubagem', { precision: 10, scale: 6 }).notNull(),
  
  // Produto
  descricaoProduto: varchar('descricao_produto', { length: 500 }).notNull(),
  codigoProduto: varchar('codigo_produto', { length: 50 }),
  
  // Observações
  observacoes: varchar('observacoes', { length: 1000 }),
});

/**
 * Índices recomendados para performance:
 * 
 * CREATE UNIQUE INDEX idx_romaneio_items_seq 
 *   ON romaneio_items(romaneio_id, sequencia);
 * 
 * CREATE INDEX idx_romaneio_items_romaneio 
 *   ON romaneio_items(romaneio_id);
 */

