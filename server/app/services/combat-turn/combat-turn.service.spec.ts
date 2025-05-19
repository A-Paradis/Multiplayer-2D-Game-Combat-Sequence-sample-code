/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CombatRoom, CombatState } from '@app/interfaces/combat.interface';
import { Room } from '@app/interfaces/room.interface';
import { CombatLogicService } from '@app/services/combat-logic/combat-logic.service';
import { CombatTurnService } from '@app/services/combat-turn/combat-turn.service';
import { TimerService } from '@app/services/timer/timer.service';
import { createMockCombatRoom1, createMockRoom1, mockConnectedPlayer1 } from '@app/utils/mock-values';
import { ATTRIBUTE_INIT_VALUE, EVASION_ATTEMPTS, MILLISECONDS_1000, MILLISECONDS_3000, MILLISECONDS_5000 } from '@common/constants';
import { Test, TestingModule } from '@nestjs/testing';

describe('CombatTurnService', () => {
    let service: CombatTurnService;
    let timerService: jest.Mocked<TimerService>;
    let combatLogicService: jest.Mocked<CombatLogicService>;
    let gameRoom: Room;
    let combatRoom: CombatRoom;
    let stateHistory: CombatState[] = [];

    const timerCallback = jest.fn();
    const activePlayerCallback = jest.fn();
    const winnerCallback = jest.fn();
    const evasionCallback = jest.fn();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CombatTurnService,
                {
                    provide: TimerService,
                    useValue: {
                        startTimer: jest.fn(),
                        stopTimer: jest.fn(),
                        deleteTimer: jest.fn(),
                        getRemainingTime: jest.fn(),
                    },
                },
                {
                    provide: CombatLogicService,
                    useValue: {
                        attack: jest.fn(),
                        evade: jest.fn(),
                    },
                },
            ],
        }).compile();
        gameRoom = createMockRoom1();
        combatRoom = createMockCombatRoom1();
        service = module.get<CombatTurnService>(CombatTurnService);
        timerService = module.get(TimerService);
        combatLogicService = module.get(CombatLogicService);
        jest.useFakeTimers();

        Object.defineProperty(combatRoom, 'state', {
            get: () => stateHistory[stateHistory.length - 1],
            set: (val: CombatState) => {
                stateHistory.push(val);
            },
            configurable: true,
        });
    });

    afterEach(() => {
        jest.clearAllTimers(); // Clear timers after each test
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    it('should delete the timer', () => {
        service.deleteTimer('123');
        expect(timerService.deleteTimer).toHaveBeenCalledWith('123');
    });

    describe('startTurn', () => {
        it('should start the timer and execute attack if the timer was not stopped', () => {
            combatRoom.state = CombatState.Active;
            combatRoom.activePlayer.evadingAttempts = EVASION_ATTEMPTS;
            let remainingTime = MILLISECONDS_5000;

            jest.spyOn(timerService, 'startTimer').mockImplementation((_id, _duration, callback) => {
                // Simulate the timer reaching 0 after 5s
                setTimeout(callback, MILLISECONDS_5000);
            });
            jest.spyOn(combatLogicService, 'attack');
            jest.spyOn(timerService, 'getRemainingTime').mockImplementation(() => {
                remainingTime -= 1000;
                return Math.max(remainingTime, 0);
            });

            service.startTurn(combatRoom, gameRoom, jest.fn(), jest.fn(), jest.fn());
            expect(timerService.startTimer).toHaveBeenCalledWith(combatRoom.timerId, MILLISECONDS_5000, expect.any(Function));

            jest.advanceTimersByTime(MILLISECONDS_5000);

            expect(combatLogicService.attack).toHaveBeenCalledWith(combatRoom, gameRoom);
        });
        it('should emit the remaining time of the combat turn each second', () => {
            combatRoom.state = CombatState.Active;
            let remainingTime = 5000;
            const callback = jest.fn();

            jest.spyOn(timerService, 'startTimer').mockImplementation((_id, _duration, call) => {
                // Simulate the timer reaching 0 after 5s
                setTimeout(call, MILLISECONDS_5000);
            });
            jest.spyOn(timerService, 'getRemainingTime').mockImplementation(() => {
                remainingTime = Math.max(remainingTime - 1000, 0);
                return remainingTime;
            });

            service.startTurn(combatRoom, gameRoom, callback, jest.fn(), jest.fn());

            // Advance time in 1s steps to simulate real behavior
            jest.advanceTimersByTime(1000);
            expect(callback).toHaveBeenCalledWith(4);

            jest.advanceTimersByTime(1000);
            expect(callback).toHaveBeenCalledWith(3);

            jest.advanceTimersByTime(1000);
            expect(callback).toHaveBeenCalledWith(2);

            jest.advanceTimersByTime(1000);
            expect(callback).toHaveBeenCalledWith(1);

            // Ensure the interval stopped after reaching 0
            jest.advanceTimersByTime(2000);
            expect(callback).toHaveBeenCalledTimes(4);
        });
        it('should clear the interval if the combat is finished', () => {
            let remainingTime = MILLISECONDS_5000;

            const spy = jest.spyOn(global, 'clearInterval');
            const spy1 = jest.spyOn(service, 'startTurn');

            jest.spyOn(timerService, 'startTimer').mockImplementation((_id, _duration, call) => {
                setTimeout(call, MILLISECONDS_5000);
            });
            jest.spyOn(timerService, 'getRemainingTime').mockImplementation(() => {
                remainingTime = Math.max(remainingTime - 1000, 0);
                return remainingTime;
            });

            service.startTurn(combatRoom, gameRoom, timerCallback, activePlayerCallback, winnerCallback);

            combatRoom.state = CombatState.Finished;

            jest.advanceTimersByTime(MILLISECONDS_1000);

            expect(spy).toHaveBeenCalled();
            expect(spy1).toHaveBeenCalledTimes(1);
        });
        it('should clear the interval if a combat event is ongoing', () => {
            let remainingTime = MILLISECONDS_5000;

            const spy = jest.spyOn(global, 'clearInterval');
            const spy1 = jest.spyOn(service, 'startTurn');

            jest.spyOn(timerService, 'startTimer').mockImplementation((_id, _duration, call) => {
                setTimeout(call, MILLISECONDS_5000);
            });
            jest.spyOn(timerService, 'getRemainingTime').mockImplementation(() => {
                remainingTime = Math.max(remainingTime - 1000, 0);
                return remainingTime;
            });

            service.startTurn(combatRoom, gameRoom, timerCallback, activePlayerCallback, winnerCallback);

            jest.advanceTimersByTime(MILLISECONDS_1000);

            combatRoom.state = CombatState.EventOngoing;

            jest.advanceTimersByTime(MILLISECONDS_1000);

            expect(spy).toHaveBeenCalled();
            expect(spy1).toHaveBeenCalledTimes(1);
        });
        it('should clear the interval if a player quitted', () => {
            let remainingTime = MILLISECONDS_5000;

            const spy = jest.spyOn(global, 'clearInterval');
            const spy1 = jest.spyOn(service, 'startTurn');

            jest.spyOn(timerService, 'startTimer').mockImplementation((_id, _duration, call) => {
                setTimeout(call, MILLISECONDS_5000);
            });
            jest.spyOn(timerService, 'getRemainingTime').mockImplementation(() => {
                remainingTime = Math.max(remainingTime - 1000, 0);
                return remainingTime;
            });

            service.startTurn(combatRoom, gameRoom, timerCallback, activePlayerCallback, winnerCallback);

            jest.advanceTimersByTime(MILLISECONDS_1000);

            combatRoom.state = CombatState.PlayerLeft;

            jest.advanceTimersByTime(MILLISECONDS_1000);

            expect(spy).toHaveBeenCalled();
            expect(spy1).toHaveBeenCalledTimes(1);
        });
        it('should recall startTurn if a combat event just finished', () => {
            let remainingTime = MILLISECONDS_5000;

            const spy = jest.spyOn(global, 'clearInterval');
            const spy1 = jest.spyOn(service, 'startTurn');

            jest.spyOn(timerService, 'startTimer').mockImplementation((_id, _duration, call) => {
                setTimeout(call, MILLISECONDS_5000);
            });
            jest.spyOn(timerService, 'getRemainingTime').mockImplementation(() => {
                remainingTime = Math.max(remainingTime - 1000, 0);
                return remainingTime;
            });

            service.startTurn(combatRoom, gameRoom, timerCallback, activePlayerCallback, winnerCallback);

            jest.advanceTimersByTime(2000);

            combatRoom.state = CombatState.EventDone;

            jest.advanceTimersByTime(MILLISECONDS_1000);

            expect(spy).toHaveBeenCalled();
            expect(combatRoom.state).toBe(CombatState.Active);
            expect(spy1).toHaveBeenCalledTimes(2);
        });
        it('should recall startTurn if the remaining time is zero while the combat state is active', () => {
            let remainingTime = MILLISECONDS_5000;

            const spy = jest.spyOn(global, 'clearInterval');
            const spy1 = jest.spyOn(service, 'startTurn');

            jest.spyOn(timerService, 'startTimer').mockImplementation((_id, _duration, call) => {
                setTimeout(call, MILLISECONDS_5000);
            });
            jest.spyOn(timerService, 'getRemainingTime').mockImplementation(() => {
                remainingTime = Math.max(remainingTime - 1000, 0);
                return remainingTime;
            });

            service.startTurn(combatRoom, gameRoom, timerCallback, activePlayerCallback, winnerCallback);

            jest.advanceTimersByTime(MILLISECONDS_5000);

            expect(spy).toHaveBeenCalled();
            expect(combatRoom.state).toBe(CombatState.Active);
            expect(spy1).toHaveBeenCalledTimes(2);
        });
        it('should emit the remaining time if the combat state is active and remaining time is above 0', () => {
            let remainingTime = MILLISECONDS_5000;

            jest.spyOn(timerService, 'startTimer').mockImplementation((_id, _duration, call) => {
                setTimeout(call, MILLISECONDS_5000);
            });
            jest.spyOn(timerService, 'getRemainingTime').mockImplementation(() => {
                remainingTime = Math.max(remainingTime - 1000, 0);
                return remainingTime;
            });

            service.startTurn(combatRoom, gameRoom, timerCallback, activePlayerCallback, winnerCallback);

            jest.advanceTimersByTime(MILLISECONDS_1000);

            expect(timerCallback).toHaveBeenCalled();
        });
    });

    describe('attackTurn', () => {
        beforeEach(() => {
            stateHistory = [];
        });
        it('should update the gameRoom and return the winner if the combat is is over', () => {
            // Disabled to spy on the private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jest.spyOn(service as any, 'isCombatOver').mockReturnValue(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(service as any, 'updateGameRoomAfterCombat');
            const result = service.attackTurn(combatRoom, gameRoom, winnerCallback);
            expect(stateHistory[0]).toBe(CombatState.EventOngoing);
            expect(stateHistory[1]).toBe(CombatState.Finished);
            expect(result).toEqual(combatRoom.winner);
            expect(winnerCallback).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(combatRoom, gameRoom);
        });
        it('should change the active player and start a new turn if the combat is not over', () => {
            // Disabled to spy on the private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jest.spyOn(service as any, 'isCombatOver').mockReturnValue(false);
            // Disabled to spy on the private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(service as any, 'toggleActivePlayer');

            combatRoom.activePlayer = combatRoom.player1.player;
            service.attackTurn(combatRoom, gameRoom, jest.fn());
            expect(spy).toHaveBeenCalledWith(combatRoom);
            expect(combatRoom.activePlayer).toBe(combatRoom.player2.player);
            expect(stateHistory[0]).toBe(CombatState.EventOngoing);
            expect(stateHistory[1]).toBe(CombatState.EventDone);
        });
    });

    describe('evadeTurn', () => {
        beforeEach(() => {
            stateHistory = [];
        });
        it('should toggleActivePlayer and finish event if evasion is unsuccessful', () => {
            // To spy on private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(service as any, 'toggleActivePlayer').mockImplementation();
            jest.spyOn(combatLogicService, 'evade').mockReturnValue(false);

            service.evadeTurn(combatRoom, evasionCallback);

            expect(stateHistory[0]).toBe(CombatState.EventOngoing);
            expect(stateHistory[1]).toBe(CombatState.EventDone);
            expect(evasionCallback).not.toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(combatRoom);
        });
        it('should return null if the evasion was successful', () => {
            // To spy on private method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = jest.spyOn(service as any, 'toggleActivePlayer').mockImplementation();
            jest.spyOn(combatLogicService, 'evade').mockReturnValue(true);

            service.evadeTurn(combatRoom, evasionCallback);

            expect(stateHistory[0]).toBe(CombatState.EventOngoing);
            expect(stateHistory[1]).toBe(CombatState.Finished);
            expect(evasionCallback).toHaveBeenCalled();
            expect(spy).not.toHaveBeenCalledWith(combatRoom);
        });
    });

    describe('isCombatOver', () => {
        it('should declare victory on player1 if player2 health is equal to zero', () => {
            combatRoom.player1.player.health = ATTRIBUTE_INIT_VALUE;
            combatRoom.player2.player.health = 0;

            const result = service['isCombatOver'](combatRoom);

            expect(result).toBe(true);
            expect(combatRoom.winner).toBe(combatRoom.player1.player);
            expect(combatRoom.player1.player.victories).toBe(1);
            expect(combatRoom.player2.player.victories).toBe(0);
        });
        it('should declare victory on player1 if player2 health is lower than zero', () => {
            combatRoom.player1.player.health = ATTRIBUTE_INIT_VALUE;
            combatRoom.player2.player.health = -10;

            const result = service['isCombatOver'](combatRoom);

            expect(result).toBe(true);
            expect(combatRoom.winner).toBe(combatRoom.player1.player);
            expect(combatRoom.player1.player.victories).toBe(1);
            expect(combatRoom.player2.player.victories).toBe(0);
        });
        it('should declare victory on player2 if player1 health is equal to zero', () => {
            combatRoom.player1.player.health = 0;
            combatRoom.player2.player.health = ATTRIBUTE_INIT_VALUE;

            const result = service['isCombatOver'](combatRoom);

            expect(result).toBe(true);
            expect(combatRoom.winner).toBe(combatRoom.player2.player);
            expect(combatRoom.player2.player.victories).toBe(1);
            expect(combatRoom.player1.player.victories).toBe(0);
        });
        it('should not declare victory on any player if their health is higher than zero', () => {
            combatRoom.player1.player.health = ATTRIBUTE_INIT_VALUE;
            combatRoom.player2.player.health = ATTRIBUTE_INIT_VALUE;

            const result = service['isCombatOver'](combatRoom);

            expect(result).toBe(false);
            expect(combatRoom.winner).toBeUndefined();
            expect(combatRoom.player1.player.victories).toBe(0);
            expect(combatRoom.player2.player.victories).toBe(0);
        });
    });

    describe('updateGameRoomAfterCombat', () => {
        it('should update the attributes of the players in gameRoom', () => {
            // Modify combatRoom players' attributes before calling the method
            combatRoom.player1.player.health = 3;
            combatRoom.player2.player.health = 1;
            combatRoom.player1.player.victories = 3;
            combatRoom.player2.player.victories = 2;

            service['updateGameRoomAfterCombat'](combatRoom, gameRoom);

            // Verify gameRoom players were updated correctly
            const updatedPlayer1 = gameRoom.players.find((p) => p.player.name === combatRoom.player1.player.name);
            const updatedPlayer2 = gameRoom.players.find((p) => p.player.name === combatRoom.player2.player.name);

            expect(updatedPlayer1).toBeDefined();
            expect(updatedPlayer2).toBeDefined();

            expect(updatedPlayer1?.player.health).toBe(ATTRIBUTE_INIT_VALUE);
            expect(updatedPlayer2?.player.health).toBe(ATTRIBUTE_INIT_VALUE);

            // To assert defined victories
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(updatedPlayer1?.player.victories).toBe(3);
            expect(updatedPlayer2?.player.victories).toBe(2);
        });
        it('should not update the attributes if one of the players is not in the gameRoom', () => {
            // Remove one player from gameRoom
            gameRoom.players = [gameRoom.players[0]]; // Keep only one player

            service['updateGameRoomAfterCombat'](combatRoom, gameRoom);

            // Ensure gameRoom state did not change
            const updatedPlayer1 = gameRoom.players.find((p) => p.player.name === combatRoom.player1.player.name);
            const missingPlayer = gameRoom.players.find((p) => p.player.name === combatRoom.player2.player.name);

            expect(updatedPlayer1).toBeDefined(); // First player should exist
            expect(missingPlayer).toBeUndefined(); // Second player should not be found

            // Verify that existing player's health was not modified
            expect(updatedPlayer1?.player.health).toBe(mockConnectedPlayer1.player.health);
        });
    });

    describe('toggleActivePlayer', () => {
        it('should change the active player to player1 if the previous player was player2', () => {
            combatRoom.activePlayer = combatRoom.player2.player;
            service['toggleActivePlayer'](combatRoom);
            expect(combatRoom.activePlayer).toBe(combatRoom.player1.player);
        });
        it('should change the active player to player2 if the previous player was player1', () => {
            combatRoom.activePlayer = combatRoom.player1.player;
            service['toggleActivePlayer'](combatRoom);
            expect(combatRoom.activePlayer).toBe(combatRoom.player2.player);
        });
    });

    describe('getTurnDuration', () => {
        it('should return 5 seconds if the player has evading attempts', () => {
            combatRoom.player1.player.evadingAttempts = EVASION_ATTEMPTS;
            expect(service['getTurnDuration'](combatRoom.player1.player)).toBe(MILLISECONDS_5000);
        });
        it('should return 3 seconds if the player does not have any evading attempts remaining', () => {
            combatRoom.player1.player.evadingAttempts = 0;
            expect(service['getTurnDuration'](combatRoom.player1.player)).toBe(MILLISECONDS_3000);
        });
    });
});
