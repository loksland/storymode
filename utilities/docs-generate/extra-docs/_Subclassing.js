
/** @class _Subclassing
* @hideconstructor
* @example

// ---------------
// Sprite Subclass
// ---------------

export default class MySprite extends PIXI.Sprite {
  
  constructor(tx){   
    super(tx);
  }
  
  // Optional. Called after PSD projection is applied
  init(){ 
    
  }
  
  // Optional. Called by addArt() after parent and siblings all present
  onAdded(){ 
    
  }
  
  // Called automatically when removed
  destroy(options) {
    // Clean up before calling super
    super.destroy(options);
  }  
  
}
  
// ------------------
// Container Subclass
// ------------------

export default class MyContainer extends PIXI.Container {
  
  constructor(){   
    super();
  }
  
  // Called after PSD projection is applied
  init(){
    
  }
  
  // Optional. Called by addArt() after parent and siblings all present
  onAdded(){ 
    
  }
  
  // Called automatically when removed
  destroy(options) {
    // Clean up before calling super
    super.destroy(options);
  }  
  
}

// -----------------------------------------
// Registering a class based on texture name
// -----------------------------------------

// App.js

import MyBtn from './sprites/myBtn.js';
ui.registerClassForTx(MyBtn, '❊/❊_btn');

import MyUI from './sprites/MyUI.js';
ui.registerClassForTx(MyUI, '❊/ui_class');

// ---------------------------------------------------------------------
// Call subclass initialisation scripts dependant on parent and siblings
// ---------------------------------------------------------------------

// Called by addArt(), parent and siblings all present
onAdded(){
  this.parent.art.glow.alpha = 0.0;
}

// -------------------------------------
// Cleaning up a Display Object subclass 
// -------------------------------------

// Called automatically when removed
destroy(options) {
  // Clean up before calling super
  super.destroy(options);
}  

// ------------------------------------------------------
// Control which sub textures will be added by `addArt()`
// ------------------------------------------------------

export default class MySubClass extends PIXI.Sprite {
  
  addArtTxNameGlobs(){
    return ['!_❊']; // 
  }
  
}

*/
  
  