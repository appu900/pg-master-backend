export class StaffContactDto {
  phoneNumber: string;
  whatsappNumber?: string;
}

export class StaffPropertyDetailsDto {
  propertyId: number;
  propertyName: string;
}

export class MaintenanceStaffResponseDto {
  id: number;
  name: string;

  staffType: string;
  jobPosition: string;

  salary: number;
  propertyScope: string;

  contact: StaffContactDto;

  propertyDetails: StaffPropertyDetailsDto[];
}
