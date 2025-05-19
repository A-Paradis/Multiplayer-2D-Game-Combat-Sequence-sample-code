import { CombatGateway } from '@app/gateways/combat/combat.gateway';
import { CombatLogicService } from '@app/services/combat-logic/combat-logic.service';
import { CombatRoomService } from '@app/services/combat-room/combat-room.service';
import { CombatTurnService } from '@app/services/combat-turn/combat-turn.service';
import { Module } from '@nestjs/common';
import { BoardModule } from './board.module';
import { TimerModule } from './timer.module';

@Module({
    providers: [CombatLogicService, CombatRoomService, CombatTurnService, CombatGateway],
    imports: [BoardModule, TimerModule],
})
export class CombatModule {}
