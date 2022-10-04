import Phaser, { Tilemaps } from 'phaser'

import { SCALE, DSCALE } from '../utils/globals'
import Dungeon from  '../libs/dungeon-generator/src/generators/dungeon'
import Grunt from '../enemies/Grunt'
import Medikit from '../items/Medikit'

let _dungeon = new Dungeon({
    "size": [100, 100],
    "rooms": {
        "initial": {
            "min_size": [3, 3],
            "max_size": [6, 6],
            "max_exits": 1
        },
        "any": {
            "min_size": [3, 3],
            "max_size": [6, 6],
            "max_exits": 4
        }
    },
    "max_corridor_length": 6,
    "min_corridor_length": 2,
    "corridor_density": 0.5,
    "symmetric_rooms": false,
    "interconnects": 1,
    "max_interconnect_length": 10,
    "room_count": 20
});

let _tiles = {
	"walls": {
		"wall_0": 0,	// void
		"wall_1": 1,	// standard wall
		"wall_2": 2,	// upper wall
		"wall_3": 13,	// lower standard wall
		"wall_4": 12,	// lower wall with light
		"lower_wall_1": 13,
		"lower_wall_2": 5,
		"lower_wall_3": 46
	},

	"floors": {
		"floor_1": 15,	// standard floor tile
		"floor_random": [8,9,15,16,17,19,21,24,26]
	}
}

export default class RandomDungeon {
    private _map!: Phaser.Tilemaps.Tilemap
    private _groundLayer!: Phaser.Tilemaps.TilemapLayer
	private _wallsLayer!: Phaser.Tilemaps.TilemapLayer
    private _tileset!: Phaser.Tilemaps.Tileset
    private _scene: Phaser.Scene
	private _grunts!: Phaser.Physics.Arcade.Group

	private _medikits!: Phaser.Physics.Arcade.StaticGroup

    constructor(scene: Phaser.Scene) {
        this._scene = scene
    }

    getMap(){
        return this._map
    }

    getGroundLayer(){
        return this._groundLayer
    }

    getWallsLayer(){
        return this._wallsLayer
    }

    getTileset(){
        return this._tileset
    }

	getGrunts(){
		return this._grunts
	}

	getMedikits(){
		return this._medikits
	}

    getStartPos(){
        return _dungeon.start_pos   // grid array coordinates
    }

    getPlayerStartPosScreenXY() {
        let [tile_x,tile_y] = this.transformGrid2TileCoordinates(_dungeon.start_pos[0], _dungeon.start_pos[1])
		
		return this.transformTileCoordinates2ScreenXY(tile_x, tile_y)
    }

    generateDungeon() {
		_dungeon.generate();
		
		let [width, height] = _dungeon.size

		this._map = this._scene.make.tilemap({
			tileWidth: 8, tileHeight: 8, 
			width: width*DSCALE, height: height*DSCALE
		})

		this._tileset = this._map.addTilesetImage('tiles', undefined, 8, 8, 0, 0)
		this._groundLayer = this._map.createBlankLayer('Ground', this._tileset)
		this._wallsLayer = this._map.createBlankLayer('Walls', this._tileset)

		this._wallsLayer.setCollisionByProperty({ collides: true })

		// Fill layers with tiles
		for (var y = 0; y < height; y++) {
			
			for (var dy = 0; dy < DSCALE; dy++) {
				
				for (var x = 0; x < width; x++) {
					let wall = _dungeon.walls.get([x,y])	// true, if wall

					for (var dx = 0; dx < DSCALE; dx++) {
						if (wall) {	// wall, id = 1
							this._wallsLayer.putTileAt(_tiles.walls.wall_1, DSCALE*x+dx, DSCALE*y+dy, false).setCollision(true, true, true, true)
						}
						else {	// floor, id = 15
							this._groundLayer.putTileAt(_tiles.floors.floor_1, DSCALE*x+dx, DSCALE*y+dy, false)
						}
					}
				}
			}
		}

		this.replaceStandardWallsWithVoid()
		this.replaceUpperStandardWalls()
		this.replaceLowerStandardWalls()

		this.replaceFloors()
		this.placeGrunts()
		this.placeItems()
	}

	private replaceFloors() {
		var width = this._map.width
		var height = this._map.height

		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				let tile = this._groundLayer.getTileAt(x, y)

				// Check if standard floor
				if(tile?.index == _tiles.floors.floor_1) {
					// Yes, replace with another floor

					let rnd = Phaser.Math.Between(1,100)

					if (rnd < 80)
						this._groundLayer.putTileAt(_tiles.floors.floor_1,x,y)
					else
						this._groundLayer.putTileAt(_tiles.floors.floor_random[Phaser.Math.Between(0,_tiles.floors.floor_random.length-1)],x,y)
				}
			}
		}
	}

	private replaceStandardWallsWithVoid() {
		var width = this._map.width
		var height = this._map.height

		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				let tile = this._wallsLayer.getTileAt(x, y)

				// Check if standard wall
				if (tile?.index == _tiles.walls.wall_1) {
					let tile_l = this._wallsLayer.getTileAt(x-1, y)
					let tile_lu = this._wallsLayer.getTileAt(x-1, y-1)
					let tile_r = this._wallsLayer.getTileAt(x+1, y)
					let tile_ru = this._wallsLayer.getTileAt(x+1, y-1)
					let tile_u = this._wallsLayer.getTileAt(x, y-1)
					let tile_dl1 = this._wallsLayer.getTileAt(x-1, y+1)
					let tile_dr1 = this._wallsLayer.getTileAt(x+1, y+1)
					let tile_dl2 = this._wallsLayer.getTileAt(x-1, y+2)
					let tile_dr2 = this._wallsLayer.getTileAt(x+1, y+2)
					let tile_d1 = this._wallsLayer.getTileAt(x, y+1)
					let tile_d2 = this._wallsLayer.getTileAt(x, y+2)

					/*
									W W W
									W X W
									W W W
									W W W

									W = wall
									X = current wall tile
					*/

					// Check tiles for walls next of this tile
					if (tile_l && tile_lu && tile_r && tile_ru && tile_u && tile_dl1 && tile_dr1 && tile_dl2 && tile_dr2 && tile_d1 && tile_d2) {
						this._wallsLayer.putTileAt(_tiles.walls.wall_0, x, y).setCollision(true, true, true, true)
					}
				}
			}
		}
	}

	private replaceUpperStandardWalls() {
		var width = this._map.width
		var height = this._map.height

		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				let tile = this._wallsLayer.getTileAt(x, y)

				// Check if standard wall
				if (tile?.index == _tiles.walls.wall_1) {
					// Yes, check if lower tile is a floor tile
					let tile = this._groundLayer.getTileAt(x, y+1)

					if (tile?.index == _tiles.floors.floor_1) {
						// Yes, replace wall
						let  rnd = Phaser.Math.Between(1,100)

						if (rnd < 80)
							this._wallsLayer.putTileAt(_tiles.walls.wall_3, x, y).setCollision(true, true, true, true)
						else
							this._wallsLayer.putTileAt(_tiles.walls.wall_4, x, y).setCollision(true, true, true, true)

						// Check for upper wall tile
						if (y-1 >= 0) {
							let tile = this._wallsLayer.getTileAt(x, y-1)

							if (tile?.index == _tiles.walls.wall_1) {
								this._wallsLayer.putTileAt(_tiles.walls.wall_2,x, y-1).setCollision(true, true, true, true)
							}
						}

					}
				}
			}
		}

	}

	private replaceLowerStandardWalls() {
		var width = this._map.width
		var height = this._map.height

		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				let tile = this._wallsLayer.getTileAt(x, y)
				
				// Check for void wall
				if (tile?.index == _tiles.walls.wall_0) {
					// Yes, check for standard wall upper this tile
					let tile_u = this._wallsLayer.getTileAt(x, y-1)

					if (tile_u?.index == _tiles.walls.wall_1) {
						let rnd = Phaser.Math.Between(1,100)

						if (rnd < 80)
							this._wallsLayer.putTileAt(_tiles.walls.lower_wall_1,x,y)
						else
							this._wallsLayer.putTileAt(_tiles.walls.lower_wall_2,x,y)

						// Check for void wall lower this tile
						let tile_d = this._wallsLayer.getTileAt(x, y+1)

						if (tile_d?.index == _tiles.walls.wall_0) {
							this._wallsLayer.putTileAt(_tiles.walls.lower_wall_3,x,y+1)
						}
					}
				}
			}
		}
	}

    transformGrid2TileCoordinates(grid_x: number, grid_y: number)	{
		let [width, height] = _dungeon.size

		for (var y = 0; y < height; y++) {
			
			for (var dy = 0; dy < DSCALE; dy++) {
				
				for (var x = 0; x < width; x++) {
					let wall = _dungeon.walls.get([x,y])	// true, if wall

					for (var dx = 0; dx < DSCALE; dx++) {
						
						if (x == grid_x && y == grid_y)
							return [DSCALE*x+dx, DSCALE*y+dy]
					}
				}
			}
		}

		return [0, 0]
	}

	transformTileCoordinates2ScreenXY(tile_x: number, tile_y: number) {
		return [tile_x*8*SCALE,tile_y*8*SCALE]
	}

	placeGrunts() {
		// Create group for grunts
		this._grunts = this._scene.physics.add.group({
			classType: Grunt,
			createCallback: go => {
				const gruntGo = go as Grunt
				gruntGo.body.onCollide = true
			}
		})

		// Place grunts
		var width = this._map.width
		var height = this._map.height

		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				let tile = this._groundLayer.getTileAt(x, y)

				// Check if ground
				if (tile) {
					// Yes, place grunt
					let rnd = Phaser.Math.Between(1,500)

					if (rnd < 5) {
						let pos = this.transformTileCoordinates2ScreenXY(x,y)
						this._grunts.get(pos[0]+4, pos[1]+4, 'grunt_texture_atlas') as Grunt
					}
				}
			}
		}
	}

	placeItems() {
		// Place medikits
		this._medikits = this._scene.physics.add.staticGroup({
			classType: Medikit
		})

		var width = this._map.width
		var height = this._map.height

		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				let tile = this._groundLayer.getTileAt(x, y)

				// Check if ground
				if (tile) {
					// Yes, place medikit
					let rnd = Phaser.Math.Between(1,500)

					if (rnd < 5) {
						let pos = this.transformTileCoordinates2ScreenXY(x,y)
						this._medikits.get(pos[0]+4, pos[1]+4, 'items_texture_atlas') as Medikit
					}
				}
			}
		}
	}

	updateGrunts() {
		this.getGrunts().children.each(child => {
			const g = child as Grunt

			g.update()
		})
	}
}