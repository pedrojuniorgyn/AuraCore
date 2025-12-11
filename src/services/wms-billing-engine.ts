/**
 * WMS Billing Engine
 * Motor de faturamento para operações de armazenagem
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface BillingEvent {
  customerId: number;
  eventType: 'STORAGE' | 'INBOUND' | 'OUTBOUND' | 'CROSS_DOCK' | 'LABELING' | 'EXTRAS';
  quantity: number;
  unitPrice: number;
  relatedDocumentId?: number;
  notes?: string;
}

export interface PreInvoice {
  customerId: number;
  billingPeriod: string;
  events: BillingEvent[];
}

export class WMSBillingEngine {
  
  /**
   * Registra um evento de faturamento
   */
  static async registerEvent(organizationId: number, event: BillingEvent): Promise<void> {
    const subtotal = event.quantity * event.unitPrice;
    
    await db.execute(sql`
      INSERT INTO wms_billing_events 
        (organization_id, customer_id, event_type, event_date, quantity, 
         unit_of_measure, unit_price, subtotal, billing_status, notes)
      VALUES 
        (${organizationId}, ${event.customerId}, ${event.eventType}, GETDATE(), 
         ${event.quantity}, 'UN', ${event.unitPrice}, ${subtotal}, 'PENDING', ${event.notes || ''})
    `);
  }

  /**
   * Fechar medição do período e consolidar eventos
   */
  static async closeMeasurement(organizationId: number, customerId: number, period: string): Promise<any> {
    // Buscar todos os eventos pendentes do cliente no período
    const events = await db.execute(sql`
      SELECT 
        event_type,
        SUM(quantity) as total_quantity,
        SUM(subtotal) as total_amount
      FROM wms_billing_events
      WHERE organization_id = ${organizationId}
        AND customer_id = ${customerId}
        AND billing_period IS NULL
        AND billing_status = 'PENDING'
      GROUP BY event_type
    `);

    const eventsList = events.recordset || events;
    
    let totalStorage = 0;
    let totalInbound = 0;
    let totalOutbound = 0;
    let totalExtras = 0;

    for (const evt of eventsList) {
      switch (evt.event_type) {
        case 'STORAGE':
          totalStorage = evt.total_amount;
          break;
        case 'INBOUND':
          totalInbound = evt.total_amount;
          break;
        case 'OUTBOUND':
          totalOutbound = evt.total_amount;
          break;
        default:
          totalExtras += evt.total_amount;
      }
    }

    const subtotal = totalStorage + totalInbound + totalOutbound + totalExtras;

    // Marcar eventos como medidos
    await db.execute(sql`
      UPDATE wms_billing_events 
      SET billing_period = ${period}, billing_status = 'MEASURED'
      WHERE organization_id = ${organizationId}
        AND customer_id = ${customerId}
        AND billing_status = 'PENDING'
    `);

    return {
      customerId,
      period,
      totalStorage,
      totalInbound,
      totalOutbound,
      totalExtras,
      subtotal
    };
  }

  /**
   * Gerar pré-fatura
   */
  static async generatePreInvoice(organizationId: number, customerId: number, period: string): Promise<any> {
    const measurement = await this.closeMeasurement(organizationId, customerId, period);
    
    const issRate = 5.00;
    const issAmount = measurement.subtotal * (issRate / 100);
    const netAmount = measurement.subtotal - issAmount;

    await db.execute(sql`
      INSERT INTO wms_pre_invoices 
        (organization_id, customer_id, billing_period, measurement_date, 
         total_storage, total_inbound, total_outbound, total_extras, 
         subtotal, iss_rate, iss_amount, net_amount, status)
      VALUES 
        (${organizationId}, ${customerId}, ${period}, GETDATE(),
         ${measurement.totalStorage}, ${measurement.totalInbound}, 
         ${measurement.totalOutbound}, ${measurement.totalExtras},
         ${measurement.subtotal}, ${issRate}, ${issAmount}, ${netAmount}, 'DRAFT')
    `);

    return {
      success: true,
      preInvoice: {
        ...measurement,
        issRate,
        issAmount,
        netAmount
      }
    };
  }

  /**
   * Enviar pré-fatura para aprovação do cliente
   */
  static async sendForApproval(preInvoiceId: number): Promise<void> {
    await db.execute(sql`
      UPDATE wms_pre_invoices 
      SET status = 'SENT', sent_to_customer_at = GETDATE()
      WHERE id = ${preInvoiceId}
    `);
  }

  /**
   * Emitir NFS-e após aprovação
   */
  static async issueNFSe(preInvoiceId: number, invoiceNumber: string): Promise<void> {
    await db.execute(sql`
      UPDATE wms_pre_invoices 
      SET status = 'INVOICED', 
          invoice_number = ${invoiceNumber}, 
          invoice_issued_at = GETDATE()
      WHERE id = ${preInvoiceId}
    `);

    // Marcar eventos como faturados
    await db.execute(sql`
      UPDATE wms_billing_events 
      SET billing_status = 'BILLED'
      WHERE pre_invoice_id = ${preInvoiceId}
    `);
  }
}






