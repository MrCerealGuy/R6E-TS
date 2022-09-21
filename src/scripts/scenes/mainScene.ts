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

import {SCALE} from '../utils/globals'

export default class MainScene extends Phaser.Scene {
  private fpsText

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
	private player!: Player

	private knives!: Phaser.Physics.Arcade.Group
	private knife_hit_wall_sound!: Phaser.Sound.BaseSound

	private grunts!: Phaser.Physics.Arcade.Group

	private playerGruntsCollider?: Phaser.Physics.Arcade.Collider

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
		this.cursors = this.input.keyboard.createCursorKeys()

		// load sfx
		this.load.audio('player-death-sound', [
			'assets/character/death.mp3'
		]);

		this.load.audio('player-hurt-sound', [
			'assets/character/hurt.mp3'
		]);

		this.load.audio('knife-throw-sound', [
			'assets/weapons/knife-throw.mp3'
		]);

		this.load.audio('knife-thrust-into-wall-sound', [
			'assets/weapons/knife-thrust-into-wall.mp3'
		]);

		this.load.audio('grunt-death-sound', [
			'assets/enemies/death.mp3'
		]);

		this.load.audio('grunt-hurt-sound', [
			'assets/enemies/hurt.mp3'
		]);
  }

  create() {
    this.fpsText = new FpsText(this)

    // display the Phaser.VERSION
    this.add
      .text(this.cameras.main.width - 15, 15, `Phaser v${Phaser.VERSION}`, {
        color: '#000000',
        fontSize: '24px'
      })
      .setOrigin(1, 0)

    this.scene.run('game-ui')
  
    createCharacterAnims(this.anims)
    createGruntAnims(this.anims)
    createChestAnims(this.anims)

    const map = this.make.tilemap({ key: 'tileset1' })
		//const tileset = map.addTilesetImage('dungeon', 'tiles', 8, 8, 1, 2)
    const tileset = map.addTilesetImage('tileset1', 'tiles', 8, 8)
    
    const groundLayer = map.createLayer('Ground', tileset)
    groundLayer.setScale(SCALE)

    groundLayer.setCollisionByProperty({ collides: true })

    this.knives = this.physics.add.group({
			classType: Phaser.Physics.Arcade.Image,
			maxSize: 3
		})

		this.knife_hit_wall_sound = this.sound.add('knife-thrust-into-wall-sound', {volume: 0.2})
    
		this.player = this.add.player(64*SCALE, 32*SCALE, 'player')
		this.player.setKnives(this.knives)

		const wallsLayer = map.createLayer('Walls', tileset)
    wallsLayer.setScale(SCALE)

		wallsLayer.setCollisionByProperty({ collides: true })

    const chests = this.physics.add.staticGroup({
			classType: Chest
		})
		/*const chestsLayer = map.getObjectLayer('Chests')
		chestsLayer.objects.forEach(chestObj => {
			chests.get(chestObj.x! + chestObj.width! * 0.5, chestObj.y! - chestObj.height! * 0.5, 'treasure')
		})*/
    
		this.cameras.main.startFollow(this.player, true)

		this.grunts = this.physics.add.group({
			classType: Grunt,
			createCallback: (go) => {
				const lizGo = go as Grunt
				lizGo.body.onCollide = true
			}
		})
    
		const gruntsLayer = map.getObjectLayer('Grunts')

		gruntsLayer.objects.forEach(lizObj => {
			this.grunts.get(lizObj.x! + lizObj.width! * 0.5, lizObj.y! - lizObj.height! * 0.5, 'grunt')
		})
    
    this.physics.add.collider(this.player, groundLayer)
		this.physics.add.collider(this.grunts, groundLayer)

		this.physics.add.collider(this.player, wallsLayer)
		this.physics.add.collider(this.grunts, wallsLayer)

		this.physics.add.collider(this.player, chests, this.handlePlayerChestCollision, undefined, this)

		this.physics.add.collider(this.knives, wallsLayer, this.handleKnifeWallCollision, undefined, this)
		this.physics.add.collider(this.knives, this.grunts, this.handleKnifeGruntCollision, undefined, this)

		this.playerGruntsCollider = this.physics.add.collider(this.grunts, this.player, this.handlePlayerGruntCollision, undefined, this)
  }

  private handlePlayerChestCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject)
	{
		const chest = obj2 as Chest
		this.player.setChest(chest)
	}

	private handleKnifeWallCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject)
	{
		this.knife_hit_wall_sound.play()
		this.knives.killAndHide(obj1)
	}

	private handleKnifeGruntCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject)
	{
		const grunt = obj2 as Grunt

		if (!grunt.dead)
			grunt.handleDeath()

		this.knives.killAndHide(obj1) // knives
		//this.grunts.killAndHide(obj2) // grunts
	}

	private handlePlayerGruntCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject)
	{
		const grunt = obj2 as Grunt

		if (grunt.dead)
			return
		
		const dx = this.player.x - grunt.x
		const dy = this.player.y - grunt.y

		const dir = new Phaser.Math.Vector2(dx, dy).normalize().scale(200)

		this.player.handleDamage(dir)

		sceneEvents.emit('player-health-changed', this.player.health)

		if (this.player.health <= 0)
		{
			this.playerGruntsCollider?.destroy()
		}
	}

  update(t: number, dt: number) {
    this.fpsText.update()
    var pads = this.input.gamepad.gamepads

    if (this.player)
		{
			this.player.update(this.cursors, pads)
		}
  }
}
