
import { nav , utils} from './../storymode.js';

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
    this.dur = 0.1

  }

  performIn(onInCallback, reverse = false){


    const sceneIn = reverse ? this.scenePrev : this.scene;
    const sceneOut = reverse ? this.scene : this.scenePrev;

    if (!nav.isScenePresentedWithTransparentBg()){
      nav.bg.tint = sceneIn.bgColor
    }

    if (reverse){
      utils.wait(this, this.dur, this.onOut, [onInCallback, sceneIn, sceneOut]);
    } else {
      utils.wait(this, this.dur, this.onIn, [onInCallback, sceneIn, sceneOut]);
    }

  }

  onIn(onInCallback, sceneIn, sceneOut){

    // Remove all filters used in the transition

    if (sceneOut){
      sceneOut.visible = false;
    }

    sceneIn.visible = true

    if (this.scenePrev){
      this.scenePrev.visible = false; // Hide incase is modal for performance
    }

    onInCallback();

  }

  performOut(onOutCallback){

    this.performIn(onOutCallback, true)

  }

  onOut(onOutCallback, sceneIn, sceneOut){

    if (sceneOut){
      sceneOut.visible = false;
    }

    sceneIn.visible = true

    // Remove all filters used in the transition

    this.scene.visible = false;

    onOutCallback();

  }

}

export default JumpTrans
