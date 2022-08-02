/**
 * Manages the translation of art from PSD to the stage.
 * <br>-Handles scaling, screen density, resize events and layout projection.
 * <br>There are two units used to measure distance information:
 * <br>- `pixels` are the physical pixels on screen. This unit will be double for a 2x retina screen.
 * <br>- `points` are screen density independent units, that match CSS units.
 * <br>Artboards represent the PSD (art) document dimensions. 
 * <br>- When a layout is translated from Photoshop to the screen, positions are calculated based on artboard projections, set via `configureArtboard()` method.
 * @module scaler 
 */
 
import { pixiApp, utils, mutils, nav, htmlEle} from './../storymode.js';
import fscreen from 'fscreen';

let proj; // Artboard projections 

/**
 * The stage width, in points.
 * @type {number}
 * @readonly
 */
let stageW = 0;
/**
 * The stage height, in points.
 * @type {number}
 * @readonly
 */
let stageH = 0;

/**
 * Stores previous proj, stageW, stageH
 * @type {Object}
 * @readonly
 * @private
 */
let prev; // 

/**
 * Default projection scale factor. Convenience alias of `scaler.proj.default.scale`.
 * <br>- These properties are used to convert from PSD pts to layout pts.
 * @type {number}
 * @readonly
 * @example 
let tenPt = scaler.scale * 10.0*0.5; // Convert 10px in a retina PSD to screen points
 */
let scale; // Alias of scaler.proj.default.scale
/**
 * UI projection scale factor. Convenience alias of `scaler.proj.ui.scale`.
 * @type {number}
 * @readonly
 */
let scaleUI; // Alias of scaler.proj.ui.scale

//let ats; // Screen to art factor - for dimension or relative position.  Refers to **default** proj.
//let sta; // Art to screen factor - for dimension or relative position. Refers to **default** proj.
//let atsUI; // Screen to art factor - for dimension or relative position. Alias of uiScaleFactor. Refers to **ui** proj.
//let staUI; // Art to screen factor - for dimension or relative position. Refers to **ui** proj. 

// Defaults
export let artboardDims = {width: Math.round(756.0*0.5), height:Math.round(1334.0*0.5)}; // PSD dimensions
let artboardScaleFactor = 2.0; // How many px in a pt in art
let artboardProjectionParams = {
  default: {
    alignment: {x:0, y:0}, // -1 (left/top) 0:(centered) 1:(right/bottom) 
    scaleToFit: 'contain', // `w` / `h` / `contain` / 'cover' (case insensitive). 
    minDensity: 1.0 // Limits up scaling. Eg. 1.0 will scale no larger than SD on retina. 
  },
  ui: {
    matchProjScale: 'default', // Match the scale of other projection before applying own limits 
    pinToProj: 'default', // Other projection will be used to position 
    minScale: 1, // Lock scale to no smaller than pts match with art.
    maxScale: 1.2 // Avoid oversized UI elements
  }
};


/**
 * Informs projection of scale required for a given stage dimension.
 * @callback module:scaler#ScaleFunction
 * @function
 * @param {number} stageWidth 
 * @param {number} stageHeight 
*/

/**
 * Represents the core paramters of a projection.
 * @name module:scaler#ProjectionConfig
 * @function
 * @param {Vector} alignment - Value pair for horizontal and vertical alignment.. <br>-1: (left/top) <br>0: (centered) <br>1: (right/bottom).<br>Eg. {x:0,y:0} for centered.
 * @param {module:scaler#ScaleFunction} [scaleFunction=null] - Will call a function at runtime to calculate the scale for the projection for a given width and height. 
 * @param {'w'|'h'|'contain'|'cover'} [scaleToFit='contain'] - How the artboard will be scaled relative to the stage. <br>- 'w': Match stage width.<br>- 'h': Match stage height.<br>- 'contain': Scale to fit inside stage.<br>- 'cover': Scale to fill entire stage.
 * @param {string} [matchProjScale=null] - A projection slug that will be used as the starting point for the projection settings.
 * @param {number} [minDensity=1.0] - Limits up scaling. Eg. 1.0 will scale no larger than SD on retina.
 * @param {string} [pinToProj=null] - Projection slug to be used for positioning
 * @param {number} [minScale=null] - Minimum scale. `1.0` will match PSD (accounting for retina).
 * @param {number} [maxScale=null] - Maximum scale.
*/

/**
 * Configures how layouts will be translated to the screen.
 * <br>- To be called before {@link storymode#createApp}
 * @param {Object} artboardDims - Defines the width and height of all PSD docs, in pts. Note: All PSD docs need to have the same dimensions.
 * @param {number} artboardDims.width 
 * @param {number} artboardDims.height 
 * @param {number} artboardScaleFactor - The density of the artboard. Eg. If the PSD is x2 retina, then this will be set to 2.0.
 * @param {Object.<string, module:scaler#ProjectionConfig>} artboardProjectionParams - Used to create the artboard projections. Both `default` and `ui` should be present.
 * @example
const artboardDims = {width: Math.round(1080.0*0.5), height:Math.round(1920.0*0.5)}; 
const artboardScaleFactor = 2.0; // How many px in a pt in art
const artboardProjectionParams = {
  default: {
    alignment: {x:0, y:0}, // -1 (left/top) 0:(centered) 1:(right/bottom) 
    scaleToFit: 'contain', // `w` / `h` / `contain` / 'cover' (case insensitive). 
    minDensity: 1.0 // Limits up scaling. Eg. 1.0 will scale no larger than SD on retina. 
  },
  ui: {
    matchProjScale: 'default', // Match the scale of other projection before applying own limits 
    pinToProj: 'default', // Other projection will be used to position 
    minScale: 1, // Lock scale to no smaller than pts match with art.
    maxScale: 1.2 // Avoid oversized UI elements
  }
};
scaler.configureArtboard(artboardDims, artboardScaleFactor, artboardProjectionParams);
 */
export function configureArtboard(_artboardDims, _artboardScaleFactor, _artboardProjectionParams){
  if (_artboardDims){
    artboardDims = _artboardDims;
  }
  if (_artboardScaleFactor){
    artboardScaleFactor = _artboardScaleFactor;
  }
  if (_artboardProjectionParams){
    artboardProjectionParams = _artboardProjectionParams;
  }
}

/**
 * Called once on init.
 * @private
 */
function init(){ // Called once on init for now

  // Points to pixel conversion factors
  initResizeListener();
  onResizeThrottled(true);
  initFullScreenListener();
  
}

// Artboard projection class
// -------------------------

 /**
  * Represents a projection from the PSD Artboard to the screen. 
  * @hideconstructor
  */
class ArtboardProjection {
  
  constructor(alignment = null, scaleFn = null, scaleToFit = null, matchProjScale = null, pinToProj = null, stretchPosMode = false, minDensity = null, minScale = null, maxScale = null){
    
    /**
     * Will distribute position throughout stage based relatively to art board position.
     * @readonly
     * @private
     * @type {boolean}
     */
    this.stretchPosMode = stretchPosMode;
    
    // Determine scale 
    
    /**
     * The scale applied to display objects.
     * @readonly
     * @private
     * @type {number}
     */
    this.scale;
    
    if (scaleFn !== null){
    
      this.scale = scaleFn(stageW, stageH);
    
    } else if (scaleToFit !== null){
      
      scaleToFit = scaleToFit.toLowerCase();
      // `w` / `h` / `contain` / 'cover' (case insensitive). 
      if (scaleToFit == 'contain'){
        // Make entire artboard visible to up to stage bounds, will use letterboxing
        this.scale = mutils.containScale(artboardDims.width, artboardDims.height, stageW, stageH);
      } else if (scaleToFit == 'cover'){
        // Cover stage bounds entirely, clipping tops or bottoms as necessary
        this.scale = mutils.coverScale(artboardDims.width, artboardDims.height, stageW, stageH);
      } else if (scaleToFit == 'w'){
        this.scale = stageW/artboardDims.width;
      } else if (scaleToFit == 'h'){
        this.scale = stageH/artboardDims.height;
      }
      
    } else if (matchProjScale){
      
      // Get scale from another projection
      if (matchProjScale && !proj[matchProjScale]){
        throw new Error('Scale match projection not found `'+matchProjScale+'`. Check declaration order.')
      }
      this.scale = proj[matchProjScale].scale;    
              
    }
    
    // Apply scale limits
    
    if (minDensity !== null){
      // Limits up scaling. Eg. 1.0 will scale no larger than SD on retina. 
      this.scale = this.scaleForPxDensity(Math.max(this.pxDensity, minDensity))
    }
    
    if (minScale !== null){
      this.scale = Math.max(this.scale, minScale)
    }
    
    if (maxScale !== null){
      this.scale = Math.min(this.scale, maxScale)
    }
    
    /**
     * The scale used to position in top level only.
     * @readonly
     * @private
     * @type {number}
     */
    this.positionScale = this.scale;
    
    /// Translate alignment to top left coords
    
    /**
     * Top left coordinates of the artboard on the stage.
     * @readonly
     * @private
     * @type {number}
     */
    this.topLeft = {x:0.0, y:0.0};
    if (alignment !== null){
      
      if (alignment.x == -1){
        this.topLeft.x = 0.0;
      } else if (alignment.x == 0){
        this.topLeft.x = Math.round(stageW*0.5-this.scale*artboardDims.width*0.5);
      } else if (alignment.x == 1){
        this.topLeft.x = Math.round(stageW-this.scale*artboardDims.width);
      } 
      
      if (alignment.y == -1){
        this.topLeft.y = 0.0;
      } else if (alignment.y == 0){
        this.topLeft.y = Math.round(stageH*0.5-this.scale*artboardDims.height*0.5);
      } else if (alignment.y == 1){
        this.topLeft.y = Math.round(stageH-this.scale*artboardDims.height);
      } 
      
    } else if (pinToProj){
      
      if (pinToProj && !proj[pinToProj]){
        throw new Error('Pin projection not found `'+pinToProj+'`. Check declaration order.')
      }
      
      this.topLeft = {x:proj[pinToProj].topLeft.x, y:proj[pinToProj].topLeft.y};
      this.positionScale = proj[pinToProj].positionScale;
      
    }
    
    this.sta = this.scale; // Screen to art factor - for dimension or relative position. Alias of scale.
    this.ats = 1.0/this.scale; // Art to screen factor - for dimension or relative position 
    
  }
  
  /**
   * Pixel scaling based on this.scale. Eg. If this.scale is 0.5 on @2 retina then will return 1.0
   * @readonly
   * @type {number}
   */
  get pxScale() { 
    return window.devicePixelRatio*(this.scale/artboardScaleFactor);
  }
  
  /**
   * Screen density based on this.scale. Eg. 2 for @2 retina.
   * @readonly
   * @type {number}
   */
  get pxDensity(){ 
    return (1.0/(window.devicePixelRatio*(this.scale/artboardScaleFactor)))*window.devicePixelRatio;
  }
  
  /**
   * Scale for given pixel density.
   * @returns {number} scale 
   */
  scaleForPxDensity(_pxDensity){
    return ((1.0/(_pxDensity/window.devicePixelRatio))/window.devicePixelRatio)*artboardScaleFactor;
  }

  /**
   * Translate art board relative pts to screen position (in pts).
   * @param {number} x - Artboard x position (in PSD pts).
   */
  transArtX(x){ 
    
    if (this.stretchPosMode){
      return this.topLeft.x + (x/artboardDims.width)*stageW;
    }
    return this.topLeft.x + this.positionScale*x;
    
  }
  
  /**
   * Translate art board relative pts to screen position (in pts).
   * @param {number} y - Artboard y position (in PSD pts).
   */
  transArtY(y){ 
    if (this.stretchPosMode){
      return this.topLeft.y + (y/artboardDims.width)*stageH;
    }
    return this.topLeft.y + this.positionScale*y;
  }
  
  
  /**
   * Translate screen position (in pts) to art board relative pts.
   * <br>- Opposite of `transArtY()`.
   * @param {number} screenX - Screen x position (in pts).
   */
  transScreenX(screenX){
    
    if (this.stretchPosMode){
      return ((screenX - this.topLeft.x)/stageW)*artboardDims.width;
    }
    
    return (screenX - this.topLeft.x)/this.positionScale
    
  }

  /**
   * Translate screen position (in pts) to art board relative pts.
   * <br>- Opposite of `transArtX()`.
   * @param {number} screenY - Screen y position (in pts).
   */
  transScreenY(screenY){
    
    if (this.stretchPosMode){
      return ((screenY - this.topLeft.y)/stageH)*artboardDims.height;
    }
    
    return (screenY - this.topLeft.y)/this.positionScale
    
  }
  
}

// Resize listener
// ---------------

let emitter;
const resizeThrottleDelay = 0.2;

/**
 * Sets up stage resizing functionality.
 * @private
 */  
function initResizeListener(){
  // https://nodejs.org/api/events.html
  // https://github.com/primus/eventemitter3
  emitter = new PIXI.utils.EventEmitter();
  pixiApp.renderer.on('resize', onResizeImmediate); // Listen for stage events
}

/**
 * Receives immediate notification of the stage being resized.
 * @private
 */  
function onResizeImmediate(){
  
  let _stageW = pixiApp.renderer.view.width/window.devicePixelRatio;
  let _stageH = pixiApp.renderer.view.height/window.devicePixelRatio;
  
  /**
   * Called when stage is resized, though the call is not debounced.  
   * @event module:scaler#resize_immediate
   * @property {number} stageWidth - Stage width (in pts).
   * @property {number} stageHeight - Stage height (in pts). 
   */
  emitter.emit('resize_immediate', _stageW, _stageH);
  
  utils.killWaitsFor(onResizeThrottled)
  utils.wait(resizeThrottleDelay, onResizeThrottled)
  
}

/**
 * Receives throttled (ie. debounce) notification of the stage being resized.
 * <br>- Triggers stage resize logic.
 * @private
 */  
function onResizeThrottled(force = false){
  
  let _stageW = pixiApp.renderer.view.width/window.devicePixelRatio;
  let _stageH = pixiApp.renderer.view.height/window.devicePixelRatio;
  
  if (!force && _stageW == stageW && _stageH == stageH){
    return;
  }
  
  // Save previous 
  if (proj){
    if (prev && prev.proj){
      for (let projID in prev.proj){
        prev.proj[projID] = null;
        delete prev.proj[projID];
      }
    }
    prev = {};
    prev.proj = proj;
    prev.stageW = stageW;
    prev.stageW = stageH;
    prev.scale = scale; 
    prev.scaleUI = scaleUI;
  }
  
  stageW = _stageW;
  stageH = _stageH;
  proj = {};
  for (let projectionSlug in artboardProjectionParams){
    let params = artboardProjectionParams[projectionSlug];    
    proj[projectionSlug] = new ArtboardProjection(params.alignment, params.scaleFn, params.scaleToFit, params.matchProjScale, params.pinToProj, params.stretchPosMode, params.minDensity, params.minScale, params.maxScale);   
  }
  scale = proj.default.scale; 
  scaleUI = proj.ui.scale;
  
  
  /**
   * Called when stage is resized. The call frequency of method is debounced (throttled).
   * <br>- This call is made *after* `scaler.stageW` and `scaler.stageH` properties have been updated.
   * @event module:scaler#resize
   * @property {number} stageWidth - Stage width (in pts).
   * @property {number} stageHeight - Stage height (in pts). 
   * @example 
scaler.on('resize', this.onStageResize, this);
function onStageResize(stageW, stageH){
 // ...
}
scaler.off('resize', this.onStageResize, this); // Cancel
   */
  emitter.emit('resize', stageW, stageH);
}

// https://nodejs.org/api/events.html
// https://github.com/primus/eventemitter3


/**
 * Listen for event.
 * <br>- See {@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}.
 * @param {string} eventName - The event identifier.
 * @param {Function} listener - The function to call.
 * @param {Object} context - The scope in which to call the function (ie. defines `this`).
 * @example 
scaler.on('resize', this.onStageResize, this); // 3rd arg is function scope
 */ 
function on(eventName, listener, context){
  return emitter.on(eventName, listener, context);
}

/**
 * Cancel an event listener.
 * @param {string} eventName - The event identifier.
 * @param {Function} listener - The function to call.
 * @param {Object} context - The scope in which to call the function.
 */  
function off(eventName, listener, context){
  return emitter.off(eventName, listener, context);
}

/**
 * Removes all event listeners.
 * @private
 */  
function removeAllListeners(){
  if (!emitter){
    return true;
  }
  return emitter.removeAllListeners();
}

// Fullscreen 
// ----------

const FULLBROWSER_ENABLED = true; 

/**
 * Sets up fullscreen functionality.
 * @private
 */ 
function initFullScreenListener(){
  if (!supportsFullScreen()){
    return;
  }
  fscreen.addEventListener('fullscreenchange', onFullscreenChange);
}

/**
 * Called internally when app toggles fullscreen state.
 * @private
 */ 
function onFullscreenChange(){
  
  const _isFullscreen = isFullScreen()
  if (_isFullscreen){
    utils.addClass(htmlEle, 'fullscreen'); // class is added so pixi div can take over browser 
  } else {
    utils.removeClass(htmlEle, 'fullscreen') 
  }
  
  /**
   * Called when fullscreen mode changes.
   * @event module:scaler#fullscreenchange
   * @property {boolean} isFullScreen - Whether the app is now being displayed in full-screen (or full-browser).
   * @example 
scaler.on('fullscreenchange', this.syncState, this); // 3rd arg is function scope
dispose(){
 scaler.off('fullscreenchange', this.syncState, this);
}
  */
  emitter.emit('fullscreenchange', _isFullscreen);
}

/**
 * Indicates whether the current browser supports full screen functionality.
 * <br>- This includes fullbrowser support (if enabled). 
 * @returns {boolean} fullscreenSupported
 */ 
function supportsFullScreen(){
  return _supportsActualFullScreen() || _supportsFullBrowser();
}

/**
 * Indicates whether the current browser supports full-browser functionality.
 * @private
 * @returns {boolean} fullBrowserSupported
 */ 
function _supportsFullBrowser(){
  if (!FULLBROWSER_ENABLED){
    return false;
  }
  return pixiApp.resizeTo !== window;
}

/**
 * Indicates whether the current browser supports full-screen.
 * @private
 */ 
function _supportsActualFullScreen(){
  return fscreen.fullscreenEnabled;
}

/**
 * Indicates whether the app is currently being presented full-screen (or full-browser).
 * @returns {boolean} isFullScreen
 */ 
function isFullScreen(){
  
  if (!supportsFullScreen()){
    return false;
  }
  
  if (_supportsActualFullScreen()){
    return Boolean(fscreen.fullscreenElement);
  }
  
  // Full browser:
  return utils.hasClass(htmlEle, 'fullscreen')
  
}


/**
 * Toggles full-screen / full-browser presentation mode.
 * <br>- The CSS class `fullscreen` will be added to the containing element when fullscreen is applied.
 * @param {string} {string|DOMElement} [resizeTarget=null] - The element to resize. Ignored for full-browser. Optionally the HTML DOMElement id can be supplied as a string or use `cv` to target the PIXI canvas. Will default to the html tag of the page.
 */ 
function toggleFullScreen(ele = null, forceState = null){
  
  if (!supportsFullScreen()){
    return;
  } else if (!_supportsActualFullScreen()){
    
    // Toggle full browser without actually going full screen
    let _isFullscreen;
    if (utils.hasClass(htmlEle, 'fullscreen')){
      _isFullscreen = true;
    } else {
      _isFullscreen = false;
    }
    
    let _state = (forceState === true || forceState === false) ? forceState : !_isFullscreen;
    if (_state == _isFullscreen){
      return
    }
    if (_state){
      utils.addClass(htmlEle, 'fullscreen') 
    } else {
      utils.removeClass(htmlEle, 'fullscreen') 
    }
    emitter.emit('fullscreenchange', _state); // Simulate this event
    pixiApp.resize();
    return;
  }
  
  if (typeof ele == 'string'){ 
    if (ele == 'cv'){ // Canvas shorthand
      ele = pixiApp.view;
    } else {
      ele = utils.e(ele.split('#').join('')); // Id is assumed if string
    } 
  } 
  
  if (!ele){
    ele = document.body.parentNode; // html * as default
  }

  let isFS = isFullScreen();
  let state = (forceState === true || forceState === false) ? forceState : !isFS;
  if (state == isFS || !ele){ // No change or ele not found
    return;
  }
  
  if (state){ // Full screen
    // this.fsPrevResizeTo = pixiApp.resizeTo    
    // pixiApp.resizeTo = window
    fscreen.requestFullscreen(ele);
  } else {
    //pixiApp.resizeTo = this.fsPrevResizeTo
    fscreen.exitFullscreen();
  }
  
}

/**
 * Called by `storymode.destroy()`.
 * @param {boolean} reset - If true then will be able to be used again after calling `scaler.init()`
 * @private
 */
function destroy(reset){
  fscreen.removeEventListener('fullscreenchange', onFullscreenChange);
  removeAllListeners();
  prev = null;
  if (!reset){
    emitter = null;
  }
}

// export {pixiApp}
export {toggleFullScreen, isFullScreen, supportsFullScreen}
export {scale, scaleUI, prev, artboardScaleFactor}
export {init, proj, stageW, stageH, on, off, resizeThrottleDelay, destroy}


