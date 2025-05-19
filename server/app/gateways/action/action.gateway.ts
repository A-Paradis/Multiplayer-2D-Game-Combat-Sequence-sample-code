import { ActionService } from '@app/services/action/action.service';
import { RoomService } from '@app/services/room/room.service';
import { MILLISECONDS_3000 } from '@common/constants';
import { Player } from '@common/interfaces/player.interface';
import { Vec2 } from '@common/interfaces/vec2.interface';
import { ActionsEvents } from '@common/socket-events/combat-action.event';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class ActionGateway {
    @WebSocketServer() private server: Server;
    private readonly logger = new Logger(ActionGateway.name);

    constructor(
        private actionService: ActionService,
        private roomService: RoomService,
        private eventEmitter: EventEmitter2,
    ) {}

    @SubscribeMessage(ActionsEvents.InteractDoor)
    interactDoor(@MessageBody() position: Vec2, @ConnectedSocket() client: Socket): void {
        // Retrieve the room the client is in (a client is in one game room only)
        const { roomId, room } = this.roomService.getRoomIdAndRoom(client);
        const door = this.actionService.interactWithDoor(room, position);
        // Notify all players that the tile was changed
        if (door) this.server.to(roomId).emit(ActionsEvents.ChangedBoard, door); // Let the client handle undefined
        this.logger.log('door toggle');
    }

    @SubscribeMessage(ActionsEvents.RequestCombat)
    requestCombat(@MessageBody() data: { attacker: Player; combatant: Player }, @ConnectedSocket() client: Socket): void {
        this.logger.log('Combat request initiated');
        // Notify attacker and combatant that the combat is starting
        const combatantSocket = this.roomService.getPlayerSocket(data.combatant);
        this.server.to([client.id, combatantSocket.id]).emit(ActionsEvents.HasBeenChallenged, {
            message: `Préparer vous à combattre: ${data.attacker.name} vs ${data.combatant.name}!`,
        });

        // Notify other players in the room
        const roomId = this.roomService.getRoomIdByPlayer(data.attacker);
        this.server
            .to(roomId)
            .except([client.id, combatantSocket.id])
            .emit(ActionsEvents.OngoingCombat, {
                message: `${data.attacker.name} a défié ${data.combatant.name} à un duel!`,
            });

        setTimeout(() => {
            this.eventEmitter.emit(ActionsEvents.StartingCombat, { roomId, data });
        }, MILLISECONDS_3000);
    }
}
