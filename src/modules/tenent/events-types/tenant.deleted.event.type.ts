
export interface TenantDeletedEvent {
    propertyId: number;
    tenantId: number;
    deletedAt: Date;
}