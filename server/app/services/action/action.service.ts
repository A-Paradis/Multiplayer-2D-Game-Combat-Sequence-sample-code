import { Room } from '@app/interfaces/room.interface';
import { BoardService } from '@app/services/board/board.service';
import { Tile } from '@common/interfaces/tile.interface';
import { Vec2 } from '@common/interfaces/vec2.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActionService {
    constructor(private readonly boardService: BoardService) {}

    /**
     * @brief Changes the state of the door at the given position if no player is on it
     * @param doorPosition
     */
    interactWithDoor(room: Room, doorPosition: Vec2): Tile | undefined {
        return this.boardService.toggleDoorState(room, doorPosition);
    }
}
