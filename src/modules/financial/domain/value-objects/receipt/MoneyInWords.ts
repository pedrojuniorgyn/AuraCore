import { Money } from '@/shared/domain/value-objects/Money';

/**
 * Converte valor numérico para extenso em português
 * 
 * Exemplos:
 * - R$ 1.234,56 -> "um mil, duzentos e trinta e quatro reais e cinquenta e seis centavos"
 * - R$ 1,00 -> "um real"
 * - R$ 0,50 -> "cinquenta centavos"
 */

const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

/**
 * Converte número até 999 para extenso
 */
function converterGrupo(num: number): string {
  if (num === 0) return '';
  if (num === 100) return 'cem';

  const c = Math.floor(num / 100);
  const d = Math.floor((num % 100) / 10);
  const u = num % 10;

  let resultado = '';

  // Centenas
  if (c > 0) {
    resultado = centenas[c];
  }

  // Dezenas e unidades
  if (d === 1) {
    // Casos especiais (10-19)
    if (resultado) resultado += ' e ';
    resultado += especiais[u];
  } else {
    if (d > 0) {
      if (resultado) resultado += ' e ';
      resultado += dezenas[d];
    }
    if (u > 0) {
      if (resultado) resultado += ' e ';
      resultado += unidades[u];
    }
  }

  return resultado;
}

/**
 * Converte número inteiro para extenso
 */
function converterInteiro(num: number): string {
  if (num === 0) return 'zero';

  const bilhao = Math.floor(num / 1000000000);
  const milhao = Math.floor((num % 1000000000) / 1000000);
  const milhar = Math.floor((num % 1000000) / 1000);
  const resto = num % 1000;

  const partes: string[] = [];

  if (bilhao > 0) {
    const texto = converterGrupo(bilhao);
    partes.push(texto + (bilhao === 1 ? ' bilhão' : ' bilhões'));
  }

  if (milhao > 0) {
    const texto = converterGrupo(milhao);
    partes.push(texto + (milhao === 1 ? ' milhão' : ' milhões'));
  }

  if (milhar > 0) {
    const texto = converterGrupo(milhar);
    partes.push(texto + ' mil');
  }

  if (resto > 0) {
    partes.push(converterGrupo(resto));
  }

  // Juntar partes
  if (partes.length === 1) {
    return partes[0];
  }

  const ultimo = partes.pop();
  return partes.join(', ') + ' e ' + ultimo;
}

/**
 * Converte Money para valor por extenso
 */
export function moneyToWords(money: Money): string {
  const amount = money.amount;
  const reais = Math.floor(amount);
  const centavos = Math.round((amount - reais) * 100);

  let resultado = '';

  // Parte inteira (reais)
  if (reais > 0) {
    resultado = converterInteiro(reais);
    if (reais === 1) {
      resultado += ' real';
    } else {
      resultado += ' reais';
    }
  }

  // Parte decimal (centavos)
  if (centavos > 0) {
    if (reais > 0) {
      resultado += ' e ';
    }
    resultado += converterInteiro(centavos);
    if (centavos === 1) {
      resultado += ' centavo';
    } else {
      resultado += ' centavos';
    }
  }

  // Caso especial: zero reais
  if (reais === 0 && centavos === 0) {
    resultado = 'zero reais';
  }

  return resultado;
}

