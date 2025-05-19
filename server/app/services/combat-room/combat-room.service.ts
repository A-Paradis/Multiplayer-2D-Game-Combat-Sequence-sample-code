import { CombatRoom, CombatState } from '@app/interfaces/combat.interface';
import { ConnectedPlayer } from '@app/interfaces/connected-players.interface';
import { ATTRIBUTE_INIT_VALUE, BONUS, EVASION_ATTEMPTS } from '@common/constants';
import { Attribute, Player } from '@common/interfaces/player.interface';
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { v4 as uuid4 } from 'uuid';

@Injectable()
export class CombatRoomService {
    private combatRooms: Map<string, CombatRoom> = new Map();

    /**
     * @brief creates a combat room with two players and their sockets
     * @param attacker
     * @param combatant
     * @returns
     */
    createCombatRoom(attacker: ConnectedPlayer, combatant: ConnectedPlayer): { combatRoomId: string; combatRoom: CombatRoom } {
        const combatRoomId = uuid4();
        const timer = uuid4();

        this.initializePlayer(attacker);
        this.initializePlayer(combatant);
        const firstPlayer = this.getCombatFirstPlayer(attacker.player, combatant.player);

        const combatRoom: CombatRoom = {
            player1: attacker,
            player2: combatant,
            activePlayer: firstPlayer,
            timerId: timer,
            state: CombatState.Active,
        };
        this.combatRooms.set(combatRoomId, combatRoom);
        return { combatRoomId, combatRoom };
    }

    /**
     * @brief retrieves combat room by its id
     * @param roomId
     * @returns
     */
    getCombatRoomById(roomId: string): CombatRoom {
        return this.combatRooms.get(roomId);
    }

    /**
     * @brief removes combat room from the map using its id
     * @param roomId
     */
    removeCombatRoom(roomId: string): void {
        this.combatRooms.delete(roomId);
    }

    /**
     * retrieved the combat room and its id from the client socket
     * @param client
     * @returns
     */
    getCombatRoomIdAndRoom(client: Socket): { roomId: string; combatRoom: CombatRoom } | undefined {
        for (const [roomId, combatRoom] of this.combatRooms.entries()) {
            // Check if the room has a connected player whose socket matches the given socketId
            if (combatRoom.player2.socket.id === client.id || combatRoom.player1.socket.id === client.id) {
                return { roomId, combatRoom };
            }
        }
        return undefined; // Return undefined if no matching room is found
    }

    /**
     * @brief retrieves the client adversary from the combat game
     * @param client
     * @returns
     */
    getClientAdversary(client: Socket): ConnectedPlayer | undefined {
        for (const [, combatRoom] of this.combatRooms.entries()) {
            if (combatRoom.player1.socket.id === client.id) return combatRoom.player2;
            else if (combatRoom.player2.socket.id === client.id) return combatRoom.player1;
        }
        return undefined;
    }

    /**
     * @brief getCombatFirstPlayer sets the first player has the with the most rapidity. If they both have the same speed, the first player is the attacker
     * @param player1
     * @param player2
     * @returns firstPlayer
     */
    private getCombatFirstPlayer(player1: Player, player2: Player): Player {
        const player1Speed = ATTRIBUTE_INIT_VALUE + (player1.bonus === Attribute.Speed ? BONUS : 0);
        const player2Speed = ATTRIBUTE_INIT_VALUE + (player2.bonus === Attribute.Speed ? BONUS : 0);

        if (player1Speed > player2Speed || player1Speed === player2Speed) {
            return player1;
        } else {
            return player2;
        }
    }

    /**
     * @brief initializePlayer sets the player's health and evasion attempts to default values
     * @param connectedPlayer
     */
    private initializePlayer(connectedPlayer: ConnectedPlayer): void {
        connectedPlayer.player.health = ATTRIBUTE_INIT_VALUE;
        connectedPlayer.player.evadingAttempts = EVASION_ATTEMPTS;
    }
}
