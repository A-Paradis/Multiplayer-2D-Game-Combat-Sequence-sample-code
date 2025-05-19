import { ActionGateway } from '@app/gateways/action/action.gateway';
import { BoardModule } from '@app/modules/board.module';
import { RoomModule } from '@app/modules/room.module';
import { ActionService } from '@app/services/action/action.service';
import { Module } from '@nestjs/common';

@Module({
    imports: [BoardModule, RoomModule],
    providers: [ActionGateway, ActionService],
    exports: [ActionService],
})
export class ActionModule {}
