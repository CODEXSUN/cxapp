export type TenantContext = {
  tenantId?: string;
  tenantCode?: string;
};

export type DomainEvent<TPayload = unknown> = {
  actorEmail?: string;
  actorId?: string;
  correlationId?: string;
  eventName: string;
  eventVersion: number;
  occurredAt: string;
  payload: TPayload;
  requestId?: string;
  sourceModule?: string;
  tenant?: TenantContext;
};

export type EventPublisher = {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
};

export class InMemoryEventPublisher implements EventPublisher {
  readonly events: DomainEvent[] = [];

  async publish<TPayload>(event: DomainEvent<TPayload>) {
    this.events.push(event);
  }
}
