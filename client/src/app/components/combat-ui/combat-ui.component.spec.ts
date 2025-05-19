import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { SocketTestHelper } from '@app/classes/socket-test-helper';
import { CombatUiComponent } from '@app/components/combat-ui/combat-ui.component';
import { CombatSocketService } from '@app/services/combat-action/combat.socket.service';
import { mockPlayer2 } from '@app/services/combat-action/combat.socket.service.spec';
import { SocketClientService } from '@app/services/socket/socket-client.service';
import { MILLISECONDS_3000 } from '@common/constants';
import { Attribute, Dice, Player } from '@common/interfaces/player.interface';
import { CharacterIcons } from '@common/utils/character-icons';
import { of } from 'rxjs';
import { Socket } from 'socket.io-client';

const mockPlayer1: Player = {
    name: 'Player 1',
    isOrganizer: false,
    avatar: CharacterIcons.Character2,
    health: 4,
    victories: 0,
    bonus: Attribute.Speed,
    attackDice: Dice.D6,
    defenseDice: Dice.D4,
};

describe('CombatUiComponent', () => {
    let component: CombatUiComponent;
    let fixture: ComponentFixture<CombatUiComponent>;
    let combatSocketServiceMock: jasmine.SpyObj<CombatSocketService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<CombatUiComponent>>;

    const socketTestHelper = new SocketTestHelper();
    const socketClientService = new SocketClientService();
    socketClientService.socket = socketTestHelper as unknown as Socket;

    beforeEach(async () => {
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);
        combatSocketServiceMock = jasmine.createSpyObj('CombatSocketService', [
            'onFirstPlayer',
            'onTimerUpdate',
            'onActivePlayerUpdate',
            'onCombatEnd',
            'onSuccessfulEvasion',
            'attack',
            'evade',
        ]);

        // Mocking observables for the CombatSocketService methods
        combatSocketServiceMock.attack.and.returnValue();
        combatSocketServiceMock.evade.and.returnValue();
        combatSocketServiceMock.onFirstPlayer.and.returnValue(of({ firstPlayer: mockPlayer1, message: 'First player' }));
        combatSocketServiceMock.onTimerUpdate.and.returnValue(of(MILLISECONDS_3000));
        combatSocketServiceMock.onActivePlayerUpdate.and.returnValue(of(mockPlayer1));
        combatSocketServiceMock.onCombatEnd.and.returnValue(of({ message: 'Combat Ended', player: mockPlayer1 }));
        combatSocketServiceMock.onSuccessfulEvasion.and.returnValue(of({ message: 'Evasion Successful', player: mockPlayer1 }));

        await TestBed.configureTestingModule({
            imports: [CombatUiComponent],
            providers: [
                { provide: CombatSocketService, useValue: combatSocketServiceMock },
                { provide: SocketClientService, useValue: socketClientService },
                { provide: MatDialogRef, useValue: dialogRefMock },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CombatUiComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should unsubscribe on ngOnDestroy', () => {
        spyOn(component['subscription'], 'unsubscribe');
        component.ngOnDestroy();
        expect(component['subscription'].unsubscribe).toHaveBeenCalled();
    });

    it('should call attack on combatSocketService when onAttack is triggered', () => {
        component.onAttack();
        expect(combatSocketServiceMock.attack).toHaveBeenCalled();
    });

    it('should call evade on combatSocketService when onEscape is triggered', () => {
        component.onEscape();
        expect(combatSocketServiceMock.evade).toHaveBeenCalled();
    });

    it('should update activePlayer and activeMessage, and call toggleButtonState when onFirstPlayer emits', fakeAsync(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spyToggleButtonState = spyOn(component as any, 'toggleButtonState');

        // Trigger ngOnInit to subscribe to the observables
        component.ngOnInit();

        // Simulate the emission of the observable by calling the subscription manually
        combatSocketServiceMock.onFirstPlayer().subscribe(({ firstPlayer, message }) => {
            component.activeMessage = message;
            component.activePlayer = firstPlayer;
            component['toggleButtonState']();
        });

        tick(MILLISECONDS_3000);

        fixture.detectChanges();

        // Check that the values are updated correctly
        expect(component.activeMessage).toBe('First player');
        expect(component.activePlayer?.name).toBe('Player 1');

        // Check if the toggleButtonState method was called
        expect(spyToggleButtonState).toHaveBeenCalled();
    }));

    it('should handle combat end and close dialog', fakeAsync(() => {
        component['subscription'].add(
            combatSocketServiceMock.onCombatEnd().subscribe(({ message, player }) => {
                component.activeMessage = message;
                component.dialogRef.close(player); // Close the dialog with the player
            }),
        );

        tick(MILLISECONDS_3000);

        fixture.detectChanges();

        expect(component.activeMessage).toEqual('Combat Ended');
        expect(dialogRefMock.close).toHaveBeenCalledWith(mockPlayer1);
    }));

    it('should handle successful evasion and close dialog', () => {
        component['subscription'].add(
            combatSocketServiceMock.onSuccessfulEvasion().subscribe(({ message, player }) => {
                component.activeMessage = message;
                component.dialogRef.close(player);
            }),
        );

        fixture.detectChanges();

        expect(component.activeMessage).toEqual('Evasion Successful');
        expect(dialogRefMock.close).toHaveBeenCalledWith(mockPlayer1);
    });

    it('should toggleButtonState to false if activePlayer is currentPlayer', () => {
        component.activePlayer = mockPlayer1;
        component.myPlayer = mockPlayer1;

        component['toggleButtonState']();

        expect(component.isDisabled).toBe(false);
    });
    it('should toggleButtonState to true if activePlayer is not currentPlayer', () => {
        component.activePlayer = mockPlayer1;
        component.myPlayer = mockPlayer2;

        component['toggleButtonState']();

        expect(component.isDisabled).toBe(true);
    });
});
