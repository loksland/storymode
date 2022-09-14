import { mutils, utils, nav, scaler } from './../storymode.js';

export const id = 'plaxmask'


/**
 * Applies a parallax pan with a rect mask.
 * <br>- The `z` property in PSD layers. Eg. `start.btn(reg:c,ui,z:50)`
 * <br>- `z` is stage dimension percentage from (0-100) where 0 is stationary and 100 is locked to the mask the scene.
 * <br>- `z` can be over 100 though it will need to extend beyond the artboard bounds.
 * <br>- Common elements between scenes can remain still if each has a z of `0` or no z defined.
 * @memberof module:nav
 * @hideconstructor
 * @example
nav.openScene(myScene, false, 'plaxmask:left')
nav.openScene(myScene, false, 'plaxmask:25'); // Degrees
 */

class PlaxMask {

  constructor(scene, scenePrev = null, isModal = false, transConfigStr = null, transID = null){

    this.scene = scene;
    this.scenePrev = scenePrev;
    this.isModal = isModal;
    this.isTransparent = true;

    this.maskMode = true;

    if (!transConfigStr || transConfigStr.length === 0){
      transConfigStr = 'r'
    } else {

      let char0 = transConfigStr.toLowerCase().charAt(0);
      if ('udlr'.includes(char0)){
        transConfigStr = char0;
        if (transConfigStr == 'u'){
          this.dir = {x:0.0,y:-1.0};
        } else if (transConfigStr == 'd'){
          this.dir = {x:0.0,y:1.0};
        } else if (transConfigStr == 'l'){
          this.dir = {x:-1.0,y:0.0};
        } else { // `right` is default
          this.dir = {x:1.0,y:0.0};
        }
      } else if (!isNaN(Number(transConfigStr))){
        let degs = Number(transConfigStr);
        let rads = mutils.degToRad(degs);
        //        270/-90
        //           |
        // 180/-180 -+- 0/360
        //           |
        //        90/-270
        this.dir = {x:Math.cos(rads),y:Math.sin(rads)}

        let max = Math.max(Math.abs(this.dir.x), Math.abs(this.dir.y))
        this.dir.x*=1.0/max;
        this.dir.y*=1.0/max;

      }

    }

    this.dir.animX = Math.abs(this.dir.x) > 0.001;
    this.dir.animY = Math.abs(this.dir.y) > 0.001;

    if (this.maskMode){
      this.transMask = new Graphics();
      nav.sceneHolder.parent.addChild(this.transMask);
      this.transMask.beginFill(0x00FF00)
      this.transMask.drawRect(0.0,0.0,scaler.stageW,scaler.stageH);
      this.transMask.endFill();
      this.scene.mask = this.transMask;
    }

    this.dur = 1.7;

  }


  onMidPoint(){
    this.scene.bringToFront();
  }

  performIn(onInCallback){

    this.scene.sendToBack();
    utils.wait(this, this.dur*0.5, this.onMidPoint);

    this.parallaxOffset = Math.abs(this.dir.x) > 0 ? scaler.stageW : scaler.stageH;

    let offset = {width:0.0, height:0.0}; // {width:scaler.stageW*0.1, height:scaler.stageH*0.1}

    this.scene.visible = true;

    this.scene.x = offset.width * this.dir.x
    this.scene.y = offset.height * this.dir.y

    if (nav.isScenePresentedWithTransparentBg()){
      gsap.to(nav.bg, this.dur, {pixi: {tint:this.scene.bgColor}, ease:Linear.easeNone});
    }

    //if (this.scenePrev){
    //  gsap.to(this.scenePrev, this.dur, {pixi: {x: offset.width * -this.dir.x, y: offset.height * -this.dir.y}, ease:Power3.easeInOut});
    //}

    //var tw = {pixi: {x: 0.0, y: 0.0}, ease:Power3.easeInOut, onComplete: this.onIn.bind(this), onCompleteParams: [onInCallback]};

    let scenes = [this.scene];
    if (this.scenePrev){
      scenes.push(this.scenePrev);
    }

    let tw = {}
    //tw.x = 0.0;
    //tw.y = 0.0;
    tw.ease = Power3.easeInOut;
    tw.onUpdate = this.applyParallax.bind(this);
    tw.onUpdateParams = [scenes];
    tw.onComplete = this.onIn.bind(this)
    tw.onCompleteParams = [onInCallback];

    gsap.killTweensOf(this.props);
    this.props = {perc:0.0}
    tw.perc = 1.0;

    this.applyParallax(scenes, true);
    gsap.to(this.props, this.dur, tw);


    //gsap.fromTo(this.transMask, this.dur, {x: scaler.stageW * this.dir.x, y: scaler.stageH * this.dir.y}, tw);
    //gsap.to(this.scene, this.dur, tw);

  }

  applyParallax(scenes, firstRun = false){

    if (this.transMask){
      this.transMask.x = scaler.stageW * this.dir.x * (1.0-this.props.perc)
      this.transMask.y = scaler.stageH * this.dir.y * (1.0-this.props.perc)
    }

    let _perc = this.props.perc
    let _dirX = this.dir.x;
    let _dirY = this.dir.y;

    let pt = new PIXI.Point();

    let isInScene = true;
    for (const scene of scenes){

      let onPlaxPosApplyExists = scene.onPlaxPosApply ? true : false;
      let mag = (isInScene ? 1.0 : -1.0)*(1.0 - _perc);

      for (const dispo of scene.children){

        if (dispo.txInfo){

          if (firstRun){
            dispo.txInfo._parallax_x = dispo.x; // Save starting position.
            dispo.txInfo._parallax_y = dispo.y; // Save starting position.
          }

          if (this.maskMode){
            pt.set(this.dir.animX ? dispo.txInfo._parallax_x + (dispo.txInfo.z/100.0) * (1.0-_perc) * scaler.stageW * _dirX : dispo.txInfo._parallax_x,
            this.dir.animY ? dispo.txInfo._parallax_y + (dispo.txInfo.z/100.0) * (1.0-_perc) * scaler.stageH * _dirY : dispo.txInfo._parallax_y);
          } else {
            pt.set(this.dir.animX ? dispo.txInfo._parallax_x + (1.0-_perc) * scaler.stageW * _dirX + (dispo.txInfo.z/100.0) * (1.0-_perc) * scaler.stageW * _dirX : dispo.txInfo._parallax_x,
            this.dir.animY ? dispo.txInfo._parallax_y + (1.0-_perc) * scaler.stageH * _dirY + (dispo.txInfo.z/100.0) * (1.0-_perc) * scaler.stageH * _dirY : dispo.txInfo._parallax_y);
          }

          if (onPlaxPosApplyExists){
            scene.onPlaxPosApply(dispo, pt, mag);
          }

          if (this.dir.animX && this.dir.animY){
            dispo.position.copyFrom(pt)
          } else if (this.dir.animX){
            dispo.x = pt.x;
          } else if (this.dir.animY){
            dispo.y = pt.y;
          }

        }
      }

      if (scene.onPlaxUpdate){
        scene.onPlaxUpdate(mag)
      }

      if (isInScene){
        isInScene = false;
        _perc = 1.0-_perc;
        _dirX *= -1.0;
        _dirY *= -1.0;
      }
    }

  }

  onIn(onInCallback){

    if (this.transMask){
      this.scene.mask = null;
      this.transMask.parent.removeChild(this.transMask);
      this.transMask.clear();
      this.transMask.destroy(true);
      this.transMask = null;
      delete this.transMask;
    }

    let scenes = [this.scene];
    if (this.scenePrev){
      this.scenePrev.x = 0.0;
      this.scenePrev.y = 0.0;
      this.scenePrev.visible = false; // Hide incase is modal for performance
      scenes.push(this.scenePrev);
    }

    this.resetParallax(scenes);

    onInCallback();

  }

  resetParallax(scenes){

    for (const scene of scenes){

      for (const dispo of scene.children){
        if (dispo.txInfo){
          if (this.dir.animX){
            dispo.x = dispo.txInfo._parallax_x;
          }
          if (this.dir.animY){
            dispo.y = dispo.txInfo._parallax_y;
          }
          delete dispo.txInfo._parallax_x;
          delete dispo.txInfo._parallax_y;

        }
      }
    }
  }

  performOut(onOutCallback){

    this.scenePrev.visible = true;
    this.scenePrev.x = scaler.stageW * this.dir.x * -1.0;
    this.scenePrev.y = scaler.stageH * this.dir.y * -1.0;

    gsap.to(nav.bg, this.dur, {pixi: {tint:this.scenePrev.bgColor}, ease:Linear.easeNone});

    gsap.to(this.scene, this.dur, {pixi: {x: scaler.stageW * -this.dir.x * -1.0, y: scaler.stageH * -this.dir.y * -1.0}, ease:Power3.easeInOut});

    var tw = {pixi: {x: 0.0, y: 0.0}, ease:Power3.easeInOut, onComplete: this.onOut.bind(this), onCompleteParams: [onOutCallback]}

    tw.onUpdate = this.applyParallax.bind(this);
    tw.onUpdateParams = [[this.scene,this.scenePrev]];
    this.applyParallax(eles, true);

    gsap.to(this.scenePrev, this.dur, tw);

  }

  onOut(onOutCallback){

    this.scene.visible = false;
    this.scene.x = 0.0;
    this.scene.y = 0.0;

    this.resetParallax([this.scene,this.scenePrev])

    onOutCallback();

  }
}

export default PlaxMask
