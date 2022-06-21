
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
window.loader = PIXI.Loader.shared;
window.resources = loader.resources;
window.ticker = PIXI.Ticker.shared;

const appEmitter = new PIXI.utils.EventEmitter(); 

import * as _ext from './utils/extensions.js';

import * as utils from './utils/utils.js';
import * as mutils from './utils/mutils.js';

import Scene from './core/scene.js';

import * as nav from './core/nav.js';
import * as scaler from './core/scaler.js';
import * as ui from './core/ui.js';

import KB from './utils/kb.js';
let kb = new KB();

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
 * Creates a new PIXI Application, wrapper for `new PIXI.Application(...)`.
 * <br>- Ideally the main app script is included in the body immediately after the container HTML element is included. In this scenario the app will be created instantly.
 * <br>- Otherwise if the app script is initialised before the container HTML element is attached to the DOM then it will load in the background before continuing.
 * @param {string} htmlEleID - The DOM element ID in which to add the Pixi canvas. If not present yet will wait for it to arrive.
 * @param {boolean} [fullScreen=false] - If true will base the canvas dimensions on the window size rather than the containing element.
 * @param {Object} [pixiOptions=null] - Option object to override defaults sent to PIXI. See: {@link http://pixijs.download/release/docs/PIXI.Application.html#Application}
 * @param {AppLoadCallback} [onLoadCallback=null] - Called after initial assets are loaded.
 */
export function createApp(_htmlEleID, fullScreen = false, pixiOptions = null, onLoadCallback = null) {
    
  let setupConfig = {};
  setupConfig.htmlEleID = _htmlEleID;
  setupConfig.onLoadCallback = onLoadCallback;

  kb.init();
  sfx.loadPrefs()
          
  let defaultOptions = {  
      autoDensity: true, //  Adjusts the canvas using css pixels so it will scale properly (it was the default behavior in v4)
      antialias: window.devicePixelRatio == 1, // Only anti alias from non-retina displays
      backgroundAlpha: 1.0,
      resolution: window.devicePixelRatio, // Resolution controls scaling of content (sprites, etc.)         
      backgroundColor: 0x000000,
      clearBeforeRender: true // This sets if the renderer will clear the canvas or not before the new render pass.
  }

  if (!pixiOptions){
    pixiOptions = {};
  }
  pixiOptions = utils.extend(defaultOptions, pixiOptions);

  // Is the html ele attached to the DOM at this point?
  if (utils.e(setupConfig.htmlEleID) && typeof utils.e(setupConfig.htmlEleID)['appendChild'] === 'function'){
    htmlEle = utils.e(setupConfig.htmlEleID);
  }

  // Apply resize target now if element already exists.
  // - Otherwise wait until setup to apply target.
  if (fullScreen){
    // Window is present even if containing DOM element is not at this point.
    pixiOptions.resizeTo = window; 
  } else if (htmlEle){
    pixiOptions.resizeTo = htmlEle;
  } 

  setupConfig.pixiOptions = utils.cloneObj(pixiOptions); // A copy is retained for setup.

  // Docs: http://pixijs.download/release/docs/PIXI.Application.html#Application
  pixiApp = new PIXI.Application(pixiOptions);

  ui.autoloadAssets(()=>{
    setup(setupConfig);
  });
    
}


let fpsAvg;
// All assets are loaded by this point and the stage is empty
function setup(setupConfig){ 
  
  if (!utils.e(setupConfig.htmlEleID) || typeof utils.e(setupConfig.htmlEleID)['appendChild'] !== 'function'){

    // The container element needs to be present and able to appendChild.
    utils.wait(1.0/5.0, setup, [setupConfig]);
    return;
  
  }

  // DOM is attached by this point.
  
  if (!htmlEle){
    htmlEle = utils.e(setupConfig.htmlEleID);
  }
  
  if (!setupConfig.pixiOptions.resizeTo){ // Will already be set if fullscreen
    pixiApp.resizeTo = htmlEle; 
  }

  pixiApp.render(); 
  scaler.init();
  
  // Attach canvas to the DOM 
  htmlEle.appendChild(pixiApp.view);
  // Attach core display objects 
  nav.setupStage(pixiApp.stage, setupConfig.pixiOptions.backgroundAlpha);
  
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
  
  // Post setup 

  if (setupConfig.onLoadCallback){
    setupConfig.onLoadCallback(pixiApp);
  }
  appEmitter.emit('ready', pixiApp.stage)

  sfx._enableLoad(); 
  
} 

function getPixiApp(){
  return pixiApp;
}


function detachApp(callback){
  destroy(true, callback);
}

let destroyed = false;
function destroy(reset = false, callback = null){
  
  if (!reset){
    if (destroyed){
      return;
    }
    destroyed = true;
  } 

  nav.destroy(reset, ()=>{
    
    gsap.killTweensOf('*')
    PIXI.Ticker.shared.stop();
    
    scaler.destroy(reset);
    ui.destroy(reset);
    kb.destroy(reset);
    
    sfx.destroy(reset);
    if (!reset){
      kb = null;
      sfx = null;
    }
    
    pixiApp.destroy(true, {
      children: true, // All the children will have their destroy method called as well. 'stageOptions' will be passed on to those calls.
      texture: true, // Should it destroy the texture of the child sprite
      baseTexture: true // Should it destroy the base texture of the child sprite
    })
    
    // Clean up this module
    pixiApp = null;
    htmlEle = null;
    if (!reset){
      filters = null;
    }
    appEmitter.removeAllListeners();
    
    // Remove base textures.
    for (let resourceID in PIXI.Loader.shared.resources){
      if (resourceID.endsWith('_image')){
        PIXI.Loader.shared.resources[resourceID].texture.destroy(true);
        delete PIXI.Loader.shared.resources[resourceID];
      }
    }
    // Remove resource references.
    for (let resourceID in PIXI.Loader.shared.resources){
      if (PIXI.Loader.shared.resources[resourceID].texture){
        PIXI.Loader.shared.resources[resourceID].texture.destroy(true);
      }
      delete PIXI.Loader.shared.resources[resourceID];
    }
    
    // Reset the shared loader.
    PIXI.Loader.shared.onComplete.detachAll();  
    PIXI.Loader.shared.onLoad.detachAll();  
    PIXI.Loader.shared.onError.detachAll();  
    PIXI.Loader.shared.onProgress.detachAll();  
    PIXI.Loader.shared.onStart.detachAll();  
    PIXI.Loader.shared.reset(); // This removes the ref to window.resources.
    if (reset){
      window.resources = PIXI.Loader.shared.resources;
    }
    
    // Remove any remaining textures from the cache.\
    for (let key in PIXI.utils.TextureCache){
      let baseTex = PIXI.utils.TextureCache[key].baseTexture
      PIXI.Texture.removeFromCache(key);
    }
    
    // Remove window references
    if (!reset){
      delete window.Sprite 
      delete window.AnimatedSprite
      delete window.Point
      delete window.Rectangle 
      delete window.Text
      delete window.Graphics
      delete window.Container 
      delete window.Texture 
      delete window.loader
      delete window.resources
      delete window.ticker
    }
    
    /*
    // Check memory
    setTimeout(()=>{
      console.log(window.resources, PIXI.Loader.shared.resources);
      console.log(PIXI.utils.TextureCache)
      console.log(PIXI.utils.BaseTextureCache)
    }, 1000);
    */ 
    
    callback();
    
  });
}

export {pixiApp, getPixiApp, filters, htmlEle}; // Internal access to these properties.
export {appEmitter, detachApp}; // Emitter events
export {kb, sfx, store, physics} // Helpers 
export {utils, mutils,nav, ui, scaler, Scene}; // Core 

