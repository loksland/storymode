
/** @class _Snippets
* @hideconstructor
* @example

// --------------------------------------------
// Determining resting scale of a DisplayObject
// --------------------------------------------

let scale = dispo.txInfo.pxtopt*scaler.scale;

Note: If the displayObject is a child then it's scale will be adjusted to compensated for its parent's scale.


// -------------------------------
// Sending scope to event emitters
// -------------------------------

player.off('statechange', this.onPlayerStateChange, this)    

if (enabled){
  player.on('statechange', this.onPlayerStateChange, this)    
}

// ----------
// Double tap
// ----------

const DBL_TAP_MS = 600;

// ...

const _lastBgPointerUpTime = this.bgPointerUpTime ? this.bgPointerUpTime : 0;
this.bgPointerUpTime = new Date().getTime();
if (_lastBgPointerUpTime !== 0 && this.bgPointerUpTime-_lastBgPointerUpTime <= DBL_TAP_MS){
  this.bgPointerUpTime = 0;
  this.hide(!this.hidden);
}

// ----------
// Frame loop 
// ----------

pauseTick(){
  ticker.remove(this.tick, this);
}

resumeTick(){
  this.pauseTick();
  ticker.add(this.tick, this);
}

tick(dt){

}

// ------------------------------------------------
// Convert positional hit div to hit area of button
// ------------------------------------------------

const hitArt = utils.cloneObj(ui.txInfo['ui.psd' + '/' + '_sfx_hit']);
hitArt.width *= 1.0/this.art.btn.scale.x
hitArt.height *= 1.0/this.art.btn.scale.x
this.art.btn.hitArea = new PIXI.Rectangle(-hitArt.width*0.5, -hitArt.height*0.5,hitArt.width, hitArt.height);  

// --------------------------------------------------
// Remove anit-aliasing from an individual text field
// --------------------------------------------------

this.art.my_tf.updateText();
this.art.my_tf.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

// -----------------------
// Tracking mouse position 
// -----------------------

this.bgScreen.on('pointermove', this.onPointerMove, this)

onPointerMove(ev){

  let dragPos = ev.data.getLocalPosition(this.parent);
  console.log(dragPos.x, dragPos.y);

}

// -----------
Set text color
// -----------

this.title.style.fill = 0xff3300


// ---------------
// Applying a blur
// ---------------

gsap.set(clip, {pixi: {blur:7}});

- Note: Animating a blur may cause shakey movement.

Alternative:

// 1) The strength of the blur filter. (Default: 8)
// 2) The quality of the blur filter. (Default: 4)
// 3) The resolution of the blur filter. (Default: PIXI.settings.FILTER_RESOLUTION)
// 4) The kernelSize of the blur filter. Options: (Default: 5), 7, 9, 11, 13, 15. 
let blurFilter = new PIXI.filters.BlurFilter(4, 4, 1, 5)
this.filters = [blurFilter]

- Note: Also consider using a PIXI.filters.KawaseBlurFilter

// -----------------
// Local NPM install 
// -----------------

npm install file:///path/to/storymode/ --save

// ---------------------
// PIXI Performance Tips
// ---------------------

{@link https://github.com/pixijs/pixijs/wiki/v4-Performance-Tips}
  
// ------------------------------------
// Checking if cacheAsBitmap is applied
// ------------------------------------

this.cacheAsBitmapResolution = 0.1 // Check bmp is cached - it will be low resolution
this.cacheAsBitmap = _cache;
  
// ------------------------------------
// Checking if cacheAsBitmap is created
// ------------------------------------

let cacheApplied = this._cacheData && this._cacheData.sprite 

- From setting .cacheAsBitmap to true, PIX will wait for the next render to create cached sprite.


  */
  
  