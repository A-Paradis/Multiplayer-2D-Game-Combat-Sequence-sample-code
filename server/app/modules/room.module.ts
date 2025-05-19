import { RoomService } from '@app/services/room/room.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
    providers: [RoomService],
    exports: [RoomService],
})
export class RoomModule {}
