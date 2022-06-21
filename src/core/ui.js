/**
 * Manages texture data as it relates to loading and laying out assets.
 * <br>- Asset, projection and scale aware convenience extensions of Pixi display object classes. Relies on exported PSD data.
 * <br>- Recieves PSD json data used to layout visuals in the app
 * <br>- Handles initial loading of assets through `PIXI.Loader.shared`, including images, spritesheets, webfonts and audio.
 * <br>- Webfont loading requires this js script: `&lt;script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"&gt;&lt;/script&gt;`.
 * <br>- If web font loading is not required remove the above Google webfont script.
 * @module ui 
 */

import { Scene, scaler, utils } from './../storymode.js';

// Index textures
let psdInfo;

/**
 * Contains all text data.
 * @type {number}
 * @readonly
 * @example 
const boxArtW = ui.txInfo[this.psdID + '/' + 'box'].width;
 */
let txInfo;

/**
 * Pass the exported PSD JSON data to the `ui` class.
 * <br>- To be called before {@link storymode#createApp}
 * @param {Array.<Object>} documentContent - Each entry in the array represents the content of a PSD's .json.
 * @example 
ui.registerPsdInfo(utils.requireAll(require.context('./ui', false, /.json$/)))
 */
function registerPsdInfo(_psdInfo){
  
  psdInfo = {}
  for (let psdData of _psdInfo) {
    psdInfo[psdData.doc.name] = psdData; // Retain `.psd` ext
  }
  
  txInfo = {};
  for (let psdID in psdInfo){
    for (let i = psdInfo[psdID].doc.txs.length - 1; i >=0 ; i--) {
      
      if (psdInfo[psdID].doc.txs[i].type == 'div'){
        if (psdInfo[psdID].doc.txs[i].clone){     
          psdInfo[psdID].doc.txs[i].type = 'img';
        
        } else if (psdInfo[psdID].doc.txs[i].flags.split(',').indexOf('white') != -1){
          psdInfo[psdID].doc.txs[i].txOverride = 'white';
          psdInfo[psdID].doc.txs[i].type = 'img';
        } else if (psdInfo[psdID].doc.txs[i].flags.split(',').indexOf('empty') != -1){
          psdInfo[psdID].doc.txs[i].txOverride = 'empty';
          psdInfo[psdID].doc.txs[i].type = 'img';
        }
      } 
      
      psdInfo[psdID].doc.txs[i].psdID = psdID; // Create a ref back to the PSD
      psdInfo[psdID].doc.txs[i].path = psdID + '/' + (psdInfo[psdID].doc.txs[i].clone ? psdInfo[psdID].doc.txs[i].clone : psdInfo[psdID].doc.txs[i].name);
      
      psdInfo[psdID].doc.txs[i].index = i; // Save index
      psdInfo[psdID].doc.txs[i].projID = psdInfo[psdID].doc.txs[i].flags.split(',').indexOf('ui') != -1 ? 'ui' : 'default' // Interpret flags as projections
      psdInfo[psdID].doc.txs[i].children = []; // Will be added to in subsequent loops of children

      if (psdInfo[psdID].doc.txs[i].tfParams.length > 0){
        psdInfo[psdID].doc.txs[i].tfParams = JSON.parse(psdInfo[psdID].doc.txs[i].tfParams); // Convert from JSON string to obj
      }
      if (psdInfo[psdID].doc.txs[i].parent){
        txInfo[psdInfo[psdID].doc.name + '/' + psdInfo[psdID].doc.txs[i].parent].children.unshift(psdInfo[psdID].doc.txs[i].name);
      }
      txInfo[psdInfo[psdID].doc.name + '/' + psdInfo[psdID].doc.txs[i].name] = psdInfo[psdID].doc.txs[i]; // Allow texture look up (with `psdname.psd/` prefix)
    }
  }
}

let spritesheetPath = 'img/'
const SPRITESHEET_RESOURCE_SUFFIX = '.ss';
/**
 * Register the path to sprite sheet assets.
 * <br>- To be called before {@link storymode#createApp}
 * @param {string} [relativePath='img/'] - web path to sprite sheet directory from app root.
 */
function registerSpritesheetPath(_spritesheetPath){
  spritesheetPath = _spritesheetPath;
}

/**
 * Register a file base name suffix to be appended to spritsheet loads.
 * <br>- To be called before {@link storymode#createApp}
 * @param {string} [spritesheetSuffix=''] - Suffix, eg `@2x` for retina+ resolution.
 */
let spritesheetSuffix = '';
function setSpritesheetSuffix(_spritesheetSuffix){
  spritesheetSuffix = _spritesheetSuffix;
}

let _crispTextMode = false;
/**
 * Control the aliasing of text fields added via `displayObject.fromTx(...)` and `displayObject.addArt(...)`. 
 * <br>- Will default to `false` if not called.
 * <br>-  If set to true then text fields added by the platform will have `texture.baseTexture.scaleMode` set to `PIXI.SCALE_MODES.NEAREST`
 * @param {boolean} [enable=false]
 */
export function crispTextMode(enable){
  _crispTextMode = enable;
}

let totLoadsComplete = 0;
let initialLoadItemCount = 0;
let loadAssetCallback;

let onLoaderQueueCallback = null;

/**
 * Make a single callback immediately before app assets are loaded. 
 * <br>- Manually queue any additional assets to be loaded.
 * <br>- Needs to be called before {@link storymode#createApp}
 * @param {Function} callback  
 * @example 
 ui.onLoaderQueue((loader)=>{
   loader.add('my_bmp_font', 'fonts/mybmp.fnt');
 })
 */
export function onLoaderQueue(_onLoaderQueueCallback){
  onLoaderQueueCallback = _onLoaderQueueCallback
}

/**
 * `storymode` will call this method as part of the initialisation of {@link storymode#createApp}.
 * <br>- Manually queue any additional assets to be loaded.
 * @param {Function} loadAssetCallback  
 * @private
 */
export function autoloadAssets(_loadAssetCallback){
  
  if (!psdInfo){
    throw new Error('PSD info never registered. Call `ui.registerPsdInfo(..)` before initiating app.')
  }
  
  loadAssetCallback = _loadAssetCallback;
  
  // Wait for loader
  initialLoadItemCount++;
  
  // 1) Load Google web fonts     
  
  if (queueWebFonts()){
    initialLoadItemCount++;
  }
  
  // 2) Load all images

  let queuedSpritesheets = {};
  for (let psdID in psdInfo){
    if (psdInfo[psdID].doc.spritesheet){ // Load spritesheets associated with PSD once
      let spritesheetBaseName = psdInfo[psdID].doc.spritesheet;
      if (!queuedSpritesheets[spritesheetBaseName] && !disabledSpritesheetBaseNames[spritesheetBaseName]){
        queuedSpritesheets[spritesheetBaseName] = true;
        loader.add(spritesheetBaseName + SPRITESHEET_RESOURCE_SUFFIX, spritesheetPath+spritesheetBaseName + spritesheetSuffix+'.json'); 
      }
    } else {
      for (let tx of psdInfo[psdID].doc.txs){  // Load individual images
        if (tx.type === 'img' && !tx.txOverride && !tx.clone){ 
          loader.add(tx.path, tx.src);
        }
      }
    }
  }
  
  if (onLoaderQueueCallback){
    onLoaderQueueCallback(loader);
  }
  
  loader.load(onAutoLoadComplete);
  
}

/**
 * Called after an asset class (webfont or textures) has finished autoloading.
 * @private
 */
function onAutoLoadComplete(){
  totLoadsComplete++;
  if (totLoadsComplete === initialLoadItemCount){
    if (loadAssetCallback){
      loadAssetCallback();
    }
  }
}

// On demand sprite sheets
// -----------------------

let disabledSpritesheetBaseNames = {};

/**
 * Disable autoloading the given spritesheet at startup.
 * <br>- To be called before {@link storymode#createApp}.
 * @param {...string} spritesheetBasename - Spritesheet name without extension.
 * @example 
 
// On startup:
ui.registerOnDemandLoadMode('lazy')

// In scene:

onDidArrive(fromModal){

  super.onDidArrive(fromModal);

  ui.queueOnDemandLoad('lazy', function(){ // Will fire instantly if already loaded,
    // Add lazy loaded sprites...
  })
  
}

onWillExit(fromModal){

  super.onWillExit(fromModal){;

  ui.removeOnDemandListeners(); // Prevent lost callbacks
  
}
 
 */
export function registerOnDemandLoadMode(...spritesheetBasenames){
  for (let spritesheetBasename of spritesheetBasenames){
    disabledSpritesheetBaseNames[spritesheetBasename] = true;
  }
}

/**
 * Checks if sprite sheet is loaded and ready to use.
 * @param {string} spritesheetBasename - Spritesheet name without extension.
 * @returns {boolean} isLoaded
 */
export function isSpritesheetLoaded(spritesheetBasename){
  if (typeof resources[spritesheetBasename + SPRITESHEET_RESOURCE_SUFFIX] === 'undefined'){
    return false;
  }
  return resources[spritesheetBasename + SPRITESHEET_RESOURCE_SUFFIX].spritesheet ? true : false;
}

/**
 * Queue a single spritesheet or multiple spritesheets to be loaded with an `onComplete` callback.
 * <br>- Designed to be called multiple times without causing any issues.
 * <br>- Any existing on-demand load callbacks will be overwritten with the current callback.
 * <br>- If the spritesheets are already loaded the callback will be fired immediately.
 * @param {string|Array} spritesheetBasenames - Spritesheet name without extension, or array of spritesheet base names.
 * @param {Function} loadCallback - `Oncomplete` callback.
 */
export function queueOnDemandLoad(spritesheetBasenames, loadCallback){
  removeOnDemandListeners();  
  if (loader.loading){
    loader.reset();
  } 
  spritesheetBasenames = Array.isArray(spritesheetBasenames) ? spritesheetBasenames : [spritesheetBasenames]
  for (let spritesheetBasename of spritesheetBasenames){
    if (!isSpritesheetLoaded(spritesheetBasename)){
      loader.add(spritesheetBasename + SPRITESHEET_RESOURCE_SUFFIX, spritesheetPath+spritesheetBasename + spritesheetSuffix+'.json'); 
    }
  }
  // loader.onError.add(onLoaderError); 
  loader.onComplete.add(loadCallback)
  loader.load();
}

/**
 * Remove all listeners to the shared loader.
 */
export function removeOnDemandListeners(){
  loader.onComplete.detachAll();  
}

/**
 * Returns a texture from given sprite path. 
 * <br>- Textures inside spritesheets are supported.
 * <br>- Optionally supply a clipping frame - which is handly for cutting up a sprite at runtime.
 * @param {string} texturePath -  A reference to the containing PSD document and layer name, separated by a forward slash. Eg. `mydoc.psd/mysprite`.   
 * @param {PIXI.Rectangle} [frame=null] - Clip the texture to the supplied frame. Not compatible with spritesheet assets. Will be taken into account with `dispo.applyProj()`.
 * @returns {PIXI.Texture} texture - Texture instance
 * @memberof PIXI.Texture
 * @example
 * PIXI.Texture.fromTx(`mydoc.psd/mysprite`)
 */
PIXI.Texture.fromTx = function(txPath, frame = null){
  
  if (!txInfo[txPath]){
    throw new Error('Texture info not found `'+txPath+'`')
  }
  //console.log('resources[txPath]',resources,txPath,resources[txPath])
  if (resources[txPath] && resources[txPath].texture){
    return new PIXI.Texture(resources[txPath].texture, frame);
  } else {
    let spritesheetBaseName = psdInfo[txInfo[txPath].psdID].doc.spritesheet 
    let spritesheet = resources[spritesheetBaseName + SPRITESHEET_RESOURCE_SUFFIX];
    if (spritesheet){     
      return spritesheet.textures[txInfo[txPath].path];
    } else {      
      throw new Error('Spritesheet not found `'+spritesheetBaseName+'` (via `'+txInfo[txPath].psdID+'`)')
    }
    throw new Error('Spritesheet textures not supported `'+txPath+'`')
  }
   
}


/**
 * Loads supplied texture to target class automatically scaled and positioned based on the projection properties of the `scaler` class.
 * <br>- Optionally supply a clipping frame - which is handly for cutting up a sprite at runtime.
 * <br>- Supports `PIXI.Text`, `PIXI.Graphics`, `PIXI.AnimatedSprite`, `PIXI.Sprite`, `PIXI.Container`.
 * @param {string} texturePath -  A reference to the containing PSD document and layer name, separated by a forward slash. Eg. `mydoc.psd/mysprite`.   
 * @param {boolean} [addChildren=true] -  If `true` then the display object's nested children will be added as well.
 * @param {PIXI.Rectangle|string} [frame|textContent=null] - For a sprite will clip the texture to the supplied frame rect. Not compatible with spritesheet assets. Will be taken into account with `dispo.applyProj()`. For text this paramer will overwrite the containing text of the field.
 * @returns {PIXI.DisplayObject} displayObject - Display object instance. 
 * @memberof PIXI.DisplayObject
 * @example
 * let mySpr = Sprite.fromTx(this.psdID + '/' + 'mysprite');
 * this.addChild(mySpr); // Sprite will be at projected scale and position.
 */
PIXI.DisplayObject.fromTx = function(txPath, addChildren = true, frame = null){
  
  let isAnimSprite = this == AnimatedSprite || this.prototype instanceof AnimatedSprite
  if (!txInfo[txPath] && !isAnimSprite){ // If animated sprite there will be no texture with that path
    throw new Error('Texture info not found `'+txPath+'`')
  }
  
  let dispo;
  
  //if (this == Btn){
  //  
  //  dispo = new Btn(txPath);
  //    
  //} else 
  
  if (this == Graphics){
    
    dispo = new Graphics();
  
  } else if (this == Text){
    
    let font = fonts[fontClassForPsdFont[txInfo[txPath].tfParams.font]];
    let fontFamilyList = [font.googleFontName].concat(font.fallbacks);
    
    // https://pixijs.download/dev/docs/PIXI.TextStyle.html
      
    let fontStyle = psdFontStyleComponents(txInfo[txPath].tfParams.fontStyle);
    
    dispo = new Text(frame ? frame : txInfo[txPath].tfParams.text, {
      fontFamily: fontFamilyList,
      fontSize: txInfo[txPath].tfParams.fontSize * scaler.proj[txInfo[txPath].projID].scale, // Apply projection scale to font size. 
      fill: txInfo[txPath].tfParams.color,
      fontWeight: fontStyle.weight,
      align: txInfo[txPath].tfParams.align, // Only affects multi-line fields, use reg to control alignment
      fontStyle: fontStyle.style
    });
    
    if (_crispTextMode){
      dispo.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    }
    
  } else if (isAnimSprite){
    
    let psdID = txPath.split('/')[0];
    
    let spritesheetBaseName = psdInfo[psdID].doc.spritesheet 
    let spritesheet = resources[spritesheetBaseName + SPRITESHEET_RESOURCE_SUFFIX];
    
    if (spritesheet){
    
      if (spritesheet.spritesheet && spritesheet.spritesheet.animations){
    
        if (spritesheet.spritesheet.animations[txPath]){
          const ssTxs = spritesheet.spritesheet.animations[txPath];
          
          const applyRegFromF1 = true; // Register sprite textures based on frame #1
          if (applyRegFromF1){ 
            // Set default anchor for textures so they align with frame #1
            // Assumes animation textures are named `%prefix%_0`,`%prefix%_1`,`%prefix%_2`,...
            let baseFrameTxInfo
            for (let frameIndex = 0; frameIndex < ssTxs.length; frameIndex++){
              let frameTxPath = txPath + '_' + String(frameIndex)
              if (!txInfo[frameTxPath]){
                throw new Error('Spritesheet frame texture not found `'+frameTxPath+'`. ')
              }
              
              let offset = {}
              // Compare top left position
              
              offset.tx = txInfo[frameTxPath].x - txInfo[frameTxPath].width * txInfo[frameTxPath].regPercX;
              offset.ty = txInfo[frameTxPath].y - txInfo[frameTxPath].height * txInfo[frameTxPath].regPercY;
              if (frameIndex === 0){
                
                baseFrameTxInfo = offset;
                baseFrameTxInfo.regOffsetX = txInfo[frameTxPath].width * txInfo[frameTxPath].regPercX;
                baseFrameTxInfo.regOffsetY = txInfo[frameTxPath].height * txInfo[frameTxPath].regPercY;
                
                baseFrameTxInfo.x = txInfo[frameTxPath].x;
                baseFrameTxInfo.y = txInfo[frameTxPath].y;
                baseFrameTxInfo.regPercX = txInfo[frameTxPath].regPercX
                baseFrameTxInfo.regPercY = txInfo[frameTxPath].regPercY
                ssTxs[frameIndex].defaultAnchor= {x: txInfo[frameTxPath].regPercX,y: txInfo[frameTxPath].regPercX}; // |!| Maybe dont need this or use txinfo.regPercX / Y
              } else {
                ssTxs[frameIndex].defaultAnchor = {x:((baseFrameTxInfo.tx-offset.tx+baseFrameTxInfo.regOffsetX)/txInfo[frameTxPath].width), y: ((baseFrameTxInfo.ty-offset.ty+baseFrameTxInfo.regOffsetY)/txInfo[frameTxPath].height)}; // Convert offset to percentage of dimensions
              }
            }
          }
          
          dispo = new PIXI.AnimatedSprite(ssTxs);
          if (applyRegFromF1){
            dispo.updateAnchor = true;
          }
          
          txPath = dispo.textures[0].textureCacheIds[0];
        } else {
          throw new Error('Spritesheet animation not found `'+txPath+'`. ')
        }
        
      } else {
        throw new Error('Spritesheet animations not found. Ensure tps auto-detect animations is enabled.')
      }
      
    } else {
      throw new Error('Spritesheet not found `'+spritesheetBaseName+'` (via `'+psdID+'`)')
    }
  
  } else if (this == Sprite || this.prototype instanceof Sprite){ // Custom Sprite class
    
    if (txInfo[txPath].txOverride){
      
      if (txInfo[txPath].txOverride == 'white'){
        dispo = new this(PIXI.Texture.WHITE);
      } else if (txInfo[txPath].txOverride == 'empty'){
        dispo = new this(PIXI.Texture.EMPTY);
      }
      
    } else if (!txInfo[txPath].src){      
      
      let spritesheetBaseName = psdInfo[txInfo[txPath].psdID].doc.spritesheet 
      let spritesheet = resources[spritesheetBaseName + SPRITESHEET_RESOURCE_SUFFIX];
  
      if (spritesheet){     
        if (!spritesheet.textures){
          throw new Error('Spritesheet `textures` property not defined.');
        }
        dispo = new this(spritesheet.textures[txInfo[txPath].path]); // Throwing IE11
      } else {
        throw new Error('Spritesheet not found `'+spritesheetBaseName+'` (via `'+txInfo[txPath].psdID+'`)')
      }
      
    } else if (frame){ // Create a clipped frame - not compatible with spritesheet assets      
      // Create a new texture with frmae defined.
      // dispo.applyProj(); will take this frame into account
      let tx = new PIXI.Texture(resources[txInfo[txPath].path].texture.baseTexture, frame); 
      dispo = new this(tx);
      dispo._hasFrame = true; // Extra prop to indicate sprite has been cropped to frame. Spritesheet sprites will not have this property
    } else {
      dispo = new this(resources[txInfo[txPath].path].texture);
    }
  } else if (this == Container || (this.prototype instanceof Container)){ // Custom container class
    dispo = new this();
  } else {
    throw new Error('Unable to initialize from texture `'+txPath+'`')
  }
  
  // Extra prop that art aware display objects posess.
  dispo.txInfo = utils.cloneObj(txInfo[txPath]); // Clone this prop as individual sprites may have custom x,y,scale
  
  dispo.name = dispo.txInfo.name; // Optional, for convenience
  
  dispo.applyProj();
  
  if (addChildren){
    // Add children
    dispo.addArt();
  }
  
  // If `setup` function exists then call now after applying projection and adding children
  if (typeof dispo.init === 'function'){
    dispo.init.bind(dispo)(); // Setup based on `txInfo`
  }
  
  return dispo;
  
}


/**
 * Syncs the position relative to another, as defined in the PSD.
 * @param {PIXI.DisplayObject} targetDispo - The display object to sync relative to. 
 * @param {boolean} [syncX=true] - Whether to sync x position.
 * @param {boolean} [syncX=true] - Whether to sync y position.
 * @memberof PIXI.DisplayObject
 * @example 
this.art.targetSprite.position.set(scaler.stageW*0.5, scaler.stageH*0.5);
this.art.followerSprite.syncRelative(this.art.targetSprite)
 */
PIXI.DisplayObject.prototype.syncRelative = function(targetDispo, syncX = true, syncY = true, round = false){
  
  if (syncX){
    let artOffsetX = this.txInfo.x - targetDispo.txInfo.x;
    let _x = targetDispo.x + artOffsetX*scaler.proj[this.txInfo.projID].scale; 		
    this.x = round ? Math.round(_x) : _x;
  }
  
  if (syncY){
    let artOffsetY = this.txInfo.y- targetDispo.txInfo.y;
    let _y = targetDispo.y + artOffsetY*scaler.proj[this.txInfo.projID].scale; 
    this.y = round ? Math.round(_y) : _y;
  }
  
}

/**
 * Attempts to update the `txInfo` property of a `PIXI.DisplayObject` to match its current stage position and scale.
 * <br>- The `usePrevious` is needed in a scenario when the stage has already resized and the scaler already updated and we need to go back to see the previous scaler state to work out the Display Object's relative stage position and scale.
 * @param {boolean|Array.<string>} [syncProps=true] - Optional array of props: `width`,`height`,`x`,`y`,'pos','scale'. Eg. ['x','y'].
 * @param {boolean} [usePrevious=false] - Assumes the dispos's current position is relative to scaler.prev (the previous stage dimension info).
 * @memberof PIXI.DisplayObject
 * @expermimental
 */
PIXI.DisplayObject.prototype.syncTxInfoToStage = function(syncProps = true, usePrevious = false){
  
  let _scaler ;
  if (usePrevious){
    if (!scaler.prev){
      throw new Error('No scaler.prev not found')      
    } else {
      _scaler = scaler.prev;
    }
  } else {
    _scaler = scaler;
  }
  
  const syncPos = syncProps === true || syncProps.includes('pos');
  const syncScale = syncProps === true || syncProps.includes('scale');  
  const projID = this.txInfo.projID;
  
  let txInfoOriginal = {x:this.txInfo.x,y:this.txInfo.y,width:this.txInfo.width,height:this.txInfo.height}
  
  if (syncPos || syncProps.includes('x')){
    this.txInfo.x = _scaler.proj[projID].transScreenX(this.position.x);
  }
  if (syncPos || syncProps.includes('y')){
    //origY = this.txInfo.y
    this.txInfo.y = _scaler.proj[projID].transScreenY(this.position.y);
  }
  
  if (syncScale || syncProps.includes('width')){
    this.txInfo.width = (1.0/_scaler.proj[projID].scale) * this.width;
  }
  if (syncScale || syncProps.includes('height')){
    this.txInfo.height = (1.0/_scaler.proj[projID].scale) * this.height;
  }
  
}


/**
 * Applys the size and position based on the current stage dimensions and scaler projection.
 * <br>- Called on each instance that `storymode` creates.
 * <br>- Suitable to be called after a stage resize event.
 * @param {boolean|Array.<string>} [syncProps=false] - If not `false` will call `syncTxInfoToStage(...)` to update the `txInfo` first. Optional array of props: `width`,`height`,`x`,`y`,'pos','scale'. Eg. ['x','y'].
 * @memberof PIXI.DisplayObject
 */
PIXI.DisplayObject.prototype.applyProj = function(syncProps = false){
  
  if (syncProps !== false){
    this.syncTxInfoToStage(syncProps, true);
  }
  
  // Projection for animated sprites are based from frame 0
  // Temporarily switch to frame 0, apply projection then resume state
  let animSpriteWasPlaying = false;
  let animSpriteCurrentFrame = 0;
  if (this.isAnimatedSprite){
    animSpriteWasPlaying = this.playing;
    animSpriteCurrentFrame = this.currentFrame;
    this.gotoAndStop(0)
  }
  
  const projID = this.txInfo.projID;
  
  // Store a pure representation of the position and scale as it relates to the stage.
  this.txInfo._proj = {};
  
  
  this.txInfo._proj.x = scaler.proj[projID].transArtX(this.txInfo.x);
  this.txInfo._proj.y = scaler.proj[projID].transArtY(this.txInfo.y);
  this.txInfo._proj.width = scaler.proj[projID].scale * this.txInfo.width;
  this.txInfo._proj.height = scaler.proj[projID].scale * this.txInfo.height;
  
  //if (_crispTextMode && (this instanceof Text)){
  //  this.txInfo._proj.x = Math.round(this.txInfo._proj.x);
  //  this.txInfo._proj.y = Math.round(this.txInfo._proj.y);
  //}
  
  // Take into account frame (clipping) applied to this sprite's texture
  if (this._hasFrame){ 
    if (this.texture.frame.x != 0.0 || this.texture.frame.y != 0.0){
      this.txInfo._proj.x += this.texture.frame.x*scaler.proj[projID].pxScale; // Convert tx px offset to screen pixel * artboard scale 
      this.txInfo._proj.y += this.texture.frame.y*scaler.proj[projID].pxScale; // Convert tx px offset to screen pixel * artboard scale 
    }
    this.txInfo._proj.width *= (this.texture.frame.width/this.texture.baseTexture.width);
    this.txInfo._proj.height *= (this.texture.frame.height/this.texture.baseTexture.height);
  }
  
  // Add bounds 
  this.txInfo._proj.tlX = this.txInfo._proj.x - this.txInfo._proj.width*this.txInfo.regPercX;
  this.txInfo._proj.tlY = this.txInfo._proj.y - this.txInfo._proj.height*this.txInfo.regPercY;
  this.txInfo._proj.brX = this.txInfo._proj.tlX + this.txInfo._proj.width
  this.txInfo._proj.brY = this.txInfo._proj.tlY + this.txInfo._proj.height
  
  // Apply anchor. Containers don't use anchors.
  if (this.isSprite){
    this.anchor.set(this.txInfo.regPercX, this.txInfo.regPercY);
  //  this.txInfo._density = this.texture.width/this.txInfo.width
  } else if (this instanceof PIXI.Mesh){
    this.pivot.x = this.texture.width * this.txInfo.regPercX;
    this.pivot.y = this.texture.height * this.txInfo.regPercY;
  }
  
  if (this.txInfo.parent){ // Don't manage alignment of children    
    this.x = scaler.proj[projID].scale * this.txInfo.x;
    this.y = scaler.proj[projID].scale * this.txInfo.y; 
  } else {
    this.x = this.txInfo._proj.x
    this.y = this.txInfo._proj.y
  }
  
  if (this.txInfo.hug){
    this.hug(this.txInfo.hug); 
  }

  if (this.isSprite && !(this instanceof Text)){ 
    // - Text fields need no limit on dimensions
    // - Containers are positional pins and do not need to be scaled
    // - Take into consideration any frame (clipping) applied to the sprite's texture.    
    this.width = this.txInfo._proj.width;
    this.height = this.txInfo._proj.height;
  } else if (this instanceof PIXI.Mesh){
    this.scale.set(scaler.proj[projID].scale/scaler.artboardScaleFactor,scaler.proj[projID].scale/scaler.artboardScaleFactor);
  }
  
  if (this instanceof Text){
    const calcFontSize = this.txInfo.tfParams.fontSize * scaler.proj[projID].scale;
    const diff = this.style.fontSize - calcFontSize;
    if (Math.abs(diff) > 0.001){ // Don't trigger font re-render if text field was just added
      this.style.fontSize = this.txInfo.tfParams.fontSize * scaler.proj[projID].scale;
    }
  }
  
  if (this.isAnimatedSprite){
    if (animSpriteWasPlaying){
      this.gotoAndPlay(animSpriteCurrentFrame)
    } else {
      this.gotoAndStop(animSpriteCurrentFrame)
    }
  }
  
}


/**
 * Will return an array of texture names that match the supplied globs.
 * <br>- Same as a dry run of `displayObject.addArt()`.
 * @param {...string} [textureNameGlob=null] - Optional texture names or wildcard pattern Eg. `*_tx_suffix`, `!tf_match*`, `tx_prefix_*`
 * @memberof PIXI.DisplayObject
 */ 
PIXI.DisplayObject.prototype.getArt = function(txNameGlob){
  let args = Array.from(arguments);  
  return this.addArt.apply(this, ['_GETNAMESONLY'].concat(args));
}

// 
// 
// |txNameGlob| is an optional texture name pattern, can add multiple arguments, will add textures that match any condition
// Accepts wildcard filtering Eg. `*_tx_suffix`, `!tf_match*`, `tx_prefix_*`
// Display objects can optionally declare a method called `addArtTxNameGlobs` that returns an array of txNameGlobs.
// This will be used if none are sent to this method.

/**
 * Will add all matching textures to the calling instance according to nesting, scale and position settings in the PSD export data and `scaler` class.
 * <br>- This method is usually called by a `scene` and will load textures found in the PSD associated with the scene via the `psdID` property.
 * <br>- Nested display objects (display objects within display objects) are automatically added as well.
 * <br>- If caller is a scene then all top level items are added otherwise will add chidren only.
 * <br>- All display objects added will also be appended to a property called `art` of the calling instance, in a lookup object by texture name.
 * @param {...string} [textureNameGlob=null] - Optional texture names or wildcard pattern to include and/or exclude. Eg. `*_tx_suffix`, `!tf_match*`, `tx_prefix_*`
 * @returns {Array.<PIXI.DisplayObject>} added - An array of display objects added to the calling instance.
 * @memberof PIXI.DisplayObject
 * @example 
// Adding art on scene load
didLoad(ev){
 super.didLoad(ev);
 const added = this.addArt('!healthbar', 'player_*', '!mountains*');
 const head = this.art.player_head; // Access added display object
 // ...
}
 */ 
PIXI.DisplayObject.prototype.addArt = function(txNameGlob){
  
  if (!(this instanceof Scene) && this.txInfo && this.txInfo.children.length == 0){   
    // No children to add
    return
  }
    
  let added = [];
  let psdID; 
  let txs;
  let startIndex = null;
  let endIndex = null;
  let addTopLevelOnly;
  
  if (!(this instanceof Scene) && this.txInfo){
    
    psdID = this.txInfo.psdID;    
    // Only loop the subset of textures for this item. May include children of children that will not be added.
    startIndex = txInfo[psdID + '/' + this.txInfo.children[this.txInfo.children.length-1]].index;
    endIndex = txInfo[psdID + '/' + this.txInfo.children[0]].index;
    addTopLevelOnly = false;
        
  } else {
    
    // Use scene psdID property 
    if (!psdID && (this instanceof Scene)){
      psdID = this.psdID; 
    }
    
    addTopLevelOnly = true;
    
  }
  
  if (!psdInfo[psdID]){
    throw new Error('psdID not found `'+psdID+'`');
  }
  txs = psdInfo[psdID].doc.txs;
  startIndex = startIndex === null ? txs.length-1 : startIndex;
  endIndex = endIndex === null ? 0 : endIndex;
  
  let txNameGlobs = Array.from(arguments);
  
  // Remove nulls and false
  txNameGlobs = txNameGlobs.filter(function (el) {
    return el != null && el !== false;
  });

  let getNamesOnly = false;
  if (txNameGlobs.length > 0 && txNameGlobs[0] == '_GETNAMESONLY'){
    getNamesOnly = true;
    txNameGlobs.shift();
  }
  
  if (txNameGlobs.length == 0 && typeof this.addArtTxNameGlobs === 'function'){
    // Use caller's custom txNameGlobs list
    txNameGlobs = this.addArtTxNameGlobs();
  }
  
  // Put ! criterea first to optimise pattern matching later
  txNameGlobs.sort(function(a, b) {
    const aIsNot = a.startsWith('!');
    const bIsNot = b.startsWith('!')
    if (aIsNot && !bIsNot) {
      return -1;
    }
    if (bIsNot && !aIsNot) {
      return 1;
    }
    return 0;
  });
  
  if (!this.art){
    this.art = {}  
  }
  
  let addedTx = {};
  let txNameList = [];
  
  for (let i = startIndex; i >= endIndex; i--){ 
    
    let addOK = false;
    if (addTopLevelOnly) {
      addOK = !txs[i].parent;
    } else {
      addOK = txs[i].parent == this.txInfo.name; 
    }
    
    if (addOK){ 
      
      // Check for tx name pattern matching
      let nameMatchOK = txNameGlobs.length > 0 ? false : true;    
      for (const txNameGlob of txNameGlobs){ 
        const isNot = txNameGlob.startsWith('!');
        nameMatchOK = utils.globMatch(txs[i].name, txNameGlob); 
        if (isNot){
          if (!nameMatchOK){ // Must match ALL not (!) criterea
            break;
          } 
        } else if (nameMatchOK){ // Can match ANY standard criterea
          break;
        }
      }
      
      if (nameMatchOK){
        
        if (getNamesOnly){
          
          txNameList.push(psdID + '/' + txs[i].name);

        } else {
          
          let dispo = null;
          // Check for wild card texture class suffix
          if (txClassSuffixes){ // Look for any suffixes existing
            let _path = txClassSuffixes['*'] || txClassSuffixes[psdID]; // Look for wildcard psd / current psd
            if (_path){
              _path = _path[txs[i].name.substr(-3)]; // Check last 3 chars match the suffix
              if (_path){
                if (_path.txPathEnd == txs[i].name.substr(-_path.txPathEnd.length)){ // Check for an exact match
                  dispo = _path.class.fromTx(psdID + '/' + txs[i].name);
                }
              }
            }
          }
          
          if (!dispo){
            if (txClassLookup[psdID + '/' + txs[i].name]){
              dispo = txClassLookup[psdID + '/' + txs[i].name].fromTx(psdID + '/' + txs[i].name);
            } else if (txClassLookup['*/' + txs[i].name]){
              dispo = txClassLookup['*/' + txs[i].name].fromTx(psdID + '/' + txs[i].name);
            } else if (txs[i].type == 'div'){ // btn
              dispo = Container.fromTx(psdID + '/' + txs[i].name);      
            } else if (txs[i].type == 'img'){      
              dispo = Sprite.fromTx(psdID + '/' + txs[i].name);      
            } else if (txs[i].type == 'tf'){      
              dispo = Text.fromTx(psdID + '/' + txs[i].name);   
            //} else if (txs[i].type == 'btn'){
            //  dispo = Btn.fromTx(psdID + '/' + txs[i].name);
            } else if (txs[i].type == 'rect'){
              dispo = Graphics.fromTx(psdID + '/' + txs[i].name);  
            }
          }
          
          if (dispo != null){
            if (txs[i].parent){
              // If parent is a spite counter act the effect of its scale on children
              if (this.isSprite){                
                dispo.x *= (1.0/this.scale.x);
                dispo.y *= (1.0/this.scale.y);
                dispo.scale.x *= (1.0/this.scale.x);
                dispo.scale.y *= (1.0/this.scale.y);
              }
            }
            
            this.addChild(dispo);
            
            this.art[txs[i].name] = dispo;
            addedTx[txs[i].name] = txs[i];
            
            added.push(dispo);
            
          }
        }
      }
    }
  }
  
  for (let dispo of added){
    // Call onAdded method if exists.
    // At this point the dispo has parent & siblings present.
    if (typeof dispo.onArtAdded === 'function'){
      dispo.onArtAdded.bind(dispo)()
      //tmp(); // Setup based on `txInfo`
    }
  }
  
  return getNamesOnly ? txNameList : added; 
  
}

/**
 * Postition a `PIXI.DisplayObject` relative to edge or center of stage or supplied dimension object, with the same offset as defined in the art PSD. 
 * <br>- This method takes the reg point into consideration when positioning.
 * @param {string} hugAlignment - A 1-2 chracter string configuring hug alignment. `T` means top aligned, `B` means bottom aligned, `L` means left aligned,  `R` means right aligned. `C` means centered on x axis,`M` means centered on y axis and any unset axes will return `null`.
 * @param {Object} [hugDimensions=null] - The dimensions to hug to. Will default to the stage dimensions.
 * @param {number} hugDimensions.width 
 * @param {number} hugDimensions.height 
 * @memberof PIXI.DisplayObject
 * @example 
 * myDispo.hug('BR'); // Positions display object bottom right of screen.
 */
PIXI.DisplayObject.prototype.hug = function(hugStr, hugBounds = null){
  
  const hugAlign = utils.alignmentStringToXY(hugStr, true); // Result may have null for undefined
  
  hugBounds = !hugBounds ? {width:scaler.stageW, height:scaler.stageH} : hugBounds; // May be extended for artboard in future
  const retainLayoutPadding = true;
  const applyProjScaleToPadding = false;
  
  const paddingScale = applyProjScaleToPadding ? proj.default.scale : 1.0;
  if (hugAlign.x !== null){
    if (hugAlign.x == -1){
      const paddingLeftX = retainLayoutPadding ? paddingScale * (this.txInfo.x - this.txInfo.regPercX*this.txInfo.width) : 0.0;
      this.x =  this.txInfo._proj.x - this.txInfo._proj.tlX + paddingLeftX;
    } else if (hugAlign.x == 0){
      this.x = hugBounds.width*0.5 - (this.txInfo._proj.brX - this.txInfo._proj.x) + this.txInfo._proj.width*0.5;
    } else if (hugAlign.x == 1){
      const paddingRightX = retainLayoutPadding ? paddingScale * (scaler.artboardDims.width - (this.txInfo.x + (1.0-this.txInfo.regPercX)*this.txInfo.width)) : 0.0;
      this.x = hugBounds.width - (this.txInfo._proj.brX - this.txInfo._proj.x + paddingRightX)  
    }
  }
  
  if (hugAlign.y !== null){
    if (hugAlign.y == -1){
      const paddingTopY = retainLayoutPadding ? paddingScale * (this.txInfo.y - this.txInfo.regPercY*this.txInfo.height) : 0.0;
      this.y =  this.txInfo._proj.y - this.txInfo._proj.tlY + paddingTopY;
    } else if (hugAlign.y == 0){
      this.y = hugBounds.height*0.5 - (this.txInfo._proj.brY - this.txInfo._proj.y) + this.txInfo._proj.height*0.5;
    } else if (hugAlign.y == 1){
      const paddingBtmY = retainLayoutPadding ? paddingScale * (scaler.artboardDims.height - (this.txInfo.y + (1.0-this.txInfo.regPercY)*this.txInfo.height)) : 0.0;
      this.y = hugBounds.height - (this.txInfo._proj.brY - this.txInfo._proj.y + paddingBtmY)  
    }
  }
  
} 



// gfxParams
// - line
//  - width
//  - color
//  - alpha
//  - alignment (0 = inner, 0.5 = middle, 1 = outter)
// - fill
//  - color
//  - alpha
// - bevel (corner radius)
// Optionally send width/height overrides
//PIXI.Graphics.prototype.setup = function(){
//  this.renderRect();
//}

/**
 * Ensure `PIXI.Graphic` instances render when they are first created.
 * @private
 */
PIXI.Graphics.prototype.init = function(){
  this.renderRect();
}

/**
 * Render a Graphic, optionally with given position and size. 
 * <br>- Will take into account the `this.txInfo.gfxParams` supplied by PSD data.
 * @param {number} [x=null] - Left screen position, in pts.
 * @param {number} [y=null] - Top screen position, in pts.
 * @param {number} [width=null] - Width, in pts.
 * @param {number} [height=null] - Height, in pts.
 * @private
 * @example 
 Default gfxParams:
 {
   line: {
     width: 0,
     color: 0x000000,
     alpha: 1.0,
     alignment: 0
   },
   fill: {
     color: 0xffffff,
     alpha: 0.5
   },
   bevel: 3.0
 }
 */
PIXI.Graphics.prototype.renderRect = function(x = null, y = null, width = null, height = null){
  
  const gfxParams = this.txInfo.gfxParams ? this.txInfo.gfxParams : {
    line: {
      width: 0,
      color: 0x000000,
      alpha: 1.0,
      alignment: 0
    },
    fill: {
      color: 0xffffff,
      alpha: 0.5
    },
    bevel: 3.0
  }
  
  this.clear();
  if (gfxParams.line.width > 0.0 && gfxParams.line.alpha > 0.0){
    this.lineStyle(gfxParams.line.width,gfxParams.line.color,gfxParams.line.alpha,gfxParams.line.alignment);
  }
  this.beginFill(gfxParams.fill.color, gfxParams.fill.alpha);
  const _x = x ? x : this.txInfo._proj.tlX - this.txInfo._proj.x;
  const _y = y ? y : this.txInfo._proj.tlY - this.txInfo._proj.y;
  const _w = width ? width : this.txInfo._proj.width;
  const _h = height ? height : this.txInfo._proj.height;
  if (gfxParams.bevel > 0.0){
    this.drawRoundedRect(_x,_y,_w,_h,gfxParams.bevel);
  } else {
    this.drawRect(_x,_y,_w,_h);
  }
  this.endFill();
  
}

// Scenes can update texture info with dynamic content 


/**
 * Overwrite PSD texture info with supplied values.
 * @param {Object} mappingData - An object representing property paths within `txInfo` with associated values.
 * @param {string} [psdID=null] - Optionally specify the psd, will default to the `scene.psdID`.
 * @memberof Scene
 * @example 
 export default class MyScene extends Scene {
     
     constructor(sceneData){
       
       super(sceneData, 'mypsd.psd', 0xff3300); 
       
       const hozGfxParams = {
         line: {
           width: 0,
           color: 0x000000,
           alpha: 1.0,
           alignment: 0
         },
         fill: {
           color: 0x222222,
           alpha: 1.0
         },
         bevel: 0.0
       }
       
       // Map textures to any dynamic content
       this.mapTxInfo({
         'headline.tfParams.text' : 'Welcome text',
         'hozgfx.gfxParams' : hozGfxParams
       })
       
     }  
 */
Scene.prototype.mapTxInfo = function(txInfoMapping, _psdID = null){
  
  if (!_psdID){
    _psdID = this.psdID; 
  }
  
  // Update paths to include path to texture info 
  
  let del = [];
  for (const writePath in txInfoMapping){
    del.push(writePath);
    txInfoMapping['txInfo.' + _psdID + '/' + writePath] = txInfoMapping[writePath];    
  }
  for (const delPath of del){
    delete txInfoMapping[delPath]
  }
  
  performValuePathMapping(txInfoMapping);
  
}

/**
 * TxInfo mapping helper.
 * @param {mapping} [psdID=null] - Optionally specify the psd, will default to the `scene.psdID`.
 * @private
 */
function performValuePathMapping(mapping){

  for (let writePath in mapping){
    
    // Only write to approved path roots
    const writePathBase = writePath.split('.')[0];
    let writeObj;
    //if (writePathBase == 'config'){
      // writeObj = config;      
    //} else 
    if (writePathBase == 'txInfo'){
      writeObj = txInfo;      
    }
    if (!writeObj){
      throw new Error('Invalid write path `'+writePath+'`');
    }
    
    // Only read from approved path roots
    let val;
    if (typeof mapping[writePath] == 'string'){
      const readPath = mapping[writePath];
      const readPathBase = readPath.split('.')[0];
      let readObj;
      if (readPathBase == 'content'){
        readObj = content;
      }
      if (!readObj){ // Interpret as string constant
        val = mapping[writePath]; // throw new Error('Invalid read path `'+readPath+'`');
      } else { 
        val = utils.getObjPath(readObj, readPath.substr(readPathBase.length+1));
      }
    } else {
      val = mapping[writePath];
    }

    utils.setObjPathVal(writeObj, writePath.substr(writePathBase.length+1).split('.psd/').join('(dot)psd/'), val)
    
  }
}



// Webfonts
// --------

// See: https://developers.google.com/fonts/docs/getting_started#Syntax

// Maps PSD font family names to google fonts, with fallbacks
let fonts; 
/*
Example:
let fonts = {
  standard: {psdFontNames: ['Montserrat'], googleFontName: 'Montserrat', additionalStyles:['bold italic'], fallbacks:['serif']}
};
*/
let fontClassForPsdFont; 

/**
 * @typedef module:ui#WebFontProps
 * @type {Object}
 * @property {Array.<string>} psdFontNames - A list of PSD font names to target. (eg. `Montserrat`)
 * @property {string} googleFontName - The corresponding Google Font name. (eg. `Montserrat`)
 * @property {Array.<string>} additionalStyles - Any additional styles to load in the format as outputted in PSD data. Eg. `['bold italic','thin','italic','900','900 italic']`. This is not usually required as the platform will load all styles referenced in the PSD data.
 * @property {Array.<string>} fallbacks - A list of fallback fonts to be queued. Eg. `['sans-serif']`
 */

/**
 * Optionally configure webfonts to be used within the app. Google Fonts is the only supported webfont provider.
 * <br>- To be called before {@link storymode#createApp}
 * <br>- This method is optional, if the font family is not configured the platform will attempt to automatically load the Google Fonts referenced in the PSDs. This assumes the font name is identical between Google Fonts and the Photoshop output.
 * <br>- Font styles will be loaded automatically based on those defined in the PSDs and optional *additionalStyles* properties. 
 * @param {Object.<string, module:ui#WebFontProps>} webfonts - The fonts to preload, with top level key of a unique class name to reference the font, eg `heading`, `serif`, `button` etc.
 * @example 
 ui.registerFonts({
   standard: {psdFontNames: ['Montserrat'], googleFontName: 'Montserrat', additionalStyles:['bold italic','thin','italic'], fallbacks:['sans-serif']}
 });
 */ 
export function registerFonts(_fonts){
  fonts = _fonts;  
}

/**
 * Given a font from Photoshop data, return the registered font class.
 * @param {string} psdFontName 
 * @returns {string} className 
 * @private
 */ 
function getfontClassForPsdFont(psdFontName){
  
  const _psdFontName = psdFontName.trim().toLowerCase()
  
  if (fonts){
    for (let className in fonts){
      if (fonts[className].psdFontNames){
        for (let psdFontName of fonts[className].psdFontNames){
          if (psdFontName.trim().toLowerCase() == _psdFontName){
            return className;
          }
        }
      }
    }
  }
  
  // Attempt to autoload the font from the PSD 
  // by assuming the font name from the PSD matches the Google font name
  
  if (!fonts){
    fonts = {};
  }
  let className = '_auto_'+String(Math.round(100000 + Math.random()*99999))
  fonts[className] = {psdFontNames: [psdFontName], googleFontName:psdFontName , fallbacks:webfontFallbacks}; // fallbacks:['sans-serif']};
  return className;
    
}



/**
 * @typedef {Object} FontStyleComponents
 * @property {'italic'|'oblique'|'normal'} style 
 * @property {number} [weight=400] 
 * @private
 */
 
/**
 * Returns the font style components of a PSD font string.
 * @param {string} psdFontName 
 * @returns {FontStyleComponents} fontStyleComponents
 * @private
 */
function psdFontStyleComponents(psdFontStyle){
  
  psdFontStyle = psdFontStyle.trim().toLowerCase();
  let parts = psdFontStyle.split(' ');
  let style = (parts[parts.length-1] == 'italic' || parts[parts.length-1] == 'oblique') ? parts[parts.length-1] : 'normal';  
  let weight = utils.fontWeightStrToNum(parts[0]); // Will default to 400
  
  return {style:style, weight:weight};
  
}

let webfontFallbacks = ['sans-serif'];
/**
 * Set fallback fonts for when webfonts fails to load.
 * @param {Array} _webfontFallbacks -  Defaults to ['sans-serif'].
 */
function setWebfontFallbacks(_webfontFallbacks){
  webfontFallbacks = _webfontFallbacks
}



let _webfontSource = 'google';
/**
 * Set how webfonts are to be loaded.
 * @param {'google'|'local'} [webfontSource='google'] -  'google' will load the font from Google Fonts, 'local' will wait for the locally CSS loaded webfont to be ready.
 */
function setWebFontSource(__webfontSource){
  if (__webfontSource !== 'google' && __webfontSource !== 'local'){
    throw new Error('Invalid font source `'+__webfontSource+'`')
  }
  _webfontSource = __webfontSource;
}


/**
 * Called internally to find all non-duplicate font family and styles referenced in PSD data to load via the webfont API.
 * @private
 */
function queueWebFonts(){

  let googleFonts = {}; // A store of all required google font families, weights & styles
  fontClassForPsdFont = {};
  let classAdditionalsQueued = {};
  
  for (let txPath in txInfo){
    if (txInfo[txPath].type == 'tf'){ //  || txInfo[txPath].type == 'btn'
      
      let fontStyle = psdFontStyleComponents(txInfo[txPath].tfParams.fontStyle)
      
      let psdFontName = txInfo[txPath].tfParams.fontName;
      let psdFont = txInfo[txPath].tfParams.font; // %name%-%weight%%style%
      
      let fontClass = getfontClassForPsdFont(psdFontName);
      
      fontClassForPsdFont[psdFont] = fontClass; // Add this to a lookup for this specific font / style / weight combo
      
      let googleFontName = fonts[fontClass].googleFontName;
      
      if (!googleFonts[googleFontName]){
        googleFonts[googleFontName] = {weights:{normal:[],italic:[],oblique:[]}};
      }
      
      if (!googleFonts[googleFontName].weights[fontStyle.style].includes(fontStyle.weight)){
        googleFonts[googleFontName].weights[fontStyle.style].push(fontStyle.weight);
      }
      
      // Also include additional requested font styles 
      
      if (classAdditionalsQueued[fontClass] !== true && fonts[fontClass].additionalStyles){
        for (let psdFontStyle of fonts[fontClass].additionalStyles){
          fontStyle = psdFontStyleComponents(psdFontStyle)
          if (!googleFonts[googleFontName].weights[fontStyle.style].includes(fontStyle.weight)){
            googleFonts[googleFontName].weights[fontStyle.style].push(fontStyle.weight);
          }
        }       
        classAdditionalsQueued[fontClass] = true;
      }
      
    }
  }
  
  // Create a list of Google Font identifiers to load
  
  let webfontIDs = [];
  for (let googleFontName in googleFonts){
   
    let webFontStyles = [];
    for (let style in googleFonts[googleFontName].weights){
       googleFonts[googleFontName].weights[style].sort();
       for (let weight of googleFonts[googleFontName].weights[style]){
         // Eg. 'Montserrat:100italic,400,600,900oblique'
         // see: https://github.com/typekit/webfontloader/issues/433
         webFontStyles.push(String(weight) + (style == 'normal' ? '' : style));
       }
    }
    webfontIDs.push(googleFontName + ':' + webFontStyles.join(','));
    
  }
  
  if (window['WebFont'] && webfontIDs.length > 0){
    
    // See: https://github.com/typekit/webfontloader
    
    let params = {
        loading: function() { 
        },
        active: function() { 
          //console.log('Loaded fonts: `'+webfontIDs.join('`,`')+'`')
          onAutoLoadComplete(); 
        },
        inactive: function() { 
          //console.log('Failed to load fonts: `'+webfontIDs.join('`,`')+'`')
          onAutoLoadComplete(); // Failed load will fallback
        }
    }
    
    if (_webfontSource === 'google'){
      params.google = {
        families: webfontIDs
        //, text: 'Q' // Optionally define text subset
      };
    } else if (_webfontSource === 'local'){
      /*
      If your fonts are already included in another stylesheet you can also
       leave out the urls array and just specify font family names to start 
       font loading. As long as the names match those that are declared in the 
       families array, the proper loading classes will be applied to the html element.
      */
      params.custom = {
        families: webfontIDs,
      };
    }
    
    // https://github.com/typekit/webfontloader
    WebFont.load(params);
    
    return true; // Indicates items need to load
    
  }
  
  return false; // Nothing to load
  
}

// Class <-> texture registration
let txClassLookup = {};
let txClassSuffixes = null;
/**
 * Associates a class with a text name or pattern. 
 * <br>- Display Objects will automatically be created with the supplied class rather than the default display object class.
 * @param {Class} class
 * @param {string} textureNameGlob - Texture name or pattern to associate with the class. Only prefix patterns are supported.
 * @returns {FontStyleComponents} fontStyleComponents
 * @example 
ui.registerClassForTx(Button, 'mypsd.psd/my_btn'); // A specific texture.
ui.registerClassForTx(Button, '*'+'/my_btn'); // Any texture with the name `my_btn` across all PSDs.
ui.registerClassForTx(Button, '*'+'/*_btn'); // Any instances with suffix `_btn` across all PSDs.
 */
function registerClassForTx(_class, txPath){
  let parts = txPath.split('/');
  if (parts.length == 2 && parts[1].charAt(0) === '*'){
    if (!txClassSuffixes){
      txClassSuffixes = {};
    }    
    let suffix = parts[1].substr(1)
    if (suffix.length < 3){
      throw new Error('Wildcard texture suffixes must be at least 3 characters')
    }
    let _psdID = parts[0];
    if (!txClassSuffixes[_psdID]){
      txClassSuffixes[_psdID] = {};
    }
    let suffixLast3 = suffix.substr(-3); 
    txClassSuffixes[_psdID][suffixLast3] = {class: _class, txPathEnd:suffix};
    return;
  } 
  txClassLookup[txPath] = _class;
}


/**
 * Called by `storymode.destroy()`.
 * @param {boolean} reset - If true then will be able to be used again after calling `ui.autoloadAssets()`
 * @private
 */
 function destroy(reset){
   
   removeOnDemandListeners();
   
   loadAssetCallback = null;
   onLoaderQueueCallback = null;
   if (reset){ 
     totLoadsComplete = 0;
     initialLoadItemCount = 0; 
   } else {
     txInfo = null;
     psdInfo = null;
     txClassLookup = null;
     txClassSuffixes = null;
     fonts = null;
     fontClassForPsdFont = null;
     disabledSpritesheetBaseNames = null;
   }
   
 }

export { txInfo, psdInfo, registerPsdInfo, registerClassForTx, registerSpritesheetPath, setSpritesheetSuffix, setWebFontSource, setWebfontFallbacks, destroy} // Temporary?



