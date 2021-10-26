
// PixiJS convenience aliases 
window.Sprite = PIXI.Sprite;
window.AnimatedSprite = PIXI.AnimatedSprite;
window.Point = PIXI.Point;
window.Rectangle = PIXI.Rectangle;
window.Text = PIXI.Text
window.Graphics = PIXI.Graphics
window.Container = PIXI.Container;
window.Texture = PIXI.Texture;
window.loader = PIXI.Loader.shared; //PIXI.Loader.shared; //.  new PIXI.Loader(); // Using shared was causing bug with hot reload.
window.resources = loader.resources;
window.ticker = PIXI.Ticker.shared;

import * as _ext from './utils/extensions.js';
//import * as _polyfill from './utils/polyfill.js';
import * as utils from './utils/utils.js';

import Scene from './class/scene.js';
import Camera from './class/camera.js';
import Btn from './class/btn.js';

import * as nav from './core/nav.js';
import * as scaler from './core/scaler.js';
import * as ui from './core/ui.js';

import KB from './utils/kb.js';
const kb = new KB();

import SFX from './utils/sfx.js';
const sfx = new SFX();

import physics from './utils/physics.js';

import * as store from './utils/store.js';

// Props 
let pixiApp; // PIXI app instance
let isProd = process.env.NODE_ENV != 'development';  // Set in package.json: eg. "start:dev": "webpack serve --mode development"
let htmlEle; // The element containing the game

// Load all transitions
let filters = {};

const _filters = utils.requireAll(require.context('./filters', false, /.js$/));
for (let _filter of _filters) {
  filters[_filter.id] = _filter.default;
}

export function createApp(_htmlEle, fullScreen = false, bgAlpha = 1.0, bgColor = 0x000000, onLoadCallback = null) {
  
    htmlEle = _htmlEle;
    
    // Docs: http://pixijs.download/release/docs/PIXI.Application.html#Application
    pixiApp = new PIXI.Application({                   
        autoDensity: true, //  Adjusts the canvas using css pixels so it will scale properly (it was the default behavior in v4)
        antialias: window.devicePixelRatio == 1, //(), 
        backgroundAlpha: bgAlpha < 1.0 ? 0.0 : 1.0,
        resolution: window.devicePixelRatio, // Resolution controls scaling of content (sprites, etc.) 
        resizeTo: fullScreen ? window : htmlEle,
        backgroundColor: bgColor,
        clearBeforeRender: true
    });
    
    pixiApp.render()

    scaler.setup();
    
    ui.loadAssets(function(){
      
      setup(bgAlpha);
      
      if (onLoadCallback){
        onLoadCallback(pixiApp);
      }
      
      sfx.preload(); // Call preload incase it was not called in app.js
      
    })
}

// All assets are loaded by this point and the stage is empty
function setup(bgAlpha){ 
  
  // Attach canvas to the DOM 
  htmlEle.appendChild(pixiApp.view);

  // Attach core display objects 
  nav.setupStage(pixiApp.stage, bgAlpha);
  
  // Debug TF
  if (isProd){
    // Disable right click - this menu may be confusing to user
    htmlEle.setAttribute('oncontextmenu', 'return false');
  } else {
    const debugTf = new PIXI.Text('X', {fontFamily : 'Arial', fontSize: 13, fill : 0xffffff, align : 'left', dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 0.0,
    dropShadowDistance: 2.0});  
    debugTf.x = 3.0;
    debugTf.y = 3.0; //+ 50.0;    
    debugTf.alpha = 0.5;
    pixiApp.stage.addChild(debugTf);
    ticker.add(function(time){
        debugTf.text = PIXI.Ticker.shared.FPS.toFixed(2);
    }); 
  }
  
  // Get default scene and load it
  if (!nav.openDefaultScene()){
    throw new Error('Default scene not found.')
  }
  
}

// export {stageW, stageH} from './core/scaler.js'; // Convenience alias
export {pixiApp, filters, htmlEle}; // Internal access to these properties.
export {Scene, Camera, Btn}; // Classes
export {kb, sfx, store, physics} // Helpers 
export {utils, nav, ui, scaler}; // Core 

