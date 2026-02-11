/**
 * k6 Load Test: Strategic Dashboard Reads
 *
 * Simulates concurrent reads to the strategic module endpoints:
 * dashboard overview, KPIs, and action plans.
 *
 * Target: 20 requests/second sustained
 * Duration: 5 minutes
 *
 * SLA:
 *   GET /api/strategic/dashboard   < 200ms p50
 *   GET /api/strategic/kpis        < 200ms p50
 *   GET /api/strategic/action-plans < 200ms p50
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 k6/scenarios/strategic-dashboard.js
 *
 * @module k6/scenarios/strategic-dashboard
 * @since E12
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------

const dashboardDuration = new Trend('dashboard_get_duration', true);
const kpiDuration = new Trend('kpi_get_duration', true);
const actionPlanDuration = new Trend('action_plan_get_duration', true);
const errorRate = new Rate('errors');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    strategic_reads: {
      // Constant arrival rate: 20 req/s = 1200 req/min
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 10,
      maxVUs: 40,
    },
  },
  thresholds: {
    dashboard_get_duration: ['p(50)<200', 'p(95)<800'],
    kpi_get_duration: ['p(50)<200', 'p(95)<800'],
    action_plan_get_duration: ['p(50)<200', 'p(95)<800'],
    http_req_duration: ['p(50)<300', 'p(95)<1500'],
    errors: ['rate<0.05'],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (__ENV.AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${__ENV.AUTH_TOKEN}`;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Main Scenario
// ---------------------------------------------------------------------------

export default function () {
  const headers = getHeaders();

  // Randomly pick one of 3 endpoints per iteration to spread the load
  const endpoint = Math.random();

  if (endpoint < 0.4) {
    // ── Dashboard (40% of traffic) ──────────────────────────────────────
    group('dashboard', function () {
      const res = http.get(`${BASE_URL}/api/strategic/dashboard`, {
        headers,
        tags: { name: 'GET /api/strategic/dashboard' },
      });

      const ok = check(res, {
        'dashboard 200': (r) => r.status === 200,
        'dashboard has body': (r) => r.body && r.body.length > 2,
      });

      errorRate.add(!ok);
      dashboardDuration.add(res.timings.duration);
    });
  } else if (endpoint < 0.7) {
    // ── KPIs (30% of traffic) ───────────────────────────────────────────
    group('kpis', function () {
      const res = http.get(`${BASE_URL}/api/strategic/kpis`, {
        headers,
        tags: { name: 'GET /api/strategic/kpis' },
      });

      const ok = check(res, {
        'kpis 200': (r) => r.status === 200,
        'kpis has body': (r) => r.body && r.body.length > 2,
      });

      errorRate.add(!ok);
      kpiDuration.add(res.timings.duration);
    });
  } else {
    // ── Action Plans (30% of traffic) ───────────────────────────────────
    group('action_plans', function () {
      const res = http.get(`${BASE_URL}/api/strategic/action-plans`, {
        headers,
        tags: { name: 'GET /api/strategic/action-plans' },
      });

      const ok = check(res, {
        'action-plans 200': (r) => r.status === 200,
        'action-plans has body': (r) => r.body && r.body.length > 2,
      });

      errorRate.add(!ok);
      actionPlanDuration.add(res.timings.duration);
    });
  }

  // No explicit sleep — arrival rate executor controls pacing
}
