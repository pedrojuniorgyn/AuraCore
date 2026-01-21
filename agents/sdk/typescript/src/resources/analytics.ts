/**
 * Analytics Resource
 * @module @auracore/sdk/resources/analytics
 */

import type { UsageStats, UsageStatsRequest } from '../types';

type RequestFn = <T>(method: string, path: string, data?: unknown) => Promise<T>;

export class AnalyticsResource {
  constructor(private readonly request: RequestFn) {}

  /**
   * Get usage statistics
   *
   * @example
   * ```typescript
   * const stats = await client.analytics.usage({
   *   startDate: '2026-01-01',
   *   endDate: '2026-01-31',
   *   groupBy: 'day',
   * });
   * console.log(stats.totalRequests);
   * ```
   */
  async usage(request?: UsageStatsRequest): Promise<UsageStats> {
    const params = new URLSearchParams();
    if (request?.startDate) params.set('start_date', request.startDate);
    if (request?.endDate) params.set('end_date', request.endDate);
    if (request?.groupBy) params.set('group_by', request.groupBy);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<UsageStats>('GET', `/v1/analytics/usage${query}`);
  }

  /**
   * Get top agents by usage
   */
  async topAgents(
    limit?: number
  ): Promise<Array<{ agent: string; requests: number }>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<Array<{ agent: string; requests: number }>>(
      'GET',
      `/v1/analytics/top-agents${query}`
    );
  }

  /**
   * Get top tools by usage
   */
  async topTools(
    limit?: number
  ): Promise<Array<{ tool: string; calls: number }>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<Array<{ tool: string; calls: number }>>(
      'GET',
      `/v1/analytics/top-tools${query}`
    );
  }

  /**
   * Get cost estimation
   */
  async costEstimate(
    startDate?: string,
    endDate?: string
  ): Promise<{ estimatedCost: number; currency: string }> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ estimatedCost: number; currency: string }>(
      'GET',
      `/v1/analytics/cost${query}`
    );
  }
}
