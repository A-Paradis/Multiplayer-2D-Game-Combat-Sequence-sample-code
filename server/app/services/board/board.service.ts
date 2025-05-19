import { DIRECTIONS_VALUES, VisitableTile } from '@app/interfaces/accessible-tiles';
import { Room } from '@app/interfaces/room.interface';
import { RoomService } from '@app/services/room/room.service';
import { Player } from '@common/interfaces/player.interface';
import { Tile, tileCost, TileType } from '@common/interfaces/tile.interface';
import { Vec2 } from '@common/interfaces/vec2.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BoardService {
    constructor(private roomService: RoomService) {}

    /**
     * @brief Checks if a given player is on a slime tile
     * @param roomId
     * @param player
     * @returns an array of Vec2 of all accessible tiles
     */
    isPlayerPositionSlime(room: Room, player: Player): boolean | undefined {
        const tile = room.state.board.find((t) => t.player?.name === player.name);
        if (tile) return tile.id === TileType.Slime ? true : false;
        else return undefined;
    }

    /**
     * @brief toggleDoorState allows the player to open and close a door. A door cannot be opened or closed if a player is on it
     * @param roomId
     * @param doorPosition
     * @returns The position of the door that was modified
     */
    toggleDoorState(room: Room, doorPosition: Vec2): Tile | undefined {
        const tile = room.state.board.find((t) => t.position.x === doorPosition.x && t.position.y === doorPosition.y);
        if (tile) {
            const isTileADoor = tile.id === TileType.ClosedDoor || tile.id === TileType.OpenedDoor ? true : false;
            if (isTileADoor && (tile.player === undefined || tile.player === null)) {
                tile.id = tile.id === TileType.ClosedDoor ? TileType.OpenedDoor : TileType.ClosedDoor;
                return tile;
            }
        }
        return undefined;
    }

    /**
     * @brief Uses Breadth-first search algorithm to find player's accessible tiles from
     *        his current position
     * @param roomId
     * @param player
     * @returns an array of Vec2 of all accessible positions
     */
    getAccessibleTiles(roomId: string, player: Player): Vec2[] {
        const gameState = this.roomService.getRoomStateById(roomId);

        const currentBoard: Tile[] = gameState.board;
        const currentBoardSize: number = gameState.boardSize;

        const startingPosition: Vec2 = player.currPosition;
        const moves: number = player.movesLeft;

        const accessibleTiles: Vec2[] = []; // returned object

        const visitedTiles = new Map<Vec2, number>(); // coordinate + cost to reach
        visitedTiles.set(startingPosition, 0);

        const unvisitedTilesFIFO: VisitableTile[] = [];
        unvisitedTilesFIFO.push({ tile: this.findTileWithPosition(currentBoard, startingPosition), cost: 0 });

        let isFirstTile = true;

        // BFS ALGORITHM
        while (unvisitedTilesFIFO.length > 0) {
            const currTile: VisitableTile = unvisitedTilesFIFO.shift();

            if (!isFirstTile) {
                // if tile not accessible or already visited with lesser cost we ignore it
                if (!this.isTileAccessible(currTile.tile) || visitedTiles.get(currTile.tile.position) <= currTile.cost) {
                    continue;
                }

                // Adding the next tile to visited and accessible
                visitedTiles.set(currTile.tile.position, currTile.cost);
                accessibleTiles.push(currTile.tile.position);
            }

            // Check next tiles
            for (const direction of DIRECTIONS_VALUES) {
                const newX = currTile.tile.position.x + direction.x;
                const newY = currTile.tile.position.y + direction.y;

                if (newX < 0 || newX >= currentBoardSize || newY < 0 || newY >= currentBoardSize) {
                    continue;
                }

                // find cost
                const nextTile = this.findTileWithPosition(currentBoard, { x: newX, y: newY });
                const cost = this.getTileCost(nextTile);
                const totalCost = isFirstTile ? cost : currTile.cost + cost;

                if (totalCost <= moves && this.isTileAccessible(nextTile) && !visitedTiles.has(nextTile.position)) {
                    unvisitedTilesFIFO.push({ tile: nextTile, cost: totalCost });
                }
            }
            isFirstTile = false;
        }

        return accessibleTiles;
    }

    /**
     * @brief update the board and the player upon client movement on the board
     * @param roomId
     * @param path
     * @param playerName
     */
    updateAfterPlayerMove(roomId, path: Vec2[], playerName: string) {
        const player = this.roomService.getPlayerByName(roomId, playerName);
        const tilePath = this.getTilesFromPath(roomId, path);

        const initPosition: Vec2 = path[0];
        const finalPosition: Vec2 = path[path.length - 1];

        this.updatePlayerPosition(player, finalPosition);
        this.updatePlayerMoves(tilePath, player);
        this.updateBoardAfterMove(roomId, initPosition, finalPosition, player);
    }

    /**
     * @brief verifies if a tile with a given weight is accessible if no other player is on it
     * @param tile
     * @returns
     */
    private isTileAccessible(tile: Tile): boolean {
        if (tileCost[tile.id] !== Infinity) {
            return tile.player === null || tile.player === undefined;
        }
        return false;
    }

    /**
     * @brief gets the weight of a tile
     * @param tile
     * @returns the weight of the tile as a number
     */
    private getTileCost(tile: Tile): number {
        if (tile) return tileCost[tile.id];
        else return Infinity;
    }

    /**
     * @brief finds the tile interface in the game board given its position
     * @param board
     * @param position
     * @returns Tile
     */
    private findTileWithPosition(board: Tile[], position: Vec2): Tile {
        return board.find((tile) => tile.position.x === position.x && tile.position.y === position.y);
    }

    /**
     * @brief decreases player movement count upon his movement on the board
     * @param path
     * @param player
     */
    private updatePlayerMoves(path: Tile[], player: Player): void {
        let movesCost = 0;
        for (const tile of path) {
            if (tile.player) continue;
            movesCost += this.getTileCost(tile);
        }

        player.movesLeft -= movesCost;
    }

    /**
     * @brief changes the state of given tiles in the board after a player has moved
     * @param roomId
     * @param initPosition
     * @param finalPosition
     * @param player
     */
    private updateBoardAfterMove(roomId: string, initPosition: Vec2, finalPosition: Vec2, player: Player): void {
        const board = this.roomService.getRoomStateById(roomId).board;

        board.find((tile) => {
            if (tile.player?.name === player.name) {
                tile.player = undefined;
            }
        });

        board.find((tile) => {
            if (tile.position.x === finalPosition.x && tile.position.y === finalPosition.y) {
                tile.player = player;
            }
        });
    }

    /**
     * @brief changes the player's position to a new position
     * @param player
     * @param newPosition
     */
    private updatePlayerPosition(player: Player, newPosition: Vec2): void {
        player.currPosition.x = newPosition.x;
        player.currPosition.y = newPosition.y;
    }

    /**
     * @brief retrieves the accessible tile path to a given tile
     * @param roomId
     * @param path
     * @returns An array of Tile objects
     */
    private getTilesFromPath(roomId: string, path: Vec2[]): Tile[] {
        const board: Tile[] = this.roomService.getRoomStateById(roomId).board;
        const tilePath = board.filter((tile) => path.some((position) => position.x === tile.position.x && position.y === tile.position.y));

        return tilePath;
    }
}
