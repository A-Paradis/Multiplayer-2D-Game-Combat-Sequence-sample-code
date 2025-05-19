import { DIRECTIONS_VALUES, VisitableTile } from '@app/interfaces/accessible-tiles';
import { Room } from '@app/interfaces/room.interface';
import { RoomService } from '@app/services/room/room.service';
import { Player } from '@common/interfaces/player.interface';
import { Tile, tileCost, TileType } from '@common/interfaces/tile.interface';
import { Vec2 } from '@common/interfaces/vec2.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BoardService {
    constructor(private roomService: RoomService) {}

    /**
     * @brief Checks if a given player is on a slime tile
     * @param roomId
     * @param player
     * @returns an array of Vec2 of all accessible tiles
     */
    isPlayerPositionSlime(room: Room, player: Player): boolean | undefined {
        const tile = room.state.board.find((t) => t.player?.name === player.name);
        if (tile) return tile.id === TileType.Slime ? true : false;
        else return undefined;
    }

    /**
     * @brief toggleDoorState allows the player to open and close a door. A door cannot be opened or closed if a player is on it
     * @param roomId
     * @param doorPosition
     * @returns The position of the door that was modified
     */
    toggleDoorState(room: Room, doorPosition: Vec2): Tile | undefined {
        const tile = room.state.board.find((t) => t.position.x === doorPosition.x && t.position.y === doorPosition.y);
        if (tile) {
            const isTileADoor = tile.id === TileType.ClosedDoor || tile.id === TileType.OpenedDoor ? true : false;
            if (isTileADoor && (tile.player === undefined || tile.player === null)) {
                tile.id = tile.id === TileType.ClosedDoor ? TileType.OpenedDoor : TileType.ClosedDoor;
                return tile;
            }
        }
        return undefined;
    }
