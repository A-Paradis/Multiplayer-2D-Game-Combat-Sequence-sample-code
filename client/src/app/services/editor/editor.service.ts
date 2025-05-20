/* eslint-disable @typescript-eslint/member-ordering */
import { HttpClient, HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BoardSpecs } from '@app/interfaces/board';
import { CreateMapDto } from '@app/interfaces/edition/create-map-dto';
import { BoardSize } from '@common/constants';
import { GameMode } from '@common/interfaces/game-mode.interface';
import { Tile } from '@common/interfaces/tile.interface';
import { BehaviorSubject, catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class EditorService {
    private boardSize = new BehaviorSubject<BoardSize>(BoardSize.Small);
    private gameMode = new BehaviorSubject<GameMode>(GameMode.DEFAULT);
    private validTileLayout = new BehaviorSubject<Tile[]>([]);
    private isReadyForCheck = new BehaviorSubject<boolean>(false);

    isReadyForCheck$ = this.isReadyForCheck.asObservable();
    validTileLayout$ = this.validTileLayout.asObservable();
    boardSize$ = this.boardSize.asObservable();
    gameMode$ = this.gameMode.asObservable();

    constructor(private http: HttpClient) {}

    /* UPDATE SUBJECTS */
    updateTileLayout(newTileLayout: Tile[]) {
        this.validTileLayout.next(newTileLayout);
    }
    updateReadyForCheckStatus(newValue: boolean) {
        this.isReadyForCheck.next(newValue);
    }

    /** @brief updateBoardSize allows other components to modify boardSize*/
    setBoardSize(size: BoardSize): void {
        this.boardSize.next(size);
    }

    /** @brief setGameMode allows other components to modify gameMode*/
    setGameMode(mode: GameMode): void {
        this.gameMode.next(mode);
    }

    /* HTTP REQUESTS */

    /** @brief isGameNameValid sends a request to verify if the game name already exists */
    /** @returns Observable boolean : true if name valid
     */
    isGameNameValid(name: string): Observable<boolean> {
        return this.http.get<void>(`${environment.serverUrl}/api/maps/${name}/valid/`).pipe(
            map(() => true),
            catchError((error) => {
                if (error.status === HttpStatusCode.NotFound) {
                    return of(false);
                } else {
                    return throwError(() => new Error(`Failed to check name validity: ${error.message}`));
                }
            }),
        );
    }

    /** @brief saveEditedGame sends a request to save the game information in the database */
    /** @return HTTP status indicating saving operation success or failure */
    saveEditedGame(gameID: string | null, name: string, description: string, board: Tile[], img: string) {
        const game = {
            id: gameID,
            name,
            description,
            board,
            previewImage: img,
        };
        return this.http.patch(`${environment.serverUrl}/api/maps/`, game, { observe: 'response' }).pipe(map((response) => response.status));
    }

    /** @brief getGameFromDatabase requests the game information and the board to the server */
    /** @return Board Object containing: id, name, description, gameSize, Tile[] */
    fetchEditedGame(gameID: string): Observable<BoardSpecs> {
        return this.http.get<BoardSpecs>(`${environment.serverUrl}/api/maps/${gameID}`).pipe(
            catchError(() => {
                const fallbackBoard: BoardSpecs = {
                    name: 'Unknown',
                    description: 'No description available',
                    mapSize: BoardSize.Small,
                    gameMode: GameMode.DEFAULT,
                    board: [],
                };
                return of(fallbackBoard); // Returns a default object instead of throwing an error
            }),
        );
    }

    saveCreatedGame(mapToSave: CreateMapDto) {
        // eslint-disable-next-line no-console
        console.log(`Map to send : ${JSON.stringify(mapToSave)}`);
        return this.http.post(`${environment.serverUrl}/api/maps/`, mapToSave);
    }
}
