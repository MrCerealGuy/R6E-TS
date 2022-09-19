import FpsText from '../objects/fpsText'

import { debugDraw } from '../utils/debug'
import { createGruntAnims } from '../anims/EnemyAnims'
import { createCharacterAnims } from '../anims/CharacterAnims'
import { createChestAnims } from '../anims/TreasureAnims'

import Grunt from '../enemies/Grunt'

import '../characters/Faune'
import Faune from '../characters/Faune'

import { sceneEvents } from '../events/EventsCenter'
import Chest from '../items/Chest'

export default class MainScene extends Phaser.Scene {
  private fpsText

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
	private faune!: Faune

	private knives!: Phaser.Physics.Arcade.Group
	private grunts!: Phaser.Physics.Arcade.Group

	private playerGruntsCollider?: Phaser.Physics.Arcade.Collider

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
		this.cursors = this.input.keyboard.createCursorKeys()
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

    const map = this.make.tilemap({ key: 'dungeon' })
		const tileset = map.addTilesetImage('dungeon', 'tiles', 8, 8, 1, 2)

		map.createLayer('Ground', tileset)

    this.knives = this.physics.add.group({
			classType: Phaser.Physics.Arcade.Image,
			maxSize: 3
		})

		this.faune = this.add.faune(128, 128, 'faune')
		this.faune.setKnives(this.knives)

		const wallsLayer = map.createLayer('Walls', tileset)

		wallsLayer.setCollisionByProperty({ collides: true })

    const chests = this.physics.add.staticGroup({
			classType: Chest
		})
		const chestsLayer = map.getObjectLayer('Chests')
		chestsLayer.objects.forEach(chestObj => {
			chests.get(chestObj.x! + chestObj.width! * 0.5, chestObj.y! - chestObj.height! * 0.5, 'treasure')
		})

		this.cameras.main.startFollow(this.faune, true)

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

		this.physics.add.collider(this.faune, wallsLayer)
		this.physics.add.collider(this.grunts, wallsLayer)

		this.physics.add.collider(this.faune, chests, this.handlePlayerChestCollision, undefined, this)

		this.physics.add.collider(this.knives, wallsLayer, this.handleKnifeWallCollision, undefined, this)
		this.physics.add.collider(this.knives, this.grunts, this.handleKnifeGruntCollision, undefined, this)

		this.playerGruntsCollider = this.physics.add.collider(this.grunts, this.faune, this.handlePlayerGruntCollision, undefined, this)
  }

  private handlePlayerChestCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject)
	{
		const chest = obj2 as Chest
		this.faune.setChest(chest)
	}

	private handleKnifeWallCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject)
	{
		this.knives.killAndHide(obj1)
	}

	private handleKnifeGruntCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject)
	{
		this.knives.killAndHide(obj1)
		this.grunts.killAndHide(obj2)
	}

	private handlePlayerGruntCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject)
	{
		const grunt = obj2 as Grunt
		
		const dx = this.faune.x - grunt.x
		const dy = this.faune.y - grunt.y

		const dir = new Phaser.Math.Vector2(dx, dy).normalize().scale(200)

		this.faune.handleDamage(dir)

		sceneEvents.emit('player-health-changed', this.faune.health)

		if (this.faune.health <= 0)
		{
			this.playerGruntsCollider?.destroy()
		}
	}

  update(t: number, dt: number) {
    this.fpsText.update()

    if (this.faune)
		{
			this.faune.update(this.cursors)
		}
  }
}
