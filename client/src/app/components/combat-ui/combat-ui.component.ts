import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CombatSocketService } from '@app/services/combat-action/combat.socket.service';
import { GameService } from '@app/services/game/game.service';
import { MILLISECONDS_3000 } from '@common/constants';
import { Player } from '@common/interfaces/player.interface';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-combat-ui',
    imports: [CommonModule],
    templateUrl: './combat-ui.component.html',
    styleUrls: ['./combat-ui.component.scss'],
})
export class CombatUiComponent implements OnInit, OnDestroy {
    isDisabled: boolean = false;
    myPlayer: Player;
    activeMessage: string;
    activePlayer: Player | undefined;
    timer: number | undefined;
    private subscription = new Subscription();

    constructor(
        public dialogRef: MatDialogRef<CombatUiComponent>,
        private combatSocketService: CombatSocketService,
        private gameService: GameService,
    ) {}

    ngOnInit(): void {
        this.initCombatSubscription();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    onAttack(): void {
        this.isDisabled = true;
        this.combatSocketService.attack();
    }

    onEscape(): void {
        this.isDisabled = true;
        this.combatSocketService.evade();
    }

    private initCombatSubscription(): void {
        this.subscription.add(
            this.gameService.myPlayer$.subscribe((player) => {
                this.myPlayer = player;
            }),
        );
        // Subscribe to first player
        this.subscription.add(
            this.combatSocketService.onFirstPlayer().subscribe(({ firstPlayer, message }) => {
                this.activeMessage = message;
                this.activePlayer = firstPlayer;
                this.toggleButtonState();
            }),
        );
        // Subscribe the current turn time
        this.subscription.add(
            this.combatSocketService.onTimerUpdate().subscribe((remainingTime) => {
                this.timer = remainingTime;
            }),
        );
        // Subscribe to the changing active player
        this.subscription.add(
            this.combatSocketService.onActivePlayerUpdate().subscribe((player) => {
                this.activePlayer = player;
                this.activeMessage = `${this.activePlayer.name} est en train de jouer`;
                this.toggleButtonState();
            }),
        );

        // Subscribe to combatEnd observable
        this.subscription.add(
            this.combatSocketService.onCombatEnd().subscribe(({ message, player }) => {
                this.activeMessage = message;
                setTimeout(() => {
                    this.dialogRef.close(player);
                }, MILLISECONDS_3000);
            }),
        );

        // Subscribe to the successful evasion observable
        this.subscription.add(
            this.combatSocketService.onSuccessfulEvasion().subscribe(({ message, player }) => {
                this.activeMessage = message;
                setTimeout(() => {
                    this.dialogRef.close(player);
                }, MILLISECONDS_3000);
            }),
        );
    }

    /**
     * @brief Toggles button activation if the active player is the current client, else blocked
     * @param myPlayer
     */
    private toggleButtonState(): void {
        if (this.activePlayer?.name === this.myPlayer.name) {
            this.isDisabled = false;
        } else this.isDisabled = true;
    }
}
