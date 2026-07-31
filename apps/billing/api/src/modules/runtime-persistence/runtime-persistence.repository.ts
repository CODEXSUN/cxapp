import { randomBytes } from "node:crypto";
import type { DomainEvent, EventPublisher } from "@cxapp/framework/events";
import type { QueueAdapter, QueueJob } from "@cxapp/framework/queue";
import { AppError } from "@cxapp/framework/errors";
import { getBillingDatabase } from "../../database/billing-database.js";

export class BillingDatabaseEventPublisher implements EventPublisher {
  async publish<TPayload>(event: DomainEvent<TPayload>) {
    const databaseName = tenantDatabase(event.tenant?.tenantId, "domain event");
    const database = await getBillingDatabase(databaseName);
    await database
      .insertInto("billing_domain_events")
      .values({
        actor_email: event.actorEmail ?? null,
        actor_id: event.actorId ?? null,
        correlation_id: event.correlationId ?? null,
        event_name: event.eventName,
        event_version: event.eventVersion,
        occurred_at: new Date(event.occurredAt),
        payload_json: JSON.stringify(event.payload ?? {}),
        request_id: event.requestId ?? null,
        source_module: event.sourceModule ?? "billing",
        status: "published",
        uuid: uuid()
      })
      .execute();
  }
}

export class BillingDatabaseQueueAdapter implements QueueAdapter {
  async enqueue<TPayload>(queueName: string, job: QueueJob<TPayload>) {
    const databaseName = tenantDatabase(job.tenantId, "queue job");
    const database = await getBillingDatabase(databaseName);
    await database
      .insertInto("billing_outbox_jobs")
      .values({
        attempts: 0,
        available_at: new Date(),
        correlation_id: job.correlationId ?? null,
        idempotency_key: job.idempotencyKey ?? null,
        job_name: job.jobName,
        max_attempts: job.retry?.attempts ?? 3,
        payload_json: JSON.stringify(job.payload ?? {}),
        queue_name: queueName,
        request_id: job.requestId ?? null,
        source_module: job.sourceModule ?? "billing",
        status: "pending",
        uuid: uuid()
      })
      .ignore()
      .execute();
  }
}

function tenantDatabase(value: string | undefined, recordType: string) {
  const databaseName = value?.trim() ?? "";
  if (!databaseName) {
    throw AppError.validation(`Billing ${recordType} is missing its tenant database.`);
  }
  return databaseName;
}

function uuid() {
  return randomBytes(4).toString("hex");
}
