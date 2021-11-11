// Layout helpers
// --------------
// - Projection / scale aware extensions of Pixi display object classes

import { Scene, Btn, scaler, Camera, utils } from './../storymode.js';

// Index textures

let psdInfo;
let txInfo;

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
function registerSpritesheetPath(_spritesheetPath){
  spritesheetPath = _spritesheetPath;
}

let totLoadsComplete = 0;
let initialLoadItemCount = 0;
let loadAssetCallback;

export function loadAssets(_loadAssetCallback){
  
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
      if (!queuedSpritesheets[spritesheetBaseName]){
        queuedSpritesheets[spritesheetBaseName] = true;
        loader.add(spritesheetBaseName + SPRITESHEET_RESOURCE_SUFFIX, spritesheetPath+spritesheetBaseName + '.json'); 
      }
    } else {
      for (let tx of psdInfo[psdID].doc.txs){  // Load individual images
        if (tx.type == 'img' && !tx.txOverride && !tx.clone){ 
          loader.add(tx.path, tx.src);
        }
      }
    }
  }
  
  loader.load(onLoadComplete);
  
}

// Wait for webfonts and assets to both load before starting

function onLoadComplete(){
  totLoadsComplete++;
  if (totLoadsComplete == initialLoadItemCount){
    if (loadAssetCallback){
      loadAssetCallback();
    }
  }
}

PIXI.Texture.fromTx = function(txPath, frame = null){
  
  if (!txInfo[txPath]){
    throw new Error('Texture info not found `'+txPath+'`')
  }
  
  return new PIXI.Texture(resources[txPath].texture, frame);
  
}

PIXI.DisplayObject.fromTx = function(txPath, addChildren = true, frame = null){
  
  let isAnimSprite = this == AnimatedSprite || this.prototype instanceof AnimatedSprite
  if (!txInfo[txPath] && !isAnimSprite){    
    throw new Error('Texture info not found `'+txPath+'`')
  }
  
  let dispo;
  
  if (this == Btn){
    
    dispo = new Btn(txPath);
      
  } else if (this == Graphics){
    
    dispo = new Graphics();
    
  } else if (this == Text){
  
    let font = fonts[fontClassForPsdFont[txInfo[txPath].tfParams.font]]
    let fontFamilyList = [font.googleFontName].concat(font.fallbacks)
    
    // https://pixijs.download/dev/docs/PIXI.TextStyle.html
      
    let fontStyle = psdFontStyleComponents(txInfo[txPath].tfParams.fontStyle);
      
    dispo = new Text(txInfo[txPath].tfParams.text, {
      fontFamily: fontFamilyList,
      fontSize: txInfo[txPath].tfParams.fontSize * scaler.proj[txInfo[txPath].projID].scale, // Apply projection scale to font size. 
      fill: txInfo[txPath].tfParams.color,
      fontWeight: fontStyle.weight,
      align: txInfo[txPath].tfParams.align, // Only affects multi-line fields, use reg to control alignment
      fontStyle: fontStyle.style
    });
  
  } else if (isAnimSprite){
    
    let psdID = txPath.split('/')[0];
    
    let spritesheetBaseName = psdInfo[psdID].doc.spritesheet 
    let spritesheet = resources[spritesheetBaseName + SPRITESHEET_RESOURCE_SUFFIX];
    
    if (spritesheet){
      
      if (spritesheet.spritesheet && spritesheet.spritesheet.animations){
        
        if (spritesheet.spritesheet.animations[txPath]){
          dispo = new PIXI.AnimatedSprite(spritesheet.spritesheet.animations[txPath]);
          txPath = dispo.textures[0].textureCacheIds[0];
        } 
        
      } else {
        throw new Error('Spritesheet animation not found `'+txPath+'`. Ensure tps auto-detect animations is enabled.')
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
        dispo = new this(spritesheet.textures[txInfo[txPath].path]);
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
    dispo.init(); // Setup based on `txInfo`
  }
  
  return dispo;
  
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
PIXI.Graphics.prototype.init = function(){
  this.renderRect();
}

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

// Updates a dispo's txInfo object to reflect it's current stage position/scale
// - *syncProps* (various, default=true) - Optional array of props: `width`,`height`,`x`,`y`,'pos','scale',
// - *usePrevious* Assumes the dispos's current position is relative to scaler.prev (the previous stage dimension info)
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
  
  // Update gsap tweens
  
  let tws = gsap.getTweensOf(this);
  if (tws.length > 0){
    
    let posProps = ['x','y'];
    let dimProps = ['width','height']
    let scaleProps = ['scale','scaleX','scaleY']
    let scaleAccessProps = {scale:'x',scaleX:'x',scaleY:'y'};
    
    for (let tw of tws){ 
      let progress = tw.progress();      
      let requiresInvalidation = false;
      let requiresRestart = false;
      if (progress < 1){ // Ignore completed tweens 
        
        for (let prop of posProps){
          if (tw.vars[prop] && (syncPos || syncProps.includes(prop))){
            let twInfo = getTwInfo(tw.vars[prop]);
            if (twInfo.isRel){
              twInfo.val = scaler.proj[projID].positionScale *  (1.0/_scaler.proj[projID].positionScale)*twInfo.val; // Convert val to art via scaler.prev then convert art to screen via new scaler
              twInfo.val *= progress > 0 ? (1.0-tw.vars.ease(progress)) : 1.0; // Take into account current position / ease & progress
              if (tw.vars.runBackwards){ 
                twInfo.val *= -1.0; // This only works for relative - reversing the relative value
              }
            } else if (tw.vars.runBackwards){ // gsap.from()              
            
              // WARNING: If progress=0 below will skip any pending delay
              tw.progress(1.0, true) // Jump to end - get the end value
              twInfo.val = prop == 'x' ? scaler.proj[projID].transArtX(_scaler.proj[projID].transScreenX(this[prop])) : scaler.proj[projID].transArtY(_scaler.proj[projID].transScreenY(this[prop])); // Save target position
              tw.progress(progress, true) // Jump to end - get the end value
              if (!(progress > 0)){
                requiresRestart = true;
              }
              
            } else {
              twInfo.val = prop === 'x' ? scaler.proj[projID].transArtX(_scaler.proj[projID].transScreenX(twInfo.val)) : scaler.proj[projID].transArtY(_scaler.proj[projID].transScreenY(twInfo.val));  // Convert val to art via scaler.prev then convert art to screen via new scaler                                        
            }
            if (tw.vars.startAt && tw.vars.startAt[prop]){ // gsap.fromTo()
              delete tw.vars.startAt[prop];              
            }
            requiresInvalidation = true;
            tw.vars[prop] = buildTwCmd(twInfo);
          }
        }
        
        for (let prop of dimProps){
          if (tw.vars[prop] && (syncScale || syncProps.includes(prop))){
            let twInfo = getTwInfo(tw.vars[prop]);
            if (!twInfo.isRel && tw.vars.runBackwards) { // from() absolute
              // WARNING: If progress=0 below will skip any pending delay
              tw.progress(1.0, true) // Jump to end - get the end value
              twInfo.val = scaler.proj[projID].scale * (1.0/_scaler.proj[projID].scale)*this[prop]; // Save target position
              tw.progress(progress, true) // Reset progress
            } else {              
              twInfo.val = scaler.proj[projID].scale * (1.0/_scaler.proj[projID].scale)*twInfo.val;
              if (twInfo.isRel){
                twInfo.val *= progress > 0 ? (1.0-tw.vars.ease(progress)) : 1.0; // Take into account current position / ease & progress              
                if (tw.vars.runBackwards){ // gsap.from()
                  twInfo.val *= -1.0; // This only works for relative - reversing the relative value
                }
              }
            } 
            if (tw.vars.startAt && tw.vars.startAt[prop]){ // gsap.fromTo()
              delete tw.vars.startAt[prop];
            }
            requiresInvalidation = true;
            tw.vars[prop] = buildTwCmd(twInfo);
          }
        }
        
        if (tw.vars.pixi){
          for (let prop of scaleProps){
            if (tw.vars.pixi[prop] && (syncScale || syncProps.includes(prop))){
              let twInfo = getTwInfo(tw.vars.pixi[prop]);
              if (!twInfo.isRel && tw.vars.runBackwards) { // from() absolute
                // Make value target            
                // WARNING: If progress=0 below will skip any pending delay
                tw.progress(1.0) // Jump to end - get the end value
                twInfo.val = scaler.proj[projID].scale * (1.0/_scaler.proj[projID].scale)*this.scale[scaleAccessProps[prop]]; // Save target position                
                tw.progress(progress) // Reset progress     
              } else {              
                twInfo.val = scaler.proj[projID].scale * (1.0/_scaler.proj[projID].scale)*twInfo.val;
                if (twInfo.isRel){
                  twInfo.val *= progress > 0 ? (1.0-tw.vars.ease(progress)) : 1.0; // Take into account current position / ease & progress              
                  if (tw.vars.runBackwards){ // gsap.from()
                    twInfo.val *= -1.0; // This only works for relative - reversing the relative value
                  }
                }
              } 
              if (tw.vars.startAt && tw.vars.startAt.pixi && tw.vars.startAt.pixi[prop]){ // gsap.fromTo()
                delete tw.vars.startAt.pixi[prop];
              }
              requiresInvalidation = true;
              tw.vars.pixi[prop] = buildTwCmd(twInfo);
            }
          }
        }
      }
      if (requiresInvalidation){
        if (tw.vars.runBackwards){ // gsap.from()
          tw.vars.runBackwards = false;
        }
        tw.invalidate();
      }
    }
  }
}

function isTwRel(twCmd){
  if (typeof twCmd === 'string'){
    return twCmd.split('+=').length > 1 || twCmd.split('-=').length > 1;
  }
  return false;
}

// Converts a gsap value command. Eg. '+=23.3' into constituent parts
function getTwInfo(twCmd){  
  let info = {}
  info.isRel = false;
  info.original = twCmd;
  if (typeof twCmd === 'string'){
    let parts = twCmd.split('+=')
    if (parts.length == 2){
      info.isRel = true;
      info.relOp = '+=';
      info.val = Number(parts[1]);
      return info;
    } else {
      parts = twCmd.split('-=');
      if (parts.length == 2){
        info.isRel = true;
        info.relOp = '-=';
        info.val = Number(parts[1]);
        return info;
      }
    }
    twCmd = Number(twCmd)
  }
  info.val = twCmd;
  return info;  
}

function buildTwCmd(info){  
  if (info.isRel){
    return info.relOp + String(info.val);
  }
  return info.val;
}

PIXI.DisplayObject.prototype.applyProj = function(syncProps = false){
  
  if (syncProps !== false){
    this.syncTxInfoToStage(syncProps, true);
  }
  
  const projID = this.txInfo.projID;
  
  // Store a pure representation of the position and scale as it relates to the stage.
  this.txInfo._proj = {};
  this.txInfo._proj.x = scaler.proj[projID].transArtX(this.txInfo.x);
  this.txInfo._proj.y = scaler.proj[projID].transArtY(this.txInfo.y);
  this.txInfo._proj.width = scaler.proj[projID].scale * this.txInfo.width;
  this.txInfo._proj.height = scaler.proj[projID].scale * this.txInfo.height;
  
  // Take into account frame (clipping) applied to this sprite's texture
  if (this._hasFrame){ 
    
    if (this.texture.frame.x != 0.0 || this.texture.frame.y != 0.0){
      this.txInfo._proj.x += this.texture.frame.x*scaler.proj[projID].pxScale; // Convert tx px offset to screen pixel * artboard scale 
      this.txInfo._proj.y += this.texture.frame.y*scaler.proj[projID].pxScale; // Convert tx px offset to screen pixel * artboard scale 
    }

    this.txInfo._proj.width *= (this.texture.frame.width/this.texture.baseTexture.width)
    this.txInfo._proj.height *= (this.texture.frame.height/this.texture.baseTexture.height)
    
  }
  
  // Add bounds 
  this.txInfo._proj.tlX = this.txInfo._proj.x - this.txInfo._proj.width*this.txInfo.regPercX;
  this.txInfo._proj.tlY = this.txInfo._proj.y - this.txInfo._proj.height*this.txInfo.regPercY;
  this.txInfo._proj.brX = this.txInfo._proj.tlX + this.txInfo._proj.width
  this.txInfo._proj.brY = this.txInfo._proj.tlY + this.txInfo._proj.height
  
  // Apply anchor. Containers don't use anchors.
  if (this.isSprite){
    this.anchor.set(this.txInfo.regPercX, this.txInfo.regPercY);
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
    this.width = this.txInfo._proj.width
    this.height = this.txInfo._proj.height
  }
  
  if (this instanceof Text){
    const calcFontSize = this.txInfo.tfParams.fontSize * scaler.proj[projID].scale;
    const diff = this.style.fontSize - calcFontSize;
    if (Math.abs(diff) > 0.001){ // Don't trigger font re-render if text field was just added
      this.style.fontSize = this.txInfo.tfParams.fontSize * scaler.proj[projID].scale;
    }
  }
  
}

// Scenes can update texture info with dynamic content 
Scene.prototype.mapTxInfo = function(txInfoMapping, _psdID = null){
  
  if (!_psdID){
    _psdID = this.psdID; // Remove extension
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
  
  performValuePathMapping(txInfoMapping)
  
}

// Returns texture names only for given pattern
PIXI.DisplayObject.prototype.getArt = function(txNameGlob){
  let args = Array.from(arguments);  
  return this.addArt.apply(this, ['_GETNAMESONLY'].concat(args));
}

// If caller is a scene then all top level items are added 
// otherwise will add chidren
// |txNameGlob| is an optional texture name pattern, can add multiple arguments, will add textures that match any condition
// Accepts wildcard filtering Eg. `*_tx_suffix`, `!tf_match*`, `tx_prefix_*`
// Display objects can optionally declare a method called `addArtTxNameGlobs` that returns an array of txNameGlobs.
// This will be used if none are sent to this method.
PIXI.DisplayObject.prototype.addArt = function(txNameGlob){
  
  if (!((this instanceof Scene) || (this instanceof Camera)) && this.txInfo && this.txInfo.children.length == 0){   
    // No children to add
    return
  }
    
  let added = [];
  let psdID; 
  let txs;
  let startIndex = null;
  let endIndex = null;
  let addTopLevelOnly;
  
  if (!((this instanceof Scene) || (this instanceof Camera)) && this.txInfo){
    
    psdID = this.txInfo.psdID;    
    // Only loop the subset of textures for this item. May include children of children that will not be added.
    startIndex = txInfo[psdID + '/' + this.txInfo.children[this.txInfo.children.length-1]].index;
    endIndex = txInfo[psdID + '/' + this.txInfo.children[0]].index;
    addTopLevelOnly = false;
        
  } else {
    
    // Use scene psdID property 
    if (!psdID && ((this instanceof Scene) || (this instanceof Camera))){
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
          } else if (txs[i].type == 'btn'){
            dispo = Btn.fromTx(psdID + '/' + txs[i].name);
          } else if (txs[i].type == 'rect'){
            dispo = Graphics.fromTx(psdID + '/' + txs[i].name);  
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
  
  return getNamesOnly ? txNameList : added; 
  
}

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

export function registerFonts(_fonts){
  
  fonts = _fonts;  
  
}

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
  fonts[className] = {psdFontNames: [psdFontName], googleFontName:psdFontName , fallbacks:['sans-serif']};
  return className;
    
  // return psdFontName; 
  
}

// Returns the font style: eigther 'normal','italic','oblique'
function psdFontStyleComponents(psdFontStyle){
  
  psdFontStyle = psdFontStyle.trim().toLowerCase();
  let parts = psdFontStyle.split(' ');
  let style = (parts[parts.length-1] == 'italic' || parts[parts.length-1] == 'oblique') ? parts[parts.length-1] : 'normal';  
  let weight = utils.fontWeightStrToNum(parts[0]); // Will default to 400
  
  return {style:style, weight:weight}
  
}

function queueWebFonts(){

  // Find all non-duplicate font family and styles to load via the webfont API
  
  let googleFonts = {}; // A store of all required google font families, weights & styles
  fontClassForPsdFont = {};
  let classAdditionalsQueued = {};
  
  for (let txPath in txInfo){
    if (txInfo[txPath].type == 'tf' || txInfo[txPath].type == 'btn'){
      
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
  
  if (webfontIDs.length > 0){
    
    // https://github.com/typekit/webfontloader
    WebFont.load({
        google: {
          families: webfontIDs,
          // text: 'Q' // Optionally define text subset
        },
        loading: function() { 
        },
        active: function() { 
          //console.log('Loaded fonts: `'+webfontIDs.join('`,`')+'`')
          onLoadComplete(); 
        },
        inactive: function() { 
          //console.log('Failed to load fonts: `'+webfontIDs.join('`,`')+'`')
          onLoadComplete(); // Failed load will fallback
        }
    });
    
    return true; // Indicates items need to load
    
  }
  
  return false; // Nothing to load
  
}

// Class <-> texture registration
let txClassLookup = {};
function registerClassForTx(_class, txPath){
  txClassLookup[txPath] = _class;
}



export { txInfo, registerPsdInfo, registerClassForTx, registerSpritesheetPath} // Temporary?
