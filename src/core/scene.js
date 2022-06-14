
import { scaler} from './../storymode.js';



/**
 * The scene class represents a distinct screen in the application. 
 * This class is designed to be subclassed.
 * Scenes are created, loaded and displayed by the `nav`, and are closely coupled to this class.
 * @extends PIXI.Container
 * @example

export default class MyScene extends Scene {
 
  static getSfxResources(){    
    return  {
      tap: {path: 'sfx/ui_tap.mp3'}, 
    }
  }

  constructor(sceneData){    
    super(sceneData, 'myscene.psd', 0xff3300); 
  }

  didLoad(ev){ 

    super.didLoad(ev);

    this.addArt('!_*');

    this.ready();
   
  }

  shouldReloadOnStageResize(stageW, stageH){
   
    for (let dispoName in this.art){
      this.art[dispoName].applyProj()
    }    

    return false;
   
  }

  onBtn(btn){
   
  }

  onWillArrive(fromModal){
   
    super.onWillArrive(fromModal);

    // Perform pre enter transition operations
   
  }

  onDidArrive(fromModal){

    super.onDidArrive(fromModal);

    // Perform post enter transition operations
       
  }

  onWillExit(fromModal){

    super.onWillExit(fromModal);

    // Perform pre exit transition operations

  }

  onDidExit(fromModal){

    super.onDidExit(fromModal);

    // Perform post exit transition operations
   
  }

  dispose(){

    // Perform clean up before instance is destroyed  
    // Call super method *after* clean up. 

    super.dispose();

  }
}
 */
class Scene extends PIXI.Container {
  
  /**
   * Creates a new storymode Scene. 
   * @constructor
   * @param {Object} [sceneData=null] - Optional parameters sent along to the scene construction. 
   * @param {string} [psdID=null] - The associated PSD, if any. Eg. `mypsd.psd`
   * @param {integer} [bgColor=0x000000] - Solid background color of the scene, used by some transitions.
   */
  constructor(sceneData, psdID = null, bgColor = 0x000000){   
     
    super();
    
    /**
     * Any data passed to the scene on creation
     * @type {Object}
     * @public
     */
    this.sceneData = sceneData;
    
    /**
     * The full name of the associated Photoshop document. `ui.addArt()` uses this property to find textures.
     * @type {!string}
     * @public
     */
    this.psdID = psdID ; // If PSD not set use scene id as fallback 
    
    /**
     * The name of the scene instance.
     * @type {!string}
     * @public
     */
    this.name = sceneData.sceneID + '_' + sceneData.instanceID;
    
    /**
     * The background color of the scene.
     * @type {!number}
     * @public
     */
    this.bgColor = bgColor;
    
    this.on('added', this.didLoad);
    
  }
  
  /**
   * Called after scene is added to the stage. Call `ready()` at the end of any initialisation.
   * @param {PIXI.Container} parent - Parent container. This should be passed to super when subclassing. 
   */
  didLoad(parent){
    
    this.off('added',  this.didLoad);
    this.on('removed',  this.dispose);
    
    // Prevent tapping on scenes below
    this.bgScreen = new Sprite(PIXI.Texture.EMPTY);﻿ // WHITE
    this.bgScreen.interactive = true;
    this.bgScreen.width = scaler.stageW;
    this.bgScreen.height = scaler.stageH;
    this.addChild(this.bgScreen);
    
  }
  
  /**
   * To be called by the scene after `didLoad()` when the scene is ready to be presented.
   */
  ready(){
    
    this.emit('ready', this);
    
  }
  
  /**
   * This method is called by `nav` when a stage resize is fired. 
   * It should not be sublcassed.
   * @private
   */
  _shouldReloadOnStageResize(stageW, stageH){
    
    this.bgScreen.width = stageW
    this.bgScreen.height = stageH
    
    return this.shouldReloadOnStageResize(stageW, stageH);
    
  }
  
  /**
   * This method is intended to be overridden to handle stage resize logic.
   * Return `false` to prevent the `nav` from automatically reloading the scene when a stage resize is detected. 
   * @param {number} [stageW] - Stage width in points.
   * @param {number} [stageH] - Stage height in points.
   * @returns {boolean} shouldReload - Whether the entire scene should be reloaded with a new one.
   */
  shouldReloadOnStageResize(stageW, stageH){
    return true 
  }
  
  // 
  /**
   * Overwrite to customise the focus point of the `mario` transition animation. 
   * @param {boolean} forArrive - Whether for an arrival or exit phase of the transition.
   * @returns {PIXI.Point} point - Focus point in stage coords (pts),
   */
  getMarioTransPt(forArrive){
    return new Point(scaler.stageW*0.5, scaler.stageH*0.5);
  }
  
  /**
   * Overwrite to customise the radius of the `mario` transition spotlight.
   * @param {boolean} forArrive - Whether for an arrival or exit phase of the transition.
   * @returns {number} radius - Radius of spotlight, in pts.
   */
  getMarioTransFocusRad(forArrive){
    return 100.0;
  }
  
  // sfx.js Integration - to be overridden
  
  /**
   * Overwrite to supply a list of audio resources required by the scene. See `sfx` docs for format options.
   */
  static getSfxResources(){
    
    //  return {
    //    disconnect_x: 'sfx/disconnect_x.mp3',
    //  };
            
    return null;
                      
  }
  
  /**
   * Lifecycle method: scene is added to the stage and transition is about to begin.
   * This is a suitable place to layout the scene for presentation to the user.
   * Ensure to call `super.onWillArrive(fromModal)` method when subclassing.
   * @param {boolean} fromModal - If true then the scene is being presented as the result of a modal being dismissed.
   */
  onWillArrive(fromModal){
  }
  
  /**
   * Lifecycle method: scene arrival transition is complete.
   * This is a suitable place to add interactive event listeners.
   * Ensure to call `super.onDidArrive(fromModal)` method when subclassing.
   * @param {boolean} fromModal - If true then the scene is being presented as the result of a modal being dismissed.
   */
  onDidArrive(fromModal){
  }
  
  /**
   * Lifecycle method: scene exit transition is about to begin.
   * This is a suitable place to remvoe interactive event listeners.
   * Ensure to call `super.onWillExit(fromModal)` method when subclassing.
   * @param {boolean} fromModal - If true then the scene is being temperarily removed to present a modal scene.
   */
  onWillExit(fromModal){
  }
  
  /**
   * Lifecycle method: scene exit transition is complete. 
   * The scene is no longer visible at this point and cleaning up can be performed.
   * Ensure to call `super.onDidExit(fromModal)` method when subclassing.
   * @param {boolean} fromModal - If true then the scene is being temperarily removed to present a modal scene.
   */
  onDidExit(fromModal){
  }
  
  /**
   * Captures all clicks for storymode.btn instances added to the scene or its children (up to 2 levels).
   * @param {storymode.btn} btn - The button that was clicked.
   */
  onBtn(btn){
    console.log('Clicked btn `'+btn.name+'`.');
  }
  
  /**
   * Called when scene is about to be destroyed.
   * When subclassing ensure `super.dispose()` is called after performing clean up.
   */
  dispose(){
    
    if (this.art){
      for (let p in this.art){
        this.art[p] = null;
      }
      this.art = null;
    }
    
    this.off('removed',  this.dispose);
    this.killTweens();
    
    this.bgScreen = null;
    
    // Removes filters and mask references from scene and all children recursively 
    this.destroyFiltersAndMasks();
    
    // Once removed from stage, destroy and use no more.
    this.destroy({children:true});  
    // Keep textures though destroys children
    // > Destroying PIXI.Texture does not free memory, it just makes texture not valid and removes it from image cache, so other sprites wont be able to use it. I really dont know cases when you have to call it
    // > Destroying PIXI.BaseTexture frees WebGL objects that are bound to it. Call it for dynamic texture that you use or some statics that arent needed anymore.
    // Source: https://www.html5gamedevs.com/topic/19874-difference-between-texture-and-basetexture/
    
  }
  
  /**
   * Attempts to remove all tweens from the scene and all it's children, recursively.
   * @private
   */
  killTweens(dispo = null){
    dispo = dispo !== null ? dispo : this;
    TweenMax.killTweensOf(dispo);
    if (this.art){
      this.art = null;
    }
    for (let child of dispo.children){
      this.killTweens(child)
    }
  }
  
}

export default Scene