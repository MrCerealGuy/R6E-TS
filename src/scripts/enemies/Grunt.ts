import Phaser from 'phaser'

import '../characters/Player'
import Player from '../characters/Player'

import { SCALE } from '../utils/globals'
import { StateMachine, State } from '../libs/stateMachine'

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

class IdleState extends State {
	enter(scene, sprite) {
		sprite.anims.play('grunt-idle')

		sprite.moveEvent = scene.time.addEvent({
			delay: 2000,
			callback: () => {
				sprite.direction = randomDirection(sprite.direction)
			},
			loop: true
		})
	}

	execute(scene, sprite) {
		// Check if grunt is dead
		if (sprite.isDead()) {
			sprite.stateMachine.transition('faint')

			return
		}

		// Detected player?
		if (!scene.player.isDead()) {
			var radius = sprite.getDetectionArea()?.radius
			var dis = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, sprite.x, sprite.y)

			if (dis <= radius) {
				sprite.stateMachine.transition('detected')
				return
			}
		}

		// Walk around
		const speed = 15

		switch (sprite.direction) {
			case Direction.UP:
				sprite.setVelocity(0, -speed)
				break

			case Direction.DOWN:
				sprite.setVelocity(0, speed)
				break

			case Direction.LEFT:
				sprite.setVelocity(-speed, 0)
				sprite.scaleX = 1
				sprite.body.offset.x = 0
				break

			case Direction.RIGHT:
				sprite.setVelocity(speed, 0)
				sprite.scaleX = -1
				sprite.body.offset.x = 8
				break
		}
	}
}

class FaintState extends State {
	enter(scene, sprite) {
		sprite.moveEvent.destroy()

		sprite.death_sound.play()
		sprite.anims.play('grunt-faint')

		sprite.detectionArea.setVisible(false)

		sprite.disableBody()
		sprite.setVelocity(0, 0)
	}

	execute(scene, sprite) {
	}
}

class PlayerDetectedState extends State {
	private detectedEvent: Phaser.Time.TimerEvent

	enter(scene, sprite) {
		sprite.detectionArea.setVisible(true)
		sprite.anims.play('grunt-idle')

		if (!sprite.detected_sound.isPlaying)
			sprite.detected_sound.play()

		sprite.setVelocity(0, 0)

		this.detectedEvent = scene.time.addEvent({
			delay: 1000,
			callback: () => {
				sprite.detectionArea.setVisible(false)
				sprite.stateMachine.transition('follow')

				this.detectedEvent.destroy()
			},
			loop: false
		})
	}

	execute(scene, sprite) {
		// Check if grunt is dead
		if (sprite.isDead()) {
			this.detectedEvent?.destroy()
			sprite.stateMachine.transition('faint')

			return
		}

		// Check if player is dead
		if (scene.player.isDead()) {
			this.detectedEvent?.destroy()
			sprite.stateMachine.transition('idle')

			return
		}

		sprite.detectionArea.x = sprite.x
		sprite.detectionArea.y = sprite.y
	}
}

class FollowPlayerState extends State {
	private updateFollowEvent: Phaser.Time.TimerEvent

	updateFollowPath(scene, sprite) {
		var toX = Math.floor(scene.player.x / 8)
		var toY = Math.floor(scene.player.y / 8)
		var fromX = Math.floor(sprite.getX() / 8)
		var fromY = Math.floor(sprite.getY() / 8)

		console.log('going from (' + fromX + ',' + fromY + ') to (' + toX + ',' + toY + ')')

		// Find path
		scene.finder.findPath(fromX, fromY, toX, toY, function (path) {
			if (path == null) {
				console.log("Path was not found.")

				sprite.stateMachine.transition('idle')
			}
			else {
				sprite.followPath = path
				console.log(path)
			}
		})

		scene.finder.calculate()
	}

	enter(scene, sprite) {
	}

	execute(scene, sprite) {
		// Check if grunt is dead
		if (sprite.isDead()) {
			this.updateFollowEvent?.destroy()
			sprite.stateMachine.transition('faint')

			return
		}

		// Check if player is dead
		if (scene.player.isDead()) {
			this.updateFollowEvent?.destroy()
			sprite.stateMachine.transition('idle')

			return
		}

		// Check if player lost
		var radius = sprite.getDetectionArea()?.radius
		var dis = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, sprite.x, sprite.y)

		if (dis > radius) {
			this.updateFollowEvent?.destroy()
			sprite.stateMachine.transition('idle')

			return
		}

		// Check if follow event is going on
		if (this.updateFollowEvent?.getRemainingSeconds() > 0) {
			return
		}

		// Calculate new path
		this.updateFollowPath(scene, sprite)

		// Make new follow step
		this.updateFollowEvent = scene.time.addEvent({
			delay: 200,
			callback: () => {

				if (sprite.followPath?.length >= 2) {
					sprite.x = sprite.followPath[1]?.x * 8
					sprite.y = sprite.followPath[1]?.y * 8

					this.updateFollowEvent.destroy()
				}
			},
			loop: false
		})

	}
}

export default class Grunt extends Phaser.Physics.Arcade.Sprite {
	private direction = Direction.RIGHT
	private moveEvent: Phaser.Time.TimerEvent

	private death_sound!: Phaser.Sound.BaseSound
	private hurt_sound!: Phaser.Sound.BaseSound
	private detected_sound!: Phaser.Sound.BaseSound

	private detectionArea!: Phaser.GameObjects.Arc

	private followPath
	private followPathIndex: number = 0

	private stateMachine!: StateMachine

	private _dead: boolean = false

	constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
		super(scene, x * SCALE, y * SCALE, texture, frame)

		scene.physics.world.on(Phaser.Physics.Arcade.Events.TILE_COLLIDE, this.handleTileCollision, this)

		this.setScale(SCALE)

		this.death_sound = scene.sound.add('grunt-death-sound', { volume: 0.2, loop: false })
		this.hurt_sound = scene.sound.add('grunt-hurt-sound', { volume: 0.2, loop: false })
		this.detected_sound = scene.sound.add('grunt-detected-sound', { volume: 0.2, loop: false })

		this.detectionArea = scene.add.circle(x * SCALE, y * SCALE, detectionRadius)
		this.detectionArea.setStrokeStyle(1, 0xff0000)
		this.detectionArea.setVisible(false)

		// Init state machine
		this.stateMachine = new StateMachine('idle', {
			idle: new IdleState(),
			faint: new FaintState(),
			follow: new FollowPlayerState(),
			detected: new PlayerDetectedState(),
		}, [scene, this]);
	}

	isDead() {
		return this._dead
	}

	getX() {
		return this.x
	}

	getY() {
		return this.y
	}

	getState() {
		return this.stateMachine.state
	}

	updatePath(map: Phaser.Tilemaps.Tilemap, player: Player, path) {
		// Sets up a list of tweens, one for each tile to walk, that will be chained by the timeline

		this.followPath = path
		this.followPathIndex = 0
	}

	getDetectionArea() {
		return this.detectionArea
	}

	handleDamage() {
		this.hurt_sound.play()
	}

	handleDeath() {
		this._dead = true
		this.stateMachine.transition('faint')
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
	}

	update() {
		// Grunt dead?
		if (this._dead)
			return

		// Update state machine
		this.stateMachine.step()
	}
}
