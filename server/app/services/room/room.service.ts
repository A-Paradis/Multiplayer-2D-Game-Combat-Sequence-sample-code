import { ConnectedPlayer } from '@app/interfaces/connected-players.interface';
import { GameState } from '@app/interfaces/game-state.interface';
import { Room } from '@app/interfaces/room.interface';
import { Player } from '@common/interfaces/player.interface';
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class RoomService {
    private rooms: Map<string, Room> = new Map();

    getRooms() {
        return this.rooms;
    }

    getRoomById(roomId: string): Room {
        return this.rooms.get(roomId);
    }

    addRoom(roomId: string, gameInfo: Room) {
        this.rooms.set(roomId, gameInfo);
    }

    getRoomStateById(roomId: string): GameState {
        const room = this.getRoomById(roomId);
        if (room) {
            return room.state;
        }

        return null;
    }

    setRoomState(roomId: string, state: GameState): void {
        const room = this.getRoomById(roomId);
        room.state = state;
    }

    removeRoom(roomId: string): void {
        this.rooms.delete(roomId);
    }

    getRoomIdByPlayer(player: Player): string | null {
        for (const [roomId, room] of this.rooms) {
            const isPlayerInRoom = room.players.find((connectedPlayer) => connectedPlayer.player.name === player.name);
            if (isPlayerInRoom) {
                return roomId;
            }
        }
        return undefined;
    }

    getPlayerSocket(player: Player): Socket | undefined {
        const room = this.getRoomByPlayer(player);
        if (room) {
            const connectedPlayer = room.players.find((p) => p.player.name === player.name);
            if (connectedPlayer) return connectedPlayer.socket;
        }
        return undefined;
    }

    getRoomIdAndRoom(client: Socket): { roomId: string; room: Room } | undefined {
        const roomId = Array.from(client.rooms).find((room) => room !== client.id); // excluding the socket's own ID

        if (roomId) {
            const room = this.getRoomById(roomId);
            return { roomId, room };
        }

        return undefined;
    }

    isRoomExist(accessCode: string): boolean {
        const exists = this.rooms.has(accessCode);
        return exists;
    }

    isRoomLocked(accessCode: string): boolean {
        return this.rooms.get(accessCode).isLocked;
    }

    getPlayers(roomId: string): ConnectedPlayer[] {
        return this.getRoomById(roomId).players ?? [];
    }

    getPlayerByName(roomId: string, playerName: string): Player {
        return this.getPlayers(roomId).find((player) => player.player.name === playerName).player;
    }

    setPlayers(roomId: string, players: ConnectedPlayer[]): void {
        this.rooms.get(roomId).players = players;
    }

    private getRoomByPlayer(player: Player): Room | null {
        for (const [, room] of this.rooms) {
            const isPlayerInRoom = room.players.find((connectedPlayer) => connectedPlayer.player.name === player.name);
            if (isPlayerInRoom) {
                return room;
            }
        }
        return undefined;
    }
}
