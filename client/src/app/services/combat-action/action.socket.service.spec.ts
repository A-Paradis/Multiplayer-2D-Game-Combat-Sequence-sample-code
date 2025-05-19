import { TestBed } from '@angular/core/testing';
import { SocketTestHelper } from '@app/classes/socket-test-helper';
import { ActionSocketService } from '@app/services/combat-action/action.socket.service';
import { SocketClientService } from '@app/services/socket/socket-client.service';
import { Attribute, Dice, Player } from '@common/interfaces/player.interface';
import { Tile, TileType } from '@common/interfaces/tile.interface';
import { Vec2 } from '@common/interfaces/vec2.interface';
import { ActionsEvents } from '@common/socket-events/combat-action.event';
import { CharacterIcons } from '@common/utils/character-icons';
import { of } from 'rxjs';
import { Socket } from 'socket.io-client';

export const mockPlayer1: Player = {
    name: 'Player 1',
    isOrganizer: false,
    avatar: CharacterIcons.Character2,
    health: 4,
    victories: 0,
    bonus: Attribute.Speed,
    attackDice: Dice.D6,
    defenseDice: Dice.D4,
};
export const mockPlayer2: Player = {
    name: 'Player 2',
    isOrganizer: false,
    avatar: CharacterIcons.Character1,
    health: 4,
    victories: 0,
    bonus: Attribute.Attack,
    attackDice: Dice.D4,
    defenseDice: Dice.D6,
};

export const mockPosition: Vec2 = { x: 3, y: 2 };
export const mockTile: Tile = { id: TileType.Dirt, position: mockPosition, itemId: null, player: null };

describe('ActionSocketService', () => {
    let service: ActionSocketService;
    let socketClientService: SocketClientService;
    let socketTestHelper: SocketTestHelper;

    beforeEach(() => {
        socketTestHelper = new SocketTestHelper();
        socketClientService = new SocketClientService();
        socketClientService.socket = socketTestHelper as unknown as Socket;

        TestBed.configureTestingModule({
            providers: [ActionSocketService, { provide: SocketClientService, useValue: socketClientService }],
        });

        service = TestBed.inject(ActionSocketService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    // SENDING
    it('should call socketClientService.send when interactDoor is called if socket is alive', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(true);
        const position = { x: 1, y: 2 };
        const sendSpy = spyOn(socketClientService, 'send');

        service.interactDoor(position);

        expect(sendSpy).toHaveBeenCalledWith(ActionsEvents.InteractDoor, position);
    });
    it('should not call socketClientService.send when interactDoor is called if socket is not alive', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(false);
        const position = { x: 5, y: 3 };
        const sendSpy = spyOn(socketClientService, 'send');

        service.interactDoor(position);

        expect(sendSpy).not.toHaveBeenCalledWith(ActionsEvents.InteractDoor, position);
    });

    it('should call socketClientService.send with the correct data when requestCombat is called with an inactive socket', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(true);
        const attacker = mockPlayer1;
        const combatant = mockPlayer2;
        const sendSpy = spyOn(socketClientService, 'send');

        service.requestCombat(attacker, combatant);

        expect(sendSpy).toHaveBeenCalledWith(ActionsEvents.RequestCombat, { attacker, combatant });
    });

    it('should not call socketClientService.send with the correct data when requestCombat is called with an inactive socket', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(false);
        const attacker = mockPlayer1;
        const combatant = mockPlayer2;
        const sendSpy = spyOn(socketClientService, 'send');

        service.requestCombat(attacker, combatant);

        expect(sendSpy).not.toHaveBeenCalledWith(ActionsEvents.RequestCombat, { attacker, combatant });
    });

    // RECEPTION
    it('should receive the door state change', (done) => {
        // Mock the onObservable method to return an observable that emits a Tile object
        const tile = mockTile;
        spyOn(socketClientService, 'onObservable').and.returnValue(of(mockTile));

        // Subscribe to the observable and check if the data is received correctly
        service.onChangeDoorState().subscribe((t) => {
            expect(t).toEqual(tile); // Check if the received tile matches the mock
            done(); // Signal that the async test is complete
        });
    });
    it('should receive the challenged message', (done) => {
        const combatMessage = { message: 'Player blabla challenged player blabla' };
        spyOn(socketClientService, 'onObservable').and.returnValue(of(combatMessage));
        service.onHasBeenChallenged().subscribe((message) => {
            expect(message).toEqual(combatMessage);
            done();
        });
    });
    it('should receive the ongoingCombat message', (done) => {
        const combatMessage = { message: 'Combat has started with bla and blabla' };
        spyOn(socketClientService, 'onObservable').and.returnValues(of(combatMessage));
        service.onOngoingCombat().subscribe((message) => {
            expect(message).toEqual(combatMessage);
            done();
        });
    });
    it('should call socketService.send when socket is alive', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(true);
        const spy = spyOn(socketClientService, 'send');
        service['sendAction'](ActionsEvents.InteractDoor, mockPosition);
        expect(spy).toHaveBeenCalledWith(ActionsEvents.InteractDoor, mockPosition);
    });

    it('should not call socketService.send when socket is not alive', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(false);
        const spy = spyOn(socketClientService, 'send');
        service['sendAction'](ActionsEvents.InteractDoor, mockPosition); // Access private method directly for testing
        expect(spy).not.toHaveBeenCalled();
    });
});
