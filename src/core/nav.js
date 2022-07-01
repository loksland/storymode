/**
 * Handles scene transitions and modal display.
 * <br>- A modally presented scene can be replaced with a non-modal scene then dismissed to return to original scene.
 * <br>- A modal can be presented over an existing modal.
 * @module nav
 */

import { utils,scaler } from './../storymode.js';

//import AlphaFilter from './../filters/alphafilter.js';

let locked = false; // Nav is locked
let transStack = [];
let pendingModalTrans = null;

let sceneHolder;
let inputScreen;
let bg; // Tinted screen for background color
let scenes;

// Load all transitions
let trans = {};
const _trans = utils.requireAll(require.context('./../trans', false, /.js$/));
for (let transMod of _trans) {
  registerTrans(transMod);
}

/**
 * Register a custom transition.
 * @param {Module} transModule 
 * @example
// In app startup:
import * as CustomTrans from './trans/mytrans.js';
nav.registerTrans(CustomTrans);
 */
function registerTrans(transMod){
  if (transMod.id){
    let ids = Array.isArray(transMod.id) ? transMod.id : [transMod.id];
    for (var id of ids) {
      trans[id] = transMod.default;
    }
  } 
}


/**
 * Registers all scenes to be loaded.
 * @param {Object} scenes - Scene configuration object
 * @example 
// app.js 
const scenes = {
  home: {class: Home, sceneData: {}, default:true, defaultTransID:'pan:down', defaultBgCol:0xff3300}, 
  play: {class: Play, sceneData: {}}
}
nav.setScenes(scenes);
 */
function setScenes(_scenes){
  scenes = _scenes;
}

/**
 * Called by `storymode` during setup.
 * @param {Pixi.Stage} stage 
 * @param {number} bgAlpha
 * @private
 */
function setupStage(stage, bgAlpha){
  
  //ticker.add(function(time) {
  //  gsap.set(pixiApp.view, {opacity:1.0});
  //});
  
  let defaultBgCol = 0x000000;
  for (const sceneID in scenes){
    if (scenes[sceneID].default && scenes[sceneID].defaultBgCol){
      defaultBgCol = scenes[sceneID].defaultBgCol;
    }
  }
  
  // Add background 
  bg = new PIXI.Sprite(PIXI.Texture.WHITE);﻿
  bg.width = scaler.stageW;
  bg.height = scaler.stageH;
  bg.tint = defaultBgCol; // Set in the index css
  stage.addChild(bg);
  gsap.fromTo(bg, 0.6, {pixi:{alpha:0.0}},{pixi:{alpha:bgAlpha}, ease:Linear.easeNone})

  // Create a container for scenes
  sceneHolder = new Container();  
  
  // stage.filters = [new PIXI.filters.CrossHatchFilter()]; // new PIXI.filters.TiltShiftFilter(27, 1000)]; //[new PIXI.filters.CRTFilter()]
  stage.addChild(sceneHolder);
  
  inputScreen = new PIXI.Sprite(PIXI.Texture.EMPTY);﻿
  inputScreen.interactive = true;
  inputScreen.width = scaler.stageW;
  inputScreen.height = scaler.stageH;
  //inputScreen.cursor = 'auto' 'not-allowed';
  
  stage.addChild(inputScreen);
  inputScreen.visible = false;
  
  scaler.on('resize_immediate', onResizeImmediate);
  scaler.on('resize', onResize);
  
}

/**
 * Listener for stage resize, called continously.
 * @param {number} stageW - Stage width in points.
 * @param {number} stageH - Stage height in points.
 * @private
 */
function onResizeImmediate(_stageW,_stageH){

  bg.width = _stageW;
  bg.height = _stageH;
  
  inputScreen.width = scaler.stageW;
  inputScreen.height = scaler.stageH;
  
}

/**
 * Listener for stage resize, debounced.
 * @param {number} stageW - Stage width in points.
 * @param {number} stageH - Stage height in points.
 * @private
 */
function onResize(stageW,stageH){
  reloadSceneStack();
}

/**
 * Toggle input for entire stage.
 * @param {boolean} enable 
 */
function enableInput(enable){
  inputScreen.visible = !enable;
}

/**
 * Will return if current scene has a transparent background.
 * @returns {boolean} sceneIsTransparent
 */
function isScenePresentedWithTransparentBg(){
  
  if (pendingModalTrans && pendingModalTrans.isTransparent){
    return true;
  }
  for (let i = transStack.length - 1; i >= 0; i--){
    if (transStack[transStack.length-1].isTransparent){
      return true;
    }
  }
  return false;  
  
}

/**
 * Opens default scene. Called internally by `storymode` on startup.
 * @returns {boolean} success
 * @private
 */
function openDefaultScene(){

  if (!scenes){
    throw new Error('Scenes never set. Call `nav.setScenes(..)` before initiating app.')
  }
  
  for (const sceneID in scenes){
    if (scenes[sceneID].default){
      openScene(sceneID, false, scenes[sceneID].defaultTransID ? scenes[sceneID].defaultTransID : 'fade');
      return true;
    }
  }
  return false;
}

/**
 * @typedef {'fade'|'over'|'pan:%direction%'|'parallax:%direction%'|'mario:%bgColor%'|'pixelate'} TransitionID
 */

/**
 * Transition to a scene.
 * @param {string} sceneID - Scene identifier.
 * @param {boolean} [isModal=false] - Whether scene should be loaded modally (over the top).
 * @param {TransitionID} [transID='fade'] - Transition identifier.
 * @param {Object} [sceneData=null] - Optional data to be passed to scene.
 */ 
function openScene(sceneID, isModal = false, transID = 'fade', sceneData = null){
  
  if (locked){
    return;
  }
  
  locked = true;
  enableInput(false);
  
  if (!scenes[sceneID]){
    throw new Error('Scene not found `'+sceneID+'`');
  }
  
  // Param can be supplied in format `transID:transConfigStr`
  const transIDParts = transID.split(':');
  const transConfigStr = transIDParts.length > 1 ? transIDParts[1] : null;
  transID = transIDParts[0];
  
  if (!trans[transID]){
    throw new Error('Transition not found `'+transID+'`');
  }
  
  const scene = new scenes[sceneID].class(Object.assign({sceneID:sceneID, instanceID:createInstanceID()}, scenes[sceneID].sceneData, sceneData)); // Merge sceneDatas (set in config.js and sent to this method)
  scene.visible = false; // Hide for now.
  scene.on('ready', onSceneReady); // Listen for custom scene `ready` event
  
  const scenePrev = transStack.length > 0 ? transStack[transStack.length-1].scene : null;
  
  const transInstance = new trans[transID](scene, scenePrev, isModal, transConfigStr, transID); 
  
  if (!transInstance.isModal && transStack.length > 1){
    // Remove previous 
    let prevModalTrans = transStack.splice(transStack.length-1,1)[0];
    if (prevModalTrans.isModal) {
      // When this transition arrives it will be replaced with this modal.
      pendingModalTrans = prevModalTrans; 
    } else {
      prevModalTrans.scene = null;
    }
  }
  
  transStack.push(transInstance);
  
  sceneHolder.addChild(scene); // Wait for on ready
  
}

/**
 * Creates a 7 character integer.
 * @returns {integer} id
 * @private
 */
function createInstanceID(){
  return 1000000 + Math.round(Math.random()*8999999); // 7 char integer
}

/**
 * Called when scene being loaded is ready to be presented.
 * <br>Triggers entry transition to begin.
 * @param {Scene} scene
 * @private
 */
function onSceneReady(scene){
  
  scene.off('ready', onSceneReady);
  
  if (transStack[transStack.length-1].scenePrev){
    transStack[transStack.length-1].scenePrev.onWillExit(transStack[transStack.length-1].isModal); // Exit to modal
  }
  transStack[transStack.length-1].scene.onWillArrive(false); // First scene arrival will never be modal
  transStack[transStack.length-1].performIn(onSceneIn);  
  
}

/**
 * Will return if current scene is presented modally.
 * @returns {boolean} sceneIsModal
 */
function isScenePresentedModally(){
  return transStack[transStack.length-1].isModal || pendingModalTrans; // If `pendingModalTrans` is set scene is not modal yet though will be 
}

/**
 * Will return if current scene is presented modally.
 * @returns {boolean} sceneIsModal
 * @private
 */
function isPresentingModal(){
  return !(transStack.length < 2 || !transStack[transStack.length-1].isModal || !transStack[transStack.length-1].scenePrev);
}

/**
 * Dismiss currently presented modal scene.
 * @param {Object} [dismissData=null] - Optionally supply an object to be passed to parent scene's `onWillArrive()` method
 */
function dismissScene(dismissData = null){
  
  if (locked){
    return;
  }
  locked = true;
  enableInput(false);
  
  if (!this.isPresentingModal()){
    throw new Error('Cannot dismiss scene');
  }
  
  transStack[transStack.length-1].scene.onWillExit(false); // Exit to be destroyed
  if (transStack[transStack.length-1].scenePrev){
    transStack[transStack.length-1].scenePrev.onWillArrive(true, dismissData); // Re-arrive modally
  }
  
  transStack[transStack.length-1].performOut(onSceneOut);
    
}

/**
 * Called when arriving scene transition is complete.
 * @private
 */
function onSceneIn(){
  
  if (transStack[transStack.length-1].scenePrev){

    transStack[transStack.length-1].scenePrev.onDidExit(transStack[transStack.length-1].isModal); 
    
    // Remove old scene if no longer required
    if (!transStack[transStack.length-1].isModal){
      let scenePrev = transStack[transStack.length-1].scenePrev
      sceneHolder.removeChild(transStack[transStack.length-1].scenePrev); // Destroy will be called by scene class
      transStack[transStack.length-1].scenePrev = null; // Don't retain reference to scene
      if (transStack[transStack.length-2].scene == scenePrev){
        transStack.splice(transStack.length-2,1);
      }
    }
    
  }
  
  if (pendingModalTrans){
    
    // Scene replaces previous modal scene. Swap them in trans stack.
    
    pendingModalTrans.scene = transStack[transStack.length-1].scene;
    transStack[transStack.length-1].scene = null;
    transStack.splice(transStack.length-1,1);
    transStack.push(pendingModalTrans);
    pendingModalTrans = null;
    
  }
  
  locked = false;
  enableInput(true);
  
  transStack[transStack.length-1].scene.onDidArrive(transStack[transStack.length-1].isModal);
  
  checkForNextArriveEvents();
  
}

/**
 * Called when exiting scene transition is complete.
 * @private
 */
function onSceneOut(){
  
  transStack[transStack.length-1].scene.onDidExit(false); // Not modal, about to be destroyed
  
  // Scene has dismissed 
  sceneHolder.removeChild(transStack[transStack.length-1].scene); // Destroy will be called by scene class
  transStack[transStack.length-1].scene = null; // Don't retain reference to scene
  if (transStack[transStack.length-1].scenePrev) {
    transStack[transStack.length-1].scenePrev = null; // Don't retain reference to scene
  }
  
  transStack.splice(transStack.length-1,1);
  
  locked = false;
  enableInput(true);
  
  transStack[transStack.length-1].scene.onDidArrive(true); // Return from modal dismissal
  
  checkForNextArriveEvents();
  
}

/**
 * Reload scene stack if `nav` was waiting to scene to arrive first.
 * @private
 */
function checkForNextArriveEvents(){
  
  if (transStack[transStack.length-1].destroyOnNextArrive){
    let _callback = transStack[transStack.length-1].destroyOnNextArrive;
    transStack[transStack.length-1].destroyOnNextArrive = null;
    delete transStack[transStack.length-1].destroyOnNextArrive
    destroy(_callback[0],_callback[1]);
    return;
  }
  
  if (transStack[transStack.length-1].reloadOnNextArrive){
    delete transStack[transStack.length-1].reloadOnNextArrive;
    reloadSceneStack();
  }
}

/**
 * Reload all scene instances with new instances.
 * @param {boolean} [force=false] - To ignore the scene's `shouldReloadOnStageResize()`.
 */
function reloadSceneStack(force = false){
  
  // Called during a scene transition, wait for arrival.
  if (locked){
    transStack[transStack.length-1].reloadOnNextArrive = true;
    return;
  }
  
  // If scene is presented modally over other scenes 
  // Hide them until they can reload themselved when next presented. 
  for (let i = 0; i < transStack.length -1; i++){    
    if (transStack[i].scene._shouldReloadOnStageResize(scaler.stageW, scaler.stageH)){
      transStack[i].scene.visible = false; // Optional
      transStack[i].reloadOnNextArrive = true;
    }
  }
  
  let _scene = transStack[transStack.length-1].scene;
  if (force || _scene._shouldReloadOnStageResize(scaler.stageW, scaler.stageH)){
    let sceneID = _scene.sceneData.sceneID;
    let sceneData = utils.cloneObj(_scene.sceneData);
    delete sceneData.sceneID;
    delete sceneData.instanceID;
    openScene(sceneID, false, 'fade', sceneData);  
  }
    
}

/**
 * Write to the console a basic outline of child display objects.
 */
function debugTransStack(){
  for (let i = transStack.length - 1; i >= 0; i--){   
    console.log(String(i) + ') `'+transStack[i].scene.name+'` ' + (i == transStack.length - 1 ? '*top*' : ''));
  }
}

/**
 * Called during `storymode.unmount`.
 * @private
 */ 
function destroy(reset = false, callback = null){

  if (!callback){
    throw new Error('Nav destroy requires a callback argument.')
  }
  
  if (locked){
    transStack[transStack.length-1].destroyOnNextArrive = [reset,callback]; // Wait for trans to finish.
    return;
  }
  
  // Clear stack
  for (let i = 0; i < transStack.length; i++){    
    
    transStack[i].scene.onWillExit(false); 
    transStack[i].scene.onDidExit(false); 
    
    sceneHolder.removeChild(transStack[i].scene)
    transStack[i].scenePrev = null; 
    transStack[i] = null;
    
    transStack.splice(i, 1)
    i--;
  }
  
  if (!reset){
    transStack = null;
    inputScreen.parent.removeChild(inputScreen)
    inputScreen = null;
    bg.parent.removeChild(bg)
    bg = null;
    transStack = null;
    scenes = null;
    sceneHolder = null;
    trans = null;
  }
  
  callback();
  
}

export { scenes }
export { isPresentingModal, openDefaultScene,setupStage,isScenePresentedModally,isScenePresentedWithTransparentBg,openScene,dismissScene,bg,inputScreen,sceneHolder,setScenes,reloadSceneStack,registerTrans }
export { destroy }