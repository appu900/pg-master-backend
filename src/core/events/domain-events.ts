export class TenantAddedEvent {
  readonly eventName = 'tenant.added' as const;

  constructor(
    public readonly tenancyId: number,
    public readonly tenantId: number,
    public readonly propertyId: number,
    public readonly ownerId: number,
    public readonly roomId: number,
    public readonly rentAmount: number,
    public readonly securityDepositeAmount: number,
    public readonly tenantPhone: string,
    public readonly tenantName: string,
    public readonly propertyName: string,
    public readonly roomNumber: string,
    public readonly billingCycleDay: number,
    public readonly dueDate: string,
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

export class DuePaymentCollectedEvent {
  readonly eventName = 'due.payment.collected' as const;

  constructor(
    public readonly dueId: number,
    public readonly tenancyId: number,
    public readonly propertyId: number,
    public readonly tenantPhone: string,
    public readonly tenantName: string,
    public readonly amountPaid: number,
    public readonly balanceAmount: number,
    public readonly dueType: string,
    public readonly paymentMode: string,
    public readonly isFullyPaid: boolean,
    public readonly month: number,
    public readonly year: number,
  ) {}
}

export class DueCreatedEvent {
  readonly eventName = 'due.created' as const;

  constructor(
    public readonly dueId: number,
    public readonly tenancyId: number,
    public readonly propertyId: number,
    public readonly dueType: string,
    public readonly totalAmount: number,
    public readonly month: number,
    public readonly year: number,
  ) {}
}
