import 'reflect-metadata';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

beforeAll(() => {
  // NODE_ENV já é definido automaticamente pelo Vitest
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});

export function mockDate(date: string | Date): Date {
  const mockDate = new Date(date);
  vi.setSystemTime(mockDate);
  return mockDate;
}

export function restoreDate(): void {
  vi.useRealTimers();
}

