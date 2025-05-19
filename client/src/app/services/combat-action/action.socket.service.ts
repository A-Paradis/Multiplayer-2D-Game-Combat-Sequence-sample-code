// To allow definition of observables after private attributes init
/* eslint-disable @typescript-eslint/member-ordering */
import { Injectable } from '@angular/core';
import { SocketClientService } from '@app/services/socket/socket-client.service';
import { Player } from '@common/interfaces/player.interface';
import { Tile } from '@common/interfaces/tile.interface';
import { Vec2 } from '@common/interfaces/vec2.interface';
import { ActionsEvents } from '@common/socket-events/combat-action.event';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ActionSocketService {
    constructor(private socketService: SocketClientService) {
        this.connect();
    }

    connect() {
        if (!this.socketService.isSocketAlive()) {
            this.socketService.connect();
        }
    }

    /** SENDING */
    /**
     * @brief interactDoor sends the position of the door who's state is to be changed from
     * opened to closed or vise-versa
     * @param position Vec2
     */
    interactDoor(position: Vec2): void {
        this.connect();
        this.sendAction(ActionsEvents.InteractDoor, position);
    }
    /**
     * @brief requestCombat sends the player information related to a new combat
     * @param attacker Player
     * @param combatant Player
     */
    requestCombat(attacker: Player, combatant: Player): void {
        this.connect();
        this.sendAction(ActionsEvents.RequestCombat, { attacker, combatant });
    }

    /** RECEPTION */
    /**
     * @brief onChangedDoorState receives the Door Tile Object that was modified by the server
     * @returns An observable of the tile
     */
    onChangeDoorState(): Observable<Tile> {
        return this.socketService.onObservable<Tile>(ActionsEvents.ChangedBoard);
    }
    /**
     * @brief onHasBeenChallenged receives a message to broadcast to the designated new combatants
     * @returns An observable of the message
     */
    onHasBeenChallenged(): Observable<{ message: string }> {
        return this.socketService.onObservable<{ message: string }>(ActionsEvents.HasBeenChallenged);
    }

    /**
     * onOngoingCombat notifies all the players in the game room that a combat has started
     * @returns An observable of the message
     */
    onOngoingCombat(): Observable<{ message: string }> {
        return this.socketService.onObservable<{ message: string }>(ActionsEvents.OngoingCombat);
    }

    /**
     * @brief sendAction provided a general interface to send ActionEvents
     * @param event ActionEvents
     * @param data any data type
     */
    private sendAction<T>(event: ActionsEvents, data: T): void {
        if (this.socketService.isSocketAlive()) this.socketService.send(event, data);
    }
}
