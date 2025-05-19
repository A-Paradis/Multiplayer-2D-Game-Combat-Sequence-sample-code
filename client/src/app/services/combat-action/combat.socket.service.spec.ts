import { TestBed } from '@angular/core/testing';
import { SocketTestHelper } from '@app/classes/socket-test-helper';
import { CombatSocketService } from '@app/services/combat-action/combat.socket.service';
import { SocketClientService } from '@app/services/socket/socket-client.service';
import { MILLISECONDS_3000 } from '@common/constants';
import { Attribute, Dice, Player } from '@common/interfaces/player.interface';
import { Tile, TileType } from '@common/interfaces/tile.interface';
import { Vec2 } from '@common/interfaces/vec2.interface';
import { CombatEvents } from '@common/socket-events/combat-action.event';
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

describe('CombatSocketService', () => {
    let service: CombatSocketService;
    let socketClientService: SocketClientService;
    let socketTestHelper: SocketTestHelper;

    beforeEach(() => {
        socketTestHelper = new SocketTestHelper();
        socketClientService = new SocketClientService();
        socketClientService.socket = socketTestHelper as unknown as Socket;

        TestBed.configureTestingModule({
            providers: [CombatSocketService, { provide: SocketClientService, useValue: socketClientService }],
        });

        service = TestBed.inject(CombatSocketService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    // SENDING
    it('should call socketService if attack is called and socket is alive', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(true);
        const sendSpy = spyOn(socketClientService, 'send');

        service.attack();

        expect(sendSpy).toHaveBeenCalledWith(CombatEvents.Attack);
    });
    it('should call socketService if attack is called and socket is not alive', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(false);
        const sendSpy = spyOn(socketClientService, 'send');

        service.attack();

        expect(sendSpy).not.toHaveBeenCalledWith(CombatEvents.Attack);
    });
    it('should call socketService if attack is called and socket is alive', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(true);
        const sendSpy = spyOn(socketClientService, 'send');

        service.evade();

        expect(sendSpy).toHaveBeenCalledWith(CombatEvents.Evade);
    });
    it('should call socketService if attack is called and socket is not alive', () => {
        spyOn(socketClientService, 'isSocketAlive').and.returnValue(false);
        const sendSpy = spyOn(socketClientService, 'send');

        service.evade();

        expect(sendSpy).not.toHaveBeenCalledWith(CombatEvents.Evade);
    });

    // RECEPTION
    it('should receive the first player and a message upon CombatEvent.FirstPlayer', (done) => {
        const object = { firstPlayer: mockPlayer1, message: 'Allo' };
        spyOn(socketClientService, 'onObservable').and.returnValue(of(object));

        service.onFirstPlayer().subscribe((o) => {
            expect(o).toEqual(object);
            done();
        });
    });
    it('should receive the updated time from the server', (done) => {
        const time = MILLISECONDS_3000;
        spyOn(socketClientService, 'onObservable').and.returnValue(of(time));

        service.onTimerUpdate().subscribe((o) => {
            expect(o).toEqual(time);
            done();
        });
    });
    it('should the new active player', (done) => {
        const player = mockPlayer1;
        spyOn(socketClientService, 'onObservable').and.returnValue(of(player));

        service.onActivePlayerUpdate().subscribe((o) => {
            expect(o).toEqual(player);
            done();
        });
    });
    it('should receive a message that says the combat is over and the updated player', (done) => {
        const data = { message: 'It is over my friend', player: mockPlayer1 };
        spyOn(socketClientService, 'onObservable').and.returnValue(of(data));

        service.onCombatEnd().subscribe((o) => {
            expect(o).toEqual(data);
            done();
        });
    });
    it('should receive a message that says the evasion was successful and the updated player', (done) => {
        const data = { message: 'Player evaded', player: mockPlayer1 };
        spyOn(socketClientService, 'onObservable').and.returnValue(of(data));

        service.onSuccessfulEvasion().subscribe((o) => {
            expect(o).toEqual(data);
            done();
        });
    });
});
