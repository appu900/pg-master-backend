// import { CanActivate ,ExecutionContext,Injectable} from "@nestjs/common";
// import { Reflector } from '@nestjs/core';
// import { PrismaService } from "src/infra/Database/prisma/prisma.service";
// import { ModuleName, PermissionAction } from "../enum/permission.module.enum";
// import { PERMISSION_KEY } from "../decorators/permission.decorator";

// @Injectable()
// export class PermissionGuard implements CanActivate {
//    constructor(private readonly reflector:Reflector,private readonly prisma:PrismaService){}

//    async canActivate(context: ExecutionContext): Promise<boolean> {
//      const permissions = this.reflector.getAllAndOverride<{module:ModuleName,action:PermissionAction}>(PERMISSION_KEY,[
//        context.getHandler(),
//        context.getClass()
//      ]);
//      if(!permissions){
//        return true;
//      }
//      const request = context.switchToHttp().getRequest();
//      const user = request.user;
//    }
// }