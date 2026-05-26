import { Logger ,Injectable} from "@nestjs/common";





@Injectable()
export class SettelmentService{
  private readonly logger = new Logger(SettelmentService.name);


  async HandleSettelmentwebHook() {
    
  }
}