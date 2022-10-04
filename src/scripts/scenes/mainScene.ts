import FpsText from '../objects/fpsText'

import { createGruntAnims } from '../anims/EnemyAnims'
import { createCharacterAnims } from '../anims/CharacterAnims'
import { createItemAnims } from '../anims/ItemAnims'

import Grunt from '../enemies/Grunt'
import Medikit from '../items/Medikit'

import '../characters/Player'
import Player from '../characters/Player'

import { sceneEvents } from '../events/EventsCenter'

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
		this.load.audio('grunt-death-sound', ['assets/enemies/death.mp3'])
		this.load.audio('grunt-hurt-sound', ['assets/enemies/hurt.mp3'])
		this.load.audio('grunt-detected-sound', ['assets/enemies/detected.mp3'])
		this.load.audio('player-death-sound', ['assets/character/death.mp3'])
		this.load.audio('player-hurt-sound', ['assets/character/hurt.mp3'])
		this.load.audio('knife-throw-sound', ['assets/weapons/knife-throw.mp3'])
		this.load.audio('knife-thrust-into-wall-sound', ['assets/weapons/knife-thrust-into-wall.mp3'])
	}

	create() {
		this.fpsText = new FpsText(this)

		this.scene.run('game-ui')

		// Init anims
		createCharacterAnims(this.anims)
		createGruntAnims(this.anims)
		createItemAnims(this.anims)

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

	private initPlayer() {
		this.player = this.add.player(this.dungeon.getPlayerStartPosScreenXY()[0], this.dungeon.getPlayerStartPosScreenXY()[1], 'player')

		if (!this.player)
			console.log("Init player failed.")
	}

	private initPathFinder(map: Phaser.Tilemaps.Tilemap, tileset: Phaser.Tilemaps.Tileset, wallsLayer: Phaser.Tilemaps.TilemapLayer) {
		this.finder = new PathFinder(map, tileset, wallsLayer)

		if (!this.finder) {
			console.log("Init path finder failed.")
			return
		}

		this.finder.initEasyStar()
	}

	private generateRandomDungeon() {
		this.dungeon = new RandomDungeon(this)

		if (!this.dungeon)
			console.log("Couldn't generate dungeon.")

		this.dungeon.generateDungeon()
	}

	private initColliders() {
		if (!this.player || !this.dungeon) {
			console.log("Init colliders failed.")
			return
		}

		this.physics.add.collider(this.player, this.dungeon.getGroundLayer())
		this.physics.add.collider(this.dungeon.getGrunts(), this.dungeon.getGroundLayer())

		this.physics.add.collider(this.player, this.dungeon.getWallsLayer())
		this.physics.add.collider(this.dungeon.getGrunts(), this.dungeon.getWallsLayer())

		this.physics.add.collider(this.player.getKnives(), this.dungeon.getWallsLayer(), this.handleKnifeWallCollision, undefined, this)

		this.physics.add.collider(this.player.getKnives(), this.dungeon.getGrunts(), this.handleKnifeGruntCollision, undefined, this)

		this.physics.add.collider(this.player, this.dungeon.getMedikits(), this.handlePlayerMedikitCollision, undefined, this)

		this.playerGruntsCollider = this.physics.add.collider(
			this.player,
			this.dungeon.getGrunts(),
			this.handlePlayerGruntCollision,
			undefined,
			this
		)
	}

	private handleKnifeWallCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject) {
		this.player.handleKnifeHitWall(obj1)
	}

	private handleKnifeGruntCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject) {
		const grunt = obj2 as Grunt

		if (!grunt.isDead()) grunt.handleDeath()

		this.player.handleKnifeHitGrunt(obj1)
	}

	private handlePlayerMedikitCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject) {
		const medi = obj2 as Medikit
		this.player.collectMedikit(medi)
	}

	private handlePlayerGruntCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject) {
		const grunt = obj2 as Grunt

		if (grunt.handleAttackPlayer(this.player)) {
			sceneEvents.emit('player-health-changed', this.player.health)

			if (this.player.isDead()) {
				this.playerGruntsCollider?.destroy()
			}
		}
	}

	update(t: number, dt: number) {
		var pads = this.input.gamepad.gamepads

		// Update player
		if (this.player) {
			this.player.update(t, this.cursors, pads)
		}

		// Update all grunts
		this.dungeon.updateGrunts()

		// Compute FOV
		this.fov.computeFOV()
	}
}
