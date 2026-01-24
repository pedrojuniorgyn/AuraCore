#!/usr/bin/env python3
"""
Script de Teste Completo de APIs
Detecta erros 500 e reporta status do sistema
"""
import os
import sys
from datetime import datetime
import subprocess

BASE_URL = os.getenv('BASE_URL', 'https://tcl.auracore.cloud')
AUTH_TOKEN = os.getenv('AUTH_TOKEN', '')

# Endpoints críticos
ENDPOINTS = [
    # Core
    ('GET', '/api/health'),
    
    # Strategic
    ('GET', '/api/strategic/strategies'),
    ('GET', '/api/strategic/goals'),
    ('GET', '/api/strategic/kpis'),
    ('GET', '/api/strategic/action-plans'),
    ('GET', '/api/strategic/notifications'),
    
    # Financial
    ('GET', '/api/financial/payables'),
    ('GET', '/api/financial/receivables'),
    ('GET', '/api/financial/payments'),
    ('GET', '/api/financial/bank-accounts'),
    ('GET', '/api/financial/categories'),
    
    # TMS
    ('GET', '/api/tms/trips'),
    ('GET', '/api/tms/vehicles'),
    ('GET', '/api/tms/drivers'),
    ('GET', '/api/tms/romaneios'),
    
    # Fiscal
    ('GET', '/api/fiscal/documents'),
    ('GET', '/api/fiscal/cte'),
    
    # WMS
    ('GET', '/api/wms/locations'),
    ('GET', '/api/wms/stock-items'),
    
    # CRÍTICO - corrigidos hoje
    ('GET', '/api/notifications'),
    ('GET', '/api/documents'),
]

def test_endpoint(method, path):
    """Testa um endpoint e retorna status code"""
    url = f"{BASE_URL}{path}"
    
    cmd = ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', method, url, '--max-time', '10']
    
    if AUTH_TOKEN:
        cmd.extend(['-H', f'Cookie: __Secure-authjs.session-token={AUTH_TOKEN}'])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return result.stdout.strip() or '000'
    except:
        return '000'

def main():
    print(f"🧪 === TESTE COMPLETO DE APIs ===")
    print(f"Base URL: {BASE_URL}")
    print(f"Data: {datetime.now()}")
    print("")
    
    stats = {
        '200': 0,
        '401': 0,
        '404': 0,
        '500': 0,
        'other': 0,
    }
    
    errors_500 = []
    
    for method, path in ENDPOINTS:
        status = test_endpoint(method, path)
        
        if status == '200':
            print(f"✅ {method} {path} - 200")
            stats['200'] += 1
        elif status == '401':
            print(f"🔒 {method} {path} - 401 (auth required)")
            stats['401'] += 1
        elif status == '404':
            print(f"⚠️  {method} {path} - 404 (not found)")
            stats['404'] += 1
        elif status == '500':
            print(f"❌ {method} {path} - 500 (SERVER ERROR)")
            stats['500'] += 1
            errors_500.append(f"{method} {path}")
        else:
            print(f"❓ {method} {path} - {status}")
            stats['other'] += 1
    
    print("")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 RESUMO FINAL")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    total = len(ENDPOINTS)
    print(f"Total testado: {total}")
    print(f"✅ 200 OK: {stats['200']}")
    print(f"🔒 401 Auth: {stats['401']}")
    print(f"⚠️  404 Not Found: {stats['404']}")
    print(f"❌ 500 Error: {stats['500']}")
    print(f"❓ Other: {stats['other']}")
    
    success_total = stats['200'] + stats['401']
    success_rate = (success_total * 100) / total if total > 0 else 0
    
    print("")
    print(f"Taxa de Sucesso (200+401): {success_rate:.1f}%")
    print("")
    
    if stats['500'] > 0:
        print(f"🔴 ATENÇÃO: {stats['500']} endpoints com erro 500!")
        print("Endpoints com erro 500:")
        for endpoint in errors_500:
            print(f"  - {endpoint}")
        print("")
        print("Sistema NÃO está 100% funcional.")
        sys.exit(1)
    else:
        print("✅ Sistema operacional - 0 erros 500!")
        sys.exit(0)

if __name__ == '__main__':
    main()
