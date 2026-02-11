/**
 * k6 Load Test: CTe Emission Pipeline
 *
 * Simulates high-throughput CTe (Conhecimento de Transporte Eletrônico)
 * document creation and querying, targeting the fiscal module.
 *
 * Target: ~100 documents/minute
 * Duration: 5 minutes
 *
 * SLA:
 *   POST /api/fiscal/cte  < 500ms p50
 *   GET  /api/fiscal/cte/summary < 200ms p50
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 k6/scenarios/cte-emission.js
 *
 * @module k6/scenarios/cte-emission
 * @since E12
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------

const cteCreateDuration = new Trend('cte_create_duration', true);
const cteSummaryDuration = new Trend('cte_summary_duration', true);
const ctesCreated = new Counter('ctes_created');
const errorRate = new Rate('errors');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    cte_emission: {
      // Constant arrival rate: ~100 iterations/min ≈ 1.67/s
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1m',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    cte_create_duration: ['p(50)<500', 'p(95)<2000'],
    cte_summary_duration: ['p(50)<200', 'p(95)<1000'],
    errors: ['rate<0.05'], // < 5% error rate
    ctes_created: ['count>400'], // At least 400 CTes in 5 min
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

function generateCtePayload() {
  const vuId = __ITER || 0;
  const timestamp = Date.now();

  return JSON.stringify({
    // Minimal CTe payload for load testing
    natOp: 'PRESTACAO DE SERVICO DE TRANSPORTE',
    mod: '57',
    serie: '1',
    tpCTe: '0', // Normal
    tpServ: '0', // Normal
    cMunEnv: '3550308', // São Paulo
    xMunEnv: 'SAO PAULO',
    UFEnv: 'SP',
    cMunIni: '3550308',
    xMunIni: 'SAO PAULO',
    UFIni: 'SP',
    cMunFim: '3304557',
    xMunFim: 'RIO DE JANEIRO',
    UFFim: 'RJ',
    vPrest: (Math.random() * 5000 + 500).toFixed(2),
    vRec: (Math.random() * 5000 + 500).toFixed(2),
    CFOP: '6353',
    // Test identification
    _testId: `k6-cte-${vuId}-${timestamp}`,
  });
}

// ---------------------------------------------------------------------------
// Main Scenario
// ---------------------------------------------------------------------------

export default function () {
  const headers = getHeaders();

  // ── Step 1: Create CTe ───────────────────────────────────────────────────
  group('01_create_cte', function () {
    const payload = generateCtePayload();

    const createRes = http.post(`${BASE_URL}/api/fiscal/cte`, payload, {
      headers,
      tags: { name: 'POST /api/fiscal/cte' },
    });

    const createOk = check(createRes, {
      'create cte status 200 or 201': (r) => r.status === 200 || r.status === 201,
      'create cte has id': (r) => {
        try {
          const body = r.json();
          return body && (body.id || body.data?.id);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!createOk);
    cteCreateDuration.add(createRes.timings.duration);

    if (createOk) {
      ctesCreated.add(1);
    }
  });

  sleep(0.3);

  // ── Step 2: Query CTe Summary ────────────────────────────────────────────
  group('02_cte_summary', function () {
    const summaryRes = http.get(`${BASE_URL}/api/fiscal/cte/summary`, {
      headers,
      tags: { name: 'GET /api/fiscal/cte/summary' },
    });

    const summaryOk = check(summaryRes, {
      'summary status is 200': (r) => r.status === 200,
      'summary has data': (r) => r.body && r.body.length > 2,
    });

    errorRate.add(!summaryOk);
    cteSummaryDuration.add(summaryRes.timings.duration);
  });

  // Minimal sleep — arrival rate controls pacing
  sleep(0.1);
}
