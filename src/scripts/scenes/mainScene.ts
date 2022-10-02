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

import RandomDungeon from '../dungeon/dungeon'
import FOV from '../dungeon/fov'
import PathFinder from '../dungeon/pathfinder'

export default class MainScene extends Phaser.Scene {
	private fpsText

	private dungeon!: RandomDungeon
	private fov!: FOV
	private finder!: PathFinder

	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
	private player!: Player
	private knives!: Phaser.Physics.Arcade.Group
	private knife_hit_wall_sound!: Phaser.Sound.BaseSound

	private playerGruntsCollider?: Phaser.Physics.Arcade.Collider

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

		// Generate random dungeon
		this.generateRandomDungeon()
		
		// Init player
		this.initPlayer()

		// Init colliders
		this.initColliders()

		// Init FOV
		this.fov = new FOV(this, this.dungeon.getMap(), this.dungeon.getGroundLayer(), this.dungeon.getWallsLayer(), this.player)
		this.fov.initFOV()

		// Init EasyStar
		this.initPathFinder(this.dungeon.getMap(), this.dungeon.getTileset(), this.dungeon.getWallsLayer())
	}

	private initPathFinder(map: Phaser.Tilemaps.Tilemap, tileset: Phaser.Tilemaps.Tileset, wallsLayer: Phaser.Tilemaps.TilemapLayer) {
		this.finder = new PathFinder(map, tileset, wallsLayer)
		this.finder.initEasyStar()
	}

	private generateRandomDungeon() {
		this.dungeon = new RandomDungeon(this)
		this.dungeon.generateDungeon()

		// Init grunts
		this.dungeon.initGrunts()
	}

	private initPlayer() {
		// Init knives
		this.knives = this.physics.add.group({
			classType: Phaser.Physics.Arcade.Image,
			maxSize: 3
		})

		this.knife_hit_wall_sound = this.sound.add('knife-thrust-into-wall-sound', { volume: 0.2 })

		// Init player
		this.player = this.add.player(this.dungeon.getPlayerStartPosScreenXY()[0], this.dungeon.getPlayerStartPosScreenXY()[1], 'player')
		this.player.setKnives(this.knives)

		this.cameras.main.startFollow(this.player, true)
	}

	private initColliders() {
		this.physics.add.collider(this.player, this.dungeon.getGroundLayer())
		this.physics.add.collider(this.dungeon.getGrunts(), this.dungeon.getGroundLayer())

		this.physics.add.collider(this.player, this.dungeon.getWallsLayer())
		this.physics.add.collider(this.dungeon.getGrunts(), this.dungeon.getWallsLayer())

		this.physics.add.collider(this.knives, this.dungeon.getWallsLayer(), this.handleKnifeWallCollision, undefined, this)

		this.physics.add.collider(this.knives, this.dungeon.getGrunts(), this.handleKnifeGruntCollision, undefined, this)

		this.playerGruntsCollider = this.physics.add.collider(
			this.player,
			this.dungeon.getGrunts(),
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
		var player = this.player

		// Update player
		if (player) {
			player.update(t, this.cursors, pads)
		}

		// Update all grunts
		this.dungeon.updateGrunts()

		// Compute FOV
		this.fov.computeFOV()
	}
}
