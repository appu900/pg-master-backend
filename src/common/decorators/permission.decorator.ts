// src/common/decorators/permission.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { ModuleName, PermissionAction } from '../enum/permission.module.enum';


export const PERMISSION_KEY = 'permission';

export const Permission = (module: ModuleName, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { module, action });
