import { TestBed } from '@angular/core/testing';
import { SocketTestHelper } from '@app/classes/socket-test-helper';
import { ActionsEvents, CombatEvents } from '@common/socket-events/combat-action.event';
import { Socket } from 'socket.io-client';
import { SocketClientService } from './socket-client.service';

describe('SocketClientService', () => {
    let service: SocketClientService;
    let socketTestHelper: SocketTestHelper;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        socketTestHelper = new SocketTestHelper();
        service = TestBed.inject(SocketClientService);
        service.socket = socketTestHelper as unknown as Socket;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should disconnect', () => {
        const spy = spyOn(service.socket, 'disconnect');
        service.disconnect();
        expect(spy).toHaveBeenCalled();
    });

    it('isSocketAlive should return true if the socket is still connected', () => {
        service.socket.connected = true;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeTruthy();
    });

    it('isSocketAlive should return false if the socket is no longer connected', () => {
        service.socket.connected = false;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeFalsy();
    });

    it('isSocketAlive should return false if the socket is not defined', () => {
        (service.socket as unknown) = undefined;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeFalsy();
    });

    it('should call socket.on with an event', () => {
        const event = 'helloWorld';
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const action = () => {};
        const spy = spyOn(service.socket, 'on');
        service.on(event, action);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event, action);
    });

    it('should call emit with data when using send', () => {
        const event = 'helloWorld';
        const data = 42;
        const spy = spyOn(service.socket, 'emit');
        service.send(event, data);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event, data);
    });

    it('should call emit without data when using send if data is undefined', () => {
        const event = 'helloWorld';
        const data = undefined;
        const spy = spyOn(service.socket, 'emit');
        service.send(event, data);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event);
    });

    it('should emit data when socket.on is triggered and onObservable is called', (done) => {
        const mockData = { success: true };

        const observable = service.onObservable(ActionsEvents.StartingCombat);

        observable.subscribe((data) => {
            expect(data).toEqual(mockData);
            done();
        });
        socketTestHelper.peerSideEmit(ActionsEvents.StartingCombat, mockData);
    });

    it('should call socket.off when unsubscribing from the observable', (done) => {
        const spyOff = spyOn(socketTestHelper, 'off');
        const observable = service.onObservable(CombatEvents.Evade);
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const subscription = observable.subscribe(() => {}); // no need to specify data for the test

        subscription.unsubscribe();

        // Check if the off method was called when unsubscribing
        expect(spyOff).toHaveBeenCalledWith(CombatEvents.Evade);

        done();
    });
});
