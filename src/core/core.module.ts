
import {Module} from "@nestjs/common"
import { EventModule } from "./events/event-bus.module";
import { QueueModule } from "./queue/queue.module";
import { MetricsListner } from "./listeners/metrics.listener";

@Module({
  imports: [EventModule,QueueModule],
  controllers: [],
  providers: [MetricsListner],
  exports: [QueueModule],
})
export class CoreModule{}