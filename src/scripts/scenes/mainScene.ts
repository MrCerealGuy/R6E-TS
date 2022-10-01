import FpsText from '../objects/fpsText'

import { debugDraw } from '../utils/debug'
import { createGruntAnims } from '../anims/EnemyAnims'
import { createCharacterAnims } from '../anims/CharacterAnims'
import { createChestAnims } from '../anims/TreasureAnims'

import Grunt from '../enemies/Grunt'

import '../characters/Player'
import Player from '../characters/Player'

import { sceneEvents } from '../events/EventsCenter'
import Chest from '../items/Chest'
import { Game } from 'phaser'

import { SCALE, RANDOM_DUNGEONS } from '../utils/globals'
import { EasyStar } from '../libs/easystar'
import { Mrpas } from 'mrpas'

import Dungeon from  '../libs/dungeon-generator/src/generators/dungeon';

let dungeon = new Dungeon({
    "size": [100, 100],
    "rooms": {
        "initial": {
            "min_size": [3, 3],
            "max_size": [9, 9],
            "max_exits": 1
        },
        "any": {
            "min_size": [5, 5],
            "max_size": [10, 10],
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

export default class MainScene extends Phaser.Scene {
	private fpsText

	private fov?: Mrpas
	private fogColor = 0x101010

	private map!: Phaser.Tilemaps.Tilemap
	private groundLayer!: Phaser.Tilemaps.TilemapLayer
	private wallsLayer!: Phaser.Tilemaps.TilemapLayer
	private gruntsLayer!: Phaser.Tilemaps.ObjectLayer

	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
	private player!: Player

	private knives!: Phaser.Physics.Arcade.Group
	private knife_hit_wall_sound!: Phaser.Sound.BaseSound

	private grunts!: Phaser.Physics.Arcade.Group
	private playerGruntsCollider?: Phaser.Physics.Arcade.Collider
	private finder

	constructor() {
		super({ key: 'MainScene' })
	}

	public getPlayer() {
		return this.player
	}

	preload() {
		this.cursors = this.input.keyboard.createCursorKeys()

		// Load sfx
		this.load.audio('player-death-sound', ['assets/character/death.mp3'])

		this.load.audio('player-hurt-sound', ['assets/character/hurt.mp3'])

		this.load.audio('knife-throw-sound', ['assets/weapons/knife-throw.mp3'])

		this.load.audio('knife-thrust-into-wall-sound', ['assets/weapons/knife-thrust-into-wall.mp3'])

		this.load.audio('grunt-death-sound', ['assets/enemies/death.mp3'])

		this.load.audio('grunt-hurt-sound', ['assets/enemies/hurt.mp3'])

		this.load.audio('grunt-detected-sound', ['assets/enemies/detected.mp3'])
	}

	create() {
		this.fpsText = new FpsText(this)

		this.scene.run('game-ui')

		// Init anims
		createCharacterAnims(this.anims)
		createGruntAnims(this.anims)
		createChestAnims(this.anims)

		// Init map and tileset
		this.map = this.make.tilemap({ key: 'tileset1' })
		var tileset = this.map.addTilesetImage('tileset1', 'tiles', 8, 8)

		// Init tilemap layers
		if (!RANDOM_DUNGEONS)
			this.initTilemapLayers(this.map, tileset)

		// Generate random dungeon
		if (RANDOM_DUNGEONS)
			tileset = this.generateDungeon()

		// Init FOV
		this.initFOV()

		// Init player
		this.initPlayer()

		// Init grunts
		this.initGrunts(this.map)

		// Init colliders
		this.initColliders()

		// Init EasyStar
		this.initEasyStar(this.map, tileset)
	}

	private generateDungeon() {
		dungeon.generate();
		dungeon.print();

		const DSCALE = 3

		let [width, height] = dungeon.size
		console.log("Dungeon width/height: "+width+"/"+height)

		this.map.destroy()

		this.map = this.make.tilemap({
			tileWidth: 8, tileHeight: 8, 
			width: width*DSCALE, height: height*DSCALE
		})

		var tileset = this.map.addTilesetImage('tiles', undefined, 8, 8, 0, 0)
		this.groundLayer = this.map.createBlankLayer('Ground', tileset)
		this.wallsLayer = this.map.createBlankLayer('Walls', tileset)

		this.wallsLayer.setCollisionByProperty({ collides: true })

		for (var y = 0; y < height; y++) {
			
			for (var dy = 0; dy < DSCALE; dy++) {
				
				for (var x = 0; x < width; x++) {
					let wall = dungeon.walls.get([x,y])	// true, if wall

					for (var dx = 0; dx < DSCALE; dx++) {
						if (wall) {	// wall, id = 1
							this.wallsLayer.putTileAt(2, DSCALE*x+dx, DSCALE*y+dy, false).setCollision(true, true, true, true)
						}
						else {	// floor, id = 15
							this.groundLayer.putTileAt(16, DSCALE*x+dx, DSCALE*y+dy, false)
						}
					}
				}
			}
		}

		return tileset
	}

	private initPlayer() {
		// Init knives
		this.knives = this.physics.add.group({
			classType: Phaser.Physics.Arcade.Image,
			maxSize: 3
		})

		this.knife_hit_wall_sound = this.sound.add('knife-thrust-into-wall-sound', { volume: 0.2 })

		// Init player
		this.player = this.add.player(64 * SCALE, 32 * SCALE, 'player')
		this.player.setKnives(this.knives)

		this.cameras.main.startFollow(this.player, true)
	}

	private initEasyStar(map: Phaser.Tilemaps.Tilemap, tiles: Phaser.Tilemaps.Tileset) {
		this.finder = new EasyStar.js()

		if (!this.finder) {
			console.log("Couldn't load EasyStar.")
			return
		}

		var grid: number[][] = []

		for (var y = 0; y < map.height; y++) {
			var col: number[] = []

			for (var x = 0; x < map.width; x++) {
				var index = this.getTileID(x, y)

				col.push(index)
			}

			grid.push(col)
		}

		console.log("Grid: " + grid)
		this.finder.setGrid(grid)

		var tileset = map.tilesets[0]
		var properties = tileset.tileProperties
		var acceptableTiles: number[] = [-1]

		console.log("AcceptableTiles: " + acceptableTiles)
		this.finder.setAcceptableTiles(acceptableTiles)
	}

	private getTileID(x: number, y: number) {
		var tile = this.wallsLayer.getTileAt(x, y, true)
		return tile?.index	// -1 = no wall tile
	}

	private initGrunts(map: Phaser.Tilemaps.Tilemap) {
		// Create group
		this.grunts = this.physics.add.group({
			classType: Grunt,
			createCallback: go => {
				const gruntGo = go as Grunt
				gruntGo.body.onCollide = true
			}
		})

		this.gruntsLayer = map.getObjectLayer('Grunts')

		// Create grunts from layer
		this.gruntsLayer?.objects.forEach(gruntObj => {
			this.grunts.get(gruntObj.x! + gruntObj.width! * 0.5, gruntObj.y! - gruntObj.height! * 0.5, 'grunt')
		})
	}

	private initTilemapLayers(map: Phaser.Tilemaps.Tilemap, tileset: Phaser.Tilemaps.Tileset) {
		this.groundLayer = map.createLayer('Ground', tileset)
		this.groundLayer.setScale(SCALE)

		this.groundLayer.setCollisionByProperty({ collides: true })

		this.wallsLayer = map.createLayer('Walls', tileset)
		this.wallsLayer.setScale(SCALE)

		this.wallsLayer.setCollisionByProperty({ collides: true })

		/*
		const chests = this.physics.add.staticGroup({
			classType: Chest
		})

		const chestsLayer = map.getObjectLayer('Chests')
			chestsLayer.objects.forEach(chestObj => {
				chests.get(chestObj.x! + chestObj.width! * 0.5, chestObj.y! - chestObj.height! * 0.5, 'treasure')
			})*/
	}

	private initFOV() {
		this.fov = new Mrpas(this.map.width, this.map.height, (x, y) => {
			const tile1 = this.groundLayer!.getTileAt(x, y)
			const tile2 = this.wallsLayer!.getTileAt(x, y)

			// Check if there is a wall
			if (!tile2) {
				// No wall, only ground. Return true.
				return true
			}

			// A wall. True, if wall collides.
			return tile2 && !tile2.collides
		})
	}

	private computeFOV() {
		if (!this.fov || !this.map || !this.groundLayer || !this.wallsLayer || !this.player) {
			return
		}

		// get camera view bounds
		const camera = this.cameras.main
		const bounds = new Phaser.Geom.Rectangle(
			this.map.worldToTileX(camera.worldView.x) - 1,
			this.map.worldToTileY(camera.worldView.y) - 1,
			this.map.worldToTileX(camera.worldView.width) + 2,
			this.map.worldToTileX(camera.worldView.height) + 3
		)

		// set all tiles within camera view to invisible
		for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
			for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
				if (y < 0 || y >= this.map.height || x < 0 || x >= this.map.width) {
					continue
				}

				const tile1 = this.groundLayer.getTileAt(x, y)
				if (!tile1) {
					continue
				}

				tile1.alpha = 1
				tile1.tint = this.fogColor

				const tile2 = this.wallsLayer.getTileAt(x, y)
				if (!tile2) {
					continue
				}

				tile2.alpha = 1
				tile2.tint = this.fogColor
			}
		}

		// calculate fov here...
		// get player's position
		const px = this.map.worldToTileX(this.player.x)
		const py = this.map.worldToTileY(this.player.y)

		// compute fov from player's position
		this.fov.compute(
			px,
			py,
			7,
			(x, y) => {
				const tile1 = this.groundLayer!.getTileAt(x, y)
				const tile2 = this.wallsLayer!.getTileAt(x, y)
				if (!tile1) {
					return false
				}

				if (!tile2) {
					return tile1.tint === 0xffffff
				}

				return (tile1.tint === 0xffffff && tile2.tint === 0xffffff)
			},
			(x, y) => {
				const d = Phaser.Math.Distance.Between(py, px, y, x)
				const alpha = Math.min(2 - d / 6, 1)

				const tile1 = this.groundLayer!.getTileAt(x, y)
				if (!tile1) {
					return
				}

				tile1.tint = 0xffffff
				tile1.alpha = alpha

				const tile2 = this.wallsLayer!.getTileAt(x, y)
				if (!tile2) {
					return
				}

				tile2.tint = 0xffffff
				tile2.alpha = alpha
			}
		)
	}

	private initColliders() {
		this.physics.add.collider(this.player, this.groundLayer)
		this.physics.add.collider(this.grunts, this.groundLayer)

		this.physics.add.collider(this.player, this.wallsLayer)
		this.physics.add.collider(this.grunts, this.wallsLayer)

		//this.physics.add.collider(this.player, chests, this.handlePlayerChestCollision, undefined, this)

		this.physics.add.collider(this.knives, this.wallsLayer, this.handleKnifeWallCollision, undefined, this)

		this.physics.add.collider(this.knives, this.grunts, this.handleKnifeGruntCollision, undefined, this)

		this.playerGruntsCollider = this.physics.add.collider(
			this.player,
			this.grunts,
			this.handlePlayerGruntCollision,
			undefined,
			this
		)
	}

	private handlePlayerChestCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject) {
		const chest = obj2 as Chest
		this.player.setChest(chest)
	}

	private handleKnifeWallCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject) {
		this.knife_hit_wall_sound.play()
		this.knives.killAndHide(obj1)
	}

	private handleKnifeGruntCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject) {
		const grunt = obj2 as Grunt

		if (!grunt.isDead()) grunt.handleDeath()

		this.knives.killAndHide(obj1) // knives
		//this.grunts.killAndHide(obj2) // grunts
	}

	private handlePlayerGruntCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject) {
		const grunt = obj2 as Grunt

		if (grunt.isDead() || this.player.isDead()) return

		const dx = this.player.x - grunt.x
		const dy = this.player.y - grunt.y

		const dir = new Phaser.Math.Vector2(dx, dy).normalize().scale(200)

		this.player.handleDamage(dir)

		sceneEvents.emit('player-health-changed', this.player.health)

		if (this.player.health <= 0) {
			this.playerGruntsCollider?.destroy()
		}
	}

	update(t: number, dt: number) {
		//this.fpsText.update()

		var pads = this.input.gamepad.gamepads
		var map = this.map
		var player = this.player

		// Update player
		if (player) {
			player.update(t, this.cursors, pads)
		}

		// Update all grunts
		this.grunts.children.each(child => {
			const grunt = child as Grunt

			grunt.update()
		})

		// Compute FOV
		this.computeFOV()
	}
}
