/**
 * k6 Load Test: Financial & Fiscal API V2
 * 
 * Testa performance das rotas V2 DDD sob carga.
 * 
 * Cenários:
 * 1. Smoke: 1 VU, 30s (verificar que funciona)
 * 2. Load: 10 VUs, 2min (carga normal)
 * 3. Stress: 50 VUs, 3min (limite)
 * 
 * Executar:
 *   k6 run tests/performance/k6-financial-api.js
 *   K6_SCENARIO=smoke k6 run tests/performance/k6-financial-api.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const payablesListDuration = new Trend('payables_list_duration', true);
const cashFlowDuration = new Trend('cash_flow_duration', true);
const trialBalanceDuration = new Trend('trial_balance_duration', true);

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const COOKIE = __ENV.AUTH_COOKIE || '';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'smokeTest',
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      exec: 'loadTest',
      startTime: '35s',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      exec: 'loadTest',
      startTime: '2m40s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // 95% das requests < 2s
    http_req_failed: ['rate<0.05'],       // < 5% de falhas
    errors: ['rate<0.05'],
    payables_list_duration: ['p(95)<1500'],
    cash_flow_duration: ['p(95)<3000'],   // Reports podem demorar mais
    trial_balance_duration: ['p(95)<3000'],
  },
};

function makeHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (COOKIE) {
    headers['Cookie'] = COOKIE;
  }
  return headers;
}

export function smokeTest() {
  const headers = makeHeaders();

  group('Smoke: Financial API V2', () => {
    // 1. List Payables
    const payables = http.get(`${BASE_URL}/api/v2/financial/payables?pageSize=5`, { headers });
    check(payables, {
      'payables status 200': (r) => r.status === 200,
      'payables has data': (r) => r.json() !== null,
    });

    // 2. List Receivables
    const receivables = http.get(`${BASE_URL}/api/v2/financial/receivables?pageSize=5`, { headers });
    check(receivables, {
      'receivables status 200': (r) => r.status === 200,
    });

    // 3. Cash Flow Report
    const cashFlow = http.get(`${BASE_URL}/api/v2/financial/reports/cash-flow`, { headers });
    check(cashFlow, {
      'cashFlow status 200': (r) => r.status === 200,
    });

    // 4. DRE Report
    const dre = http.get(`${BASE_URL}/api/v2/financial/reports/dre`, { headers });
    check(dre, {
      'dre status 200': (r) => r.status === 200,
    });
  });

  group('Smoke: Accounting API V2', () => {
    // 5. Trial Balance
    const trialBalance = http.get(`${BASE_URL}/api/v2/accounting/trial-balance`, { headers });
    check(trialBalance, {
      'trialBalance status 200': (r) => r.status === 200,
    });

    // 6. Journal Entries
    const entries = http.get(`${BASE_URL}/api/v2/accounting/journal-entries?pageSize=5`, { headers });
    check(entries, {
      'entries status 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}

export function loadTest() {
  const headers = makeHeaders();

  // Mix de operações típicas
  const operations = [
    () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/v2/financial/payables?pageSize=20`, { headers });
      payablesListDuration.add(Date.now() - start);
      errorRate.add(res.status !== 200);
    },
    () => {
      const res = http.get(`${BASE_URL}/api/v2/financial/receivables?pageSize=20`, { headers });
      errorRate.add(res.status !== 200);
    },
    () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/v2/financial/reports/cash-flow`, { headers });
      cashFlowDuration.add(Date.now() - start);
      errorRate.add(res.status !== 200);
    },
    () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/v2/accounting/trial-balance`, { headers });
      trialBalanceDuration.add(Date.now() - start);
      errorRate.add(res.status !== 200);
    },
    () => {
      const res = http.get(`${BASE_URL}/api/v2/accounting/journal-entries?pageSize=20`, { headers });
      errorRate.add(res.status !== 200);
    },
    () => {
      const res = http.get(`${BASE_URL}/api/v2/audit?pageSize=10`, { headers });
      errorRate.add(res.status !== 200);
    },
  ];

  // Pick random operation
  const op = operations[Math.floor(Math.random() * operations.length)];
  op();

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s between requests
}

export function handleSummary(data) {
  return {
    'tests/performance/k6-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  // k6 default summary
  return '';
}
