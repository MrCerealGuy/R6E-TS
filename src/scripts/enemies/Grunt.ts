import Phaser from 'phaser'

import {SCALE} from '../utils/globals'

enum Direction
{
	UP,
	DOWN,
	LEFT,
	RIGHT
}

const randomDirection = (exclude: Direction) => {
	let newDirection = Phaser.Math.Between(0, 3)
	while (newDirection === exclude)
	{
		newDirection = Phaser.Math.Between(0, 3)
	}

	return newDirection
}

export default class Grunt extends Phaser.Physics.Arcade.Sprite
{
	private direction = Direction.RIGHT
	private moveEvent: Phaser.Time.TimerEvent

	private death_sound
	private hurt_sound

	constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number)
	{
		super(scene, x*SCALE, y*SCALE, texture, frame)

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

		this.death_sound = scene.sound.add('grunt-death-sound')
		this.hurt_sound = scene.sound.add('grunt-hurt-sound')
	}

	handleDamage()
	{
		// tbd
		this.hurt_sound.play()
	}

	handleDeath()
	{
		this.moveEvent.destroy()

		this.death_sound.play()

		//this.anims.play('grunt-faint')
		this.setVelocity(0, 0)
	}

	destroy(fromScene?: boolean)
	{
		this.moveEvent.destroy()

		//this.anims.play('grunt-faint')
		//this.setVelocity(0, 0)

		super.destroy(fromScene)
	}

	private handleTileCollision(go: Phaser.GameObjects.GameObject, tile: Phaser.Tilemaps.Tile)
	{
		if (go !== this)
		{
			return
		}

		this.direction = randomDirection(this.direction)
	}

	preUpdate(t: number, dt: number)
	{
		super.preUpdate(t, dt)

		const speed = 15

		switch (this.direction)
		{
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
	}
}
