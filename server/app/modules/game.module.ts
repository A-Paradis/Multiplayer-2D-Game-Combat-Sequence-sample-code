import { GameGateway } from '@app/gateways/game/game.gateway';
import { RoomModule } from '@app/modules/room.module';
import { TimerModule } from '@app/modules/timer.module';
import { GameService } from '@app/services/game/game.service';
import { forwardRef, Module } from '@nestjs/common';

@Module({
    imports: [forwardRef(() => RoomModule), TimerModule],
    providers: [GameGateway, GameService],
    exports: [GameService],
})
export class GameModule {}
