import { TimerService } from '@app/services/timer/timer.service';
import { Module } from '@nestjs/common';

@Module({
    providers: [TimerService],
    exports: [TimerService],
})
export class TimerModule {}
