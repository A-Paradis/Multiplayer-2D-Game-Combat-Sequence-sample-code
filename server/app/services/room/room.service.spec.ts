import { RoomService } from '@app/services/room/room.service';
import { MOCK_ROOM_ID, mockConnectedPlayer1, mockConnectedPlayer2, mockRoom1, mockState } from '@app/utils/mock-values';
import { Test, TestingModule } from '@nestjs/testing';

describe('RoomService', () => {
    let service: RoomService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RoomService],
        }).compile();

        service = module.get<RoomService>(RoomService);
    });

    it('should initialize with an empty rooms map', () => {
        expect(service.getRooms().size).toBe(0);
    });

    describe('add and remove rooms', () => {
        it('should add and retrieve a room by ID', () => {
            service.addRoom(MOCK_ROOM_ID, mockRoom1);

            const rooms = service.getRooms();
            expect(rooms.size).toBe(1);

            const roomId = Array.from(rooms.keys())[0];
            expect(service.getRoomById(roomId)).toBe(mockRoom1);

            service['rooms'].delete(MOCK_ROOM_ID);
        });

        it('should set and get the room state', () => {
            service.addRoom(MOCK_ROOM_ID, mockRoom1);

            service.setRoomState(MOCK_ROOM_ID, mockState);
            expect(service.getRoomStateById(MOCK_ROOM_ID)).toBe(mockState);

            service['rooms'].delete(MOCK_ROOM_ID);
        });

        it('should remove a room', () => {
            service.addRoom(MOCK_ROOM_ID, mockRoom1);
            service.removeRoom(MOCK_ROOM_ID);

            expect(service.getRoomById(MOCK_ROOM_ID)).toBeUndefined();
        });
    });

    describe('Get rooms', () => {
        beforeEach(() => {
            service.addRoom(MOCK_ROOM_ID, mockRoom1);
        });

        afterEach(() => {
            service['rooms'].delete(MOCK_ROOM_ID);
        });

        it('should get room ID by player', () => {
            expect(service.getRoomIdByPlayer(mockConnectedPlayer1.player)).toBe(MOCK_ROOM_ID);
        });

        it('should return undefined if the room does not exist', () => {
            expect(service.getRoomIdByPlayer(mockConnectedPlayer2.player)).toBeUndefined();
        });

        it("should get a player's socket", () => {
            expect(service.getPlayerSocket(mockConnectedPlayer1.player)).toBe(mockConnectedPlayer1.socket);
        });
        it('should return undefined (instead of socket) if the player is not any rooms', () => {
            expect(service.getPlayerSocket(mockConnectedPlayer2.player)).toBeUndefined();
        });

        it('should return the roomId and the room from the client socket', () => {
            const { roomId, room } = service.getRoomIdAndRoom(mockConnectedPlayer1.socket);
            expect(roomId).toBe(MOCK_ROOM_ID);
            expect(room).toBe(mockRoom1);
        });

        it('should return undefined if the client is in no rooms', () => {
            expect(service.getRoomIdAndRoom(mockConnectedPlayer2.socket)).toBeUndefined();
        });

        it('should return the room the player is in', () => {
            expect(service['getRoomByPlayer'](mockConnectedPlayer1.player)).toBe(mockRoom1);
        });
        it('should return undefined if the player is not in a room', () => {
            expect(service['getRoomByPlayer'](mockConnectedPlayer2.player)).toBeUndefined();
        });
    });
});
