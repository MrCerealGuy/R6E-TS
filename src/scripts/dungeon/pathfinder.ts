import Phaser from 'phaser'
import { EasyStar } from '../libs/easystar'

export default class PathFinder {
    private _map: Phaser.Tilemaps.Tilemap
    private _tiles: Phaser.Tilemaps.Tileset
    private _wallsLayer: Phaser.Tilemaps.TilemapLayer
    private _finder

    constructor(map: Phaser.Tilemaps.Tilemap, tiles: Phaser.Tilemaps.Tileset, wallsLayer: Phaser.Tilemaps.TilemapLayer) {
        this._map = map
        this._tiles = tiles
        this._wallsLayer = wallsLayer
    }

   initEasyStar() {
		this._finder = new EasyStar.js()

		if (!this._finder) {
			console.log("Couldn't load EasyStar.")
			return
		}

		var grid: number[][] = []

		for (var y = 0; y < this._map.height; y++) {
			var col: number[] = []

			for (var x = 0; x < this._map.width; x++) {
				var index = this.getTileID(x, y)

				col.push(index)
			}

			grid.push(col)
		}

		console.log("Grid: " + grid)
		this._finder.setGrid(grid)

		var tileset = this._map.tilesets[0]
		var properties = tileset.tileProperties
		var acceptableTiles: number[] = [-1]

		console.log("AcceptableTiles: " + acceptableTiles)
		this._finder.setAcceptableTiles(acceptableTiles)
	}

    getEasyStar() {
        return this._finder
    }

	private getTileID(x: number, y: number) {
		var tile = this._wallsLayer.getTileAt(x, y, true)
		return tile?.index	// -1 = no wall tile
	}
}