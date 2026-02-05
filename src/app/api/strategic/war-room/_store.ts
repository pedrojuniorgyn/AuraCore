/**
 * War Room Store (Compartilhado)
 * Store em memória compartilhado entre todas as rotas de war room
 * 
 * IMPORTANTE: Este arquivo é importado por:
 * - /api/strategic/war-room/route.ts
 * - /api/strategic/war-room/[id]/route.ts
 * - /api/strategic/war-room/[id]/actions/route.ts
 * - /api/strategic/war-room/[id]/team/route.ts
 * - /api/strategic/war-room/[id]/updates/route.ts
 * 
 * ⚠️ LIMITAÇÕES (storage in-memory temporário):
 * - Dados perdidos ao reiniciar servidor
 * - Não há proteção contra race conditions em modificações concorrentes
 * - Não há transações atômicas para múltiplas operações
 * - Substituir por persistência em banco quando implementar E10
 * 
 * @module app/api/strategic/war-room/_store
 */
import type { WarRoom } from '@/lib/war-room/war-room-types';

// Store compartilhado por organização
const warRoomsStoreByOrg = new Map<number, Map<string, WarRoom>>();

/**
 * Obtém o store de war rooms para uma organização específica
 * Cria um novo Map se não existir
 */
export function getOrgStore(orgId: number): Map<string, WarRoom> {
  if (!warRoomsStoreByOrg.has(orgId)) {
    warRoomsStoreByOrg.set(orgId, new Map());
  }
  return warRoomsStoreByOrg.get(orgId)!;
}

/**
 * Obtém uma war room por ID e organização
 * Retorna undefined se não encontrada
 */
export function getWarRoom(orgId: number, warRoomId: string): WarRoom | undefined {
  const store = getOrgStore(orgId);
  return store.get(warRoomId);
}

/**
 * Salva uma war room no store
 */
export function setWarRoom(orgId: number, warRoom: WarRoom): void {
  const store = getOrgStore(orgId);
  store.set(warRoom.id, warRoom);
}

/**
 * Remove uma war room do store
 */
export function deleteWarRoom(orgId: number, warRoomId: string): boolean {
  const store = getOrgStore(orgId);
  return store.delete(warRoomId);
}

/**
 * Lista todas as war rooms de uma organização
 */
export function listWarRooms(orgId: number): WarRoom[] {
  const store = getOrgStore(orgId);
  return Array.from(store.values());
}

/**
 * Verifica se uma war room existe
 */
export function hasWarRoom(orgId: number, warRoomId: string): boolean {
  const store = getOrgStore(orgId);
  return store.has(warRoomId);
}
