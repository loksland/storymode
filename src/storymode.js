
/** 
  * @module storymode 
  */

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

/*
let Sprite,
    AnimatedSprite,
    Point,
    Rectangle,
    Text,
    Graphics,
    Container,
    Texture,
    loader,
    resources,
    ticker;

if (typeof window['PIXI'] !== 'undefined'){
  Sprite = PIXI.Sprite;
  AnimatedSprite = PIXI.AnimatedSprite;
  Point = PIXI.Point;
  Rectangle = PIXI.Rectangle;
  Text = PIXI.Text
  Graphics = PIXI.Graphics
  Container = PIXI.Container;
  Texture = PIXI.Texture;
  loader = PIXI.Loader.shared; //PIXI.Loader.shared; //.  new PIXI.Loader(); // Using shared was causing bug with hot reload.
  resources = loader.resources;
  ticker = PIXI.Ticker.shared;
} 
*/
 
const appEmitter = new PIXI.utils.EventEmitter(); 

import * as _ext from './utils/extensions.js';
// import * as _extDep from './depreciated/extensions.js';


import * as utils from './utils/utils.js';
import * as mutils from './utils/mutils.js';

import Scene from './core/scene.js';
//import Camera from './depreciated/camera.js';
//import Btn from './depreciated/btn.js'; 

import * as nav from './core/nav.js';
import * as scaler from './core/scaler.js';
import * as ui from './core/ui.js';

import KB from './utils/kb.js';
const kb = new KB();

import SFX from './utils/sfx.js';
let sfx = new SFX();;

import physics from './utils/physics.js';

import * as store from './utils/store.js';

// Props 
let pixiApp; // PIXI app instance
let isProd = process.env.NODE_ENV != 'development';  // Set in package.json: eg. "start:dev": "webpack serve --mode development"
let htmlEle; // The element containing the game

// Load all transitions
let filters = {};
const _filters = utils.requireAll(require.context('./utils/filters', false, /.js$/));
for (let _filter of _filters) {
  filters[_filter.id] = _filter.default;
}

/**
 * Called after initial assets are loaded.
 *
 * @callback AppLoadCallback
 * @param {PIXI.Application} pixiApp The PIXI Application 
 */
 
/**
 * Creates a new PIXI Application, wrapper for `new PIXI.Application(...)`
 * @param {DOMElement} htmlEle - The DOM element in which to add the Pixi canvas.
 * @param {boolean} [fullScreen=false] - If true will base the canvas dimensions on the window size rather than the containing element.
 * @param {Object} [pixiOptions=null] - Option object to override defaults sent to PIXI. See: http://pixijs.download/release/docs/PIXI.Application.html#Application
 * @param {AppLoadCallback} [onLoadCallback=null] - Called after initial assets are loaded.
 */
export function createApp(_htmlEle, fullScreen = false, pixiOptions = null, onLoadCallback = null) {
    
    sfx.loadPrefs()
    
    htmlEle = _htmlEle;
        
    let defaultOptions = {                   
        autoDensity: true, //  Adjusts the canvas using css pixels so it will scale properly (it was the default behavior in v4)
        antialias: window.devicePixelRatio == 1, // Only anti alias from non-retina displays
        backgroundAlpha: 1.0,
        resolution: window.devicePixelRatio, // Resolution controls scaling of content (sprites, etc.) 
        resizeTo: fullScreen ? window : htmlEle,
        backgroundColor: 0x000000,
        clearBeforeRender: true // This sets if the renderer will clear the canvas or not before the new render pass.
    }
    
    if (!pixiOptions){
      pixiOptions = {};
    }
    pixiOptions = utils.extend(defaultOptions, pixiOptions);
    
    // Docs: http://pixijs.download/release/docs/PIXI.Application.html#Application
    pixiApp = new PIXI.Application(pixiOptions);
    
    pixiApp.render()

    scaler.setup();
    
    ui.loadAssets(function(){
      
      setup(pixiOptions.backgroundAlpha);
      
      if (onLoadCallback){
        onLoadCallback(pixiApp);
      }
      
      appEmitter.emit('ready', pixiApp.stage)
      
      sfx._enableLoad(); 
      
    })
}


let fpsAvg;
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
    debugTf.y = 3.0 + 50.0;    
    debugTf.alpha = 0.5;
    pixiApp.stage.addChild(debugTf);
    fpsAvg = -1;    
    ticker.add(function(time){
        fpsAvg = fpsAvg < 0 ? PIXI.Ticker.shared.FPS : fpsAvg*0.8 + PIXI.Ticker.shared.FPS*0.2;
        debugTf.text = fpsAvg.toFixed(1);
    }); 
  }
  
  // Get default scene and load it
  if (!nav.openDefaultScene()){
    throw new Error('Default scene not found.')
  }
} 

export {pixiApp, filters, htmlEle}; // Internal access to these properties.
export {appEmitter}; // Emitter events
export {kb, sfx, store, physics} // Helpers 
export {utils, mutils,nav, ui, scaler, Scene}; // Core 

