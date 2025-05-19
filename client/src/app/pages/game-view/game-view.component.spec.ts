import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseBoardComponent } from '@app/components/base-board/base-board.component';
import { ChatZoneComponent } from '@app/components/chat-zone/chat-zone.component';
import { CharacterService } from '@app/services/game-creation/character.service';
import { GameSocketService } from '@app/services/game/game-socket.service';
import { TurnService } from '@app/services/game/turn.service';
import { Attribute, Dice, DiceType, Player } from '@common/interfaces/player.interface';
import { CharacterIcons } from '@common/utils/character-icons';
import { of, Subscription } from 'rxjs';
import { GameViewComponent } from './game-view.component';

export const player1: Player = {
    name: 'Player 1',
    isOrganizer: false,
    avatar: CharacterIcons.Character2,
    health: 4,
    victories: 0,
    bonus: Attribute.Speed,
    attackDice: Dice.D6,
    defenseDice: Dice.D4,
};

describe('GameViewComponent', () => {
    let component: GameViewComponent;
    let fixture: ComponentFixture<GameViewComponent>;
    // To mock the activated Route
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let characterServiceStub: CharacterService;
    let dialogStub: MatDialog;
    let routerStub: Router;
    let mockGameInfo: GameSocketService;
    let mockTurnService: TurnService;
    let subscriptions: Subscription;

    beforeEach(async () => {
        // Create spies for CharacterService methods
        characterServiceStub = jasmine.createSpyObj<CharacterService>('CharacterService', {
            getCharacterName: 'TestName',
            getCharacterAvatar: CharacterIcons.Character1,
            getAttackDice: DiceType.D6Attack,
            getDefenseDice: DiceType.D4Defense,
        });

        subscriptions = jasmine.createSpyObj('Subscription', ['add']);
        mockGameInfo = jasmine.createSpyObj<GameSocketService>('GameSocketService', ['onGetGameInfo', 'getGameInfo', 'startGame']);
        mockTurnService = jasmine.createSpyObj<TurnService>('TurnService', ['initialize']);

        // Create a mock MatDialogRef object
        const dialogRefStub = jasmine.createSpyObj<MatDialogRef<unknown>>('MatDialogRef', {
            afterClosed: of(true), // Simulate dialog closing with a result
        });

        // Create a spy for MatDialog's open method
        dialogStub = jasmine.createSpyObj<MatDialog>('MatDialog', {
            open: dialogRefStub, // Return the mock MatDialogRef
        });

        // Create spies for Router methods
        routerStub = jasmine.createSpyObj<Router>('Router', {
            navigate: undefined,
        });

        await TestBed.configureTestingModule({
            imports: [GameViewComponent, BaseBoardComponent, ChatZoneComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: CharacterService, useValue: characterServiceStub },
                { provide: MatDialog, useValue: dialogStub },
                { provide: Router, useValue: routerStub },
                { provide: GameSocketService, useValue: mockGameInfo },
                { provide: TurnService, useValue: mockTurnService },
                { provide: Subscription, useValue: subscriptions },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of({
                            get: () => '123', // Mock the get method to return a specific value
                        }),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameViewComponent);
        component = fixture.componentInstance;
        component.players = [player1];
        component.myPlayer = player1;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    /**
     * TODO: uncomment and correct tests
     */

    // it('should load character data on initialization', fakeAsync(() => {
    //     component.ngOnInit();
    //     tick();
    //     expect(component.name).toBe('TestName');
    //     expect(component.avatar).toBe('avatar.png');
    //     expect(component.attackDice).toBe(DiceType.D6Attack);
    //     expect(component.defenseDice).toBe(DiceType.D4Defense);
    //     expect(component.totalLife).toBe(DEFAULT_MOVES_NUMBER);
    //     expect(component.totalMoves).toBe(DEFAULT_MOVES_NUMBER);
    // }));

    // it('should navigate to /home on confirmExit if confirmed', fakeAsync(() => {
    //     component.confirmExit();
    //     tick();
    //     expect(dialogStub.open).toHaveBeenCalledWith(FeedbackDialogComponent, jasmine.any(Object));
    //     expect(routerStub.navigate).toHaveBeenCalledWith(['/home']);
    // }));

    // it('should open combat UI dialog when openCombatUiDialog is called', fakeAsync(() => {
    //     spyOn(console, 'log');
    //     component.openCombatUiDialog();
    //     tick();
    //     expect(dialogStub.open).toHaveBeenCalledWith(
    //         CombatUiComponent,
    //         jasmine.objectContaining({
    //             width: '50vw',
    //             height: '60vh',
    //             maxWidth: 'none',
    //             disableClose: true,
    //         }),
    //     );
    // }));
});
