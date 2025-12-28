/**
 * CTe BUILDER SERVICE
 * 
 * Constrói o XML do CTe 4.0 conforme especificação da SEFAZ
 */

import { db } from "@/lib/db";
import { 
  cteHeader, 
  pickupOrders, 
  businessPartners, 
  branches,
  cargoDocuments,
  cteCargoDocuments,
  fiscalSettings 
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { calculateTax, calculateIcmsValue } from "./tax-calculator";
import { create } from "xmlbuilder2";

/**
 * ⚙️ Busca ambiente do CTe (banco de dados ou .env como fallback)
 */
async function getCteEnvironment(organizationId: number, branchId: number): Promise<string> {
  try {
    const [settings] = await db
      .select()
      .from(fiscalSettings)
      .where(
        and(
          eq(fiscalSettings.organizationId, organizationId),
          eq(fiscalSettings.branchId, branchId)
        )
      );
    
    if (settings) {
      const env = settings.cteEnvironment === "production" ? "1" : "2";
      console.log(`✅ CTe Ambiente (DB): ${settings.cteEnvironment} (tpAmb=${env})`);
      return env;
    }
  } catch (error) {
    console.log("⚠️  Erro ao buscar configurações, usando .env");
  }
  
  // Fallback para .env
  const env = process.env.CTE_ENVIRONMENT === "production" ? "1" : "2";
  console.log(`✅ CTe Ambiente (.env): ${process.env.CTE_ENVIRONMENT} (tpAmb=${env})`);
  return env;
}

export interface CteBuilderParams {
  pickupOrderId: number;
  organizationId: number;
}

/**
 * Gera o XML do CTe baseado em uma Ordem de Coleta
 */
export async function buildCteXml(params: CteBuilderParams): Promise<string> {
  const { pickupOrderId, organizationId } = params;

  // 1. Buscar Ordem de Coleta
  const [order] = await db
    .select()
    .from(pickupOrders)
    .where(eq(pickupOrders.id, pickupOrderId));

  if (!order) {
    throw new Error(`Ordem de Coleta #${pickupOrderId} não encontrada`);
  }

  // 2. Validar Averbação de Seguro (OBRIGATÓRIO)
  if (!order.insurancePolicy || !order.insuranceCertificate) {
    throw new Error(
      "Averbação de seguro obrigatória! Informe apólice e certificado antes de gerar o CTe."
    );
  }

  // 3. Buscar Tax Matrix (auto-preenchimento de ICMS/CFOP)
  const taxInfo = await calculateTax({
    organizationId,
    originUf: order.originUf,
    destinationUf: order.destinationUf,
  });

  // 4. Calcular ICMS
  const icms = calculateIcmsValue(
    parseFloat(order.agreedPrice?.toString() || "0"),
    taxInfo
  );

  // 5. Buscar Filial Emitente
  const [branch] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, order.branchId));

  // 6. Buscar Cliente (Tomador)
  const [customer] = await db
    .select()
    .from(businessPartners)
    .where(eq(businessPartners.id, order.customerId));

  // 7. Gerar Chave de Acesso (44 dígitos)
  const cteKey = await generateCteKey({
    branchUf: branch?.state || "SP",
    issueDate: new Date(),
    cnpj: branch?.document || "",
    model: "57",
    serie: "1",
    cteNumber: await getNextCteNumber(order.branchId),
  });

  // 8. Montar XML CTe 4.0
  const xml = create({ version: "1.0", encoding: "UTF-8" })
    .ele("CTe", { xmlns: "http://www.portalfiscal.inf.br/cte" })
      .ele("infCte", { versao: "4.00", Id: `CTe${cteKey}` })
        .ele("ide")
          .ele("cUF").txt(getUfCode(order.originUf)).up()
          .ele("cCT").txt(generateRandomCode(8)).up()
          .ele("CFOP").txt(taxInfo.cfop).up()
          .ele("natOp").txt("PRESTACAO DE SERVICO DE TRANSPORTE").up()
          .ele("mod").txt("57").up()
          .ele("serie").txt("1").up()
          .ele("nCT").txt(await getNextCteNumber(order.branchId)).up()
          .ele("dhEmi").txt(new Date().toISOString()).up()
          .ele("tpImp").txt("1").up() // 1=Retrato
          .ele("tpEmis").txt("1").up() // 1=Normal
          .ele("tpAmb").txt(await getCteEnvironment(organizationId, order.branchId)).up() // 1=Produção, 2=Homologação
          .ele("tpCTe").txt("0").up() // 0=Normal
          .ele("procEmi").txt("0").up() // 0=Emissão CTe com aplicativo do contribuinte
          .ele("verProc").txt("AuraCore 1.0").up()
          .ele("modal").txt("01").up() // 01=Rodoviário
          .ele("tpServ").txt("0").up() // 0=Normal
          .ele("indIEToma").txt("1").up() // 1=Contribuinte ICMS
        .up()
        
        // Emitente
        .ele("emit")
          .ele("CNPJ").txt(branch?.document || "").up()
          .ele("IE").txt(branch?.ie || "").up()
          .ele("xNome").txt(branch?.name || "").up()
          .ele("xFant").txt(branch?.tradeName || branch?.name || "").up()
          .ele("enderEmit")
            .ele("xLgr").txt(branch?.street || "").up()
            .ele("nro").txt(branch?.number || "SN").up()
            .ele("xBairro").txt(branch?.district || "").up()
            .ele("cMun").txt("3550308").up() // TODO: Buscar código IBGE
            .ele("xMun").txt(branch?.cityName || "").up()
            .ele("CEP").txt(branch?.zipCode?.replace(/\D/g, "") || "").up()
            .ele("UF").txt(branch?.state || "").up()
          .up()
        .up()

        // Remetente (Cliente)
        .ele("rem")
          .ele("CNPJ").txt(customer?.document || "").up()
          .ele("IE").txt(customer?.ie || "").up()
          .ele("xNome").txt(customer?.name || "").up()
          .ele("xFant").txt(customer?.tradeName || customer?.name || "").up()
          .ele("enderReme")
            .ele("xLgr").txt(customer?.street || "").up()
            .ele("nro").txt(customer?.number || "SN").up()
            .ele("xBairro").txt(customer?.district || "").up()
            .ele("cMun").txt("3550308").up()
            .ele("xMun").txt(customer?.cityName || "").up()
            .ele("CEP").txt(customer?.zipCode?.replace(/\D/g, "") || "").up()
            .ele("UF").txt(customer?.state || "").up()
          .up()
        .up()

        // Destinatário (mesmo que remetente por enquanto)
        .ele("dest")
          .ele("CNPJ").txt(customer?.document || "").up()
          .ele("IE").txt(customer?.ie || "").up()
          .ele("xNome").txt(customer?.name || "").up()
          .ele("enderDest")
            .ele("xLgr").txt(order.destinationAddress || "").up()
            .ele("nro").txt("SN").up()
            .ele("xBairro").txt("Centro").up()
            .ele("cMun").txt("3550308").up()
            .ele("xMun").txt("São Paulo").up()
            .ele("UF").txt(order.destinationUf).up()
          .up()
        .up()

        // Valores da Prestação
        .ele("vPrest")
          .ele("vTPrest").txt(parseFloat(order.agreedPrice ?? "0").toFixed(2)).up()
          .ele("vRec").txt(parseFloat(order.agreedPrice ?? "0").toFixed(2)).up()
          .ele("Comp")
            .ele("xNome").txt("FRETE PESO").up()
            .ele("vComp").txt(parseFloat(order.agreedPrice ?? "0").toFixed(2)).up()
          .up()
        .up()

        // Impostos
        .ele("imp")
          .ele("ICMS")
            .ele("ICMS00")
              .ele("CST").txt(taxInfo.cst).up()
              .ele("vBC").txt(icms.base.toFixed(2)).up()
              .ele("pICMS").txt(taxInfo.icmsRate.toFixed(2)).up()
              .ele("vICMS").txt(icms.value.toFixed(2)).up()
            .up()
          .up()
        .up()

        // Informações da Carga
        .ele("infCTeNorm")
          .ele("infCarga")
            .ele("vCarga").txt(parseFloat(order.invoiceValue ?? "0").toFixed(2)).up()
            .ele("proPred").txt(order.cargoDescription || "MERCADORIA EM GERAL").up()
            .ele("infQ")
              .ele("cUnid").txt("01").up() // 01=Kg
              .ele("tpMed").txt("PESO").up()
              .ele("qCarga").txt(parseFloat(order.weightKg ?? "0").toFixed(4)).up()
            .up()
          .up()
          
          // Seguro
          .ele("seg")
            .ele("respSeg").txt("4").up() // 4=Emitente do CTe
            .ele("xSeg").txt(order.insuranceCompany || "").up()
            .ele("nApol").txt(order.insurancePolicy || "").up()
            .ele("nAver").txt(order.insuranceCertificate || "").up()
          .up()
        .up()
      .up()
    .up();

  return xml.end({ prettyPrint: true });
}

/**
 * Gera a chave de acesso do CTe (44 dígitos)
 */
async function generateCteKey(params: {
  branchUf: string;
  issueDate: Date;
  cnpj: string;
  model: string;
  serie: string;
  cteNumber: string;
}): Promise<string> {
  const ufCode = getUfCode(params.branchUf);
  const yyMM = params.issueDate.toISOString().slice(2, 7).replace("-", "");
  const cnpj = params.cnpj.replace(/\D/g, "");
  const model = params.model.padStart(2, "0");
  const serie = params.serie.padStart(3, "0");
  const number = params.cteNumber.padStart(9, "0");
  const emissionType = "1";
  const randomCode = generateRandomCode(8);

  const baseKey = `${ufCode}${yyMM}${cnpj}${model}${serie}${number}${emissionType}${randomCode}`;
  
  // Calcular dígito verificador (módulo 11)
  const dv = calculateMod11(baseKey);

  return `${baseKey}${dv}`;
}

/**
 * Retorna o código IBGE da UF
 */
function getUfCode(uf: string): string {
  const codes: Record<string, string> = {
    AC: "12", AL: "27", AP: "16", AM: "13", BA: "29", CE: "23",
    DF: "53", ES: "32", GO: "52", MA: "21", MT: "51", MS: "50",
    MG: "31", PA: "15", PB: "25", PR: "41", PE: "26", PI: "22",
    RJ: "33", RN: "24", RS: "43", RO: "11", RR: "14", SC: "42",
    SP: "35", SE: "28", TO: "17",
  };
  return codes[uf.toUpperCase()] || "35";
}

/**
 * Gera código aleatório de N dígitos
 */
function generateRandomCode(length: number): string {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, "0");
}

/**
 * Calcula dígito verificador Módulo 11
 */
function calculateMod11(key: string): string {
  let sum = 0;
  let multiplier = 2;

  for (let i = key.length - 1; i >= 0; i--) {
    sum += parseInt(key[i]) * multiplier;
    multiplier = multiplier === 9 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const dv = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
  
  return dv.toString();
}

/**
 * Gera o próximo número de CTe da filial
 */
async function getNextCteNumber(branchId: number): Promise<string> {
  const lastCte = await db
    .select({ cteNumber: cteHeader.cteNumber })
    .from(cteHeader)
    .where(eq(cteHeader.branchId, branchId))
    .orderBy(cteHeader.cteNumber);

  const lastNumber = lastCte.length > 0 ? lastCte[lastCte.length - 1].cteNumber : 0;
  return (lastNumber + 1).toString();
}

/**
 * ✅ OPÇÃO A - BLOCO 3: Vincula NFes do repositório de cargas ao CTe
 * 
 * Busca cargas vinculadas a uma trip e cria os registros de rastreabilidade
 */
export async function linkCargosToCte(
  cteId: number,
  tripId: number
): Promise<number> {
  try {
    // Buscar cargas vinculadas à viagem
    const cargos = await db
      .select()
      .from(cargoDocuments)
      .where(
        and(
          eq(cargoDocuments.tripId, tripId),
          isNull(cargoDocuments.deletedAt)
        )
      );
    
    if (cargos.length === 0) {
      console.log(`⚠️  Nenhuma carga vinculada à viagem ${tripId}`);
      return 0;
    }
    
    console.log(`📦 Vinculando ${cargos.length} cargas ao CTe ${cteId}...`);
    
    // Inserir cada cargo como documento do CTe
    for (const cargo of cargos) {
      await db.insert(cteCargoDocuments).values({
        cteHeaderId: cteId,
        documentType: "NFE",
        documentKey: cargo.accessKey,
        documentNumber: cargo.nfeNumber || "",
        documentSerie: cargo.nfeSeries || "",
        documentValue: cargo.cargoValue,
        
        // ✅ OPÇÃO A - BLOCO 3: Rastreabilidade
        sourceInvoiceId: cargo.nfeInvoiceId,
        sourceCargoId: cargo.id,
        
        createdAt: new Date(),
      });
      
      // Atualizar cargo com CTe ID
      await db
        .update(cargoDocuments)
        .set({
          cteId,
          status: "IN_TRANSIT",
          updatedAt: new Date(),
        })
        .where(eq(cargoDocuments.id, cargo.id));
      
      console.log(`  ↳ NFe ${cargo.accessKey} vinculada ao CTe`);
    }
    
    return cargos.length;
    
  } catch (error: any) {
    console.error(`❌ Erro ao vincular cargas ao CTe:`, error.message);
    throw error;
  }
}


