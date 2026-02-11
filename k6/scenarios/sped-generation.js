/**
 * k6 Load Test: SPED File Generation
 *
 * Stress test for SPED (Sistema Público de Escrituração Digital) generation.
 * SPED reports are computationally heavy and can take seconds to generate.
 * This scenario validates that the system meets the 30-second SLA even
 * under concurrent requests.
 *
 * Target: 5 concurrent SPED generations
 * Duration: 5 minutes
 *
 * SLA:
 *   POST /api/fiscal/sped/generate  < 30s per generation
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 k6/scenarios/sped-generation.js
 *
 * @module k6/scenarios/sped-generation
 * @since E12
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------

const spedDuration = new Trend('sped_generation_duration', true);
const spedSuccessCount = new Counter('sped_success_count');
const spedFailCount = new Counter('sped_fail_count');
const errorRate = new Rate('errors');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    sped_generation: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 2 },  // warm up
        { duration: '3m', target: 5 },   // sustained — 5 concurrent generations
        { duration: '1m', target: 2 },   // cool down
        { duration: '30s', target: 0 },  // drain
      ],
    },
  },
  thresholds: {
    // SPED generation must complete within 30 seconds
    sped_generation_duration: ['p(50)<15000', 'p(95)<30000'],
    // Max allowed duration (hard fail)
    http_req_duration: ['p(99)<60000'],
    errors: ['rate<0.1'],
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

/**
 * Generates a SPED request payload.
 * Cycles through different SPED types per VU iteration.
 */
function generateSpedPayload() {
  const spedTypes = ['fiscal', 'contributions', 'ecd'];
  const spedType = spedTypes[(__ITER || 0) % spedTypes.length];

  // Use a recent month for generation
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // previous month (0-indexed)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-28`;

  return {
    payload: JSON.stringify({
      type: spedType,
      startDate,
      endDate,
      // Test identification
      _testId: `k6-sped-${__VU}-${__ITER}`,
    }),
    spedType,
  };
}

// ---------------------------------------------------------------------------
// Main Scenario
// ---------------------------------------------------------------------------

export default function () {
  const headers = getHeaders();
  const { payload, spedType } = generateSpedPayload();

  // ── Step 1: Generate SPED ────────────────────────────────────────────────
  group('01_generate_sped', function () {
    const startTime = Date.now();

    const genRes = http.post(`${BASE_URL}/api/fiscal/sped/generate`, payload, {
      headers,
      tags: { name: `POST /api/fiscal/sped/generate [${spedType}]` },
      timeout: '60s', // Allow up to 60s for generation
    });

    const duration = Date.now() - startTime;

    const genOk = check(genRes, {
      'sped generation status 200': (r) => r.status === 200,
      'sped response has content': (r) => r.body && r.body.length > 0,
      'sped completed within 30s': () => duration < 30000,
    });

    spedDuration.add(genRes.timings.duration);
    errorRate.add(!genOk);

    if (genOk) {
      spedSuccessCount.add(1);
    } else {
      spedFailCount.add(1);
    }
  });

  // ── Step 2: Verify via Summary (lightweight) ─────────────────────────────
  group('02_verify_summary', function () {
    const summaryRes = http.get(`${BASE_URL}/api/fiscal/documents/summary`, {
      headers,
      tags: { name: 'GET /api/fiscal/documents/summary' },
    });

    check(summaryRes, {
      'summary status is 200': (r) => r.status === 200,
    });
  });

  // Longer think time — SPED generation is heavy
  sleep(Math.random() * 5 + 3); // 3-8 seconds
}
