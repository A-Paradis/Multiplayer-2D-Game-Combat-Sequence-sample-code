import { CombatRoom, CombatState } from '@app/interfaces/combat.interface';
import { Room } from '@app/interfaces/room.interface';
import { CombatLogicService } from '@app/services/combat-logic/combat-logic.service';
import { TimerService } from '@app/services/timer/timer.service';
import { ATTRIBUTE_INIT_VALUE, MILLISECONDS_1000, MILLISECONDS_3000, MILLISECONDS_5000 } from '@common/constants';
import { Player } from '@common/interfaces/player.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CombatTurnService {
    constructor(
        private timeService: TimerService,
        private combatLogicService: CombatLogicService,
    ) {}

    /**
     * @brief startTurn sets the combat turn-to-turn time logic
     * @param timerId
     * @param duration
     * @param onTimeout
     * @param timerCallback
     */
    startTurn(
        combatRoom: CombatRoom,
        gameRoom: Room,
        timerCallback: (remainingTime: number) => void,
        activePlayerCallback: () => void,
        winnerCallback: () => void,
    ): void {
        combatRoom.state = CombatState.Active;
        const duration = this.getTurnDuration(combatRoom.activePlayer);

        activePlayerCallback();
        this.timeService.startTimer(combatRoom.timerId, duration, () => {
            this.attackTurn(combatRoom, gameRoom, winnerCallback);
        });

        const interval = setInterval(() => {
            const remainingTime = this.timeService.getRemainingTime(combatRoom.timerId);
            if (remainingTime > 0 && combatRoom.state === CombatState.Active) timerCallback(Math.ceil(remainingTime / MILLISECONDS_1000));
            else if (combatRoom.state === CombatState.EventDone || (remainingTime <= 0 && combatRoom.state === CombatState.Active)) {
                combatRoom.state = CombatState.Active;
                clearInterval(interval);
                this.startTurn(combatRoom, gameRoom, timerCallback, activePlayerCallback, winnerCallback);
            } else if (combatRoom.state === CombatState.Finished || combatRoom.state === CombatState.EventOngoing || CombatState.PlayerLeft) {
                clearInterval(interval);
            }
        }, MILLISECONDS_1000);
    }

    /**
     * @brief attack manages the synchronization of the timer and attack logic
     * @param combatRoom
     * @param gameRoom
     * @returns
     */
    attackTurn(combatRoom: CombatRoom, gameRoom: Room, winnerCallback: () => void): void {
        combatRoom.state = CombatState.EventOngoing;
        this.combatLogicService.attack(combatRoom, gameRoom); // Perform attack
        const isCombatOver = this.isCombatOver(combatRoom);
        if (isCombatOver) {
            combatRoom.state = CombatState.Finished;
            this.updateGameRoomAfterCombat(combatRoom, gameRoom);
            winnerCallback();
        } else {
            this.toggleActivePlayer(combatRoom); // Change the active player
            combatRoom.state = CombatState.EventDone;
        }
    }

    /**
     * @brief evadeTurn manages the synchronization of the timer and evasion logic
     * @param combatRoom
     * @param gameRoom
     * @param timerCallback
     * @return false if evasion unsuccessful else true
     */
    evadeTurn(combatRoom: CombatRoom, evasionCallback: () => void): void {
        combatRoom.state = CombatState.EventOngoing;
        const isEvasionSuccessful = this.combatLogicService.evade(combatRoom);
        if (isEvasionSuccessful) {
            combatRoom.state = CombatState.Finished;
            evasionCallback();
        } else {
            this.toggleActivePlayer(combatRoom);
            combatRoom.state = CombatState.EventDone;
        }
    }

    /**
     * @brief delete refreshes the timer
     * @param timerId
     */
    deleteTimer(timerId: string): void {
        this.timeService.deleteTimer(timerId);
    }

    /**
     * @brief Checks the health of the player to determine if there is a winner
     */
    private isCombatOver(combat: CombatRoom): boolean {
        if (combat.player1.player.health <= 0 && combat.player2.player.health > 0) {
            combat.player2.player.victories += 1;
            combat.winner = combat.player2.player;
            return true;
        } else if (combat.player1.player.health > 0 && combat.player2.player.health <= 0) {
            combat.player1.player.victories += 1;
            combat.winner = combat.player1.player;
            return true;
        }
        return false;
    }

    private updateGameRoomAfterCombat(combatRoom: CombatRoom, gameRoom: Room): void {
        const gamePlayer1 = gameRoom.players.find((p) => combatRoom.player1.player.name === p.player.name);
        const gamePlayer2 = gameRoom.players.find((p) => combatRoom.player2.player.name === p.player.name);

        if (gamePlayer1 && gamePlayer2) {
            // Reset player health
            gamePlayer1.player.health = ATTRIBUTE_INIT_VALUE;
            gamePlayer2.player.health = ATTRIBUTE_INIT_VALUE;

            // Set number of victories
            gamePlayer1.player.victories = combatRoom.player1.player.victories;
            gamePlayer2.player.victories = combatRoom.player2.player.victories;

            // Set number of evading attempts
            gamePlayer1.player.evadingAttempts = combatRoom.player1.player.evadingAttempts;
            gamePlayer2.player.evadingAttempts = combatRoom.player2.player.evadingAttempts;
        }
    }

    /**
     * @brief toggleActivePlayer changes the active player between the two combatants
     * @param combat
     */
    private toggleActivePlayer(combat: CombatRoom): void {
        if (combat.activePlayer === combat.player1.player) combat.activePlayer = combat.player2.player;
        else combat.activePlayer = combat.player1.player;
    }
    /**
     * @brief getTurnDuration determines the attack time depending on the player's number of evasion attempts
     * @param combatRoom
     * @returns 5000 milliseconds if the player as a positive amount of evasion, else 3000 milliseconds
     */
    private getTurnDuration(player: Player): number {
        return player.evadingAttempts > 0 ? MILLISECONDS_5000 : MILLISECONDS_3000;
    }
}
