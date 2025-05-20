import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { BoardSpecs } from '@app/interfaces/board';
import { CreateMapDto } from '@app/interfaces/edition/create-map-dto';
import { BoardSize } from '@common/constants';
import { GameMode } from '@common/interfaces/game-mode.interface';
import { Tile } from '@common/interfaces/tile.interface';
import { of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EditorService } from './editor.service';

describe('EditorService', () => {
    let service: EditorService;
    let httpClientSpy: jasmine.SpyObj<HttpClient>;

    beforeEach(() => {
        const spy = jasmine.createSpyObj('HttpClient', ['get', 'patch', 'post']);
        TestBed.configureTestingModule({
            providers: [EditorService, { provide: HttpClient, useValue: spy }],
        });
        service = TestBed.inject(EditorService);
        httpClientSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should update tile layout', () => {
        const newTileLayout: Tile[] = [{ id: 1 } as Tile];
        service.updateTileLayout(newTileLayout);
        service.validTileLayout$.subscribe((layout) => {
            expect(layout).toEqual(newTileLayout);
        });
    });

    it('should update ready for check status', () => {
        service.updateReadyForCheckStatus(true);
        service.isReadyForCheck$.subscribe((status) => {
            expect(status).toBeTrue();
        });
    });

    it('should set board size', () => {
        service.setBoardSize(BoardSize.Large);
        service.boardSize$.subscribe((size) => {
            expect(size).toBe(BoardSize.Large);
        });
    });

    it('should set game mode', () => {
        service.setGameMode(GameMode.DEFAULT);
        service.gameMode$.subscribe((mode) => {
            expect(mode).toBe(GameMode.DEFAULT);
        });
    });

    it('should return true if game name is valid', () => {
        httpClientSpy.get.and.returnValue(of({}));
        service.isGameNameValid('validName').subscribe((result) => {
            expect(result).toBeTrue();
        });
        expect(httpClientSpy.get).toHaveBeenCalledWith(`${environment.serverUrl}/api/maps/validName/valid/`);
    });

    it('should return false if game name is invalid', () => {
        httpClientSpy.get.and.returnValue(throwError(() => ({ status: 404 })));
        service.isGameNameValid('invalidName').subscribe((result) => {
            expect(result).toBeFalse();
        });
    });

    it('should handle error when checking game name validity', () => {
        httpClientSpy.get.and.returnValue(throwError(() => ({ status: 500, message: 'Server error' })));
        service.isGameNameValid('errorName').subscribe({
            error: (err) => {
                expect(err.message).toContain('Failed to check name validity');
            },
        });
    });

    it('should save edited game', () => {
        const code = 200;
        const mockResponse = { status: code };
        httpClientSpy.patch.and.returnValue(of(mockResponse));
        const gameID = '123';
        const name = 'Test Game';
        const description = 'Test Description';
        const board: Tile[] = [];
        const img = 'test.png';

        service.saveEditedGame(gameID, name, description, board, img).subscribe((status) => {
            expect(status).toBe(code);
        });
        expect(httpClientSpy.patch).toHaveBeenCalledWith(
            `${environment.serverUrl}/api/maps/`,
            {
                id: gameID,
                name,
                description,
                board,
                previewImage: img,
            },
            { observe: 'response' as 'body' },
        );
    });

    it('should fetch edited game', () => {
        const mockBoard: BoardSpecs = {
            name: 'Test Game',
            description: 'Test Description',
            mapSize: BoardSize.Small,
            gameMode: GameMode.DEFAULT,
            board: [],
        };
        httpClientSpy.get.and.returnValue(of(mockBoard));
        service.fetchEditedGame('123').subscribe((board) => {
            expect(board).toEqual(mockBoard);
        });
    });

    it('should return fallback board on fetch error', () => {
        httpClientSpy.get.and.returnValue(throwError(() => new Error('Fetch error')));
        service.fetchEditedGame('123').subscribe((board) => {
            expect(board.name).toBe('Unknown');
            expect(board.description).toBe('No description available');
        });
    });

    it('should save created game', () => {
        const mockMap: CreateMapDto = {
            name: 'Test Map',
            description: 'Test Description',
            mapSize: `${BoardSize.Small}`,
            gameMode: GameMode.DEFAULT,
            board: [],
            previewImage: 'test.png',
        };
        httpClientSpy.post.and.returnValue(of({}));
        service.saveCreatedGame(mockMap).subscribe(() => {
            expect(httpClientSpy.post).toHaveBeenCalledWith(`${environment.serverUrl}/api/maps/`, mockMap);
        });
    });
});
