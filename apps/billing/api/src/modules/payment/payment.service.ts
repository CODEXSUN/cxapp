import { AppError } from "@codexsun/framework/errors";
import { InMemoryEventPublisher, type EventPublisher } from "@codexsun/framework/events";
import { InMemoryQueueAdapter, type QueueAdapter } from "@codexsun/framework/queue";
import { billingDashboardProjection } from "../dashboard/index.js";
import { formatBillingDocumentNumber, nextBillingDocumentNumber } from "../settings/index.js";
import { BillingSettingsRepository } from "../settings/settings.repository.js";
import { createPaymentEvent } from "./payment.events.js";
import { PaymentRepository } from "./payment.repository.js";
import type { Payment, PaymentJob, PaymentSavePayload } from "./payment.types.js";

export class PaymentService {
  constructor(
    private readonly repository = new PaymentRepository(),
    private readonly settings = new BillingSettingsRepository(),
    private readonly events: EventPublisher = new InMemoryEventPublisher(),
    private readonly queue: QueueAdapter = new InMemoryQueueAdapter()
  ) {}
  list(databaseName: string) {
    return this.repository.list(databaseName);
  }
  listPage(
    databaseName: string,
    query: { page: number; pageSize: number; search: string; status: string }
  ) {
    return this.repository.listPage(databaseName, query);
  }
  get(databaseName: string, id: string) {
    return this.repository.get(databaseName, id);
  }
  activity(databaseName: string, id: string) {
    return this.repository.activity(databaseName, id);
  }
  async context(databaseName: string) {
    const context = await this.repository.context(databaseName);
    if (!context)
      throw AppError.conflict(
        "Default Company, Financial Year, and INR currency context must be configured before creating payments."
      );
    const settings = await this.settings.getBillingSettings(databaseName, context.companyId);
    return {
      ...context,
      suggestedPaymentNumber: formatBillingDocumentNumber(settings.numbering.payment)
    };
  }
  allocationCandidates(databaseName: string, supplierId: number) {
    return this.repository.allocationCandidates(databaseName, supplierId);
  }
  async create(databaseName: string, payload: PaymentSavePayload) {
    const input = await this.prepare(databaseName, payload);
    const duplicate = await this.repository.findByNumber(
      databaseName,
      input.companyId,
      input.financialYearId,
      input.paymentNumber
    );
    if (duplicate)
      throw AppError.conflict("Payment number already exists for this company and financial year.");
    const record = await this.repository.create(databaseName, input);
    if (!record) throw AppError.notFound("Created payment could not be reloaded.");
    const settings = await this.settings.getBillingSettings(databaseName, input.companyId);
    const sequence = settings.numbering.payment;
    const nextNumber = nextBillingDocumentNumber(sequence, input.paymentNumber);
    if (sequence.automatic && nextNumber > sequence.nextNumber) {
      await this.settings.saveBillingSettings(databaseName, input.companyId, {
        ...settings,
        numbering: { ...settings.numbering, payment: { ...sequence, nextNumber } }
      });
    }
    await this.publish("created", record, databaseName);
    return record;
  }
  async update(databaseName: string, id: string, payload: PaymentSavePayload) {
    const current = await this.repository.get(databaseName, id);
    if (!current) return null;
    this.assertDraft(current.status);
    const input = await this.prepare(databaseName, payload, id);
    if (
      await this.repository.findByNumber(
        databaseName,
        input.companyId,
        input.financialYearId,
        input.paymentNumber,
        id
      )
    )
      throw AppError.conflict("Payment number already exists for this company and financial year.");
    const updated = await this.repository.update(databaseName, id, input);
    if (updated) {
      await this.publish("updated", updated, databaseName);
      if (
        current.companyId !== updated.companyId ||
        current.financialYearId !== updated.financialYearId
      )
        await this.project(databaseName, "updated", current);
    }
    return updated;
  }
  async post(databaseName: string, id: string) {
    const current = await this.repository.get(databaseName, id);
    if (!current) return null;
    this.assertDraft(current.status);
    if (current.totalAmount <= 0)
      throw AppError.conflict("Enter a positive payment total before posting.");
    if (current.unallocatedAmount < 0)
      throw AppError.conflict("Payment allocations exceed the payment total.");
    const posted = await this.repository.setStatus(databaseName, id, "posted");
    if (posted) await this.publish("posted", posted, databaseName);
    return posted;
  }
  async cancel(databaseName: string, id: string) {
    const current = await this.repository.get(databaseName, id);
    if (!current) return null;
    if (current.status !== "posted")
      throw AppError.conflict("Only posted payments can be cancelled.");
    const cancelled = await this.repository.setStatus(databaseName, id, "cancelled");
    if (cancelled) await this.publish("cancelled", cancelled, databaseName);
    return cancelled;
  }
  async deleteDraft(databaseName: string, id: string) {
    const current = await this.repository.get(databaseName, id);
    if (!current) return null;
    this.assertDraft(current.status);
    const deleted = await this.repository.deleteDraft(databaseName, id);
    if (deleted) await this.project(databaseName, "deleted", current);
    return deleted;
  }
  private async prepare(databaseName: string, payload: PaymentSavePayload, excludeId?: string) {
    const settings = await this.settings.getBillingSettings(databaseName, payload.companyId);
    const paymentNumber =
      payload.paymentNumber.trim() || formatBillingDocumentNumber(settings.numbering.payment);
    const allocations = payload.allocations.map((item) => ({
      purchaseId: item.purchaseId.trim(),
      allocatedAmount: money(item.allocatedAmount)
    }));
    if (new Set(allocations.map((item) => item.purchaseId)).size !== allocations.length)
      throw AppError.validation("A purchase invoice can only be allocated once in a payment.");
    const totalAmount = money(
      payload.amount + payload.tdsAmount - payload.discountAmount + payload.roundOff
    );
    const allocatedAmount = money(allocations.reduce((sum, item) => sum + item.allocatedAmount, 0));
    if (totalAmount < 0) throw AppError.validation("Payment total cannot be negative.");
    if (allocations.some((item) => !item.purchaseId || item.allocatedAmount <= 0))
      throw AppError.validation(
        "Every payment allocation requires a purchase invoice and a positive amount."
      );
    if (allocatedAmount > totalAmount)
      throw AppError.validation("Allocated amount cannot exceed the payment total.");
    const input = {
      ...payload,
      allocations,
      paymentNumber,
      notes: payload.notes.trim(),
      referenceNo: payload.referenceNo.trim(),
      ledgerId: payload.ledgerId || (await this.repository.defaultLedgerId(databaseName)),
      totalAmount,
      allocatedAmount,
      unallocatedAmount: money(totalAmount - allocatedAmount)
    };
    const refs = await this.repository.validateReferences(databaseName, input, excludeId);
    if (!refs.company) throw AppError.validation("Selected company is invalid or inactive.");
    if (!refs.financialYear)
      throw AppError.validation("Payment date is outside the selected active financial year.");
    if (!refs.currency) throw AppError.validation("Selected currency is invalid or inactive.");
    if (!refs.supplier) throw AppError.validation("Selected supplier is invalid or inactive.");
    if (!refs.ledger)
      throw AppError.validation("Selected cash or bank ledger is invalid or inactive.");
    if (!refs.allocations)
      throw AppError.validation(
        "One or more purchase allocations are invalid, belong to another supplier, or exceed the outstanding balance."
      );
    return input;
  }
  private assertDraft(status: string) {
    if (status !== "draft")
      throw AppError.conflict("Only draft payments can be edited or deleted.");
  }

  private async publish(
    action: "created" | "updated" | "posted" | "cancelled",
    payment: Pick<Payment, "companyId" | "financialYearId" | "id" | "status">,
    databaseName: string
  ) {
    const event = createPaymentEvent(action, payment, databaseName);
    await this.events.publish(event);
    const job: PaymentJob = {
      correlationId: event.occurredAt,
      name: action === "posted" ? "payment.posting-sync" : "payment.activity-sync",
      paymentId: payment.id,
      tenantDatabase: databaseName
    };
    await this.queue.enqueue("billing.payment", {
      idempotencyKey: `${event.eventName}:${payment.id}:${event.occurredAt}`,
      jobName: job.name,
      payload: job,
      sourceModule: "billing.payment",
      tenantId: databaseName
    });
    await this.project(
      databaseName,
      action === "posted"
        ? "posted"
        : action === "cancelled"
          ? "cancelled"
          : action === "created"
            ? "created"
            : "updated",
      payment
    );
  }

  private project(
    databaseName: string,
    action: "cancelled" | "created" | "deleted" | "posted" | "updated",
    payment: Pick<Payment, "companyId" | "financialYearId" | "id">
  ) {
    return billingDashboardProjection.project(databaseName, {
      action,
      companyId: payment.companyId,
      documentId: payment.id,
      financialYearId: payment.financialYearId,
      source: "payment"
    });
  }
}
function money(value: number) {
  return Math.round(Number(value) * 100) / 100;
}
