
/** @class _Snippets
* @hideconstructor
* @example

// --------------------------------------------
// Determining resting scale of a DisplayObject
// --------------------------------------------

let scale = dispo.txInfo.pxtopt*scaler.scale;

// -------------------------------------
// Cleaning up a Display Object subclass 
// -------------------------------------

// Called automatically when removed
destroy(options) {
  // Clean up before calling super
  super.destroy(options);
}  

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

// ---------------------------------------------------------------------
// Call subclass initialisation scripts dependant on parent and siblings
// ---------------------------------------------------------------------

// Called by addArt(), parent and siblings all present
onAdded(){
  
  this.parent.art.glow.alpha = 0.0;

}

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

// -----------------
// Local NPM install 
// -----------------

npm install file:///path/to/storymode/ --save

// ---------------------
// PIXI Performance Test
// ---------------------

{@link https://github.com/pixijs/pixijs/wiki/v4-Performance-Tips}


  */
  
  