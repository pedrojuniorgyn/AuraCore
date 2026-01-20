#!/usr/bin/env python3
# agents/scripts/index_legislation.py
"""
Script para indexar legislação fiscal inicial.

Uso:
    python scripts/index_legislation.py /path/to/legislation/
    
Ou para indexar legislação de exemplo:
    python scripts/index_legislation.py --sample

Legislação incluída no modo --sample:
- Lei Kandir (LC 87/96) - ICMS
- PIS (Lei 10.637/02)
- COFINS (Lei 10.833/03)
- Reforma Tributária (EC 132/2023)
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Adicionar src ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.services.knowledge import DocumentIndexer, DocumentMetadata


# Legislação padrão para indexar
SAMPLE_LEGISLATION = [
    {
        "title": "Lei Kandir - LC 87/96",
        "type": "law",
        "law_number": "LC 87/96",
        "year": 1996,
        "content": """
Lei Complementar nº 87, de 13 de setembro de 1996.

Dispõe sobre o imposto dos Estados e do Distrito Federal sobre operações 
relativas à circulação de mercadorias e sobre prestações de serviços de 
transporte interestadual e intermunicipal e de comunicação (ICMS).

Art. 1º Compete aos Estados e ao Distrito Federal instituir o imposto sobre 
operações relativas à circulação de mercadorias e sobre prestações de serviços 
de transporte interestadual e intermunicipal e de comunicação, ainda que as 
operações e as prestações se iniciem no exterior.

Art. 2º O imposto incide sobre:
I - operações relativas à circulação de mercadorias;
II - prestações de serviços de transporte interestadual e intermunicipal;
III - prestações onerosas de serviços de comunicação;
IV - fornecimento de mercadorias com prestação de serviços;
V - entrada de mercadoria ou bem importados do exterior.

Art. 12. Considera-se ocorrido o fato gerador do imposto no momento:
I - da saída de mercadoria de estabelecimento de contribuinte;
II - do fornecimento de alimentação, bebidas e outras mercadorias;
III - da transmissão a terceiro de mercadoria depositada em armazém geral;
IV - da transmissão de propriedade de mercadoria;
V - do início da prestação de serviços de transporte interestadual e intermunicipal.

Art. 13. A base de cálculo do imposto é:
I - na saída de mercadoria, o valor da operação;
II - na prestação de serviço de transporte, o preço do serviço;
III - no fornecimento de alimentação, bebidas e outras mercadorias, o valor da operação.

ALÍQUOTAS INTERESTADUAIS (Resolução SF 22/89):
- 7% para operações destinadas aos Estados das regiões Norte, Nordeste e Centro-Oeste
- 12% para operações destinadas aos Estados das regiões Sul e Sudeste
- 4% para operações com bens importados (Resolução SF 13/2012)

DIFAL - Diferencial de Alíquotas (EC 87/2015):
Para operações destinadas a consumidor final não contribuinte:
- Estado de origem: alíquota interestadual
- Estado de destino: diferença entre alíquota interna e interestadual
"""
    },
    {
        "title": "PIS - Lei 10.637/02",
        "type": "law",
        "law_number": "Lei 10.637/02",
        "year": 2002,
        "content": """
Lei nº 10.637, de 30 de dezembro de 2002.

Dispõe sobre a não-cumulatividade na cobrança da contribuição para os 
Programas de Integração Social (PIS) e de Formação do Patrimônio do 
Servidor Público (Pasep).

Art. 1º A Contribuição para o PIS/Pasep, com a incidência não-cumulativa, 
tem como fato gerador o faturamento mensal, assim entendido o total das 
receitas auferidas pela pessoa jurídica, independentemente de sua denominação 
ou classificação contábil.

§ 1º Para efeito do disposto neste artigo, o total das receitas compreende 
a receita bruta da venda de bens e serviços nas operações em conta própria 
ou alheia e todas as demais receitas auferidas pela pessoa jurídica.

ALÍQUOTA: 1,65% (regime não-cumulativo)
ALÍQUOTA: 0,65% (regime cumulativo)

Art. 3º Do valor apurado na forma do art. 2º a pessoa jurídica poderá 
descontar créditos calculados em relação a:
I - bens adquiridos para revenda;
II - bens e serviços utilizados como insumo na prestação de serviços e 
na produção ou fabricação de bens ou produtos destinados à venda;
III - energia elétrica e energia térmica, inclusive sob a forma de vapor, 
consumidas nos estabelecimentos da pessoa jurídica;
IV - aluguéis de prédios, máquinas e equipamentos, pagos a pessoa jurídica, 
utilizados nas atividades da empresa;
V - valor das contraprestações de operações de arrendamento mercantil de 
pessoa jurídica.

CRÉDITOS SOBRE FRETE (Art. 3º, IX):
O valor do frete quando o ônus for suportado pelo vendedor constitui 
crédito para o PIS, desde que vinculado a operações que gerem receita 
tributável.
"""
    },
    {
        "title": "COFINS - Lei 10.833/03",
        "type": "law",
        "law_number": "Lei 10.833/03",
        "year": 2003,
        "content": """
Lei nº 10.833, de 29 de dezembro de 2003.

Altera a Legislação Tributária Federal e dá outras providências.

COFINS - Contribuição para o Financiamento da Seguridade Social

Art. 1º A Contribuição para o Financiamento da Seguridade Social - Cofins, 
com a incidência não-cumulativa, tem como fato gerador o faturamento mensal, 
assim entendido o total das receitas auferidas pela pessoa jurídica.

ALÍQUOTA: 7,6% (regime não-cumulativo)
ALÍQUOTA: 3,0% (regime cumulativo)

Art. 3º Do valor apurado na forma do art. 2º a pessoa jurídica poderá 
descontar créditos calculados em relação a:
I - bens adquiridos para revenda;
II - bens e serviços utilizados como insumo na prestação de serviços e 
na produção ou fabricação de bens ou produtos destinados à venda;
III - energia elétrica e energia térmica, inclusive sob a forma de vapor;
IV - aluguéis de prédios, máquinas e equipamentos, pagos a pessoa jurídica.

RETENÇÃO NA FONTE (Art. 30):
Os pagamentos efetuados por pessoas jurídicas a outras pessoas jurídicas 
de direito privado, pela prestação de serviços, estão sujeitos à retenção 
na fonte da CSLL, da COFINS e da Contribuição para o PIS/Pasep.

Alíquota total de retenção: 4,65%
- CSLL: 1,0%
- COFINS: 3,0%
- PIS: 0,65%

Base de cálculo: valor bruto da nota ou fatura de prestação de serviços.

Dispensa: pagamentos de valor igual ou inferior a R$ 5.000,00 (cinco mil reais) 
no mês a uma mesma pessoa jurídica.

SERVIÇOS SUJEITOS À RETENÇÃO:
- Limpeza e conservação
- Segurança e vigilância
- Locação de mão de obra
- Transporte de cargas
- Assessoria e consultoria
- Manutenção de equipamentos
"""
    },
    {
        "title": "Reforma Tributária - EC 132/2023",
        "type": "law",
        "law_number": "EC 132/2023",
        "year": 2023,
        "content": """
Emenda Constitucional nº 132, de 20 de dezembro de 2023.

Altera o Sistema Tributário Nacional.

PRINCIPAIS MUDANÇAS:

1. IBS - Imposto sobre Bens e Serviços
   - Substitui ICMS (estadual) e ISS (municipal)
   - Competência compartilhada Estados/Municípios
   - Alíquota de referência: definida por resolução do Senado
   - Não-cumulatividade plena
   - Princípio do destino (tributo pertence ao local de consumo)

2. CBS - Contribuição sobre Bens e Serviços
   - Substitui PIS e COFINS
   - Competência federal
   - Alíquota única nacional
   - Não-cumulatividade plena
   - Crédito integral sobre todas as aquisições

3. IS - Imposto Seletivo
   - Incide sobre produtos prejudiciais à saúde ou meio ambiente
   - Cigarros e derivados do tabaco
   - Bebidas alcoólicas
   - Bebidas açucaradas
   - Veículos poluentes
   - Extração de recursos naturais não renováveis

4. CRONOGRAMA DE TRANSIÇÃO (2026-2032):

   2026:
   - CBS: 0,9% (teste)
   - IBS: 0,1% (teste)
   - PIS/COFINS e ICMS/ISS continuam integralmente

   2027:
   - CBS: alíquota integral
   - IBS: aumento gradual
   - Extinção de PIS/COFINS

   2028:
   - ICMS/ISS reduzidos em 10%
   - IBS aumenta proporcionalmente

   2029-2032:
   - Extinção gradual de ICMS/ISS
   - 2029: redução de 10% ICMS/ISS
   - 2030: redução de 10% ICMS/ISS
   - 2031: redução de 10% ICMS/ISS
   - 2032: redução de 10% ICMS/ISS

   2033:
   - Novo sistema em vigor pleno
   - ICMS e ISS extintos
   - PIS e COFINS extintos
   - Apenas IBS, CBS e IS

5. CASHBACK:
   - Devolução de tributos para famílias de baixa renda
   - Cadastro Único (CadÚnico)
   - Itens essenciais: cesta básica, medicamentos
   - Serviços: energia, água, telecomunicações, gás

6. ALÍQUOTA ZERO / REDUZIDA:
   - Cesta básica nacional: alíquota zero
   - Medicamentos genéricos: redução de 60%
   - Transporte coletivo: redução de 60%
   - Serviços de saúde: redução de 60%
   - Serviços de educação: redução de 60%

7. IMPACTO NO TRANSPORTE DE CARGAS:
   - CTe (Conhecimento de Transporte Eletrônico): mesma estrutura
   - Tributação no destino (onde a carga é entregue)
   - Crédito integral sobre insumos
   - Combustível: tributação monofásica
   - Pedágio e despesas de viagem: crédito permitido
"""
    },
    {
        "title": "Manual SPED Fiscal - EFD-ICMS/IPI",
        "type": "manual",
        "law_number": None,
        "year": 2024,
        "content": """
MANUAL DE ORIENTAÇÃO DO LAYOUT DA EFD-ICMS/IPI

Guia Prático da Escrituração Fiscal Digital (EFD-ICMS/IPI)

1. OBRIGATORIEDADE:
   - Todos os contribuintes do ICMS e/ou IPI
   - Substituídos: verificar legislação estadual
   - Prazo de entrega: até o dia 15 do mês subsequente

2. BLOCOS DO ARQUIVO:
   - Bloco 0: Abertura, Identificação e Referências
   - Bloco B: Escrituração e Apuração do ISS (apenas DF)
   - Bloco C: Documentos Fiscais I - Mercadorias
   - Bloco D: Documentos Fiscais II - Serviços (ICMS)
   - Bloco E: Apuração do ICMS e do IPI
   - Bloco G: Controle do Crédito de ICMS do Ativo Permanente (CIAP)
   - Bloco H: Inventário Físico
   - Bloco K: Controle da Produção e do Estoque
   - Bloco 1: Outras Informações
   - Bloco 9: Controle e Encerramento do Arquivo Digital

3. REGISTROS PARA TRANSPORTE:
   
   D100 - DOCUMENTO FISCAL DE SERVIÇO DE TRANSPORTE:
   - CTe (Conhecimento de Transporte Eletrônico) - Modelo 57
   - CTe OS (Outros Serviços) - Modelo 67
   
   D190 - REGISTRO ANALÍTICO DOS DOCUMENTOS:
   - Um registro para cada combinação de CST, CFOP e Alíquota
   - Obrigatório para todos os documentos do D100
   
   D195 - OBSERVAÇÕES DO LANÇAMENTO:
   - Informações complementares obrigatórias por UF
   - Código de observação do contribuinte

4. CFOP DE TRANSPORTE MAIS COMUNS:
   - 5.351: Prestação de serviço de transporte para execução de serviço da mesma natureza
   - 5.352: Prestação de serviço de transporte a estabelecimento industrial
   - 5.353: Prestação de serviço de transporte a estabelecimento comercial
   - 5.354: Prestação de serviço de transporte a estabelecimento de prestador de serviço
   - 5.355: Prestação de serviço de transporte a estabelecimento de geradora ou distribuidora de energia
   - 5.356: Prestação de serviço de transporte a estabelecimento de produtor rural
   - 5.357: Prestação de serviço de transporte a não contribuinte
   - 5.932: Prestação de serviço de transporte iniciada em UF diversa

5. CST - CÓDIGO DE SITUAÇÃO TRIBUTÁRIA ICMS:
   - 00: Tributada integralmente
   - 10: Tributada e com cobrança de ICMS por substituição tributária
   - 20: Com redução de base de cálculo
   - 40: Isenta
   - 41: Não tributada
   - 50: Suspensão
   - 51: Diferimento
   - 60: ICMS cobrado anteriormente por substituição tributária
   - 90: Outras

6. VALIDAÇÕES IMPORTANTES:
   - Soma dos valores de D190 deve fechar com D100
   - CFOPs de entrada x saída devem corresponder
   - CTe cancelados não devem gerar crédito/débito
   - Alíquota zero de ICMS: CST 40 ou 41
"""
    },
    {
        "title": "CTe - Conhecimento de Transporte Eletrônico",
        "type": "regulation",
        "law_number": "Ajuste SINIEF 09/07",
        "year": 2007,
        "content": """
CONHECIMENTO DE TRANSPORTE ELETRÔNICO (CT-e)

Base Legal: Ajuste SINIEF 09/07 e alterações

1. DEFINIÇÃO:
   O CT-e é o documento emitido e armazenado eletronicamente, de existência 
   apenas digital, cuja validade jurídica é garantida pela assinatura digital 
   do emitente e pela Autorização de Uso concedida pela administração tributária.

2. MODELOS:
   - Modelo 57: CT-e comum
   - Modelo 67: CT-e OS (Outros Serviços) - passageiros, valores, bagagens

3. TIPOS DE CTe (tpCTe):
   - 0: Normal
   - 1: Complemento de Valores
   - 2: Anulação
   - 3: Substituto

4. TIPOS DE SERVIÇO (tpServ):
   - 0: Normal
   - 1: Subcontratação
   - 2: Redespacho
   - 3: Redespacho Intermediário
   - 4: Serviço Vinculado a Multimodal

5. PRAZOS:
   - Emissão: ANTES do início da prestação do serviço
   - Cancelamento: até 168 horas (7 dias) da autorização
   - Carta de Correção: até 720 dias da emissão

6. CHAVE DE ACESSO (44 dígitos):
   - UF (2) + AAMM (4) + CNPJ (14) + Modelo (2) + Série (3) + Número (9) + 
   - Código (8) + DV (1)

7. EVENTOS DO CTe:
   - 110110: Carta de Correção
   - 110111: Cancelamento
   - 110113: EPEC (Evento Prévio de Emissão em Contingência)
   - 110170: Registro de Multimodal
   - 610110: Prestação em Desacordo
   - 240170: MDF-e Autorizado

8. INFORMAÇÕES OBRIGATÓRIAS:
   - Dados do emitente (transportadora)
   - Dados do remetente
   - Dados do destinatário
   - Dados do expedidor e recebedor (quando houver)
   - Dados da carga (peso, volume, valor)
   - NFes vinculadas
   - Componentes do valor do frete
   - Modal de transporte
   - Dados do veículo (placa, RNTRC)
   - Dados do motorista

9. SITUAÇÕES QUE EXIGEM CTe:
   - Transporte interestadual de cargas
   - Transporte intermunicipal de cargas (exceto dentro do mesmo município)
   - Subcontratação de frete
   - Redespacho

10. MULTAS POR IRREGULARIDADES:
    - Falta de emissão: 30% do valor da operação (mínimo 15 UFESP)
    - Emissão incorreta: 10% do valor da operação
    - Transporte sem documento: apreensão da mercadoria
"""
    }
]


async def index_sample_legislation() -> None:
    """Indexa legislação de exemplo."""
    print("=" * 60)
    print("INDEXANDO LEGISLAÇÃO FISCAL BRASILEIRA")
    print("=" * 60)
    print()
    
    indexer = DocumentIndexer()
    
    total_chunks = 0
    successful = 0
    
    for leg in SAMPLE_LEGISLATION:
        print(f"📚 {leg['title']}...")
        
        metadata = DocumentMetadata(
            title=leg["title"],
            type=leg["type"],  # type: ignore
            law_number=leg.get("law_number"),
            year=leg.get("year")
        )
        
        result = await indexer.index_text(leg["content"], metadata)
        
        if result.success:
            print(f"   ✅ {result.chunks_indexed} chunks indexados")
            total_chunks += result.chunks_indexed
            successful += 1
        else:
            print(f"   ❌ Erro: {result.error}")
    
    print()
    print("=" * 60)
    print(f"RESUMO: {successful}/{len(SAMPLE_LEGISLATION)} documentos")
    print(f"Total de chunks indexados: {total_chunks}")
    print("=" * 60)


async def index_directory(directory: str) -> None:
    """Indexa PDFs de um diretório."""
    print(f"Indexando PDFs de {directory}...")
    
    indexer = DocumentIndexer()
    results = await indexer.index_directory(directory, doc_type="law")
    
    successful = sum(1 for r in results if r.success)
    total_chunks = sum(r.chunks_indexed for r in results if r.success)
    
    print()
    print("=" * 60)
    print(f"RESUMO: {successful}/{len(results)} documentos")
    print(f"Total de chunks indexados: {total_chunks}")
    print("=" * 60)
    
    # Listar falhas
    failures = [r for r in results if not r.success]
    if failures:
        print("\nFalhas:")
        for f in failures:
            print(f"  - {f.error}")


def main() -> None:
    """Entry point do script."""
    parser = argparse.ArgumentParser(
        description="Indexa legislação fiscal para RAG",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python index_legislation.py --sample
  python index_legislation.py /path/to/pdfs/
  python index_legislation.py /path/to/pdfs/ --recursive
        """
    )
    parser.add_argument(
        "directory",
        nargs="?",
        help="Diretório com PDFs de legislação"
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Indexar legislação de exemplo"
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Buscar PDFs recursivamente em subdiretórios"
    )
    
    args = parser.parse_args()
    
    if args.sample:
        asyncio.run(index_sample_legislation())
    elif args.directory:
        asyncio.run(index_directory(args.directory))
    else:
        print("Uso: python index_legislation.py /path/to/pdfs/")
        print("  ou: python index_legislation.py --sample")
        print()
        print("Para ver todas as opções: python index_legislation.py --help")
        sys.exit(1)


if __name__ == "__main__":
    main()
