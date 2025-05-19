import { CombatRoom } from '@app/interfaces/combat.interface';
import { ConnectedPlayer } from '@app/interfaces/connected-players.interface';
import { Room } from '@app/interfaces/room.interface';
import { CombatRoomService } from '@app/services/combat-room/combat-room.service';
import { CombatTurnService } from '@app/services/combat-turn/combat-turn.service';
import { RoomService } from '@app/services/room/room.service';
import { Player } from '@common/interfaces/player.interface';
import { ActionsEvents, CombatEvents } from '@common/socket-events/combat-action.event';
import { TimerEvents } from '@common/socket-events/timer.events';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class CombatGateway implements OnGatewayDisconnect {
    @WebSocketServer() private server: Server;
    private readonly logger = new Logger(CombatGateway.name);

    constructor(
        private combatRoomService: CombatRoomService,
        private combatTurnService: CombatTurnService,
        private roomService: RoomService,
    ) {}

    @OnEvent(ActionsEvents.StartingCombat)
    onCombatStarted(@MessageBody() { roomId, data }: { roomId: string; data: { attacker: Player; combatant: Player } }): void {
        const attackerSocket = this.roomService.getPlayerSocket(data.attacker);
        const combatantSocket = this.roomService.getPlayerSocket(data.combatant);
        const attackerConnected: ConnectedPlayer = { player: data.attacker, socket: attackerSocket };
        const combatantConnected: ConnectedPlayer = { player: data.combatant, socket: combatantSocket };
        const gameRoom = this.roomService.getRoomById(roomId);

        // Create the combat room
        const { combatRoomId, combatRoom } = this.combatRoomService.createCombatRoom(attackerConnected, combatantConnected);
        attackerSocket.join(combatRoomId);
        combatantSocket.join(combatRoomId);

        this.server.to(combatRoomId).emit(CombatEvents.FirstPlayer, {
            firstPlayer: combatRoom.activePlayer,
            message: `${combatRoom.activePlayer.name} commence le combat`,
        });

        this.startCombatTurn(combatRoomId, combatRoom, gameRoom);
    }

    @SubscribeMessage(CombatEvents.Attack)
    attack(@ConnectedSocket() client: Socket): void {
        this.handleCombatAction(client, (combat, game, combatRoomId) => {
            this.combatTurnService.attackTurn(combat, game, () => this.signalWonCombat(combatRoomId, combat));
        });
    }

    @SubscribeMessage(CombatEvents.Evade)
    evade(@ConnectedSocket() client: Socket): void {
        this.handleCombatAction(client, (combat, _game, combatRoomId) => {
            this.combatTurnService.evadeTurn(combat, () => this.signalEvadedCombat(client.id, combatRoomId, combat));
        });
    }

    handleDisconnect(@ConnectedSocket() client: Socket): void {
        const combat = this.combatRoomService.getCombatRoomIdAndRoom(client);
        if (combat && combat.roomId && combat.combatRoom) {
            this.signalDisconnect(client, combat.roomId, combat.combatRoom);
        }
    }

    // COMBAT TURN METHODS
    private handleCombatAction(client: Socket, action: (combat: CombatRoom, game?: Room, combatRoomId?: string) => void): void {
        const game = this.roomService.getRoomIdAndRoom(client);
        const combat = this.combatRoomService.getCombatRoomIdAndRoom(client);
        if (game && combat) {
            action(combat.combatRoom, game.room, combat.roomId);
        }
    }

    private startCombatTurn(combatRoomId: string, combatRoom: CombatRoom, gameRoom: Room): void {
        this.combatTurnService.startTurn(
            combatRoom,
            gameRoom,
            (remainingTime) => this.emitUpdatedTime(combatRoomId, remainingTime),
            () => this.emitActivePlayer(combatRoomId, combatRoom.activePlayer),
            () => this.signalWonCombat(combatRoomId, combatRoom),
        );
    }

    private emitUpdatedTime(roomId: string, remainingTime: number): void {
        this.server.to(roomId).emit(TimerEvents.TimerUpdate, remainingTime);
    }

    private emitActivePlayer(roomId: string, player: Player): void {
        this.server.to(roomId).emit(CombatEvents.ActivePlayer, player);
    }

    // END OF COMBAT METHODS
    private removeRoomAfterTime(roomId: string, combatRoom: CombatRoom): void {
        combatRoom.player1.socket.leave(roomId); // Disconnect players from the combat room
        combatRoom.player2.socket.leave(roomId);
        this.combatTurnService.deleteTimer(combatRoom.timerId); // Delete timer from the time service
        this.combatRoomService.removeCombatRoom(roomId); // Delete combat room
    }

    private signalWonCombat(combatRoomId: string, combat: CombatRoom): void {
        let loser;
        let loserSocket;
        const winnerSocket = this.roomService.getPlayerSocket(combat.winner);
        if (winnerSocket) {
            loser = combat.player1.socket.id === winnerSocket.id ? combat.player2.player : combat.player1.player;
            loserSocket = this.roomService.getPlayerSocket(loser);
            this.server.to(winnerSocket.id).emit(CombatEvents.Finished, {
                message: 'Félicitation! Vous avez gagné le combat.',
                player: combat.winner,
            });
            if (loserSocket) {
                this.server.to(loserSocket.id).emit(CombatEvents.Finished, {
                    message: 'Vous avez perdu. Meilleur chance la prochaine fois.',
                    player: loser,
                });
            }
        }

        this.removeRoomAfterTime(combatRoomId, combat);
    }

    private signalEvadedCombat(socketId: string, combatRoomId: string, combat: CombatRoom): void {
        const adversary = combat.player1.socket.id === socketId ? combat.player2 : combat.player1;
        const clientPlayer = combat.player1.socket.id === socketId ? combat.player1 : combat.player2;

        if (socketId) {
            this.server.to(socketId).emit(CombatEvents.EvasionSuccessful, {
                message: 'Vous avez évader votre adversaire.',
                player: clientPlayer.player,
            });
        }
        if (adversary.socket && socketId) {
            this.server.to(adversary.socket.id).emit(CombatEvents.EvasionSuccessful, {
                message: "Votre adversaire s'est échappé.",
                player: adversary.player,
            });
        }
        this.removeRoomAfterTime(combatRoomId, combat);
    }

    // DISCONNECT
    private signalDisconnect(client: Socket, roomId: string, combat: CombatRoom): void {
        const adversary = this.combatRoomService.getClientAdversary(client);
        this.removeRoomAfterTime(roomId, combat);
        if (adversary) {
            adversary.player.victories += 1;
            this.server.to(adversary.socket.id).emit(CombatEvents.Finished, {
                message: "Votre adversaire s'est déconnecté. Vous être le gagnant!",
                player: adversary.player,
            });
        }
    }
}
