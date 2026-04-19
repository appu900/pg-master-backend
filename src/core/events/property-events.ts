export class PropertyCreateEvent {
  readonly eventName = 'property.create';
  constructor(
    public propertyId: number,
    public ownerId: number,
    public month:number,
    public year:number
  ) {}
}
