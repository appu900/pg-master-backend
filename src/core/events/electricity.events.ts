export class ElectricityReadingCreatedEvent {
  constructor(
    public readonly propertyId: number,
    public readonly mobth: number,
    public readonly year: number,
  ) {}
}
