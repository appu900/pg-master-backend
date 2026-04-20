
import {Module} from "@nestjs/common"
import { EventModule } from "./events/event-bus.module";
import { QueueModule } from "./queue/queue.module";
import { MetricsListner } from "./listeners/metrics.listener";
import { DueListner } from "./listeners/due.listener";
import { NotificationListner } from "./listeners/notification.listner";

@Module({
  imports: [EventModule,QueueModule],
  controllers: [],
  providers: [MetricsListner,DueListner,NotificationListner],
  exports: [QueueModule],
})
export class CoreModule{}