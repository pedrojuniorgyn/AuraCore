#!/usr/bin/env npx tsx
/**
 * Script para testar manualmente o process_document com bank_statement
 * 
 * Uso:
 *   npx tsx mcp-server/scripts/test-bank-statement.ts <arquivo.ofx|arquivo.csv>
 * 
 * Ou via npm script:
 *   cd mcp-server && npm run test:bank-statement -- scripts/exemplo-extrato.ofx
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Importar o handler do tool
import { processDocument } from '../src/tools/process-document.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📄 Script de Teste - Bank Statement Parser');
    console.log('═'.repeat(50));
    console.log('');
    console.log('Uso:');
    console.log('  npx tsx mcp-server/scripts/test-bank-statement.ts <arquivo>');
    console.log('');
    console.log('Formatos suportados:');
    console.log('  .ofx  - Open Financial Exchange');
    console.log('  .qfx  - Quicken OFX');
    console.log('  .csv  - Valores separados por vírgula/ponto-e-vírgula');
    console.log('  .txt  - Texto (auto-detecta formato)');
    console.log('');
    console.log('Exemplo:');
    console.log('  npx tsx mcp-server/scripts/test-bank-statement.ts ~/Downloads/extrato.ofx');
    console.log('  npx tsx mcp-server/scripts/test-bank-statement.ts scripts/exemplo-extrato.ofx');
    console.log('');
    process.exit(1);
  }

  const filePath = args[0];
  if (!filePath) {
    console.error('❌ Caminho do arquivo não fornecido');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);

  // Verificar se arquivo existe
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Arquivo não encontrado: ${absolutePath}`);
    process.exit(1);
  }

  // Ler arquivo
  const content = fs.readFileSync(absolutePath);
  const base64Content = content.toString('base64');
  const fileName = path.basename(absolutePath);

  console.log('');
  console.log('📄 Processando arquivo:', fileName);
  console.log('📦 Tamanho:', (content.length / 1024).toFixed(2), 'KB');
  console.log('📂 Caminho:', absolutePath);
  console.log('');

  try {
    const startTime = Date.now();

    // Chamar o handler
    const result = await processDocument({
      document_type: 'bank_statement',
      file_name: fileName,
      file_base64: base64Content,
    });

    const elapsed = Date.now() - startTime;

    if (!result.success) {
      console.error('❌ Erro no processamento:');
      result.errors?.forEach(err => console.error('  -', err));
      process.exit(1);
    }

    const bankData = result.data.bank_statement;
    if (!bankData) {
      console.error('❌ Dados do extrato não encontrados na resposta');
      process.exit(1);
    }

    // Exibir resultados
    console.log('✅ Processamento concluído em', elapsed, 'ms');
    console.log('');
    
    console.log('🏦 DADOS DA CONTA:');
    console.log('─'.repeat(50));
    console.log('  Banco:', bankData.account.bankName || 'N/A', `(${bankData.account.bankCode || 'N/A'})`);
    console.log('  Agência:', bankData.account.branchCode || 'N/A');
    console.log('  Conta:', bankData.account.accountNumber || 'N/A');
    console.log('  Tipo:', bankData.account.accountType || 'N/A');
    console.log('  Moeda:', bankData.account.currency);
    console.log('');

    console.log('📅 PERÍODO:');
    console.log('─'.repeat(50));
    console.log('  Início:', bankData.period.start);
    console.log('  Fim:', bankData.period.end);
    console.log('');

    console.log('💰 SALDOS:');
    console.log('─'.repeat(50));
    console.log('  Saldo inicial: R$', bankData.balance.opening.toFixed(2));
    console.log('  Saldo final:   R$', bankData.balance.closing.toFixed(2));
    if (bankData.balance.available !== undefined) {
      console.log('  Disponível:    R$', bankData.balance.available.toFixed(2));
    }
    console.log('');

    console.log('📊 ESTATÍSTICAS:');
    console.log('─'.repeat(50));
    console.log('  Total de transações:', bankData.statistics.transactionCount);
    console.log('  Créditos:', bankData.statistics.creditCount, '| Total: R$', bankData.statistics.totalCredits.toFixed(2));
    console.log('  Débitos:', bankData.statistics.debitCount, '| Total: R$', bankData.statistics.totalDebits.toFixed(2));
    console.log('  Movimento líquido: R$', bankData.statistics.netMovement.toFixed(2));
    console.log('  Média por transação: R$', bankData.statistics.averageAmount.toFixed(2));
    console.log('');

    console.log('💳 TRANSAÇÕES (primeiras 10):');
    console.log('─'.repeat(50));
    const transactions = bankData.transactions.slice(0, 10);
    transactions.forEach((tx, i) => {
      const sign = tx.type === 'CREDIT' ? '+' : '-';
      const color = tx.type === 'CREDIT' ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      const desc = tx.description.length > 35 ? tx.description.substring(0, 35) + '...' : tx.description;
      console.log(
        `  ${String(i + 1).padStart(2)}. ${tx.date} | ${color}${sign}R$ ${Math.abs(tx.amount).toFixed(2).padStart(10)}${reset} | ${(tx.category || 'OTHER').padEnd(12)} | ${desc}`
      );
    });

    if (bankData.transactions.length > 10) {
      console.log(`  ... e mais ${bankData.transactions.length - 10} transações`);
    }
    console.log('');

    console.log('🏷️  CATEGORIAS:');
    console.log('─'.repeat(50));
    const categories: Record<string, { count: number; total: number }> = {};
    bankData.transactions.forEach(tx => {
      const cat = tx.category || 'OTHER';
      if (!categories[cat]) {
        categories[cat] = { count: 0, total: 0 };
      }
      categories[cat].count++;
      categories[cat].total += Math.abs(tx.amount);
    });
    Object.entries(categories)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([cat, data]) => {
        console.log(`  ${cat.padEnd(15)} ${String(data.count).padStart(3)} transações | R$ ${data.total.toFixed(2)}`);
      });
    console.log('');

    console.log('✔️  VALIDAÇÃO:');
    console.log('─'.repeat(50));
    console.log('  Válido:', bankData.validation.isValid ? '✅ Sim' : '❌ Não');
    if (bankData.validation.errors.length > 0) {
      console.log('  Erros:');
      bankData.validation.errors.forEach(e => console.log('    -', e));
    }
    if (bankData.validation.warnings.length > 0) {
      console.log('  Avisos:');
      bankData.validation.warnings.forEach(w => console.log('    -', w));
    }
    console.log('');

    console.log('ℹ️  METADADOS:');
    console.log('─'.repeat(50));
    console.log('  Parser utilizado:', bankData.parserUsed);
    console.log('  Formato detectado:', bankData.format);
    console.log('  Tempo de processamento:', result.processing_time_ms, 'ms');
    console.log('');

    // Salvar resultado completo em JSON
    const outputPath = absolutePath.replace(/\.[^.]+$/, '_resultado.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log('💾 Resultado completo salvo em:', outputPath);
    console.log('');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro:', errorMessage);
    process.exit(1);
  }
}

main();
