import Phaser from 'phaser'
import { Mrpas } from 'mrpas'
import '../characters/Player'
import Player from '../characters/Player'

export default class FOV {
    private _fov?: Mrpas
	private _fogColor = 0x202020

    private _scene: Phaser.Scene
    private _map: Phaser.Tilemaps.Tilemap
    private _groundLayer: Phaser.Tilemaps.TilemapLayer
    private _wallsLayer: Phaser.Tilemaps.TilemapLayer
    private _player: Player

    constructor(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap, groundLayer: Phaser.Tilemaps.TilemapLayer, wallsLayer: Phaser.Tilemaps.TilemapLayer, player: Player) {
        this._scene = scene
        this._map = map
        this._groundLayer = groundLayer
        this._wallsLayer = wallsLayer
        this._player = player
    }

    initFOV() {
		this._fov = new Mrpas(this._map.width, this._map.height, (x, y) => {
			const tile = this._wallsLayer!.getTileAt(x, y)

			// Check if there is a wall
			if (!tile) {
				// No wall, only ground. Transparency = true.
				return true
			}

			// A wall. Transparency = false
			return false
		})

        if (!this._fov)
            console.log("initFOV() failed.")
	}

	computeFOV() {
		if (!this._fov || !this._map || !this._groundLayer || !this._wallsLayer || !this._player) {
            console.log("computeFOV() failed.")
			return
		}

		// get camera view bounds
		const camera = this._scene.cameras.main
		const bounds = new Phaser.Geom.Rectangle(
			this._map.worldToTileX(camera.worldView.x) - 1,
			this._map.worldToTileY(camera.worldView.y) - 1,
			this._map.worldToTileX(camera.worldView.width) + 3,
			this._map.worldToTileX(camera.worldView.height) + 3
		)

		// set all tiles within camera view to invisible
		for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
			for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
				if (y < 0 || y >= this._map.height || x < 0 || x >= this._map.width) {
					continue
				}

				const tile1 = this._groundLayer.getTileAt(x, y)
				if (tile1) {
					tile1.alpha = 1
					tile1.tint = this._fogColor
				}

				const tile2 = this._wallsLayer.getTileAt(x, y)
				if (tile2) {
					tile2.alpha = 1
					tile2.tint = this._fogColor
				}
			}
		}

		// calculate fov here...
		// get player's position
		const px = this._map.worldToTileX(this._player.x)
		const py = this._map.worldToTileY(this._player.y)

		// compute fov from player's position
		this._fov.compute(
			px,
			py,
			7,
			(x, y) => {
				const tile1 = this._groundLayer!.getTileAt(x, y)
				const tile2 = this._wallsLayer!.getTileAt(x, y)

				if (!tile1) {
					if (!tile2) {
						return false
					}

					return (tile2?.tint === 0xffffff)
				}

				return (tile1?.tint === 0xffffff)
			},
			(x, y) => {
				const d = Phaser.Math.Distance.Between(py, px, y, x)
				const alpha = Math.min(2 - d / 6, 1)

				const tile1 = this._groundLayer!.getTileAt(x, y)
				const tile2 = this._wallsLayer!.getTileAt(x, y)
				
				if (tile1) {
					tile1.tint = 0xffffff
					tile1.alpha = alpha
				}

				if (tile2) {
					tile2.tint = 0xffffff
					tile2.alpha = alpha
				}
			}
		)
	}
}