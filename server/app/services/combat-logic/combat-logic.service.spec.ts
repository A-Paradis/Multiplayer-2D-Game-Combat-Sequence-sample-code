/* eslint-disable @typescript-eslint/no-magic-numbers */
// Disabled no magic numbers because creating many random constants is unnecessary for the purpose of testing
import { CombatRoom } from '@app/interfaces/combat.interface';
import { Room } from '@app/interfaces/room.interface';
import { BoardService } from '@app/services/board/board.service';
import { mockCombatRoom1, mockRoom2, player1, player2 } from '@app/utils/mock-values';
import { ATTRIBUTE_INIT_VALUE, EVASION_ATTEMPTS } from '@common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { CombatLogicService } from './combat-logic.service';

describe('CombatLogicService', () => {
    let service: CombatLogicService;
    let boardService: BoardService;
    let combatRoom: CombatRoom;
    let room: Room;

    const RANDOM_THRESHOLD_1 = 0.3;
    const RANDOM_THRESHOLD_2 = 0.7;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CombatLogicService,
                {
                    provide: BoardService, // Provide a mock BoardService
                    useValue: {
                        isPlayerPositionSlime: jest.fn().mockReturnValue(false),
                    },
                },
            ],
        }).compile();

        service = module.get<CombatLogicService>(CombatLogicService);
        boardService = module.get<BoardService>(BoardService);
        room = mockRoom2;
        combatRoom = mockCombatRoom1;
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Restore the original Math.random implementation after tests
    });

    describe('rollDice', () => {
        it('should give a minimum value of 1 no matter the number of dice faces', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0);
            const result = service['rollDice'](combatRoom.player1.player.attackDice);
            expect(result).toBe(1);
        });
        it('should give a maximum value of 4 if the player has a dice of 4 faces', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.99);
            const result = service['rollDice'](combatRoom.player2.player.attackDice);
            expect(result).toBe(combatRoom.player2.player.attackDice);
        });
        it('should give a maximum value of 6 if the player has a dice of 6 faces', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.99);
            const result = service['rollDice'](combatRoom.player1.player.attackDice);
            expect(result).toBe(combatRoom.player1.player.attackDice);
        });
        it('should give a whole number other than the min and max', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.56);
            const result = service['rollDice'](combatRoom.player1.player.attackDice);
            expect(Number.isInteger(result)).toBeTruthy();
        });
    });
    describe('getPassivePlayer', () => {
        it('should retrieve player2 if player1 is the active player', () => {
            combatRoom.activePlayer = combatRoom.player1.player;
            const player = service['getPassivePlayer'](combatRoom);
            expect(player).toBe(combatRoom.player2.player);
            expect(player).not.toBe(combatRoom.player1.player);
        });
        it('should retrieve player1 if player2 is the active player', () => {
            combatRoom.activePlayer = combatRoom.player2.player;
            const player = service['getPassivePlayer'](combatRoom);
            expect(player).toBe(combatRoom.player1.player);
            expect(player).not.toBe(combatRoom.player2.player);
        });
    });
    describe('attack', () => {
        beforeEach(() => {
            combatRoom.player1.player.health = ATTRIBUTE_INIT_VALUE;
            combatRoom.player2.player.health = ATTRIBUTE_INIT_VALUE;
            combatRoom.player1.player.evadingAttempts = EVASION_ATTEMPTS;
            combatRoom.player2.player.evadingAttempts = EVASION_ATTEMPTS;
        });
        it('should decrease the passive player health if the attack is greater than the defense', () => {
            combatRoom.player1.player = player1; // Not on slime
            combatRoom.player2.player = player2; // On slime
            combatRoom.activePlayer = combatRoom.player1.player;
            // To verify the number of times rollDice is called
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jest.spyOn(service as any, 'rollDice')
                .mockImplementationOnce(() => 2) // First call (4+2 = 6)
                .mockImplementationOnce(() => 2); // Second call (4+2 = 6)

            // To verify the number of times isPlayerPositionMud is called
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jest.spyOn(boardService, 'isPlayerPositionSlime')
                .mockImplementationOnce(() => false)
                .mockImplementationOnce(() => true); // 6 - 2 = 4 (player 2 is on slime in mock board)

            service.attack(combatRoom, room);

            expect(combatRoom.player2.player.health).toBeLessThan(ATTRIBUTE_INIT_VALUE); // 6-4=2
        });
        it('should not decrease the passive player health if the attack is less than the defense', () => {
            combatRoom.player1.player = player2; // On Slime
            combatRoom.player2.player = player1; // Not on slime
            combatRoom.activePlayer = combatRoom.player1.player;
            // To mock the return value of each dice rolls
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jest.spyOn(service as any, 'rollDice')
                .mockImplementationOnce(() => 2) // First call (4+2 = 6)
                .mockImplementationOnce(() => 5); // Second call (4+5 = 9)

            // To mock the return value of each isPlayerPositionSlime
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jest.spyOn(boardService, 'isPlayerPositionSlime')
                .mockImplementationOnce(() => true)
                .mockImplementationOnce(() => false); // 6-9 = -3

            service.attack(combatRoom, room);

            expect(combatRoom.player2.player.health).toBe(ATTRIBUTE_INIT_VALUE);
        });
    });
    describe('evade', () => {
        beforeEach(() => {
            combatRoom.player1.player.health = 2;
            combatRoom.player2.player.health = 3;
            combatRoom.activePlayer = combatRoom.player1.player;
            combatRoom.player1.player.evadingAttempts = EVASION_ATTEMPTS;
            combatRoom.player2.player.evadingAttempts = EVASION_ATTEMPTS;
        });
        it('should allow evasion if the player can evade and his successful', () => {
            jest.spyOn(Math, 'random').mockReturnValue(RANDOM_THRESHOLD_1);

            service.evade(combatRoom);

            expect(combatRoom.player1.player.health).toBe(ATTRIBUTE_INIT_VALUE);
            expect(combatRoom.player2.player.health).toBe(ATTRIBUTE_INIT_VALUE);
            expect(combatRoom.activePlayer.evadingAttempts).toBeLessThan(ATTRIBUTE_INIT_VALUE);
        });
        it('should not allow the player to evade if he can evade but unsuccessful', () => {
            jest.spyOn(Math, 'random').mockReturnValue(RANDOM_THRESHOLD_2);

            service.evade(combatRoom);

            expect(combatRoom.player1.player.health).not.toBe(ATTRIBUTE_INIT_VALUE);
            expect(combatRoom.player2.player.health).not.toBe(ATTRIBUTE_INIT_VALUE);
            expect(combatRoom.activePlayer.evadingAttempts).toBe(EVASION_ATTEMPTS);
        });
        it('should not allow the player to evade if he cannot evade but his successful', () => {
            combatRoom.activePlayer.evadingAttempts = 0;
            jest.spyOn(Math, 'random').mockReturnValue(RANDOM_THRESHOLD_1);

            service.evade(combatRoom);

            expect(combatRoom.player1.player.health).not.toBe(ATTRIBUTE_INIT_VALUE);
            expect(combatRoom.player2.player.health).not.toBe(ATTRIBUTE_INIT_VALUE);
            expect(combatRoom.activePlayer.evadingAttempts).toBe(0);
        });
        it('should not allow the player to evade if he cannot evade and his unsuccessful', () => {
            combatRoom.activePlayer.evadingAttempts = 0;
            jest.spyOn(Math, 'random').mockReturnValue(RANDOM_THRESHOLD_2);

            service.evade(combatRoom);

            expect(combatRoom.player1.player.health).not.toBe(ATTRIBUTE_INIT_VALUE);
            expect(combatRoom.player2.player.health).not.toBe(ATTRIBUTE_INIT_VALUE);
            expect(combatRoom.activePlayer.evadingAttempts).toBe(0);
        });
    });
});
