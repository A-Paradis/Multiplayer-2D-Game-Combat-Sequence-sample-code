/* eslint-disable no-console */
import { GameState } from '@app/interfaces/game-state.interface';
import { Room } from '@app/interfaces/room.interface';
import { RoomService } from '@app/services/room/room.service';
import { MOCK_ROOM_ID, mockPath, mockRoom2, mockState, player1, player2, player5, tiles } from '@app/utils/mock-values';
import { BoardSize } from '@common/constants';
import { Player } from '@common/interfaces/player.interface';
import { Tile, tileCost, TileType } from '@common/interfaces/tile.interface';
import { Vec2 } from '@common/interfaces/vec2.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import { testBoard, testPlayer } from './board.constant';
import { BoardService } from './board.service';

describe('BoardService', () => {
    let service: BoardService;
    let room: Room;
    let roomService: SinonStubbedInstance<RoomService>;

    beforeEach(async () => {
        roomService = createStubInstance<RoomService>(RoomService);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BoardService,
                RoomService,
                {
                    provide: RoomService,
                    useValue: roomService,
                },
            ],
        }).compile();

        service = module.get<BoardService>(BoardService);
        room = mockRoom2;
    });

    describe('isPlayerPositionSlime', () => {
        it('should return true if a player is on a slime tile', () => {
            const result = service.isPlayerPositionSlime(room, player2);
            expect(result).toBeTruthy();
        });
        it('should return false if a player is not on a slime time', () => {
            const result = service.isPlayerPositionSlime(room, player1);
            expect(result).toBeFalsy();
        });
        it('should return undefined if the player is not in game', () => {
            const result = service.isPlayerPositionSlime(room, player5);
            expect(result).toBe(undefined);
        });
    });
    describe('toggleDoorState', () => {
        it('should open the door if no player is on it', () => {
            const position = { x: 1, y: 3 };
            service.toggleDoorState(mockRoom2, position);
            const door = room.state.board.find(
                (tile: { position: { x: number; y: number } }) => tile.position.x === position.x && tile.position.y === position.y,
            );
            expect(door.id).toBe(TileType.OpenedDoor);
        });
        it('should close the door if no player is on it', () => {
            const position = { x: 2, y: 1 };
            service.toggleDoorState(mockRoom2, position);
            const door = room.state.board.find(
                (tile: { position: { x: number; y: number } }) => tile.position.x === position.x && tile.position.y === position.y,
            );
            expect(door.id).toBe(TileType.ClosedDoor);
        });
        it('should not interact with door if a player is on it', () => {
            const position = { x: 1, y: 2 };
            service.toggleDoorState(mockRoom2, position);
            const door = room.state.board.find(
                (tile: { position: { x: number; y: number } }) => tile.position.x === position.x && tile.position.y === position.y,
            );
            expect(door.id).toBe(TileType.OpenedDoor);
        });
        it('should not interact with the tile if it is not a door', () => {
            const position = { x: 1, y: 1 };
            service.toggleDoorState(mockRoom2, position);
            const door = room.state.board.find(
                (tile: { position: { x: number; y: number } }) => tile.position.x === position.x && tile.position.y === position.y,
            );
            expect(door.id).toBe(TileType.Dirt);
        });
    });
});
