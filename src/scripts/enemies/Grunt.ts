import Phaser from 'phaser'

import '../characters/Player'
import Player from '../characters/Player'

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

const detectionRadius: number = 60

export default class Grunt extends Phaser.Physics.Arcade.Sprite {
	private direction = Direction.RIGHT
	private moveEvent: Phaser.Time.TimerEvent

	private death_sound!: Phaser.Sound.BaseSound
	private hurt_sound!: Phaser.Sound.BaseSound
	private detected_sound!: Phaser.Sound.BaseSound

	public dead: boolean = false
	
	private detectionArea!: Phaser.GameObjects.Arc
	private detected_player: boolean = false
	private detected_time: number = 0

	private followPlayer: boolean = false
	private followPath
	private followPathIndex: number = 0
	private followLastFollowTime: number = 0

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

		this.death_sound = scene.sound.add('grunt-death-sound', { volume: 0.2, loop: false })
		this.hurt_sound = scene.sound.add('grunt-hurt-sound', { volume: 0.2, loop: false })
		this.detected_sound = scene.sound.add('grunt-detected-sound', { volume: 0.2, loop: false })

		this.detectionArea = scene.add.circle(x * SCALE,y * SCALE, detectionRadius)
		this.detectionArea.setStrokeStyle(1, 0xff0000)
		this.detectionArea.setVisible(false)
	}

	isDead() {
		return this.dead
	}

	getX() {
		return this.x
	}

	getY() {
		return this.y
	}

	moveTo(map: Phaser.Tilemaps.Tilemap, player: Player, path) {
		// Sets up a list of tweens, one for each tile to walk, that will be chained by the timeline

		this.followPlayer = true
		this.followPath = path
		this.followPathIndex = 0
	}

	isPlayerDetected() {
		return this.detected_player
	}

	getDetectionArea() {
		return this.detectionArea
	}

	handleDetection() {
		if (this.dead)
			return

		if (this.followPlayer)
			return

		this.detected_player = true

		this.detectionArea.setVisible(true)
		this.anims.play('grunt-idle')
		this.detected_sound.play()
		this.setVelocity(0, 0)
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

		//this.detectionArea.destroy(true)
		this.detectionArea.setVisible(false)

		this.disableBody()
		this.setVelocity(0, 0)
	}

	destroy(fromScene?: boolean) {
		this.moveEvent.destroy()
		super.destroy(fromScene)
	}

	private handleTileCollision(go: Phaser.GameObjects.GameObject, tile: Phaser.Tilemaps.Tile) {
		if (go !== this) {
			return
		}

		this.direction = randomDirection(this.direction)
	}

	preUpdate(t: number, dt: number) {
		super.preUpdate(t, dt)

		// Grunt dead?
		if (this.dead)
			return

		// Player detected?
		if (this.detected_player) {
			if (this.detected_time == 0)
				this.detected_time = t
			else if (t > (this.detected_time+1000)){
				this.detected_time = 0
				this.detected_player = false
			}
		}
		else
			this.detectionArea.setVisible(false)

		// Following player?
		if (this.followPlayer) {
			if (this.followLastFollowTime == 0) {
				// Follow player if path end not reached
				if (this.followPathIndex < this.followPath.length) {
					this.x = this.followPath[this.followPathIndex].x*8
					this.y = this.followPath[this.followPathIndex].y*8

					this.followPathIndex++
					this.followLastFollowTime = t
				}
				else {	// Path end reached
					this.followPlayer = false
					this.followPathIndex = 0
				}
			}
			else if (t > (this.followLastFollowTime+200)) {
				this.followLastFollowTime = 0
			}
		}
		// Moving grunt
		else {
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
					this.scaleX = 1
					this.body.offset.x = 0
					break

				case Direction.RIGHT:
					this.setVelocity(speed, 0)
					this.scaleX = -1
					this.body.offset.x = 8
					break
			}
		}

		this.detectionArea.x = this.x
		this.detectionArea.y = this.y
	}
}
