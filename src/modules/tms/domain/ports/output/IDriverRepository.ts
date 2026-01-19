/**
 * IDriverRepository - Port de Output para persistência de Drivers
 */
import { Result } from '@/shared/domain';
import type { Driver } from '../../entities/Driver';
import type { DriverStatusType } from '../../value-objects/DriverStatus';

export interface DriverFilter {
  organizationId: number;
  branchId?: number;
  status?: DriverStatusType;
  name?: string;
  cpf?: string;
  page?: number;
  pageSize?: number;
}

export interface DriverListResult {
  items: Driver[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IDriverRepository {
  findById(id: number, organizationId: number): Promise<Result<Driver | null, string>>;
  findByCpf(cpf: string, organizationId: number): Promise<Result<Driver | null, string>>;
  findMany(filter: DriverFilter): Promise<Result<DriverListResult, string>>;
  findActive(organizationId: number, branchId: number): Promise<Result<Driver[], string>>;
  save(driver: Driver): Promise<Result<number, string>>;
  delete(id: number, organizationId: number): Promise<Result<void, string>>;
}
