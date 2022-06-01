import { nav } from './../storymode.js';

export const id = 'pixelate';

/**
 * Will use a blocky pixel transition reminiscent of early Mario games.
 * <br>- Evoked with 'pixelate' transition ID.
 * @memberof module:nav
 * @hideconstructor
 * @example
nav.openScene(myScene, false, 'pixelate')
 */
class PixelateTrans {
  
  constructor(scene, scenePrev = null, isModal = false, transConfigStr = null){
    
    this.scene = scene;
    this.scenePrev = scenePrev;
    this.isModal = isModal;
    this.isTransparent = false;
    
  }
  
  performIn(onInCallback, reverse = false){
    
    const sceneIn = reverse ? this.scenePrev : this.scene;
    const sceneOut = reverse ? this.scene : this.scenePrev;
    
    let dur = 0.6;
    const minPxSize = 1.0;
    const maxPxSize = 40.0;
    
    if (!nav.isScenePresentedWithTransparentBg()){
      TweenMax.to(nav.bg, dur, {pixi: {tint:sceneIn.bgColor}, ease:Linear.easeNone});
    }
    
    sceneIn.alpha = 1.0;
    
    const filterIn = new PIXI.filters.PixelateFilter(maxPxSize);    
    sceneIn.filters = [filterIn];
    this.perc = 0;
    let self = this;
    
    let filterOut = null;
    let delay = 0.0;
    const fps = 15;
    const ease = 'steps('+String(Math.round(dur*fps))+')'
 
    if (sceneOut){
      filterOut = new PIXI.filters.PixelateFilter(minPxSize);
      sceneOut.filters = [filterOut];
      TweenMax.to(this, dur, {perc:1.0, ease:ease, onUpdate:function(){
        filterOut.size = minPxSize + self.perc * (maxPxSize-minPxSize);
      }, onComplete:function(){
        sceneOut.visible = false;
      }});
      delay = dur;
    } 
    
    TweenMax.fromTo(this, dur, {perc:0.0}, {perc:1.0, delay:delay, ease:ease, onUpdate:function(){
      filterIn.size = minPxSize + (1.0-self.perc) * (maxPxSize-minPxSize);
    }, onStart:function(){      
      sceneIn.visible = true;
    }, onComplete: reverse ? this.onOut : this.onIn.bind(this), onCompleteParams: [onInCallback]});
    
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
    
    this.scenePrev.filters = null;
    this.scene.filters = null;
    
    onOutCallback();    
    
  }
  
}

export default PixelateTrans