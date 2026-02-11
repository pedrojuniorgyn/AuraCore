/**
 * k6 Load Test: Login + Dashboard Navigation
 *
 * Simulates a typical user flow: authenticate via credentials,
 * then navigate through the strategic dashboard.
 *
 * Target: 50 virtual users
 * Duration: 5 minutes (1m ramp-up, 3m sustained, 1m ramp-down)
 *
 * SLA:
 *   GET  < 200ms p50
 *   POST < 500ms p50
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 k6/scenarios/login-navigation.js
 *
 * @module k6/scenarios/login-navigation
 * @since E12
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------

const loginDuration = new Trend('login_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);
const errorRate = new Rate('errors');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    login_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 25 },  // ramp up
        { duration: '3m', target: 50 },  // sustained load
        { duration: '1m', target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    // Global HTTP thresholds
    http_req_duration: ['p(50)<500', 'p(95)<2000'],
    // Custom thresholds
    login_duration: ['p(50)<500', 'p(95)<1500'],
    dashboard_duration: ['p(50)<200', 'p(95)<1000'],
    errors: ['rate<0.1'], // < 10% error rate
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

function getHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Main Scenario
// ---------------------------------------------------------------------------

export default function () {
  let authToken = __ENV.AUTH_TOKEN || null;

  // ── Step 1: Login ────────────────────────────────────────────────────────
  group('01_login', function () {
    if (!authToken) {
      const loginPayload = JSON.stringify({
        email: __ENV.TEST_USER_EMAIL || 'test@example.com',
        password: __ENV.TEST_USER_PASSWORD || 'test123',
      });

      const loginRes = http.post(
        `${BASE_URL}/api/auth/callback/credentials`,
        loginPayload,
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /api/auth/login' } }
      );

      const loginOk = check(loginRes, {
        'login status is 200': (r) => r.status === 200,
        'login response has body': (r) => r.body && r.body.length > 0,
      });

      errorRate.add(!loginOk);
      loginDuration.add(loginRes.timings.duration);

      if (loginOk) {
        try {
          const body = loginRes.json();
          if (body) {
            authToken = body.token || body.accessToken || null;
          }
        } catch {
          // Response may not be JSON; continue with cookies
          // authToken remains null, which is fine
        }
      }
    }
  });

  sleep(0.5);

  // ── Step 2: Dashboard ────────────────────────────────────────────────────
  group('02_dashboard', function () {
    const headers = getHeaders(authToken);

    const dashRes = http.get(`${BASE_URL}/api/strategic/dashboard`, {
      headers,
      tags: { name: 'GET /api/strategic/dashboard' },
    });

    const dashOk = check(dashRes, {
      'dashboard status is 200': (r) => r.status === 200,
      'dashboard has data': (r) => r.body && r.body.length > 10,
    });

    errorRate.add(!dashOk);
    dashboardDuration.add(dashRes.timings.duration);
  });

  sleep(0.5);

  // ── Step 3: KPIs ─────────────────────────────────────────────────────────
  group('03_kpis', function () {
    const headers = getHeaders(authToken);

    const kpiRes = http.get(`${BASE_URL}/api/strategic/kpis`, {
      headers,
      tags: { name: 'GET /api/strategic/kpis' },
    });

    check(kpiRes, {
      'kpis status is 200': (r) => r.status === 200,
    });

    errorRate.add(kpiRes.status !== 200);
  });

  sleep(0.5);

  // ── Step 4: Notifications ────────────────────────────────────────────────
  group('04_notifications', function () {
    const headers = getHeaders(authToken);

    const notifRes = http.get(`${BASE_URL}/api/notifications?limit=10`, {
      headers,
      tags: { name: 'GET /api/notifications' },
    });

    check(notifRes, {
      'notifications status is 200': (r) => r.status === 200,
    });
  });

  // Think time between iterations
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}
