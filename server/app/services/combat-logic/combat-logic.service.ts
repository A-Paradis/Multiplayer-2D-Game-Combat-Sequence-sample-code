/* eslint-disable no-console */
import { CombatRoom } from '@app/interfaces/combat.interface';
import { Room } from '@app/interfaces/room.interface';
import { BoardService } from '@app/services/board/board.service';
import { ATTRIBUTE_INIT_VALUE, BONUS, EVASION_FAILURE_PROBABILITY } from '@common/constants';
import { Dice, Player } from '@common/interfaces/player.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CombatLogicService {
    constructor(private readonly boardService: BoardService) {}

    /**
     * @brief Active player attacks passive player
     */
    attack(combat: CombatRoom, game: Room): void {
        const passivePlayer = this.getPassivePlayer(combat);

        const attackPoints = ATTRIBUTE_INIT_VALUE + this.rollDice(combat.activePlayer.attackDice);
        const defensePoints = ATTRIBUTE_INIT_VALUE + this.rollDice(passivePlayer.defenseDice);

        // Adjust points if players are on slime
        const attackPenalty = this.boardService.isPlayerPositionSlime(game, combat.activePlayer) ? BONUS : 0;
        const defensePenalty = this.boardService.isPlayerPositionSlime(game, passivePlayer) ? BONUS : 0;

        const totalPoints = attackPoints - attackPenalty - defensePoints + defensePenalty;

        if (totalPoints > 0) passivePlayer.health -= totalPoints;
    }

    /**
     * @brief If the current player can evade and is successful, players gain back
     * their health, the active player has one less evading attempt and the battle is over
     * @param combat
     * @returns true if evasion was successful, else false
     */
    evade(combat: CombatRoom): boolean {
        const canEvade = combat.activePlayer.evadingAttempts > 0 ? true : false;
        const successfulEvasion = Math.random() <= EVASION_FAILURE_PROBABILITY ? true : false;
        if (canEvade && successfulEvasion) {
            combat.player1.player.health = ATTRIBUTE_INIT_VALUE;
            combat.player2.player.health = ATTRIBUTE_INIT_VALUE;
            combat.activePlayer.evadingAttempts -= 1;
            return true;
        }
        return false;
    }

    /**
     * @brief rollDice simulates a dice roll
     * @param dice
     * @returns number in the interval of the dice faces
     */
    private rollDice(dice: Dice): number {
        return Math.floor(Math.random() * dice) + 1;
    }

    /**
     * @brief Determines the player that is not currently playing
     * @return Player
     */
    private getPassivePlayer(combat: CombatRoom): Player {
        if (combat.activePlayer === combat.player1.player) return combat.player2.player;
        else return combat.player1.player;
    }
}
