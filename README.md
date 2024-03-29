# R6E-TS

A minimalistic roguelike dungeon crawler by Andreas Zahnleiter. This project is in development.

Early gameplay preview video:

[![Watch the video](http://i3.ytimg.com/vi/UdKSiLR-mZ4/hqdefault.jpg)](https://youtu.be/UdKSiLR-mZ4)


## How To Use

To clone and run this repository, you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository (yes, npx not npm)
$ npx gitget MrCerealGuy/R6E-TS

# Go into the repository
$ cd R6E-TS

# Install dependencies
$ npm install

# Install MRPAS
$ npm install mrpas

# Used for libs/dungeon-generator
npm install random-seed

# Start the local development server (on port 8080)
$ npm start

# Ready for production?
# Build the production ready code to the /dist folder
$ npm run build

# Play your production ready game in the browser
$ npm run serve
```

## Credits

Phaser 3 TypeScript Starter Template
https://github.com/yandeu/phaser-project-template

Dungeon Crawler Starter
https://github.com/ourcade/phaser3-dungeon-crawler-starter

Finite State Machine (FSM)
https://www.mkelly.me/blog/phaser-finite-state-machine/

FOV MRPAS algorithm
https://blog.ourcade.co/posts/2020/phaser3-mrpas-fov-field-of-view-algorithm-roguelike-dungeon-crawler/

Procedural dungeon generator (needs random-seed)
https://github.com/domasx2/dungeon-generator

### Tile sets

Scut Pixel Tileset - 8x8 Roguelike
https://scut.itch.io/7drl-tileset-2018

Oryx Design Lab 16-BIT SCI-FI
https://www.oryxdesignlab.com/products/16-bit-sci-fi-tileset

### Sfx effects

https://pixabay.com/sound-effects/