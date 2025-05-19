/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable max-params */
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseBoardComponent } from '@app/components/base-board/base-board.component';
import { ChatZoneComponent } from '@app/components/chat-zone/chat-zone.component';
import { CombatUiComponent } from '@app/components/combat-ui/combat-ui.component';
import { FeedbackDialogComponent } from '@app/components/feedback-dialog/feedback-dialog.component';
import { TimerComponent } from '@app/components/game/timer/timer.component';
import { BoardGameService } from '@app/services/board_service/board-game.service';
import { ActionSocketService } from '@app/services/combat-action/action.socket.service';
import { CombatSocketService } from '@app/services/combat-action/combat.socket.service';
import { GameSocketService } from '@app/services/game/game-socket.service';
import { GameTimerService } from '@app/services/game/game-timer/game-timer.service';
import { GameService } from '@app/services/game/game.service';
import { TurnService } from '@app/services/game/turn.service';
import { PlayerService } from '@app/services/player/player.service';
import { DEFAULT_MOVES_NUMBER } from '@app/utils/attribut-constants';
import { BoardSize, MILLISECONDS_3000 } from '@common/constants';
import { Attribute, Player } from '@common/interfaces/player.interface';
import { Tile } from '@common/interfaces/tile.interface';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-view',
    standalone: true,
    imports: [CommonModule, ChatZoneComponent, BaseBoardComponent, TimerComponent],
    templateUrl: './game-view.component.html',
    styleUrls: ['./game-view.component.scss'],
})
export class GameViewComponent implements OnInit, OnDestroy {
    /**
     * TODO: change totalDice and totalLife intialization witht he right constant, create it in common if necessary
     */
    totalDice: number = DEFAULT_MOVES_NUMBER;
    totalLife: number = DEFAULT_MOVES_NUMBER;
    totalMoves: number = DEFAULT_MOVES_NUMBER;

    protected board: Tile[];
    private gameService: GameService = inject(GameService);
    private boardGameService: BoardGameService = inject(BoardGameService);
    private actionSocketService: ActionSocketService = inject(ActionSocketService);
    private subscription: Subscription = new Subscription();

    gameCode: string = '';
    currentPlayer: string = '';
    myPlayer: Player;
    players: Player[] = [];
    isMyTurn: boolean = false;

    message: string = '';
    boardSize: BoardSize = BoardSize.Small;
    actions: number = 0;
    moves: number;
    isActionClicked: boolean = false;

    isBonusLife: boolean;

    /**
     * fetches game access code, sets game service myPlayer property for each client
     */
    constructor(
        private dialog: MatDialog,
        private router: Router,
        private gameTimerService: GameTimerService,
        private turnService: TurnService,
        private gameSocketService: GameSocketService,
        private route: ActivatedRoute,
        private playerService: PlayerService,
        private combatSocketService: CombatSocketService,
    ) {
        this.route.paramMap.subscribe((params) => {
            const accessCode = params.get('accessCode');
            if (accessCode) {
                this.gameCode = accessCode;
                this.gameService.updateGameCode(accessCode);
            }
        });

        this.myPlayer = this.playerService.getMyPlayer();
        this.gameService.updateMyPlayer(this.myPlayer);

        if (this.myPlayer.bonus === Attribute.Life) this.isBonusLife = true;
    }
    /**
     * getter to see if there is any actions left
     */
    get hasActionsLeft() {
        return this.actions > 0;
    }

    /**
     * - Initialize subscriptions from various services
     * - Retrieve game information from the server to set the UI
     * - send the Start game event to server
     */
    ngOnInit() {
        this.accessCodeSubscription();
        this.initGameTurnSubscription();
        this.initActionSubscription();
        this.initGameServiceSubscription();
        this.endActionSubscription();

        this.gameSocketService.getGameInfo(this.gameCode);
        this.gameSocketService.onGetGameInfo((players, maxPlayers, board, boardSize) => {
            this.players = players;
            this.board = board;
            this.boardSize = boardSize;
        });

        // Start the game
        this.turnService.initialize(this.gameCode, this.myPlayer);
        this.gameSocketService.startGame(this.gameCode);
    }

    /**
     * unsubscribes from all subscriptions
     */
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    /**
     * method called when player click on quit button (called in the template)
     */
    confirmExit() {
        const dialogRef = this.dialog.open(FeedbackDialogComponent, {
            data: {
                title: 'Confirmation',
                message: 'Êtes-vous sûr de vouloir quitter le jeu?',
            },
        });

        dialogRef.afterClosed().subscribe(() => {
            this.gameSocketService.playerQuit(this.gameCode, this.myPlayer.name);
            this.router.navigate(['/home']);
        });
    }

    /**
     * method called when combat starts
     */
    openCombatUiDialog() {
        const dialogRef = this.dialog.open(CombatUiComponent, {
            width: '50vw',
            height: '60vh',
            maxWidth: 'none',
            disableClose: true,
        });

        dialogRef.afterClosed().subscribe((updatedPlayer) => {
            // SAVE NEW COPY OF PLAYER IN PLAYER LIST
            const playerIndex = this.players.findIndex((p) => p.name === updatedPlayer.name);
            if (playerIndex >= 0) {
                this.players[playerIndex] = { ...this.players[playerIndex], ...updatedPlayer };
            }
            this.gameService.updateIsActionClicked(false);
            this.gameService.updateIsCombatPlayerClicked(false);
            this.decrementAction();
        });
    }

    private accessCodeSubscription(): void {
        this.route.paramMap.subscribe((params) => {
            const accessCode = params.get('accessCode');
            if (accessCode) {
                this.gameCode = accessCode;
            }
        });
    }
    private initGameTurnSubscription(): void {
        this.subscription.add(this.turnService.message$.subscribe((msg) => (this.message = msg)));
        this.subscription.add(this.turnService.isMyTurn$.subscribe((isMyTurn) => (this.isMyTurn = isMyTurn)));
        this.subscription.add(this.turnService.currentPlayer$.subscribe((currentPlayer) => (this.currentPlayer = currentPlayer)));
    }
    private initGameServiceSubscription() {
        this.subscription.add(
            this.gameService.isActionClicked$.subscribe((isCombat) => {
                this.isActionClicked = isCombat;
            }),
        );
        this.subscription.add(
            this.gameService.isCombatPlayerClicked$.subscribe((isPlayerClicked) => {
                if (isPlayerClicked) this.startCombat();
            }),
        );
        this.subscription.add(
            this.gameService.actions$.subscribe((actionNum) => {
                this.actions = actionNum;
            }),
        );
        this.subscription.add(
            this.gameService.isDoorAction$.subscribe((isDoorClicked) => {
                if (isDoorClicked) this.interactDoor();
            }),
        );
    }

    /**
     * @brief initActionSubscription initializes observation of action events responses
     */
    private initActionSubscription(): void {
        this.subscription.add(
            this.actionSocketService.onChangeDoorState().subscribe((tile) => {
                this.gameService.updateTileInBoard(tile);
            }),
        );
        this.subscription.add(
            this.actionSocketService.onHasBeenChallenged().subscribe((data) => {
                this.gameTimerService.pauseTimer(this.gameCode);
                this.message = data.message;
                setTimeout(() => {
                    this.openCombatUiDialog();
                }, MILLISECONDS_3000);
            }),
        );
        this.subscription.add(
            this.actionSocketService.onOngoingCombat().subscribe((data) => {
                this.gameTimerService.pauseTimer(this.gameCode);
                this.message = data.message;
            }),
        );
    }

    private endActionSubscription(): void {
        this.subscription.add(
            this.combatSocketService.onCombatEnd().subscribe(() => {
                this.gameTimerService.resumeTimer(this.gameCode);
            }),
        );

        this.subscription.add(
            this.combatSocketService.onSuccessfulEvasion().subscribe(() => {
                this.gameTimerService.resumeTimer(this.gameCode);
            }),
        );
    }

    private decrementAction() {
        this.gameService.decrementActions();
    }

    protected interactDoor(): void {
        const doorPosition = this.boardGameService.checkIfAdjacent();
        if (this.hasActionsLeft && doorPosition && this.isActionClicked) {
            this.actionSocketService.interactDoor(doorPosition);
            this.decrementAction();
        }
    }

    protected onAction(): void {
        this.gameService.updateIsActionClicked(true);
    }
    private startCombat() {
        const adjacentPlayer = this.boardGameService.checkIfCombatPossible();
        if (this.hasActionsLeft && adjacentPlayer && this.isActionClicked) {
            this.actionSocketService.requestCombat(this.myPlayer, adjacentPlayer);
            this.decrementAction();
        }
    }

    protected finishTurnEarly() {
        this.gameSocketService.turnOver(this.gameCode);
        this.gameTimerService.stopTimer(this.gameCode);
    }
}
