
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

import GP from './utils/gp.js';
let gp = new GP();

import SFX from './utils/sfx.js';
let sfx = new SFX();;

import physics from './utils/physics.js';

import * as store from './utils/store.js';

// Props
let pixiApp; // PIXI app instance
let isProd = process.env.NODE_ENV != 'development';  // Set in package.json: eg. "start:dev": "webpack serve --mode development"
let htmlEle; // The element containing the game
let setupComplete = false;
let pendingDetach = null;
// Load all transitions
/*
let filters = {};
const _filters = utils.requireAll(require.context('./utils/filters', false, /.js$/));
for (let _filter of _filters) {
  filters[_filter.id] = _filter.default;
}
*/

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
 * @param {Object} [options=null] - Addtional storymode options.
 * @param {AppLoadCallback} [onLoadCallback=null] - Called after initial assets are loaded.
 */
export function createApp(_htmlEleID, fullScreen = false, pixiOptions = null, options = null, onLoadCallback = null) {

  /*
  If true, all tweens of the same targets will be killed immediately regardless
  of what properties they affect.
  If "auto", when the tween renders for the first time it hunt down any conflicts
  in active animations (animating the same properties of the same targets) and kill only those parts of the other tweens.
  Non-conflicting parts remain intact.
  If false, no overwriting strategies will be employed. Default: false.
  */
  gsap.defaults({ overwrite: 'auto' });

  setupComplete = false
  pendingDetach = null;

  let setupConfig = {};
  setupConfig.htmlEleID = _htmlEleID;
  setupConfig.onLoadCallback = onLoadCallback;

  kb.init();
  sfx.loadPrefs()

  let defaultOptions = {
      displayFPS: isProd ? false : true,
      waitForImagesToLoad: null, // Supply a single or array of images or image IDs
  }
  options = utils.extend(defaultOptions, options);

  if (options.waitForImagesToLoad){
    options.waitForImagesToLoad = Array.isArray(options.waitForImagesToLoad) ? options.waitForImagesToLoad : [options.waitForImagesToLoad]; // Ensure singles are arrays
  }

  setupConfig.options = utils.cloneObj(options); // A copy is retained for setup.

  let defaultPixiOptions = {
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
  pixiOptions = utils.extend(defaultPixiOptions, pixiOptions);

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

function areImagesLoaded(imageList){
  if (!imageList){
    return true;
  }
  for (let image of imageList){
    if (!utils.isImgLoaded(image)){
      return false;
    }
  }
  return true;
}

let fpsAvg;
// All assets are loaded by this point and the stage is empty
function setup(setupConfig){

  if (!utils.e(setupConfig.htmlEleID) || typeof utils.e(setupConfig.htmlEleID)['appendChild'] !== 'function' || !areImagesLoaded(setupConfig.options.waitForImagesToLoad)){
    // The container element needs to be present and able to appendChild.
    utils.wait(1.0/5.0, setup, [setupConfig]);
    return;
  }

  if (setupConfig.options.setupDelay){
    let _delay = setupConfig.options.setupDelay;
    setupConfig.options.setupDelay = null;
    delete setupConfig.options.setupDelay;
    utils.wait(_delay, setup, [setupConfig]);
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
  } else if (setupConfig.options.displayFPS !== false){
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

  appEmitter.emit('onapp_predefaultscene', pixiApp)

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
  setupComplete = true;

  if (pendingDetach){
    detachApp(pendingDetach[0],pendingDetach[1],pendingDetach[2])
    pendingDetach = null;
  }

}

function getPixiApp(){
  return pixiApp;
}

function detachApp(callback, debugToConsole, consoleIdPrefix){
  if (!setupComplete){
    pendingDetach = [callback, debugToConsole, consoleIdPrefix];
    return;
  }

  destroy(true, callback, debugToConsole, consoleIdPrefix);

}

let destroyed = false;
function destroy(reset = false, callback = null, debugToConsole = false, consoleIdPrefix = ''){

  if (consoleIdPrefix && !consoleIdPrefix.endsWith(' ')){
    consoleIdPrefix += ' ';
  }
  let logToConsole = debugToConsole ? window['con' + 'sole']['log'] : ()=>{};

  appEmitter.emit('pre_destory', pixiApp.stage)

  if (!reset){
    if (destroyed){
      return;
    }
    destroyed = true;
  }

  logToConsole(consoleIdPrefix + 'nav.destroy()')
  nav.destroy(reset, ()=>{

    //loader.reset(); // Required to halt ui lazy loads in progress.
    //if (reset){
    //  window.resources = PIXI.Loader.shared.resources;
    //}

    logToConsole(consoleIdPrefix + 'nav.destroy() complete.')

    logToConsole(consoleIdPrefix + 'Killing gsap animations.')
    gsap.killTweensOf('*')
    PIXI.Ticker.shared.stop();

    logToConsole(consoleIdPrefix + 'scaler.destroy()')
    scaler.destroy(reset);

    logToConsole(consoleIdPrefix + 'ui.destroy()')
    ui.destroy(reset);

    logToConsole(consoleIdPrefix + 'kb.destroy()')
    kb.destroy(reset);

    logToConsole(consoleIdPrefix + 'sfx.destroy()')
    sfx.destroy(reset);
    if (!reset){
      kb = null;
      sfx = null;
    }

    logToConsole(consoleIdPrefix + 'pixiApp.destroy()')
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

    logToConsole(consoleIdPrefix + 'Removing textures...')

    // Remove base textures.
    for (let resourceID in PIXI.Loader.shared.resources){
      if (resourceID.endsWith('_image')){
        if (PIXI.Loader.shared.resources[resourceID].texture){
          PIXI.Loader.shared.resources[resourceID].texture.destroy(true);
        }
      }
    }

    // Remove resource references.
    for (let resourceID in PIXI.Loader.shared.resources){
      if (PIXI.Loader.shared.resources[resourceID].texture){
        PIXI.Loader.shared.resources[resourceID].texture.destroy(true);
      }
      if (PIXI.Loader.shared.resources[resourceID].spritesheet){
        PIXI.Loader.shared.resources[resourceID].spritesheet.destroy(true);
        PIXI.Loader.shared.resources[resourceID].spritesheet = null;
      }
      if (PIXI.Loader.shared.resources[resourceID].textures){
        for (let txName in PIXI.Loader.shared.resources[resourceID].textures){
          PIXI.Loader.shared.resources[resourceID].textures[txName].destroy(true);
        }
      }
    }

    logToConsole(consoleIdPrefix + 'Reseting shared loader...')

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

    // Remove resource references.
    for (let resourceID in PIXI.Loader.shared.resources){
      PIXI.Loader.shared.resources[resourceID] = null;
      delete PIXI.Loader.shared.resources[resourceID];
    }

    logToConsole(consoleIdPrefix + 'Removing any remaining tx...')

    // Remove any remaining textures from the cache.
    for (let key in PIXI.utils.TextureCache){
      let baseTex = PIXI.utils.TextureCache[key].baseTexture
      baseTex.destroy();
      PIXI.Texture.removeFromCache(key);
    }

    for (let key in PIXI.utils.BaseTextureCache){
      PIXI.utils.BaseTextureCache[key].destroy();
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

    // Check memory
    if (debugToConsole){
      setTimeout(()=>{
        logToConsole(consoleIdPrefix + 'resouces / shared.resources:', window.resources, PIXI.Loader.shared.resources);
        logToConsole(consoleIdPrefix + 'TextureCache:', PIXI.utils.TextureCache)
        logToConsole(consoleIdPrefix + 'BaseTextureCache:', PIXI.utils.BaseTextureCache)
        logToConsole(consoleIdPrefix + 'Done.')
      }, 1000);
    }

    callback();

  });
}

export {pixiApp, getPixiApp, htmlEle}; // Internal access to these properties.
export {appEmitter, detachApp}; // Emitter events
export {gp, kb, sfx, store, physics} // Helpers
export {utils, mutils,nav, ui, scaler, Scene}; // Core
