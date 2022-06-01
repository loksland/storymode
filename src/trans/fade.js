
import { nav } from './../storymode.js';

export const id = 'fade';


/**
 * Simple fade transition.
 * <br>- Evoked with 'fade' transition ID.
 * <br>- Uses `AlphaFilter` to fade contents as a whole rather than individually.
 * @memberof module:nav
 * @hideconstructor
 * @example
nav.openScene(myScene, false, 'fade')
 */
class FadeTrans {
  
  constructor(scene, scenePrev = null, isModal = false, transConfigStr = null){
    
    this.scene = scene;
    this.scenePrev = scenePrev;
    this.isModal = isModal;
    this.isTransparent = false;
    
  }
  
  performIn(onInCallback, reverse = false){
    
    const dur = 0.4;
    
    const sceneIn = reverse ? this.scenePrev : this.scene;
    const sceneOut = reverse ? this.scene : this.scenePrev;
    
    if (!nav.isScenePresentedWithTransparentBg()){
      TweenMax.to(nav.bg, dur, {pixi: {tint:sceneIn.bgColor}, ease:Linear.easeNone});
    }
    
    if (sceneOut){
      const filter = new PIXI.filters.AlphaFilter(1.0);
      sceneOut.filters = [filter];
      TweenMax.to(filter, dur, {pixi: {alpha:0.0}, ease:Linear.easeNone});
    }
    
    sceneIn.visible = true;
    sceneIn.alpha = 1.0;
    
    const filter = new PIXI.filters.AlphaFilter(0.0);
    sceneIn.filters = [filter];
    
    TweenMax.to(filter, dur, {pixi:{alpha:1.0}, ease:Linear.easeNone,  onComplete: (reverse ? this.onOut : this.onIn).bind(this), onCompleteParams: [onInCallback]});
    
  }
  
  onIn(onInCallback){
    
    // Remove all filters used in the transition
    
    if (this.scenePrev){
      this.scenePrev.filters = null;
      this.scenePrev.visible = false; // Hide incase is modal for performance
    }
    
    this.scene.filters = null;
    
    onInCallback();    
    
  }
  
  performOut(onOutCallback){
    
    this.performIn(onOutCallback, true)
    
  }
  
  onOut(onOutCallback){
    
    // Remove all filters used in the transition
    
    this.scene.filters = null;
    this.scene.visible = false;
    this.scenePrev.filters = null;
    
    onOutCallback();    
    
  }
  
}

export default FadeTrans