export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {

    // preload gfx
    this.load.image('tiles', 'assets/tiles/tileset01.png')

    this.load.atlas('player_texture_atlas', 'assets/character/player.png', 'assets/character/player.json')
    this.load.atlas('grunt_texture_atlas', 'assets/enemies/grunt.png', 'assets/enemies/grunt.json')
    //this.load.atlas('treasure', 'assets/items/treasure.png', 'assets/items/treasure.json')
    this.load.atlas('items_texture_atlas', 'assets/items/scifi_items.png', 'assets/items/scifi_items.json')

    this.load.image('ui-heart-empty', 'assets/ui/ui_heart_empty.png')
    this.load.image('ui-heart-full', 'assets/ui/ui_heart_full.png')
    this.load.image('knife', 'assets/weapons/weapon_knife.png')
  }

  create() {
    this.scene.start('MainScene')

    /**
     * This is how you would dynamically import the mainScene class (with code splitting),
     * add the mainScene to the Scene Manager
     * and start the scene.
     * The name of the chunk would be 'mainScene.chunk.js
     * Find more about code splitting here: https://webpack.js.org/guides/code-splitting/
     */
    // let someCondition = true
    // if (someCondition)
    //   import(/* webpackChunkName: "mainScene" */ './mainScene').then(mainScene => {
    //     this.scene.add('MainScene', mainScene.default, true)
    //   })
    // else console.log('The mainScene class will not even be loaded by the browser')
  }
}
