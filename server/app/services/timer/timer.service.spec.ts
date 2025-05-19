import { MILLISECONDS_1000, MILLISECONDS_3000, MILLISECONDS_5000 } from '@common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { TimerService } from './timer.service';

describe('TimerService', () => {
    const MILLISECONDS_2000 = 2000;
    let service: TimerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TimerService],
        }).compile();

        service = module.get<TimerService>(TimerService);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers(); // Clear timers after each test
        jest.clearAllMocks();
    });

    describe('startTimer', () => {
        const timerId = 'testTimer';
        it('should start a timer and call the callback after the duration', (done) => {
            const duration = MILLISECONDS_1000;
            const callback = jest.fn(() => {
                expect(callback).toHaveBeenCalled();
                done();
            });

            service.startTimer(timerId, duration, callback);

            // Simulate passing time for the timer
            jest.advanceTimersByTime(duration);
        });

        it('should replace an existing timer with the same ID', () => {
            const firstDuration = MILLISECONDS_1000;
            const secondDuration = MILLISECONDS_2000;
            const firstCallback = jest.fn();
            const secondCallback = jest.fn();

            service.startTimer(timerId, firstDuration, firstCallback);
            service.startTimer(timerId, secondDuration, secondCallback);

            jest.advanceTimersByTime(secondDuration);

            expect(firstCallback).not.toHaveBeenCalled();
            expect(secondCallback).toHaveBeenCalled();
        });
        it('should store the timer in timers when it is started', (done) => {
            const duration = MILLISECONDS_1000; // 1 second
            const callback = jest.fn(() => {
                expect(callback).toHaveBeenCalled();
                done();
            });

            service.startTimer(timerId, duration, callback);

            // Check that the timer has been added to the timers map
            const timer = service['timers'].get(timerId);
            expect(timer).toBeDefined();
            expect(timer.timeout).toBeDefined();
            expect(timer.duration).toBe(duration);
            expect(timer.startTime).toBeGreaterThan(0);

            jest.advanceTimersByTime(duration);
        });
        it('should reset the timer before restarting it', () => {
            const spy = jest.spyOn(service, 'clearTimer');
            service.startTimer(timerId, MILLISECONDS_2000, jest.fn());
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('stopTimer & clearTimer', () => {
        const timerId = 'testTimer';
        const duration = MILLISECONDS_5000;
        const callback = jest.fn();
        it('should stop a running timer - stopTimer', () => {
            service.startTimer(timerId, duration, callback);
            service.stopTimer(timerId);

            jest.advanceTimersByTime(duration);

            expect(callback).not.toHaveBeenCalled();
        });
        it('should not stop a timer if it does not exist - stopTimer', () => {
            const spy = jest.spyOn(global, 'clearTimeout');
            service.stopTimer('NoTimer');

            expect(spy).not.toBeCalledWith('NoTimer');
        });
        it('should stop the timer and reset it if the timerID is valid - clearTimer', () => {
            const spy = jest.spyOn(service, 'stopTimer');

            service.startTimer(timerId, duration, callback);
            service.clearTimer(timerId);

            const timer = service['timers'].get(timerId);
            expect(spy).toHaveBeenCalledWith(timerId);
            expect(timer.timeout).toBe(null);
            expect(timer.duration).toBe(0);
            expect(timer.startTime).toBe(0);
        });
        it('should not stop the timer and reset it if the timerID is not valid - clearTimer', () => {
            const spy = jest.spyOn(service, 'stopTimer');

            service.startTimer(timerId, duration, callback);
            service.clearTimer('UnknownID');

            expect(spy).not.toHaveBeenCalledWith('UnknownID');
        });
    });

    describe('getRemainingTime', () => {
        it('should return the remaining time of a running timer', () => {
            const timerId = 'testTimer';
            const duration = MILLISECONDS_5000;
            const callback = jest.fn();

            service.startTimer(timerId, duration, callback);

            jest.advanceTimersByTime(MILLISECONDS_2000);

            const remainingTime = service.getRemainingTime(timerId);

            expect(remainingTime).toBe(MILLISECONDS_3000); // 5s - 2s = 3s
        });

        it('should return null if the timer does not exist', () => {
            const remainingTime = service.getRemainingTime('nonExistentTimer');
            expect(remainingTime).toBeNull();
        });
    });

    describe('deleteTimer', () => {
        it('should delete the timer from the map', () => {
            const timerId = 'testTimer';
            const duration = MILLISECONDS_1000;
            const callback = jest.fn();

            service.startTimer(timerId, duration, callback);
            service.deleteTimer(timerId);

            const remainingTime = service.getRemainingTime(timerId);

            expect(remainingTime).toBeNull();
        });
    });
});
