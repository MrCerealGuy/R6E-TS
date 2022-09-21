import 'phaser'
import MainScene from './scenes/mainScene'
import PreloadScene from './scenes/preloadScene'
import GameUI from './scenes/GameUI'

const DEFAULT_WIDTH = 300
const DEFAULT_HEIGHT = 200

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#2d2d2d',
  scale: {
    parent: 'phaser-game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT
  },
  input: {
    gamepad: true
  },
  scene: [PreloadScene, MainScene, GameUI],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  audio: {
    disableWebAudio: true
  }
}

window.addEventListener('load', () => {
  const game = new Phaser.Game(config)
})
