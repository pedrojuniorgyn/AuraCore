# k6 Load Test Scenarios - AuraCore

Performance and load tests for the AuraCore ERP using [k6](https://k6.io/).

## Prerequisites

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | AuraCore base URL |
| `TEST_USER_EMAIL` | `test@example.com` | Test user email |
| `TEST_USER_PASSWORD` | `test123` | Test user password |
| `AUTH_TOKEN` | _(none)_ | Pre-authenticated JWT token (skips login) |

## Running Tests

### Single Scenario

```bash
# Login + dashboard navigation (50 VUs, 5 min)
k6 run --env BASE_URL=http://localhost:3000 k6/scenarios/login-navigation.js

# CTe emission under load (100 docs/min target)
k6 run --env BASE_URL=http://localhost:3000 k6/scenarios/cte-emission.js

# Strategic dashboard read load (20 req/s)
k6 run --env BASE_URL=http://localhost:3000 k6/scenarios/strategic-dashboard.js

# SPED generation stress test
k6 run --env BASE_URL=http://localhost:3000 k6/scenarios/sped-generation.js
```

### With Pre-Authenticated Token

```bash
k6 run \
  --env BASE_URL=http://localhost:3000 \
  --env AUTH_TOKEN=eyJhbGciOiJIUzI1NiIs... \
  k6/scenarios/strategic-dashboard.js
```

### With Docker

```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3000 \
  -v $(pwd)/k6:/scripts \
  grafana/k6 run /scripts/scenarios/login-navigation.js
```

## SLA Targets

| Scenario | Metric | Target |
|---|---|---|
| Login + Navigation | GET p50 | < 200ms |
| Login + Navigation | POST p50 | < 500ms |
| CTe Emission | POST p50 | < 500ms |
| CTe Emission | Throughput | 100 docs/min |
| Strategic Dashboard | GET p50 | < 200ms |
| SPED Generation | Full generation | < 30s |

## Scenarios Overview

### `login-navigation.js`
Simulates user login followed by dashboard navigation.
- Ramp up to 50 VUs over 5 minutes
- Tests authentication and page load performance

### `cte-emission.js`
Simulates high-throughput CTe document creation.
- Constant arrival rate of ~100 docs/min
- Tests fiscal document pipeline under sustained load

### `strategic-dashboard.js`
Simulates concurrent dashboard reads.
- Constant rate of 20 requests/second
- Tests KPI aggregation and caching layers

### `sped-generation.js`
Stress test for SPED file generation.
- Low concurrency (5 VUs) but heavy compute
- Tests long-running fiscal report generation

## Output & Reporting

### Console summary (default)
```bash
k6 run k6/scenarios/login-navigation.js
```

### JSON output for CI/CD
```bash
k6 run --out json=results.json k6/scenarios/login-navigation.js
```

### Grafana Cloud k6 (if configured)
```bash
K6_CLOUD_TOKEN=<token> k6 cloud k6/scenarios/login-navigation.js
```
