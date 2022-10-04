import Phaser from 'phaser'

const createItemAnims = (anims: Phaser.Animations.AnimationManager) => {
/*
    anims.create({
		key: 'chest-open',
		frames: anims.generateFrameNames('treasure', { start: 0, end: 2, prefix: 'chest_empty_open_anim_f', suffix: '.png' }),
		frameRate: 5
	})

	anims.create({
		key: 'chest-closed',
		frames: [{ key: 'treasure', frame: 'chest_empty_open_anim_f0.png' }]
	})*/

	anims.create({
		key: 'medikit-red',
		frames: [{ key: 'items_texture_atlas', frame: 'medikit_red.png' }]
	})
}

export {
	createItemAnims
}