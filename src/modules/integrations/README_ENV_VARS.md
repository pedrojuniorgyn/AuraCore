# Integrations Module - Environment Variables

## Overview

The IntegrationsModule uses environment variables to switch between **real adapters** and **mocks**.

**Default behavior:** Uses mocks for **partial adapters** to prevent production failures.

---

## Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `NODE_ENV` | `test` \| `development` \| `production` | - | Auto-enables mocks when `test` |
| `USE_MOCK_INTEGRATIONS` | `true` \| `false` | `false` | Forces all integrations to use mocks |
| `USE_MOCK_SEFAZ` | `true` \| `false` | `true` | SEFAZ adapter switch |
| `USE_MOCK_BANKING` | `true` \| `false` | `true` | Banking adapter switch |
| `USE_MOCK_NOTIFICATION` | `true` \| `false` | `false` | Notification adapter switch |
| `USE_MOCK_OFX` | `true` \| `false` | `false` | OFX Parser adapter switch |

---

## Adapter Implementation Status

### ⚠️ SEFAZ Gateway (`USE_MOCK_SEFAZ`)

**Implementation:** 1/7 methods (14%)

| Method | Status | Notes |
|--------|--------|-------|
| `authorizeCte` | ✅ Functional | Production ready |
| `cancelCte` | ❌ Stub | Returns NOT_IMPLEMENTED |
| `queryCteStatus` | ❌ Stub | Returns NOT_IMPLEMENTED |
| `queryDistribuicaoDFe` | ❌ Stub | Returns NOT_IMPLEMENTED |
| `manifestNfe` | ❌ Stub | Returns NOT_IMPLEMENTED |
| `authorizeMdfe` | ❌ Stub | Returns NOT_IMPLEMENTED |
| `closeMdfe` | ❌ Stub | Returns NOT_IMPLEMENTED |

**Default:** `MockSefazGateway` (safe)  
**Production use:** ⚠️ **NOT RECOMMENDED** - Only 1 method works

```bash
# Development (safe)
USE_MOCK_SEFAZ=true

# Production (DANGEROUS! 6/7 methods will fail)
USE_MOCK_SEFAZ=false  # NOT RECOMMENDED
```

---

### ⚠️ Banking Gateway (`USE_MOCK_BANKING`)

**Implementation:** 6/11 methods (55%)

| Method | Status | Notes |
|--------|--------|-------|
| `createBankSlip` | ✅ Functional | BTG Boletos |
| `cancelBankSlip` | ✅ Functional | BTG Boletos |
| `queryBankSlipStatus` | ✅ Functional | BTG Boletos |
| `createPixCharge` | ✅ Functional | BTG Pix |
| `queryPixChargeStatus` | ✅ Functional | BTG Pix |
| `queryDdaDebits` | ✅ Functional | BTG DDA |
| `executePayment` | ❌ Stub | Returns NOT_IMPLEMENTED |
| `queryPaymentStatus` | ❌ Stub | Returns NOT_IMPLEMENTED |
| `authorizeDdaDebit` | ❌ Stub | Returns NOT_IMPLEMENTED |
| `queryBalance` | ❌ Stub | Returns NOT_IMPLEMENTED |

**Default:** `MockBankingGateway` (safe)  
**Production use:** ⚠️ **LIMITED** - Only boletos/pix work

```bash
# Development (safe)
USE_MOCK_BANKING=true

# Production (PARTIAL! Payment/DDA/Balance will fail)
USE_MOCK_BANKING=false  # Use with caution
```

---

### ✅ Notification Service (`USE_MOCK_NOTIFICATION`)

**Implementation:** 2/2 methods (100%)

| Method | Status | Notes |
|--------|--------|-------|
| `sendEmail` | ✅ Functional | Nodemailer SMTP |
| `sendBulkEmail` | ✅ Functional | Nodemailer SMTP |

**Default:** Real adapter (`NodemailerAdapter`)  
**Production use:** ✅ **SAFE** - Fully implemented

**Requirements:**
- SMTP credentials configured
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

```bash
# Use real SMTP (default)
USE_MOCK_NOTIFICATION=false

# Use mock (testing)
USE_MOCK_NOTIFICATION=true
```

---

### ✅ Bank Statement Parser (`USE_MOCK_OFX`)

**Implementation:** 2/2 methods (100%)

| Method | Status | Notes |
|--------|--------|-------|
| `parseOFX` | ✅ Functional | ofx-parser library |
| `parseCSV` | ✅ Functional | papaparse library |

**Default:** Real adapter (`OfxParserAdapter`)  
**Production use:** ✅ **SAFE** - Fully implemented

```bash
# Use real parser (default)
USE_MOCK_OFX=false

# Use mock (testing)
USE_MOCK_OFX=true
```

---

## Recommended Configurations

### Development

```bash
NODE_ENV=development
USE_MOCK_SEFAZ=true       # Safe default
USE_MOCK_BANKING=true     # Safe default
USE_MOCK_NOTIFICATION=false  # Use real SMTP if configured
USE_MOCK_OFX=false        # Use real parser
```

### Testing

```bash
NODE_ENV=test             # Auto-enables all mocks
# OR
USE_MOCK_INTEGRATIONS=true  # Force all mocks
```

### Production (Conservative)

```bash
NODE_ENV=production
USE_MOCK_SEFAZ=true       # ⚠️ Real adapter has 6/7 stubs!
USE_MOCK_BANKING=true     # ⚠️ Real adapter has 5/11 stubs!
USE_MOCK_NOTIFICATION=false  # ✅ Safe - fully implemented
USE_MOCK_OFX=false        # ✅ Safe - fully implemented
```

### Production (Aggressive - NOT RECOMMENDED)

```bash
NODE_ENV=production
USE_MOCK_SEFAZ=false      # 🔴 DANGER! 6/7 methods fail
USE_MOCK_BANKING=false    # 🔴 DANGER! 5/11 methods fail
USE_MOCK_NOTIFICATION=false  # ✅ OK
USE_MOCK_OFX=false        # ✅ OK
```

---

## Production Safety (LC-896237)

**Rule:** Never use adapters with stub methods in production without explicit opt-in.

**Enforcement:**

1. **Default to mocks** for partial adapters (SEFAZ, Banking)
2. **Require explicit env var** to use real adapters (`USE_MOCK_X=false`)
3. **Log warnings** when real partial adapters are used
4. **Document** which methods are stub vs functional

**Why?**

Registering stub adapters in production causes:
- ❌ 100% failure rate for unimplemented methods
- ❌ Silent failures (Result.fail instead of errors)
- ❌ Hard to debug (looks like external API issue)

---

## Implementation Roadmap

### E7.11 - Complete SEFAZ Adapter

**Target:** 7/7 methods (100%)

- [ ] `cancelCte` - SEFAZ webservice call
- [ ] `queryCteStatus` - SEFAZ webservice call
- [ ] `queryDistribuicaoDFe` - Reuse sefaz-service.ts
- [ ] `manifestNfe` - SEFAZ webservice call
- [ ] `authorizeMdfe` - SEFAZ webservice call
- [ ] `closeMdfe` - SEFAZ webservice call

### E7.11 - Complete Banking Adapter

**Target:** 11/11 methods (100%)

- [ ] `executePayment` - Implement btg-payments.ts
- [ ] `queryPaymentStatus` - Implement btg-payments.ts
- [ ] `authorizeDdaDebit` - Implement btg-dda.ts
- [ ] `queryBalance` - Implement btg-account.ts

---

## Troubleshooting

### Error: "SEFAZ_NOT_IMPLEMENTED"

**Cause:** Real SefazGatewayAdapter is registered but method is stub.

**Solution:**
```bash
USE_MOCK_SEFAZ=true  # Use mock instead
```

### Error: "BANKING_PAYMENT_NOT_IMPLEMENTED"

**Cause:** Real BtgBankingAdapter is registered but payment methods are stub.

**Solution:**
```bash
USE_MOCK_BANKING=true  # Use mock instead
# OR
# Only use boletos/pix, avoid payment/dda/balance methods
```

### Email not sending

**Cause:** SMTP credentials not configured.

**Solution:**
```bash
# Configure SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password

# OR use mock for testing
USE_MOCK_NOTIFICATION=true
```

---

**Last updated:** 2026-01-03 (E7.10 Phase 2.6 - LC-896237)

