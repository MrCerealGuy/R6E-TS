import Phaser from 'phaser'

import { SCALE } from '../utils/globals'

enum Direction {
	UP,
	DOWN,
	LEFT,
	RIGHT
}

const randomDirection = (exclude: Direction) => {
	let newDirection = Phaser.Math.Between(0, 3)
	while (newDirection === exclude) {
		newDirection = Phaser.Math.Between(0, 3)
	}

	return newDirection
}

export default class Grunt extends Phaser.Physics.Arcade.Sprite {
	private direction = Direction.RIGHT
	private moveEvent: Phaser.Time.TimerEvent

	private death_sound!: Phaser.Sound.BaseSound
	private hurt_sound!: Phaser.Sound.BaseSound

	public dead: boolean = false

	private attention_circle!: Phaser.GameObjects.Arc
	//private playerAttentionCircleCollider?: Phaser.Physics.Arcade.Collider

	constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
		super(scene, x * SCALE, y * SCALE, texture, frame)

		this.anims.play('grunt-idle')

		scene.physics.world.on(Phaser.Physics.Arcade.Events.TILE_COLLIDE, this.handleTileCollision, this)

		this.moveEvent = scene.time.addEvent({
			delay: 2000,
			callback: () => {
				this.direction = randomDirection(this.direction)
			},
			loop: true
		})

		this.setScale(SCALE)

		this.death_sound = scene.sound.add('grunt-death-sound', { volume: 0.2 })
		this.hurt_sound = scene.sound.add('grunt-hurt-sound', { volume: 0.2 })

		this.attention_circle = scene.add.circle(x * SCALE,y * SCALE,20)
		this.attention_circle.setStrokeStyle(1, 0xff0000)
/*
		this.playerAttentionCircleCollider = scene.physics.add.collider(
			this.attention_circle,
			
			this.handlePlayerAttentionCircleCollision,
			undefined,
			this
		)
		*/
	}

	public getAttentionCircle(){
		return this.attention_circle
	}

	handleDamage() {
		// tbd
		this.hurt_sound.play()
	}

	handleDeath() {
		this.dead = true
		this.moveEvent.destroy()

		this.death_sound.play()
		this.anims.play('grunt-faint')

		this.disableBody()
		this.setVelocity(0, 0)
	}

	destroy(fromScene?: boolean) {
		this.moveEvent.destroy()
		super.destroy(fromScene)
	}
/*
	private handlePlayerAttentionCircleCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject) {

	}
*/
	private handleTileCollision(go: Phaser.GameObjects.GameObject, tile: Phaser.Tilemaps.Tile) {
		if (go !== this) {
			return
		}

		this.direction = randomDirection(this.direction)
	}

	preUpdate(t: number, dt: number) {
		super.preUpdate(t, dt)

		if (this.dead)
			return

		const speed = 15

		switch (this.direction) {
			case Direction.UP:
				this.setVelocity(0, -speed)
				break

			case Direction.DOWN:
				this.setVelocity(0, speed)
				break

			case Direction.LEFT:
				this.setVelocity(-speed, 0)
				break

			case Direction.RIGHT:
				this.setVelocity(speed, 0)
				break
		}

		this.attention_circle.x = this.x
		this.attention_circle.y = this.y
	}
}
