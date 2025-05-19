import { ActionService } from '@app/services/action/action.service';
import { RoomService } from '@app/services/room/room.service';
import { MOCK_ROOM_ID, mockDoor, mockPosition, mockRoom1, player1, player2 } from '@app/utils/mock-values';
import { ActionsEvents, ActionsEventsMap } from '@common/socket-events/combat-action.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { createStubInstance } from 'sinon';
import { BroadcastOperator, Server, Socket } from 'socket.io';
import { ActionGateway } from './action.gateway';

describe('ActionGateway', () => {
    let gateway: ActionGateway;
    let eventEmitter: EventEmitter2;
    let roomService: RoomService;
    let actionService: ActionService;
    // To mock the broadcast operator inside the server
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let broadcastOperator: jest.Mocked<BroadcastOperator<ActionsEventsMap, any>>;
    let server: Server;
    let socket: Socket;

    beforeEach(async () => {
        // Create stubbed instances for dependencies
        socket = createStubInstance(Socket);
        actionService = createStubInstance(ActionService);
        roomService = createStubInstance(RoomService);
        eventEmitter = createStubInstance(EventEmitter2);
        server = createStubInstance(Server);

        broadcastOperator = {
            emit: jest.fn(),
            // To provide the right definition for the BroadcastOperator
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as unknown as jest.Mocked<BroadcastOperator<ActionsEventsMap, any>>;

        server.to = jest.fn().mockReturnValue({
            ...broadcastOperator,
            except: jest.fn().mockReturnValue(broadcastOperator),
        });

        eventEmitter.emit = jest.fn();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionGateway,
                { provide: ActionService, useValue: actionService },
                { provide: RoomService, useValue: roomService },
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        gateway = module.get<ActionGateway>(ActionGateway);
        gateway['server'] = server; // Attach the mocked server
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers(); // Clear timers after each test
        jest.clearAllMocks();
    });

    describe('interactDoor', () => {
        it('should emit the changed tile to the game room', () => {
            const id = MOCK_ROOM_ID;
            // Mock methods
            roomService.getRoomIdAndRoom = jest.fn().mockReturnValue({ roomId: id, room: mockRoom1 });
            actionService.interactWithDoor = jest.fn().mockReturnValue(mockDoor);

            // Call the interactDoor method
            gateway.interactDoor(mockPosition, socket);

            // Check if the actionService's interactWithDoor was called
            expect(actionService.interactWithDoor).toHaveBeenCalledWith(mockRoom1, mockPosition);

            // Check if the server emitted the correct event
            expect(server.to).toHaveBeenCalledWith(id);
            expect(broadcastOperator.emit).toHaveBeenCalledWith(ActionsEvents.ChangedBoard, mockDoor);
        });
        it('should not emit the tile if the door is undefined', () => {
            const id = MOCK_ROOM_ID;
            // Mock methods
            roomService.getRoomIdAndRoom = jest.fn().mockReturnValue({ roomId: id, room: mockRoom1 });
            actionService.interactWithDoor = jest.fn().mockReturnValue(undefined);

            // Call the interactDoor method
            gateway.interactDoor(mockPosition, socket);

            // Check if the actionService's interactWithDoor was called
            expect(actionService.interactWithDoor).toHaveBeenCalledWith(mockRoom1, mockPosition);

            // Check if the server emitted the correct event
            expect(server.to).not.toHaveBeenCalledWith(id);
            expect(broadcastOperator.emit).not.toHaveBeenCalledWith(ActionsEvents.ChangedBoard, mockDoor);
        });
    });

    describe('requestCombat', () => {
        it('should emit the correct events upon combat request', () => {
            const combatantSocket = { id: 'combatantSocketId' } as Socket;
            const id = MOCK_ROOM_ID;
            // Mock methods
            roomService.getPlayerSocket = jest.fn().mockReturnValue(combatantSocket);
            roomService.getRoomIdByPlayer = jest.fn().mockReturnValue(id);

            // Enable fake timers
            jest.useFakeTimers();

            // Call the requestCombat method
            gateway.requestCombat({ attacker: player1, combatant: player2 }, socket);

            // Check if the HasBeenChallenged event was emitted
            expect(server.to).toHaveBeenCalledWith([socket.id, combatantSocket.id]);
            expect(broadcastOperator.emit).toHaveBeenCalledWith(ActionsEvents.HasBeenChallenged, {
                message: `Préparer vous à combattre: ${player1.name} vs ${player2.name}!`,
            });

            // Check if the OngoingCombat event was emitted to the rest of the room
            expect(server.to).toHaveBeenCalledWith(id);
            expect(broadcastOperator.emit).toHaveBeenCalledWith(ActionsEvents.OngoingCombat, {
                message: `${player1.name} a défié ${player2.name} à un duel!`,
            });

            jest.runAllTimers();
            // Check if the StartingCombat event was emitted
            expect(eventEmitter.emit).toHaveBeenCalledWith(ActionsEvents.StartingCombat, {
                roomId: id,
                data: { attacker: player1, combatant: player2 },
            });
            jest.useRealTimers();
        });
    });
});
