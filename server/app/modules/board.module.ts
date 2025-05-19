import { BoardGateway } from '@app/gateways/board/board.gateway';
import { RoomModule } from '@app/modules/room.module';
import { BoardService } from '@app/services/board/board.service';
import { forwardRef, Module } from '@nestjs/common';

@Module({
    imports: [forwardRef(() => RoomModule)],
    providers: [BoardService, BoardGateway],
    exports: [BoardService],
})
export class BoardModule {}
