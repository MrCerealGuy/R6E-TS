import Phaser from 'phaser'

import { SCALE, DSCALE } from '../utils/globals'
import Dungeon from  '../libs/dungeon-generator/src/generators/dungeon'
import Grunt from '../enemies/Grunt'

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

export default class RandomDungeon {
    private _map!: Phaser.Tilemaps.Tilemap
    private _groundLayer!: Phaser.Tilemaps.TilemapLayer
	private _wallsLayer!: Phaser.Tilemaps.TilemapLayer
    private _tileset!: Phaser.Tilemaps.Tileset
    private _scene: Phaser.Scene
	private _grunts!: Phaser.Physics.Arcade.Group

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

    getStartPos(){
        return _dungeon.start_pos   // grid array coordinates
    }

    getPlayerStartPosScreenXY() {
        let [tile_x,tile_y] = this.transformGrid2TileCoordinates(_dungeon.start_pos[0], _dungeon.start_pos[1])
		
		return this.transformTileCoordinates2ScreenXY(tile_x, tile_y)
    }

    generateDungeon() {
		_dungeon.generate();
		_dungeon.print();

		let [width, height] = _dungeon.size
		console.log("Dungeon width/height: "+width+"/"+height)

		this._map = this._scene.make.tilemap({
			tileWidth: 8, tileHeight: 8, 
			width: width*DSCALE, height: height*DSCALE
		})

		this._tileset = this._map.addTilesetImage('tiles', undefined, 8, 8, 0, 0)
		this._groundLayer = this._map.createBlankLayer('Ground', this._tileset)
		this._wallsLayer = this._map.createBlankLayer('Walls', this._tileset)

		this._wallsLayer.setCollisionByProperty({ collides: true })

		for (var y = 0; y < height; y++) {
			
			for (var dy = 0; dy < DSCALE; dy++) {
				
				for (var x = 0; x < width; x++) {
					let wall = _dungeon.walls.get([x,y])	// true, if wall

					for (var dx = 0; dx < DSCALE; dx++) {
						if (wall) {	// wall, id = 1
							this._wallsLayer.putTileAt(2, DSCALE*x+dx, DSCALE*y+dy, false).setCollision(true, true, true, true)
						}
						else {	// floor, id = 15
							this._groundLayer.putTileAt(16, DSCALE*x+dx, DSCALE*y+dy, false)
						}
					}
				}
			}
		}

		return this._tileset
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

	initGrunts() {
		// Create group
		this._grunts = this._scene.physics.add.group({
			classType: Grunt,
			createCallback: go => {
				const gruntGo = go as Grunt
				gruntGo.body.onCollide = true
			}
		})

		// Add 1 test grunt
		this._grunts.get(this.getPlayerStartPosScreenXY()[0]+64, this.getPlayerStartPosScreenXY()[1]+64, 'grunt') as Grunt
	}

	updateGrunts() {
		this.getGrunts().children.each(child => {
			const g = child as Grunt

			g.update()
		})
	}
}