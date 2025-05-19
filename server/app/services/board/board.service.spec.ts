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
    describe('updateAfterPlayerMove', () => {
        it('should call the necessary methods to update the board', () => {
            const mockTiles: Vec2[] = [tiles[1].position, tiles[2].position, tiles[5].position];
            jest.spyOn(service['roomService'], 'getPlayerByName').mockReturnValue(player1);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jest.spyOn(service as any, 'getTilesFromPath').mockReturnValue(mockTiles);
            const randomRoomID = 'LOL';
            const initPosition = { x: 2, y: 0 };
            const lastPosition = { x: 2, y: 8 };
            // Disabled to spy private methods
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(service as any, 'updatePlayerPosition').mockImplementation();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy1 = jest.spyOn(service as any, 'updatePlayerMoves').mockImplementation();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy2 = jest.spyOn(service as any, 'updateBoardAfterMove').mockImplementation();

            service.updateAfterPlayerMove(randomRoomID, mockPath, player1.name);

            expect(spy).toHaveBeenCalledWith(player1, lastPosition);
            expect(spy1).toHaveBeenCalledWith(mockTiles, player1);
            expect(spy2).toHaveBeenCalledWith(randomRoomID, initPosition, lastPosition, player1);
        });
    });
    describe('getAccessibleTiles', () => {
        it('getAccessibleTiles should return only Slime tiles if no moves left', () => {
            const initPosition: Vec2 = { x: 1, y: 1 };
            const mockPlayer: Player = { ...player1, currPosition: initPosition, initMoves: 4, movesLeft: 0 };
            const mockBoard: Tile[] = [
                { ...tiles[0], id: TileType.Slime, player: mockPlayer, position: { ...initPosition } },
                { ...tiles[1], id: TileType.Slime, player: null, position: { x: 1, y: 0 } },
                { ...tiles[2], id: TileType.Slime, player: null, position: { x: 2, y: 1 } },
                { ...tiles[3], id: TileType.Mud, player: null, position: { x: 1, y: 2 } },
                { ...tiles[3], id: TileType.OpenedDoor, player: null, position: { x: 0, y: 1 } },
                { ...tiles[3], id: TileType.Slime, player: null, position: { x: 0, y: 0 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 2, y: 0 } },
                { ...tiles[3], id: TileType.Dirt, player: null, position: { x: 2, y: 2 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 0, y: 2 } },
            ];
            const mockGameState: GameState = { ...mockState, board: mockBoard, boardSize: BoardSize.Test3 };
            roomService.getRoomStateById.returns(mockGameState);

            const expectedPath: Vec2[] = [mockBoard[1].position, mockBoard[2].position, mockBoard[5].position];
            expect(service.getAccessibleTiles(MOCK_ROOM_ID, mockPlayer)).toEqual(expectedPath);
        });
        it('getAccessibleTiles() should return all accessible tiles', () => {
            const initPosition: Vec2 = { x: 1, y: 1 };
            const mockPlayer: Player = { ...player1, currPosition: initPosition, initMoves: 4, movesLeft: 3 };
            const mockBoard: Tile[] = [
                { ...tiles[0], id: TileType.Slime, player: mockPlayer, position: { ...initPosition } },
                { ...tiles[1], id: TileType.OpenedDoor, player: null, position: { x: 1, y: 0 } },
                { ...tiles[2], id: TileType.Mud, player: null, position: { x: 2, y: 1 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 1, y: 2 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 0, y: 1 } },
                { ...tiles[3], id: TileType.Wall, player: null, position: { x: 0, y: 0 } },
                { ...tiles[3], id: TileType.Wall, player: null, position: { x: 2, y: 0 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 2, y: 2 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 0, y: 2 } },
            ];
            const mockGameState: GameState = { ...mockState, board: mockBoard, boardSize: BoardSize.Test3 };
            roomService.getRoomStateById.returns(mockGameState);

            const expectedPath: Vec2[] = [mockBoard[1].position, mockBoard[2].position];
            expect(service.getAccessibleTiles(MOCK_ROOM_ID, mockPlayer)).toEqual(expectedPath);
        });
        it('getAccessibleTiles() should not allow directly diagonal tiles', () => {
            const initPosition: Vec2 = { x: 1, y: 1 };
            const mockPlayer: Player = { ...player1, currPosition: initPosition, initMoves: 4, movesLeft: 3 };
            const mockBoard: Tile[] = [
                { ...tiles[0], id: TileType.Slime, player: mockPlayer, position: { ...initPosition } },
                { ...tiles[1], id: TileType.OpenedDoor, player: null, position: { x: 1, y: 0 } },
                { ...tiles[2], id: TileType.Wall, player: null, position: { x: 2, y: 1 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 1, y: 2 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 0, y: 1 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 0, y: 0 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 2, y: 0 } },
                { ...tiles[3], id: TileType.Dirt, player: null, position: { x: 2, y: 2 } },
                { ...tiles[3], id: TileType.Slime, player: null, position: { x: 0, y: 2 } },
            ];
            const mockGameState: GameState = { ...mockState, board: mockBoard, boardSize: BoardSize.Test3 };
            roomService.getRoomStateById.returns(mockGameState);

            const expectedPath: Vec2[] = [mockBoard[1].position];
            expect(service.getAccessibleTiles(MOCK_ROOM_ID, mockPlayer)).toEqual(expectedPath);
        });
        it('getAccessibleTiles() should not allow tiles with players on them', () => {
            const initPosition: Vec2 = { x: 1, y: 1 };
            const mockPlayer: Player = { ...player1, currPosition: initPosition, initMoves: 4, movesLeft: 3 };
            const mockBoard: Tile[] = [
                { ...tiles[0], id: TileType.Slime, player: mockPlayer, position: { ...initPosition } },
                { ...tiles[1], id: TileType.OpenedDoor, player: player2, position: { x: 1, y: 0 } },
                { ...tiles[2], id: TileType.Mud, player: null, position: { x: 2, y: 1 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 1, y: 2 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 0, y: 1 } },
                { ...tiles[3], id: TileType.Wall, player: null, position: { x: 0, y: 0 } },
                { ...tiles[3], id: TileType.Wall, player: null, position: { x: 2, y: 0 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 2, y: 2 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 0, y: 2 } },
            ];
            const mockGameState: GameState = { ...mockState, board: mockBoard, boardSize: BoardSize.Test3 };
            roomService.getRoomStateById.returns(mockGameState);

            const expectedPath: Vec2[] = [mockBoard[2].position];
            expect(service.getAccessibleTiles(MOCK_ROOM_ID, mockPlayer)).toEqual(expectedPath);
        });
        it('getAccessibleTiles() should show only accessible tiles on 10x10 board', () => {
            // initial position : { x: 6, y: 3 };
            const mockPlayer: Player = { ...testPlayer }; // movesLeft = 3
            const mockBoard: Tile[] = [...testBoard];

            const mockGameState: GameState = { ...mockState, board: mockBoard, boardSize: BoardSize.Small };
            roomService.getRoomStateById.returns(mockGameState);

            const accessibleTiles = service.getAccessibleTiles(MOCK_ROOM_ID, mockPlayer);
            expect(compareArray(accessibleTiles, mockPath)).toBe(true);
        });
    });

    // PRIVATE METHODS

    describe('private board methods', () => {
        it('isTileAccessible should return false is the tile id is Infinity', () => {
            const mockTile: Tile = { ...tiles[0], id: TileType.ClosedDoor };

            expect(service['isTileAccessible'](mockTile)).toBe(false);
        });
        it('isTileAccessible should return false if a player is on it', () => {
            const mockTile: Tile = { ...tiles[0], id: TileType.Slime, player: player1 };

            expect(service['isTileAccessible'](mockTile)).toBe(false);
        });
        it('isTileAccessible should return true if the tile is accessible', () => {
            const mockTile: Tile = { ...tiles[0], id: TileType.Slime, player: null };

            expect(service['isTileAccessible'](mockTile)).toBe(true);
        });
        it('getTileCost() should return the tiles cost', () => {
            const mockTile: Tile = { ...tiles[0], id: TileType.Slime, player: null };

            expect(service['getTileCost'](mockTile)).toBe(tileCost[TileType.Slime]);
        });
        it('getTileCost() should return infinity if undefined', () => {
            const mockTile = undefined;

            expect(service['getTileCost'](mockTile)).toBe(Infinity);
        });
        it('findTileWithPosition() should return the tile from the board with the position', () => {
            const mockBoard: Tile[] = [...tiles];
            const position: Vec2 = tiles[0].position;

            expect(service['findTileWithPosition'](mockBoard, position)).toBe(tiles[0]);
        });
        it('updatePlayerMoves() should update the movesLeft of the player', () => {
            const path: Tile[] = [
                { ...tiles[0], id: TileType.Slime, player: player2 },
                { ...tiles[1], id: TileType.Dirt, player: null },
            ];
            const initMovesLeft = 4;
            const mockPlayer: Player = { ...player1, movesLeft: initMovesLeft };
            const movesCost: number = tileCost[TileType.Slime] + tileCost[TileType.Dirt];

            service['updatePlayerMoves'](path, mockPlayer);
            expect(mockPlayer.movesLeft).toBe(initMovesLeft - movesCost);
        });
        it('updateBoardAfterMove() should update the board after the player moved', () => {
            const initPosition: Vec2 = { x: 2, y: 2 };
            const mockPlayer: Player = { ...player1, currPosition: initPosition, initMoves: 4, movesLeft: 3 };
            const mockBoard: Tile[] = [
                { ...tiles[0], id: TileType.Slime, player: mockPlayer, position: { ...initPosition } },
                { ...tiles[1], id: TileType.OpenedDoor, player: null, position: { x: 2, y: 1 } },
                { ...tiles[2], id: TileType.Mud, player: null, position: { x: 3, y: 2 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 2, y: 3 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 1, y: 2 } },
                { ...tiles[3], id: TileType.Wall, player: null, position: { x: 1, y: 1 } },
                { ...tiles[3], id: TileType.Wall, player: null, position: { x: 3, y: 1 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 3, y: 3 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 1, y: 3 } },
            ];
            const mockP: Tile[] = [mockBoard[1], mockBoard[2], mockBoard[5]];

            const mockGameState: GameState = { ...mockState, board: mockBoard, boardSize: BoardSize.Test3 };
            roomService.getRoomStateById.returns(mockGameState);

            service['updateBoardAfterMove'](MOCK_ROOM_ID, initPosition, mockP[mockP.length - 1].position, mockPlayer);
            expect(mockBoard[0].player).toBeUndefined();
            expect(mockBoard[5].player).toBe(mockPlayer);
        });
        it('updatePlayerPosition() should update the players current position', () => {
            const initPosition: Vec2 = { x: 2, y: 2 };
            const mockPlayer: Player = { ...player1, currPosition: initPosition, initMoves: 4, movesLeft: 3 };
            const mockTile: Tile = { ...tiles[0], id: TileType.Slime, player: null }; // position : {x: 3, y: 2}

            service['updatePlayerPosition'](mockPlayer, mockTile.position);

            expect(mockTile.player).toBeDefined();
            expect(mockPlayer.currPosition.x).toEqual(mockTile.position.x);
            expect(mockPlayer.currPosition.y).toEqual(mockTile.position.y);
        });
        it('getTilesFromPath() should return an array of tiles from the positions', () => {
            const initPosition: Vec2 = { x: 2, y: 2 };
            const mockPlayer: Player = { ...player1, currPosition: initPosition, initMoves: 4, movesLeft: 3 };
            const mockBoard: Tile[] = [
                { ...tiles[0], id: TileType.Slime, player: mockPlayer, position: { ...initPosition } },
                { ...tiles[1], id: TileType.OpenedDoor, player: null, position: { x: 2, y: 1 } },
                { ...tiles[2], id: TileType.Mud, player: null, position: { x: 3, y: 2 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 2, y: 3 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 1, y: 2 } },
                { ...tiles[3], id: TileType.Wall, player: null, position: { x: 1, y: 1 } },
                { ...tiles[3], id: TileType.Wall, player: null, position: { x: 3, y: 1 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 3, y: 3 } },
                { ...tiles[3], id: TileType.ClosedDoor, player: null, position: { x: 1, y: 3 } },
            ];
            const mockGameState: GameState = { ...mockState, board: mockBoard, boardSize: BoardSize.Test3 };
            roomService.getRoomStateById.returns(mockGameState);

            const mockP: Vec2[] = [mockBoard[1].position, mockBoard[2].position, mockBoard[5].position];
            const expectedPath: Tile[] = [{ ...mockBoard[1] }, { ...mockBoard[2] }, { ...mockBoard[5] }];

            expect(service['getTilesFromPath'](MOCK_ROOM_ID, mockP)).toEqual(expectedPath);
        });
    });

    // FONCTION PRISE DU FORUM STACKOVERFLOW
    // https://stackoverflow.com/questions/47666515/comparing-arrays-in-javascript-where-order-doesnt-matter
    const compareArray = (array1, array2): boolean => {
        const countOccurrences = (arr) => {
            return arr.reduce((acc, num) => {
                acc[num] = (acc[num] || 0) + 1;
                return acc;
            }, {});
        };

        array1.sort();
        array2.sort();

        const arr1 = countOccurrences(array1);
        const arr2 = countOccurrences(array2);

        if (arr1.length !== arr2.length) return false;

        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }

        return true;
    };
});
