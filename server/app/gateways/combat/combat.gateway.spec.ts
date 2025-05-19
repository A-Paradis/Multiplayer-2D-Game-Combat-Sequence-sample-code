/* eslint-disable max-lines */
import { CombatRoom } from '@app/interfaces/combat.interface';
import { Room } from '@app/interfaces/room.interface';
import { CombatRoomService } from '@app/services/combat-room/combat-room.service';
import { CombatTurnService } from '@app/services/combat-turn/combat-turn.service';
import { RoomService } from '@app/services/room/room.service';
import {
    createMockCombatRoom1,
    createMockRoom1,
    MOCK_COMBAT_ROOM_ID,
    MOCK_COMBAT_ROOM_ID as MOCK_ROOM_ID,
    mockConnectedPlayer1,
    mockConnectedPlayer2,
    mockConnectedPlayer3,
} from '@app/utils/mock-values';
import { MILLISECONDS_1000 } from '@common/constants';
import { CombatEvents } from '@common/socket-events/combat-action.event';
import { TimerEvents } from '@common/socket-events/timer.events';
import { Test, TestingModule } from '@nestjs/testing';
import { createStubInstance } from 'sinon';
import { Server, Socket } from 'socket.io';
import { CombatGateway } from './combat.gateway';

describe('CombatGateway', () => {
    const mockRoomId = MOCK_ROOM_ID;
    const mockCombatRoomID = MOCK_COMBAT_ROOM_ID;
    let gateway: CombatGateway;
    let mockGameRoom: Room;
    let mockCombatRoom: CombatRoom;
    let roomService: RoomService;
    let combatRoomService: CombatRoomService;
    let combatTurnService: CombatTurnService;
    let server: Server;
    let socket: Socket;
    let mockEmit: jest.Mock;

    beforeEach(async () => {
        socket = createStubInstance(Socket);
        combatRoomService = createStubInstance(CombatRoomService);
        combatTurnService = createStubInstance(CombatTurnService);
        roomService = createStubInstance(RoomService);
        server = createStubInstance(Server);

        mockEmit = jest.fn();
        server.to = jest.fn().mockReturnValue({
            emit: mockEmit,
        });

        socket.leave = jest.fn();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CombatGateway,
                { provide: RoomService, useValue: roomService },
                { provide: CombatRoomService, useValue: combatRoomService },
                { provide: CombatTurnService, useValue: combatTurnService },
            ],
        }).compile();

        mockGameRoom = createMockRoom1();
        mockCombatRoom = createMockCombatRoom1();

        roomService.getRoomIdAndRoom = jest.fn().mockReturnValue({
            roomId: mockRoomId,
            room: mockGameRoom,
        });

        combatRoomService.getCombatRoomIdAndRoom = jest.fn().mockReturnValue({
            roomId: mockCombatRoomID,
            combatRoom: mockCombatRoom,
        });

        roomService.getPlayerSocket = jest.fn().mockImplementation((player) => {
            if (player === mockConnectedPlayer1.player) return mockConnectedPlayer1.socket;
            if (player === mockConnectedPlayer2.player) return mockConnectedPlayer2.socket;
            return undefined;
        });

        roomService.getRoomById = jest.fn().mockReturnValue(mockGameRoom);
        combatTurnService.startTurn = jest.fn();

        gateway = module.get<CombatGateway>(CombatGateway);
        gateway['server'] = server; // Attach the mocked server
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers(); // Clear timers after each test
        jest.clearAllMocks();
    });

    describe('onCombatStarted', () => {
        beforeEach(() => {
            combatRoomService.createCombatRoom = jest.fn().mockReturnValue({
                combatRoomId: mockCombatRoomID,
                combatRoom: mockCombatRoom,
            });
        });
        it('should create a combat room and join the combatants to it', () => {
            gateway.onCombatStarted({ roomId: mockRoomId, data: { attacker: mockConnectedPlayer1.player, combatant: mockConnectedPlayer2.player } });

            expect(roomService.getPlayerSocket).toHaveBeenCalledWith(mockConnectedPlayer1.player);
            expect(roomService.getPlayerSocket).toHaveBeenCalledWith(mockConnectedPlayer2.player);
            expect(combatRoomService.createCombatRoom).toHaveBeenCalledWith(
                { player: mockConnectedPlayer1.player, socket: mockConnectedPlayer1.socket },
                { player: mockConnectedPlayer2.player, socket: mockConnectedPlayer2.socket },
            );
            expect(mockConnectedPlayer1.socket.join).toHaveBeenCalledWith(mockCombatRoomID);
            expect(mockConnectedPlayer2.socket.join).toHaveBeenCalledWith(mockCombatRoomID);
        });
        it('should emit the name of the first player in the combat room', () => {
            gateway.onCombatStarted({ roomId: mockRoomId, data: { attacker: mockConnectedPlayer1.player, combatant: mockConnectedPlayer2.player } });

            expect(server.to).toHaveBeenCalledWith(mockCombatRoomID);
            expect(server.to(mockCombatRoomID).emit).toHaveBeenCalledWith(CombatEvents.FirstPlayer, {
                firstPlayer: mockCombatRoom.activePlayer,
                message: `${mockCombatRoom.activePlayer.name} commence le combat`,
            });
        });
        it('should start the turn and emit the remaining time', () => {
            // Spy on private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(gateway as any, 'startCombatTurn').mockImplementation();
            jest.spyOn(combatRoomService, 'createCombatRoom').mockReturnValue({ combatRoomId: mockCombatRoomID, combatRoom: mockCombatRoom });
            gateway.onCombatStarted({ roomId: mockRoomId, data: { attacker: mockConnectedPlayer1.player, combatant: mockConnectedPlayer2.player } });

            expect(spy).toHaveBeenCalledWith(mockCombatRoomID, mockCombatRoom, mockGameRoom);
        });
    });

    describe('attack', () => {
        it('should call handleCombatAction and combatTurnService.attackTurn when attack event is triggered', async () => {
            const spyA = jest.spyOn(combatTurnService, 'attackTurn');
            // To spy on private methods
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spyAttack = jest.spyOn(gateway as any, 'handleCombatAction').mockImplementation(() => {
                combatTurnService.attackTurn(mockCombatRoom, mockGameRoom, () => {
                    gateway['signalWonCombat'](mockCombatRoomID, mockCombatRoom);
                });
            });

            gateway.attack(socket);

            expect(spyAttack).toHaveBeenCalled();
            expect(spyA).toHaveBeenCalled();
        });
    });

    describe('evade', () => {
        it('should call handleCombatAction and combatTurnService.evadeTurn when attack event is triggered', async () => {
            const evasionCallback = jest.fn();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spyLost = jest.spyOn(gateway as any, 'signalEvadedCombat').mockImplementation();
            // To spy on private methods
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spyAction = jest.spyOn(gateway as any, 'handleCombatAction').mockImplementation(() => {
                combatTurnService.evadeTurn(mockCombatRoom, evasionCallback);
            });
            const spyTurn = jest.spyOn(combatTurnService, 'evadeTurn').mockImplementation(() => {
                gateway['signalEvadedCombat'](socket.id, mockCombatRoomID, mockCombatRoom);
            });

            gateway.evade(socket);

            expect(spyAction).toHaveBeenCalled();
            expect(spyTurn).toHaveBeenCalled();
            expect(spyLost).toHaveBeenCalled();
        });
    });
    describe('handleCombatAction', () => {
        it('should call the action callback function if the game and combat room are valid', () => {
            const action = jest.fn();
            jest.spyOn(roomService, 'getRoomIdAndRoom').mockReturnValue({ roomId: mockRoomId, room: mockGameRoom });
            jest.spyOn(combatRoomService, 'getCombatRoomIdAndRoom').mockReturnValue({ roomId: mockCombatRoomID, combatRoom: mockCombatRoom });

            gateway['handleCombatAction'](socket, action);

            expect(action).toHaveBeenCalled();
        });
        it('should not call the action callback function if game room is not valid', () => {
            const action = jest.fn();
            jest.spyOn(roomService, 'getRoomIdAndRoom').mockReturnValue({ roomId: mockRoomId, room: mockGameRoom });
            jest.spyOn(combatRoomService, 'getCombatRoomIdAndRoom').mockReturnValue(undefined);

            gateway['handleCombatAction'](socket, action);

            expect(action).not.toHaveBeenCalled();
        });
        it('should not call the action callback function if combat room is not valid', () => {
            const action = jest.fn();
            jest.spyOn(roomService, 'getRoomIdAndRoom').mockReturnValue(undefined);
            jest.spyOn(combatRoomService, 'getCombatRoomIdAndRoom').mockReturnValue({ roomId: mockCombatRoomID, combatRoom: mockCombatRoom });

            gateway['handleCombatAction'](socket, action);

            expect(action).not.toHaveBeenCalled();
        });
    });
    describe('startCombatTurn', () => {
        it('should call startTurn with the right callback functions and parameters', () => {
            // Spy on emit methods
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const emitUpdatedTimeSpy = jest.spyOn(gateway as any, 'emitUpdatedTime').mockImplementation();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const emitActivePlayerSpy = jest.spyOn(gateway as any, 'emitActivePlayer').mockImplementation();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const signalWonCombatSpy = jest.spyOn(gateway as any, 'signalWonCombat').mockImplementation();

            const spy = jest.spyOn(combatTurnService, 'startTurn').mockImplementation((_combat, _game, onTime, onActivePlayer, onWin) => {
                onTime(MILLISECONDS_1000);
                onActivePlayer();
                onWin();
            });

            gateway['startCombatTurn'](mockRoomId, mockCombatRoom, mockGameRoom); // since it's private, use `as any` or test indirectly

            expect(spy).toHaveBeenCalledWith(mockCombatRoom, mockGameRoom, expect.any(Function), expect.any(Function), expect.any(Function));

            expect(emitUpdatedTimeSpy).toHaveBeenCalledWith(mockCombatRoomID, MILLISECONDS_1000);
            expect(emitActivePlayerSpy).toHaveBeenCalledWith(mockCombatRoomID, mockCombatRoom.activePlayer);
            expect(signalWonCombatSpy).toHaveBeenCalledWith(mockCombatRoomID, mockCombatRoom);
        });
    });
    it('should emit the remaining time to the combatRoom - emitUpdatedTime', () => {
        const remainingTime = 10;
        gateway['emitUpdatedTime'](mockCombatRoomID, remainingTime);

        expect(server.to).toHaveBeenCalledWith(mockCombatRoomID);
        expect(mockEmit).toHaveBeenCalledWith(TimerEvents.TimerUpdate, remainingTime);
    });

    it('should emit the active player to the combatRoom - emitActivePlayer', () => {
        gateway['emitActivePlayer'](mockCombatRoomID, mockCombatRoom.activePlayer);
        expect(server.to).toHaveBeenCalledWith(mockCombatRoomID);
        expect(mockEmit).toHaveBeenCalledWith(CombatEvents.ActivePlayer, mockCombatRoom.activePlayer);
    });

    it('should remove the players from the room, delete the timer and the combat room - removeRoomAfterTime', () => {
        const spy = jest.spyOn(combatTurnService, 'deleteTimer').mockImplementation();
        const spy1 = jest.spyOn(combatRoomService, 'removeCombatRoom').mockImplementation();

        gateway['removeRoomAfterTime'](mockCombatRoomID, mockCombatRoom);

        expect(mockCombatRoom.player1.socket.leave).toHaveBeenCalledWith(mockCombatRoomID);
        expect(mockCombatRoom.player2.socket.leave).toHaveBeenCalledWith(mockCombatRoomID);
        expect(spy).toHaveBeenCalled();
        expect(spy1).toHaveBeenCalled();
    });

    describe('signalWonCombat', () => {
        it('should emit a message to the winner of the combat', () => {
            roomService.getPlayerSocket = jest.fn().mockReturnValueOnce(mockConnectedPlayer1.socket).mockReturnValueOnce(mockConnectedPlayer2.socket);
            // spy on private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(gateway as any, 'removeRoomAfterTime').mockImplementation();
            gateway['signalWonCombat'](mockCombatRoomID, mockCombatRoom);

            expect(server.to).toHaveBeenNthCalledWith(1, mockConnectedPlayer1.socket.id);
            expect(mockEmit).toHaveBeenNthCalledWith(1, CombatEvents.Finished, {
                message: 'Félicitation! Vous avez gagné le combat.',
                player: mockCombatRoom.winner,
            });

            expect(server.to).toHaveBeenNthCalledWith(2, mockConnectedPlayer2.socket.id);
            expect(mockEmit).toHaveBeenNthCalledWith(2, CombatEvents.Finished, {
                message: 'Vous avez perdu. Meilleur chance la prochaine fois.',
                player: mockConnectedPlayer2.player,
            });

            expect(spy).toHaveBeenCalled();
        });
        it('should not emit a message to the winner if the socket is not valid', () => {
            roomService.getPlayerSocket = jest.fn().mockReturnValue(undefined);
            gateway['signalWonCombat'](mockCombatRoomID, mockCombatRoom);

            expect(server.to).not.toHaveBeenCalled();
            expect(mockEmit).not.toHaveBeenCalled();
        });
    });
    describe('signalEvadedCombat', () => {
        it('should emit messages to the players after', () => {
            // spy on private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(gateway as any, 'removeRoomAfterTime').mockImplementation();
            gateway['signalEvadedCombat'](mockConnectedPlayer1.socket.id, mockCombatRoomID, mockCombatRoom);

            expect(mockEmit).toHaveBeenNthCalledWith(1, CombatEvents.EvasionSuccessful, {
                message: 'Vous avez évader votre adversaire.',
                player: mockCombatRoom.player1.player,
            });

            expect(mockEmit).toHaveBeenNthCalledWith(2, CombatEvents.EvasionSuccessful, {
                message: "Votre adversaire s'est échappé.",
                player: mockCombatRoom.player2.player,
            });

            expect(spy).toHaveBeenCalled();
        });
        it('should not emit a message to the other player if his socket is not defined', () => {
            // spy on private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(gateway as any, 'removeRoomAfterTime').mockImplementation();
            mockCombatRoom.player2.socket = null;
            gateway['signalEvadedCombat'](undefined, mockCombatRoomID, mockCombatRoom);

            expect(server.to).not.toHaveBeenCalled();
            expect(mockEmit).not.toHaveBeenCalledWith(CombatEvents.EvasionSuccessful, {
                message: "Votre adversaire s'est échappé.",
                player: mockCombatRoom.player2,
            });

            expect(spy).toHaveBeenCalled();
        });
    });
    describe('disconnect', () => {
        it('should call signalDisconnect upon client disconnection if combat room is valid', () => {
            // To spy on a private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(gateway as any, 'signalDisconnect');

            gateway.handleDisconnect(mockConnectedPlayer1.socket);

            expect(spy).toHaveBeenCalledWith(mockConnectedPlayer1.socket, mockCombatRoomID, mockCombatRoom);
        });
        it('should not call signalDisconnect upon client disconnection if combat room is not valid', () => {
            // To spy on a private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(gateway as any, 'signalDisconnect').mockImplementation();
            jest.spyOn(combatRoomService, 'getCombatRoomIdAndRoom').mockReturnValue(undefined);

            gateway.handleDisconnect(mockConnectedPlayer3.socket);

            expect(spy).not.toHaveBeenCalled();
        });
        it('should signal the opposite player that adversary left the game', () => {
            mockConnectedPlayer2.player.victories = 0;
            jest.spyOn(combatRoomService, 'getClientAdversary').mockReturnValue(mockConnectedPlayer2);

            gateway['signalDisconnect'](mockConnectedPlayer1.socket, mockCombatRoomID, mockCombatRoom);

            expect(mockConnectedPlayer2.player.victories).toBe(1);
            expect(mockEmit).toHaveBeenCalledWith(CombatEvents.Finished, {
                message: "Votre adversaire s'est déconnecté. Vous être le gagnant!",
                player: mockConnectedPlayer2.player,
            });
        });
        it('should not signal the player if the connectedPlayer is invalid', () => {
            jest.spyOn(combatRoomService, 'getClientAdversary').mockReturnValue(undefined);

            gateway['signalDisconnect'](mockConnectedPlayer1.socket, mockCombatRoomID, mockCombatRoom);

            expect(mockEmit).not.toHaveBeenCalled();
        });
    });
});
