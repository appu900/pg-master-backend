export class ElectricityReadingCreatedEvent {
  constructor(
    public readonly propertyId: number,
    public readonly month: number,
    public readonly year: number,
  ) {}
}
