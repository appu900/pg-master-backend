
export class RoomCreatedEvent {
  readonly eventName = 'room.created' as const;
  constructor(
    public readonly roomId: number,
    public readonly propertyId: number,
    public readonly ownerId: number,
    public readonly totalBedCount:number,
    public readonly month: number,
    public readonly year: number,
  ) {}
}
