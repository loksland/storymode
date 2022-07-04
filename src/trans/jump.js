
import { nav } from './../storymode.js';

export const id = 'jump';


/**
 * Jumps from one scene to the next without any animation.
 * <br>- Evoked with 'jump' transition ID.
 * @memberof module:nav
 * @hideconstructor
 * @example
nav.openScene(myScene, false, 'jump')
 */
 
class JumpTrans {
  
  constructor(scene, scenePrev = null, isModal = false, transConfigStr = null){
    
    this.scene = scene;
    this.scenePrev = scenePrev;
    this.isModal = isModal;
    this.isTransparent = false;
    
  }
  
  performIn(onInCallback, reverse = false){
    
    const sceneIn = reverse ? this.scenePrev : this.scene;
    const sceneOut = reverse ? this.scene : this.scenePrev;
    
    if (!nav.isScenePresentedWithTransparentBg()){
      gsap.set(nav.bg, {pixi: {tint:sceneIn.bgColor}});
    }
    
    if (sceneOut){
      sceneOut.visible = false;
    }
    
    sceneIn.visible = true;
    
    if (reverse){
      this.onOut(onInCallback);
    } else {
      this.onIn(onInCallback);
    }
     
  }
  
  onIn(onInCallback){
    
    // Remove all filters used in the transition
    
    if (this.scenePrev){
      this.scenePrev.visible = false; // Hide incase is modal for performance
    }
    
    onInCallback();    
    
  }
  
  performOut(onOutCallback){
    
    this.performIn(onOutCallback, true)
    
  }
  
  onOut(onOutCallback){
    
    // Remove all filters used in the transition
    
    this.scene.visible = false;

    onOutCallback();    
    
  }
  
}

export default JumpTrans