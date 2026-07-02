// src/common/enum/module.enum.ts
export enum ModuleName {
  TENANT      = 'TENANT',
  BILLING     = 'BILLING',
  DUE         = 'DUE',
  COMPLAINT   = 'COMPLAINT',
  EXPENSE     = 'EXPENSE',
  ELECTRICITY = 'ELECTRICITY',
  ROOM        = 'ROOM',
  STAFF       = 'STAFF',
  PAYMENT     = 'PAYMENT',
  METRICS     = 'METRICS',
}

export enum PermissionAction {
  CREATE = 'CREATE',
  READ   = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
