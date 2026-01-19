import { Role } from '../enum/role.enum';

export interface AuthUser {
  userId: number;
  role: Role;
}
