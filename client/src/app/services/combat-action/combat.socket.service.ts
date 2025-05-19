import { Injectable } from '@angular/core';
import { SocketClientService } from '@app/services/socket/socket-client.service';
import { Player } from '@common/interfaces/player.interface';
import { CombatEvents } from '@common/socket-events/combat-action.event';
import { TimerEvents } from '@common/socket-events/timer.events';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class CombatSocketService {
    constructor(private socketService: SocketClientService) {
        if (!this.socketService.isSocketAlive()) this.socketService.connect();
    }

    /** SENDING */
    /**
     * @brief Allows player to attack another the other combatant
     */
    attack(): void {
        if (this.socketService.isSocketAlive()) this.socketService.send(CombatEvents.Attack);
    }

    /**
     * @brief Allows the player to evade the other combatant
     */
    evade(): void {
        if (this.socketService.isSocketAlive()) this.socketService.send(CombatEvents.Evade);
    }

    /** RECEPTION */
    /**
     * @brief onFirstPlayer notifies the combatants who is the first player on combat initialization
     * @returns An observable containing the first player and a message
     */
    onFirstPlayer(): Observable<{ firstPlayer: Player; message: string }> {
        return this.socketService.onObservable<{ firstPlayer: Player; message: string }>(CombatEvents.FirstPlayer);
    }
    /**
     * onTimerUpdate sends the remaining time of a combat turn
     * @returns time in seconds (number)
     */
    onTimerUpdate(): Observable<number> {
        return this.socketService.onObservable<number>(TimerEvents.TimerUpdate);
    }
    /**
     * @brief onActivePlayerUpdate notifies the combatants of who's turn it is
     * @returns An observable of the new active player
     */
    onActivePlayerUpdate(): Observable<Player> {
        return this.socketService.onObservable<Player>(CombatEvents.ActivePlayer);
    }
    /**
     * @brief onCombatEnd notifies the combatants who won and who did not and sends
     * an updated copy of the player
     * @returns message and the winning player
     */
    onCombatEnd(): Observable<{ message: string; player: Player }> {
        return this.socketService.onObservable<{ message: string; player: Player }>(CombatEvents.Finished);
    }
    /**
     * @brief onSuccessfulEvasion notifies the combatant that the combat is over upon evasion
     * @returns return the an updated copy of the player
     */
    onSuccessfulEvasion(): Observable<{ message: string; player: Player }> {
        return this.socketService.onObservable<{ message: string; player: Player }>(CombatEvents.EvasionSuccessful);
    }
}
