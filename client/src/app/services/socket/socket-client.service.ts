import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment'; // local

/**
 * Centralised socket service for socket methods
 */
@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: Socket;

    isSocketAlive() {
        return this.socket && this.socket.connected;
    }

    connect() {
        this.socket = io(environment.serverUrl, { transports: ['websocket', 'polling'], upgrade: false });
    }

    disconnect() {
        this.socket.disconnect();
    }

    on<T>(event: string, action: (data: T) => void): void {
        this.socket.on(event, action);
    }

    onObservable<T>(event: string): Observable<T> {
        return new Observable<T>((observer) => {
            this.socket.on(event, (data: T) => {
                observer.next(data); // Emit the data to the observer
            });

            // Cleanup when the observable is unsubscribed
            return () => {
                this.socket.off(event); // Remove the listener when unsubscribed
            };
        });
    }

    send<T>(event: string, data?: T, callback?: () => void): void {
        this.socket.emit(event, ...[data, callback].filter((x) => x));
    }
}
