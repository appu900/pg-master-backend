export class TenantAddedEvent {
  readonly eventName = 'tenant.added' as const;
  constructor(
    public readonly tenantId: number,
    public readonly propertyId: number,
    public readonly ownerId: number,
    public readonly phoneNumber: string,
    public readonly tenantName: string,
  ) {}
}

export class RentDueGeneratedEvent {
  constructor(
    public readonly tenantId: number,
    public readonly tenancyId: number,
    public readonly amount: number,
    public readonly dueType: string,
    public readonly dueDate: string,
  ) {}
}
