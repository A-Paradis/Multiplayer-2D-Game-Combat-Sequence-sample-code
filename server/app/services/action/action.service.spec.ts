import { BoardService } from '@app/services/board/board.service';
import { mockRoom2 } from '@app/utils/mock-values';
import { Tile } from '@common/interfaces/tile.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { ActionService } from './action.service';

describe('ActionService', () => {
    let actionService: ActionService;
    let boardService: BoardService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionService,
                {
                    provide: BoardService,
                    useValue: {
                        toggleDoorState: jest.fn(),
                    },
                },
            ],
        }).compile();

        actionService = module.get<ActionService>(ActionService);
        boardService = module.get<BoardService>(BoardService);
    });

    it('should call toggleDoorState with correct parameters and return its result', () => {
        const mockTile: Tile = {
            id: 1,
            position: { x: 5, y: 3 },
            itemId: null,
            player: null,
        };
        (boardService.toggleDoorState as jest.Mock).mockReturnValue(mockTile);
        const result = actionService.interactWithDoor(mockRoom2, mockTile.position);
        expect(boardService.toggleDoorState).toHaveBeenCalledWith(mockRoom2, mockTile.position);
        expect(result).toBe(mockTile);
    });
});
