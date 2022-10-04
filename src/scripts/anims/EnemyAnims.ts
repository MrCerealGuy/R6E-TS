import Phaser from 'phaser'

const createGruntAnims = (anims: Phaser.Animations.AnimationManager) => {
	anims.create({
		key: 'grunt-idle',
		frames: anims.generateFrameNames('grunt_texture_atlas', { start: 0, end: 0, prefix: 'grunt_m_idle_anim_f', suffix: '.png' }),
		repeat: -1,
		frameRate: 10
	})

	anims.create({
		key: 'grunt-run',
		frames: anims.generateFrameNames('grunt_texture_atlas', { start: 0, end: 1, prefix: 'grunt_m_run_anim_f', suffix: '.png' }),
		repeat: -1,
		frameRate: 10
	})

	anims.create({
		key: 'grunt-faint',
		frames: anims.generateFrameNames('grunt_texture_atlas', { start: 0, end: 0, prefix: 'grunt_m_faint_anim_f', suffix: '.png' }),
		repeat: -1,
		frameRate: 10
	})
}

export {
	createGruntAnims
}
