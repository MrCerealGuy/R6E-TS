import Phaser from 'phaser'
import Chest from '../items/Chest'

import { sceneEvents } from '../events/EventsCenter'

import { SCALE } from '../utils/globals'

declare global {
	namespace Phaser.GameObjects {
		interface GameObjectFactory {
			player(x: number, y: number, texture: string, frame?: string | number): Player
		}
	}
}

enum HealthState {
	IDLE,
	DAMAGE,
	DEAD
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
	private healthState = HealthState.IDLE
	private damageTime = 0

	private _health = 3
	private _coins = 0

	private knives!: Phaser.Physics.Arcade.Group
	private activeChest?: Chest

	private death_sound!: Phaser.Sound.BaseSound
	private hurt_sound!: Phaser.Sound.BaseSound
	private knife_throw_sound!: Phaser.Sound.BaseSound
	private knife_hit_wall_sound!: Phaser.Sound.BaseSound

	private _scene!: Phaser.Scene

	private lastFired = 0

	constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
		super(scene, x * SCALE, y * SCALE, texture, frame)

		this._scene = scene

		this.knife_hit_wall_sound = scene.sound.add('knife-thrust-into-wall-sound', { volume: 0.2 })

		if (!this.knife_hit_wall_sound)
			console.log("Couldn't load knife_hit_wall_sound")

		this.death_sound = scene.sound.add('player-death-sound', { volume: 0.2 })
		this.hurt_sound = scene.sound.add('player-hurt-sound', { volume: 0.2 })
		this.knife_throw_sound = scene.sound.add('knife-throw-sound', { volume: 0.2 })

		this.anims.play('player-idle-down')

		this.setScale(SCALE)
		this.setDepth(1)

		scene.cameras.main.startFollow(this, true)

		// Init knives
		this.knives = this._scene.physics.add.group({
			classType: Phaser.Physics.Arcade.Image,
			maxSize: 3
		})
	}

	get health() {
		return this._health
	}

	isDead() {
		if (this._health == 0)
			return true
		else
			return false
	}

	getKnives() {
		return this.knives
	}

	setChest(chest: Chest) {
		this.activeChest = chest
	}

	handleDamage(dir: Phaser.Math.Vector2) {
		if (this._health <= 0) {
			return
		}

		if (this.healthState === HealthState.DAMAGE) {
			return
		}

		--this._health

		if (this._health <= 0) {
			// TODO: die
			this.healthState = HealthState.DEAD
			this.anims.play('player-faint')
			this.setVelocity(0, 0)

			this.death_sound.play()
		}
		else {
			this.setVelocity(dir.x, dir.y)

			this.setTint(0xff0000)

			this.healthState = HealthState.DAMAGE
			this.damageTime = 0

			this.hurt_sound.play()
		}
	}

	handleKnifeHitWall(obj1: Phaser.GameObjects.GameObject) {
		this.knife_hit_wall_sound.play()
		obj1.destroy()
		this.knives.killAndHide(obj1)
	}

	handleKnifeHitGrunt(obj1: Phaser.GameObjects.GameObject) {
		obj1.destroy()
		this.knives.killAndHide(obj1)
	}

	private throwKnife() {
		if (!this.knives) {
			return
		}

		const knife = this.knives.get(this.x, this.y, 'knife') as Phaser.Physics.Arcade.Image

		if (!knife) {
			return
		}

		//this.knife_throw_sound.play()

		const parts = this.anims.currentAnim.key.split('-')
		const direction = parts[2]

		const vec = new Phaser.Math.Vector2(0, 0)

		switch (direction) {
			case 'up':
				vec.y = -1
				break

			case 'down':
				vec.y = 1
				break

			default:
			case 'side':
				if (this.scaleX < 0) {
					vec.x = -1
				}
				else {
					vec.x = 1
				}
				break
		}

		const angle = vec.angle()

		knife.setActive(true)
		knife.setVisible(true)

		knife.setRotation(angle)

		knife.x += vec.x * 16
		knife.y += vec.y * 16

		knife.setVelocity(vec.x * 300, vec.y * 300)
	}

	preUpdate(t: number, dt: number) {
		super.preUpdate(t, dt)

		switch (this.healthState) {
			case HealthState.IDLE:
				break

			case HealthState.DAMAGE:
				this.damageTime += dt
				if (this.damageTime >= 250) {
					this.healthState = HealthState.IDLE
					this.setTint(0xffffff)
					this.damageTime = 0
				}
				break
		}
	}

	update(time: number, cursors: Phaser.Types.Input.Keyboard.CursorKeys, pads: Phaser.Input.Gamepad.Gamepad[]) {
		const speed = 50

		const leftDown = cursors.left?.isDown
		const rightDown = cursors.right?.isDown
		const upDown = cursors.up?.isDown
		const downDown = cursors.down?.isDown

		const padLeftDown = pads[0]?.buttons[14]?.value
		const padRightDown = pads[0]?.buttons[15]?.value
		const padUpDown = pads[0]?.buttons[12]?.value
		const padDownDown = pads[0]?.buttons[13]?.value

		const padXButtonDown = pads[0]?.buttons[2]?.value

		if (this.healthState === HealthState.DAMAGE
			|| this.healthState === HealthState.DEAD
		) {
			return
		}

		if (!cursors) {
			return
		}

		if (!pads) {
			return
		}

		if (Phaser.Input.Keyboard.JustDown(cursors.space!) || padXButtonDown) {
			if (this.activeChest) {
				const coins = this.activeChest.open()
				this._coins += coins

				sceneEvents.emit('player-coins-changed', this._coins)
			}
			else if (time > this.lastFired) {
				this.throwKnife()

				this.lastFired = time + 1000
			}
			return
		}

		if (leftDown || padLeftDown) {
			this.anims.play('player-run-side', true)
			this.setVelocity(-speed, 0)

			this.scaleX = -1
			this.body.offset.x = 8
		}
		else if (rightDown || padRightDown) {
			this.anims.play('player-run-side', true)
			this.setVelocity(speed, 0)

			this.scaleX = 1
			this.body.offset.x = 0
		}
		else if (upDown || padUpDown) {
			this.anims.play('player-run-up', true)
			this.setVelocity(0, -speed)
		}
		else if (downDown || padDownDown) {
			this.anims.play('player-run-down', true)
			this.setVelocity(0, speed)
		}
		else {
			const parts = this.anims.currentAnim.key.split('-')
			parts[1] = 'idle'
			this.anims.play(parts.join('-'))
			this.setVelocity(0, 0)
		}

		if (leftDown || rightDown || upDown || downDown) {
			this.activeChest = undefined
		}
	}
}

Phaser.GameObjects.GameObjectFactory.register('player', function (this: Phaser.GameObjects.GameObjectFactory, x: number, y: number, texture: string, frame?: string | number) {
	var sprite = new Player(this.scene, x, y, texture, frame)

	this.displayList.add(sprite)
	this.updateList.add(sprite)

	this.scene.physics.world.enableBody(sprite, Phaser.Physics.Arcade.DYNAMIC_BODY)

	//sprite.body.setSize(sprite.width * 0.5, sprite.height * 0.8)
	sprite.body.setSize(sprite.width * SCALE, sprite.height * SCALE)

	return sprite
})
