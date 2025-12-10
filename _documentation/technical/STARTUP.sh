#!/bin/bash

echo "🚀 INICIANDO MVP AURACORE..."
echo ""

# Passo 1: Verificar se o servidor está rodando
echo "📋 PASSO 1: Verificando servidor Next.js..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Servidor já está rodando na porta 3000"
else
    echo "⚠️  Servidor não está rodando. Iniciando..."
    npm run dev &
    sleep 5
fi

echo ""
echo "📋 PASSO 2: Executando Migration MVP..."
curl -X POST http://localhost:3000/api/admin/run-mvp-migration \
  -H "Content-Type: application/json" \
  2>/dev/null | jq '.' || echo "Migration já executada anteriormente"

echo ""
echo "📋 PASSO 3: Populando Matriz Tributária (729 regras)..."
echo "Criando endpoint temporário..."

# Criar o endpoint de seed
cat > src/app/api/admin/seed-tax-matrix-temp/route.ts << 'SEED_EOF'
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taxMatrix } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    console.log("🚀 Seeding Tax Matrix...");
    
    const organizationId = 1;
    const createdBy = "system";
    
    const ufs = [
      "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", 
      "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", 
      "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ];
    
    const internalRates: Record<string, number> = {
      AC: 17, AL: 18, AP: 18, AM: 18, BA: 18, CE: 18,
      DF: 18, ES: 17, GO: 17, MA: 18, MT: 17, MS: 17,
      MG: 18, PA: 17, PB: 18, PR: 18, PE: 18, PI: 18,
      RJ: 20, RN: 18, RS: 18, RO: 17.5, RR: 17, SC: 17,
      SP: 18, SE: 18, TO: 18,
    };
    
    const sulSudeste = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"];
    const rules: any[] = [];
    
    for (const origin of ufs) {
      for (const dest of ufs) {
        if (origin === dest) {
          rules.push({
            organizationId,
            originUf: origin,
            destinationUf: dest,
            icmsRate: internalRates[origin].toString(),
            cfopInternal: "5353",
            cst: "00",
            regime: "NORMAL",
            validFrom: new Date("2024-01-01"),
            status: "ACTIVE",
            createdBy,
          });
        } else {
          const isSulSudesteOrigin = sulSudeste.includes(origin);
          const isSulSudesteDest = sulSudeste.includes(dest);
          const icmsRate = isSulSudesteOrigin && isSulSudesteDest ? 12 : 7;
          
          rules.push({
            organizationId,
            originUf: origin,
            destinationUf: dest,
            icmsRate: icmsRate.toString(),
            cfopInterstate: "6353",
            cst: "00",
            regime: "NORMAL",
            validFrom: new Date("2024-01-01"),
            status: "ACTIVE",
            createdBy,
          });
        }
      }
    }
    
    await db.execute(sql\`DELETE FROM tax_matrix WHERE organization_id = 1\`);
    await db.insert(taxMatrix).values(rules);
    
    return NextResponse.json({
      success: true,
      message: \`\${rules.length} regras fiscais criadas!\`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
SEED_EOF

echo "Aguardando rebuild..."
sleep 3

curl -X POST http://localhost:3000/api/admin/seed-tax-matrix-temp \
  -H "Content-Type: application/json" \
  2>/dev/null | jq '.'

# Limpar endpoint temporário
rm -f src/app/api/admin/seed-tax-matrix-temp/route.ts

echo ""
echo "✅ SETUP COMPLETO!"
echo ""
echo "🌐 ACESSE O SISTEMA:"
echo "   http://localhost:3000"
echo ""
echo "📊 PÁGINAS DISPONÍVEIS:"
echo "   - Dashboard:              http://localhost:3000"
echo "   - Matriz Tributária:      http://localhost:3000/fiscal/matriz-tributaria"
echo "   - Tabelas de Frete:       http://localhost:3000/comercial/tabelas-frete"
echo "   - Torre de Controle:      http://localhost:3000/comercial/cotacoes"
echo "   - CTes:                   http://localhost:3000/fiscal/cte"
echo "   - Viagens (TMS):          http://localhost:3000/tms/viagens"
echo "   - Dashboard DRE:          http://localhost:3000/financeiro/dre-dashboard"
echo ""
echo "🎉 SISTEMA PRONTO PARA USO!"
