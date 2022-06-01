import { utils, mutils, Scene, scaler } from './../storymode.js';
 
// Extensions
// ----------


/**
 * Returns `true` if the display object is a `PIXI.AnimatedSprite`.
 * @returns {boolean} result 
 */
PIXI.AnimatedSprite.prototype.isAnimatedSprite = function(){
  return true;
}


/**
 * Removes display object from parent.
 */
PIXI.DisplayObject.prototype.removeFromParent = function(){
  
  if (this.parent){
    this.parent.removeChild(this)
  }
  
}

/**
 * Brings display object to the top of the display stack.
 * <br>- Will throw an error if display object doesn't have a parent.
 */
PIXI.DisplayObject.prototype.bringToFront = function(){
  
  this.parent.setChildIndex(this, this.parent.children.length - 1)
  
}

/**
 * Sends display object to the back of the display stack.
 * <br>- Will throw an error if display object doesn't have a parent.
 */
PIXI.DisplayObject.prototype.sendToBack = function(){
  
  this.parent.setChildIndex(this, 0)
  
}

/**
 * Outputs to console a representation of children of the given display object.
 */
PIXI.DisplayObject.prototype.debugStack = function(level = 0){
  
  let output = [];
  let info = this.name;
  let type = (this.isSprite) ? 'sprite' : 'other'
  info += ' ('+type+')';
  
  if (level == 0){
    output.push(info);
    output.push('='.repeat(info.length));
  } else {
    output.push('  '.repeat(level-1) + '- ' + info);
  }
  for (let i = this.children.length - 1; i >= 0; i--){
    let child = this.children[i];
    output = output.concat(child.debugStack(level+1));
  }
  
  if (level == 0){
    window['c' + 'onsole']['l' + 'og'](output.join('\n'))
  } else {
    return output;
  }
}

/**
 * Applies the supplied pivot to the display object without moving the position, even if rotated.
 * @param {number} pivotX 
 * @param {number} pivotY 
 */
PIXI.DisplayObject.prototype.setPivotWithoutMoving = function(pivotX, pivotY){
  
  const pivotOffset = new Point(pivotX-this.pivot.x,pivotY-this.pivot.y);
  this.pivot.set(pivotX, pivotY);
  
  const angOffset = 0.0;
  const pivotOffsetScaled = new Point(pivotOffset.x * this.scale.x, pivotOffset.y * this.scale.y)
  const zeroPt = new Point(0.0,0.0);
  const pivotOffsetDist = mutils.distanceBetweenPoints(zeroPt, pivotOffsetScaled);
  const pivotOffsetAng = mutils.angleDegsBetweenPoints(zeroPt, pivotOffsetScaled);
  
  this.position = mutils.projectFromPointDeg(this.position, pivotOffsetAng+this.angle, pivotOffsetDist);

}


  
/**
 * A drop in replacement for `Graphics.lineTo` that plots dashed lines.
 * @param {Vector} from - Starting point.
 * @param {Vector} to - End point.
 * @param {number} [dash=16.0] - Dash distance, in points.
 * @param {number} [gap=8.0] - Gap distance, in points.
 * @param {number} [offsetPerc=0.0] - Optional offset percentage (0.0-1.0) of dash pattern. Percentage is applied to the sum of `dash` + `gap`.
 */
PIXI.Graphics.prototype.dashedLineTo = function(fromPt, toPt, dash = 16.0, gap = 8.0, offsetPerc = 0.0) {
  
  let penDist = (gap + dash) * offsetPerc;
  if (penDist > gap){
    penDist -= gap + dash;
  }
  let penEnabled = false;
  let totalDist = mutils.distanceBetweenPoints(fromPt, toPt);
  
  let penPt;
  if (penDist > 0.0){
    penPt = mutils.projectDistance(fromPt, toPt, penDist);
    this.moveTo(penPt.x, penPt.y);
  } else {
    this.moveTo(fromPt.x, fromPt.y);
  }
  
  while(penDist < totalDist){
    penEnabled = !penEnabled;
    if (penEnabled){
      penDist = Math.min(totalDist, penDist + dash);
      penPt = mutils.projectDistance(fromPt, toPt, penDist);
      this.lineTo(penPt.x, penPt.y);
    } else {
      penDist = Math.min(totalDist, penDist + gap);
      penPt = mutils.projectDistance(fromPt, toPt, penDist);
      this.moveTo(penPt.x, penPt.y);
    }
  }
};

/**
 * Will adjust child display object to retain the same scale despite the scale applied to its parent.
 * <br>- Will throw an error if display object has not got a parent.
 */
PIXI.DisplayObject.prototype.adjustForParentScale = function(){
  this.scale.x *= Math.abs(1.0/this.parent.scale.x);
  this.scale.y *= Math.abs(1.0/this.parent.scale.y);
}

/**
 * Display object will remain in place from one parent coord space o another
 * <br>- See {@link https://pixijs.download/dev/docs/PIXI.AnimatedSprite.html#toGlobal}
 */
PIXI.DisplayObject.prototype.translateToCoordSpace = function(oldParent, newParent){
  
  return newParent.toLocal(this.position, oldParent, this.position);
  
}

/**
 * Point will remain in place from one parent coord space to another
 * <br>- See {@link https://pixijs.download/dev/docs/PIXI.AnimatedSprite.html#toGlobal}
 */
PIXI.Point.prototype.translateToCoordSpace = function(oldParent, newParent){
  
  return newParent.toLocal(this, oldParent, this);
  
}

/**
 * Point will remain in place from one parent coord space to another
 * <br>- See {@link https://pixijs.download/dev/docs/PIXI.AnimatedSprite.html#toGlobal}
 */
PIXI.ObservablePoint.prototype.translateToCoordSpace = function(oldParent, newParent){

  return newParent.toLocal(this, oldParent, this);
  
}

/**
 * Removes filters and masks to display object and all children recursively.
 * <br>- Called by scene on exit.
 * @param {boolean} recursive - Whether to call on children and their children.
 */
PIXI.DisplayObject.prototype.destroyFiltersAndMasks = function(recursive = true){
  
  if (this.mask){
    this.mask = null;
  }
  if (this.filters){
    this.filters = null;
  }
  
  if (!recursive){
    return;
  }
  
  for (let i = 0; i < this.children.length; i++){
    this.children[i].destroyFiltersAndMasks();
  }
  
}

/**
 * Will play the animated sprite until it gets to the target frame.
 * @param {integer} targetFrame - The target frame index.
 * @param {boolean} [animateAlways=true] - If `true` then will animate even if currently on the target frame.
 */
PIXI.AnimatedSprite.prototype.playUntil = function(targetFrame, animateAlways = false){
  this.loop = true;
  if (this.currentFrame == targetFrame && !animateAlways){
    return;
  }
  this.play();
  this.onFrameChange = ()=>{
    if (this.currentFrame === targetFrame){
      this.stop();
      this.onFrameChange = null;
    }
  }
}

// Screen shake 
// ------------

// 
const MAX_SHAKE_ROT = 2.0;
const MAX_SHAKE_OFFSET_ART = 15.0*0.5;


/**
 * Will apply a cumulative screen shake and rotation.
 * <br>- Primarily developed to be applied to the current scene.
 * <br>- See: {@link https://youtu.be/tu-Qe66AvtY?t=660}
 * @param {number} traumaPerc - How much trauma/impact to apply in the range of 0.0 to 1.0.
 * @param {number} [maxFactor=1.0] - The shake limits will be multipled by this factor.
 * @param {number} [options=null] - Options
 * @param {boolean} [options.rotateOnly=false] - If true then position will not be animated.
 * @param {Array|DisplayObject} [extraTargets=false] - Any additional display objects that will be affected by the animation.
 */
PIXI.DisplayObject.prototype.applyShake = function(traumaPerc, maxFactor = 1.0, options = null, extraTargets = null){
  
  let defaults = {
      rotateOnly: false,
  };
  options = utils.extend(defaults, options);

  let targets = [this];
  if (extraTargets){
    targets = targets.concat(Array.isArray(extraTargets) ? extraTargets : [extraTargets]);
  }
  
  if (typeof this._shake === 'undefined'){

    this._shake = {};
    this._shake.targets = targets;
    this._shake.trauma = 0.0;    
    if (!options.rotateOnly){
      if (this instanceof Scene){
        this.setPivotWithoutMoving(scaler.stageW*0.5, scaler.stageH*0.5)
        this._shake.origin = this.position.clone()
      } 
    }
    this._shake.kill = ()=>{

      gsap.killTweensOf(targets); // Includes self
      gsap.killTweensOf(targets[0]._shake)
      for (let target of targets){ // Captured
        target.rotation = 0.0;
      }
      if (!options.rotateOnly){
        targets[0].position.copyFrom(targets[0]._shake.origin)      
        if (targets[0] instanceof Scene){
          targets[0].setPivotWithoutMoving(0.0, 0.0); // Default
        }
      }
      targets[0]._shake = null;
      delete targets[0]._shake;
      
    }
  }

  this._shake.trauma = Math.min(1.0, this._shake.trauma + traumaPerc); // Linear ease down 
  gsap.killTweensOf(this._shake);
  gsap.to(this._shake, 1.0, {trauma:0.0, ease:Linear.easeNone, onUpdateParams:[targets], onUpdate:(targets)=>{
    const shakeAmt = Math.pow(targets[0]._shake.trauma, 3); // Or 3
    let tw = {};
    tw.angle = maxFactor*MAX_SHAKE_ROT * shakeAmt * mutils.randFloatNegOneToOne()
    if (!options.rotateOnly){
      tw.x = targets[0]._shake.origin.x + maxFactor*MAX_SHAKE_OFFSET_ART * scaler.scale * shakeAmt * mutils.randFloatNegOneToOne()
      tw.y = targets[0]._shake.origin.y + maxFactor*MAX_SHAKE_OFFSET_ART * scaler.scale * shakeAmt * mutils.randFloatNegOneToOne()
    }
    gsap.set(targets, tw);
  }, onComplete:this._shake.kill})
  
}

/**
 * Stops and disposes of any screenshake in progress.
 */
PIXI.DisplayObject.prototype.killShake = function(){

  if (typeof this._shake !== 'undefined'){
    this._shake.kill();
  }
}


// Simple Button 
// -------------

/**
 * Converts the display object into a simple button.
 * @param {number} [clickCallback=null] - The function to call on click. If not set will fire `parent.onBtn()` or `parent.parent.onBtn()` if preset.
 * @param {number} [stateChangeCallback=null] - Will trigger callback on state change.
 */

PIXI.DisplayObject.prototype.makeBtn = function(clickCallback = null, stateChangeCallback = null){
  
  const tintOn = 0x000000;;
  this.interactive = true;
  this.buttonMode = true;
  
  const isContainer = !this.isSprite && !(this instanceof Graphics) && !(this instanceof Btn);
  if (!stateChangeCallback){
    if (isContainer){
      const debugHitBtn = false;
      // Add a layer to collect hit events for the button, as containers have no bounds.
      const hit = new Sprite(debugHitBtn ? PIXI.Texture.WHITE : PIXI.Texture.EMPTY);﻿
      hit.name = '__btnhit';
      hit.width = this.txInfo._proj.width;
      hit.height = this.txInfo._proj.height;
      hit.x = this.txInfo._proj.tlX - this.txInfo._proj.x;
      hit.y = this.txInfo._proj.tlY - this.txInfo._proj.y;
      this.addChild(hit);
    }
  }
  
  this 
  .on('pointerdown', function(){    
    
    if (stateChangeCallback){
      stateChangeCallback(true, this);
    } else {
      this.tint = tintOn;
      if (isContainer){
        for (const child of this.children){
          if (child.isSprite){
            child.tint = tintOn;
          }
        }
      }
    }
    
    this.on('pointerupoutside', function(){
      this.off('pointerup');
      this.off('pointerupoutside');
      if (stateChangeCallback){
        stateChangeCallback(false, this);
        return;
      }
      this.tint = 0xffffff;
      if (isContainer){
        for (const child of this.children){
          if (child.isSprite){
            child.tint = 0xffffff;
          }
        }
      }
    }, this)
    
    this.on('pointerup', function(){
      this.off('pointerup');
      this.off('pointerupoutside');
      if (stateChangeCallback){
        stateChangeCallback(false, this);
      } else {
        this.tint = 0xffffff;
        if (isContainer){
          for (const child of this.children){
            if (child.isSprite){
              child.tint = 0xffffff;
            }
          }
        }
      }
      if (clickCallback){
        clickCallback(this);
      } else if (typeof this.parent.onBtn === 'function'){
        this.parent.onBtn.bind(this.parent)(this);
      } else if (typeof this.parent.parent.onBtn === 'function'){
        this.parent.parent.onBtn.bind(this.parent.parent)(this);
      }
    }, this)
    
  }, this)

}

/**
 * Resets and cleans up display object that was converted to button with `makeBtn()`.
 */
PIXI.DisplayObject.prototype.killBtn = function(){
  this.off('pointerdown');
  this.off('pointerupoutside');
  this.off('pointerup');
  this.interactive = false;
  this.buttonMode = false;
  let hit = this.getChildByName('__btnhit');
  if (hit){
    this.removeChild(hit);
  }
  
}

