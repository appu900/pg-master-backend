



import { BullExplorer } from "@nestjs/bullmq/dist/bull.explorer";
import {Module,Global} from "@nestjs/common"
import { BullMqModule } from "../adapters/bullmq/bullmq.module";





const QueueDriver = (()=>{
    const driver = process.env.QUEUE_DRIVER || 'bullmq';
    switch(driver){
        case 'bullmq':
            return BullMqModule
        default:
            return BullMqModule
    }
})();


@Global()
@Module({
  imports: [QueueDriver],
  controllers: [],
  providers: [],
  exports: [QueueDriver],
})
export class QueueModule{}