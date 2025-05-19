import { JoinGameGateway } from '@app/gateways/join-game/join-game.gateway';
import { MapsModule } from '@app/modules/maps.module';
import { RoomModule } from '@app/modules/room.module';
import { JoinGameService } from '@app/services/join-game/join-game.service';
import { forwardRef, Module } from '@nestjs/common';
import { GameModule } from './game.module';

@Module({
    imports: [MapsModule, forwardRef(() => RoomModule), GameModule],
    providers: [JoinGameGateway, JoinGameService],
    exports: [JoinGameService],
})
export class JoinGameModule {}
