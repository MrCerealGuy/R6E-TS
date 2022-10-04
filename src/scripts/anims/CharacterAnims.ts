import Phaser from 'phaser'

const createCharacterAnims = (anims: Phaser.Animations.AnimationManager) => {
	anims.create({
		key: 'player-idle-down',
		frames: [{ key: 'player_texture_atlas', frame: 'walk-down-3.png' }]
	})

	anims.create({
		key: 'player-idle-up',
		frames: [{ key: 'player_texture_atlas', frame: 'walk-up-3.png' }]
	})

	anims.create({
		key: 'player-idle-side',
		frames: [{ key: 'player_texture_atlas', frame: 'walk-side-3.png' }]
	})

	anims.create({
		key: 'player-run-down',
		frames: anims.generateFrameNames('player_texture_atlas', { start: 1, end: 2, prefix: 'run-down-', suffix: '.png' }),
		repeat: -1,
		frameRate: 15
	})

	anims.create({
		key: 'player-run-up',
		frames: anims.generateFrameNames('player_texture_atlas', { start: 1, end: 2, prefix: 'run-up-', suffix: '.png' }),
		repeat: -1,
		frameRate: 15
	})

	anims.create({
		key: 'player-run-side',
		frames: anims.generateFrameNames('player_texture_atlas', { start: 1, end: 2, prefix: 'run-side-', suffix: '.png' }),
		repeat: -1,
		frameRate: 15
	})

	anims.create({
		key: 'player-faint',
		frames: anims.generateFrameNames('player_texture_atlas', { start: 1, end: 1, prefix: 'faint-', suffix: '.png' }),
		frameRate: 15
	})
}

export { createCharacterAnims }
