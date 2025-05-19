import {
    MOCK_ROOM_ID,
    mockCombatRoom1,
    mockConnectedPlayer1,
    mockConnectedPlayer2,
    mockConnectedPlayer3,
    player1,
    player2,
} from '@app/utils/mock-values';
import { ATTRIBUTE_INIT_VALUE, EVASION_ATTEMPTS } from '@common/constants';
import { Attribute } from '@common/interfaces/player.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { CombatRoomService } from './combat-room.service';

describe('CombatRoomService', () => {
    const randomId1 = '8907';
    const randomId2 = '3476';
    let service: CombatRoomService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CombatRoomService],
        }).compile();

        service = module.get<CombatRoomService>(CombatRoomService);
    });

    it('should generate an empty combatRoom upon service creation', () => {
        expect(service['combatRooms'].size).toBe(0);
    });

    it('should initialize the connectedPlayer with the default combat attributes', () => {
        // Set random health to detect if the health was changed correctly
        mockConnectedPlayer1.player.health = 2;
        service['initializePlayer'](mockConnectedPlayer1);
        expect(mockConnectedPlayer1.player.health).toBe(ATTRIBUTE_INIT_VALUE);
        expect(mockConnectedPlayer1.player.evadingAttempts).toBe(EVASION_ATTEMPTS);
    });

    it('should remove the CombatRoom from combatRooms', () => {
        service['combatRooms'].set(randomId1, mockCombatRoom1);
        service.removeCombatRoom(randomId1);
        expect(service.getCombatRoomById(randomId1)).toBeUndefined();
    });

    describe('getCombatRoomById', () => {
        beforeEach(() => {
            service['combatRooms'].set(randomId1, mockCombatRoom1);
        });
        afterEach(() => {
            service['combatRooms'].delete(randomId1); // Delete mock value form the map
        });
        it('should return the room from its room id', () => {
            const room = service.getCombatRoomById(randomId1);
            expect(room).toBe(mockCombatRoom1);
        });

        it('should return undefined if the no room exist with this given id', () => {
            const room = service.getCombatRoomById(randomId2);
            expect(room).toBeUndefined();
        });
    });

    describe('createCombatRoom', () => {
        it('should create a combatRoom and return its id and the room itself', () => {
            // Disabled to spy on the amount of time initializePlayer was called
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const initSpy = jest.spyOn(service as any, 'initializePlayer');
            // Disabled to check if getCombatFirstPlayer was called with the right attributes
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const firstPlayerSpy = jest.spyOn(service as any, 'getCombatFirstPlayer');

            const { combatRoomId, combatRoom } = service.createCombatRoom(mockConnectedPlayer1, mockConnectedPlayer2);

            expect(initSpy).toHaveBeenCalledTimes(2);
            expect(firstPlayerSpy).toHaveBeenCalledWith(mockConnectedPlayer1.player, mockConnectedPlayer2.player);
            expect(service['combatRooms'].size).toBe(1);
            expect(combatRoomId).toBeDefined();
            expect(combatRoom.player1).toBe(mockConnectedPlayer1);
            expect(combatRoom.player2).toBe(mockConnectedPlayer2);
            expect(combatRoom.activePlayer).toBeDefined();
            expect(combatRoom.timerId).toBeDefined();

            service['combatRooms'].delete(combatRoomId); // Delete mock value form the map
        });
    });

    describe('getCombatRoomIdAndRoom', () => {
        beforeEach(() => {
            service['combatRooms'].set(MOCK_ROOM_ID, mockCombatRoom1);
        });
        afterEach(() => {
            service['combatRooms'].delete(MOCK_ROOM_ID); // Delete mock value form the map
        });
        it('should return the combatRoom and its id from the client socket', () => {
            const { roomId, combatRoom } = service.getCombatRoomIdAndRoom(mockConnectedPlayer1.socket);
            expect(roomId).toBe(MOCK_ROOM_ID);
            expect(combatRoom).toBe(mockCombatRoom1);
        });
        it('should return undefined if the client does not belong to a combat room', () => {
            expect(service.getCombatRoomIdAndRoom(mockConnectedPlayer3.socket)).toBeUndefined();
        });
    });

    describe('getClientAdversary', () => {
        beforeEach(() => {
            service['combatRooms'].set(MOCK_ROOM_ID, mockCombatRoom1);
        });
        afterEach(() => {
            service['combatRooms'].delete(MOCK_ROOM_ID); // Delete mock value form the map
        });
        it('should return the opposite connected player 2 in the combat game if defined', () => {
            const result = service.getClientAdversary(mockConnectedPlayer1.socket);
            expect(result).toBe(mockConnectedPlayer2);
        });
        it('should return the opposite connected player 1 in the combat game if defined', () => {
            const result = service.getClientAdversary(mockConnectedPlayer2.socket);
            expect(result).toBe(mockConnectedPlayer1);
        });
        it('should return undefined the client is not in any combat games', () => {
            const result = service.getClientAdversary(mockConnectedPlayer3.socket);
            expect(result).toBeUndefined();
        });
    });

    describe('getCombatFirstPlayer', () => {
        it('should assign player1 as active player if he has greater speed', () => {
            player1.bonus = Attribute.Speed;
            player2.bonus = Attribute.Defense;
            const player = service['getCombatFirstPlayer'](player1, player2);
            expect(player).toBe(player1);
        });
        it('should assign player2 as active player if he has greater speed', () => {
            player1.bonus = Attribute.Defense;
            player2.bonus = Attribute.Speed;
            const player = service['getCombatFirstPlayer'](player1, player2);
            expect(player).toBe(player2);
        });
        it('should assign player1 as active player if he has greater speed', () => {
            player1.bonus = Attribute.Speed;
            player2.bonus = Attribute.Speed;
            const player = service['getCombatFirstPlayer'](player1, player2);
            expect(player).toBe(player1);
        });
    });
});
