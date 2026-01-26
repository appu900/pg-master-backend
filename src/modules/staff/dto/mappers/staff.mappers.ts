import { MaintenanceStaffResponseDto } from '../staff-Response.dto';

export class StaffMapper {
  static toResponse(record: any): MaintenanceStaffResponseDto {
    const profile = record.employeeProfile;

    return {
      id: profile.id,
      name: profile.user.fullName,

      staffType: profile.staffType,
      jobPosition: profile.jobPosition,

      salary: Number(profile.monthlySalary),
      propertyScope: profile.propertyScope,

      contact: {
        phoneNumber: profile.phoneNumber,
        whatsappNumber: profile.whatsAppNumber,
      },

      propertyDetails: profile.maintenanceStaffPropertyAccesses.map(
        (access) => ({
          propertyId: access.property.id,
          propertyName: access.property.name,
        }),
      ),
    };
  }
}
