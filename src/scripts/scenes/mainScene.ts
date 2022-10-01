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
import RandomDungeon from '../dungeon/dungeon'
import FOV from '../dungeon/fov'

export default class MainScene extends Phaser.Scene {
	private fpsText

	private fov!: FOV

	private map!: Phaser.Tilemaps.Tilemap
	private groundLayer!: Phaser.Tilemaps.TilemapLayer
	private wallsLayer!: Phaser.Tilemaps.TilemapLayer
	private gruntsLayer!: Phaser.Tilemaps.ObjectLayer

	private dungeon!: RandomDungeon

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
		if (RANDOM_DUNGEONS) {
			this.map.destroy()
			this.dungeon = new RandomDungeon(this)
			this.dungeon.generateDungeon()

			this.map = this.dungeon.getMap()
			this.wallsLayer = this.dungeon.getWallsLayer()
			this.groundLayer = this.dungeon.getGroundLayer()
			tileset = this.dungeon.getTileset()
		}

		// Init player
		this.initPlayer()

		// Init grunts
		this.initGrunts(this.map)

		// Init colliders
		this.initColliders()

		// Init FOV
		this.fov = new FOV(this, this.map, this.groundLayer, this.wallsLayer, this.player)
		this.fov.initFOV()

		// Init EasyStar
		this.initEasyStar(this.map, tileset)
	}

	private initPlayer() {
		// Init knives
		this.knives = this.physics.add.group({
			classType: Phaser.Physics.Arcade.Image,
			maxSize: 3
		})

		this.knife_hit_wall_sound = this.sound.add('knife-thrust-into-wall-sound', { volume: 0.2 })

		// Init player
		if (RANDOM_DUNGEONS) {
			this.player = this.add.player(this.dungeon.getPlayerStartPosScreenXY()[0], this.dungeon.getPlayerStartPosScreenXY()[1], 'player')
		}
		else
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
		this.fov.computeFOV()
	}
}
