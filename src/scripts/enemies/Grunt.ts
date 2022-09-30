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
			},
			loop: false
		})
	}
	
	execute(scene, sprite) {
		sprite.detectionArea.x = sprite.x
		sprite.detectionArea.y = sprite.y
	}
 }

 class FollowPlayerState extends State {
	private followEvent: Phaser.Time.TimerEvent

	enter(scene, sprite) {
		//console.log(" "+scene.player.x)
		this.followEvent = scene.time.addEvent({
			delay: 200,
			callback: () => {			
				// Follow player if path end not reached
				if (sprite.followPathIndex < sprite.followPath.length) {
					sprite.x = sprite.followPath[sprite.followPathIndex].x*8
					sprite.y = sprite.followPath[sprite.followPathIndex].y*8

					sprite.followPathIndex++
				}
				else {	// Path end reached
					sprite.followPathIndex = 0

					//???
					sprite.stateMachine.transition('idle')

					this.followEvent.destroy()
				}
			},
			loop: true
		})
	}
	
	execute(scene, sprite) {
	}
 }

export default class Grunt extends Phaser.Physics.Arcade.Sprite {
	private direction = Direction.RIGHT
	private moveEvent: Phaser.Time.TimerEvent

	private death_sound!: Phaser.Sound.BaseSound
	private hurt_sound!: Phaser.Sound.BaseSound
	private detected_sound!: Phaser.Sound.BaseSound
	
	private detectionArea!: Phaser.GameObjects.Arc
	private detected_time: number = 0

	private followPath
	private followPathIndex: number = 0

	private stateMachine!: StateMachine

	constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
		super(scene, x * SCALE, y * SCALE, texture, frame)

		scene.physics.world.on(Phaser.Physics.Arcade.Events.TILE_COLLIDE, this.handleTileCollision, this)

		this.setScale(SCALE)

		this.death_sound = scene.sound.add('grunt-death-sound', { volume: 0.2, loop: false })
		this.hurt_sound = scene.sound.add('grunt-hurt-sound', { volume: 0.2, loop: false })
		this.detected_sound = scene.sound.add('grunt-detected-sound', { volume: 0.2, loop: false })

		this.detectionArea = scene.add.circle(x * SCALE,y * SCALE, detectionRadius)
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

	getX() {
		return this.x
	}

	getY() {
		return this.y
	}

	getState() {
		return this.stateMachine.state
	}

	moveTo(map: Phaser.Tilemaps.Tilemap, player: Player, path) {
		// Sets up a list of tweens, one for each tile to walk, that will be chained by the timeline

		this.followPath = path
		this.followPathIndex = 0
	}

	getDetectionArea() {
		return this.detectionArea
	}

	handleDetection() {
		if (this.stateMachine.state == 'idle')
			this.stateMachine.transition('detected')
	}

	handleDamage() {
		this.hurt_sound.play()
	}

	handleDeath() {
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
		if (this.stateMachine.state == 'faint')
			return

		// Update state machine
		this.stateMachine.step()
	}
}
