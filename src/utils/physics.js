import { utils, scaler, pixiApp, htmlEle, ui} from './../storymode.js';

let Engine,
    Render,
    Runner,
    Bodies,
    Composites,
    Composite,
    Constraint,
    MouseConstraint,
    Mouse,
    Body;

if (typeof window['Matter'] !== 'undefined'){
 
  Engine = Matter.Engine;
  Render = Matter.Render;
  Runner = Matter.Runner;
  Bodies = Matter.Bodies;
  Composites = Matter.Composites;
  Composite = Matter.Composite;
  Constraint = Matter.Constraint;
  MouseConstraint = Matter.MouseConstraint;
  Mouse = Matter.Mouse;
  Body = Matter.Body;
    
} 

// Overview:
// Integrates between between matter.js to storymode.
// 
// - When there is syncing, PIXI display objects sync to the engine bodies.
// - Modifiers and tweens involving physics bodies are always in physics coords
// - Bodies and their synced dispos have center registrations

// Requires:
/*
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.17.1/matter.min.js" integrity="sha512-3CP+e7z5ieYYTIyvRvV3eGVYR67yXg5V2mWfg8pEJJd2mlh8tG/cnDv5scTmRztEYHTksBlpPOmxFOiMtHfZdQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
*/

// JRunner
// -------

// A pixi ticker integrated with matter js engine
class JRunner { // } extends PIXI.utils.EventEmitter {
  
  constructor(engine, render, renderCallback, options){  
    
    this.engine = engine;
    this.renders = Array.isArray(render) ? render : [render];
    this.renderCallback = renderCallback;
    
    let defaults = {
      fixedTimestep: false, // If timing is fixed, then the apparent simulation speed will change depending on the frame rate (but behaviour will be deterministic).
                            // If the timing is variable, then the apparent simulation speed will be constant (approximately, but at the cost of determininism).
      
    };

    options = utils.extend(defaults, options);
    
    let targetFPS = 60.0;
    this.targetDelta = 1000.0/targetFPS;
    this.deltaMin = 1000.0/targetFPS;
    this.deltaMax = 1000.0/(targetFPS * 0.5)
    this.fixedTimestep = options.fixedTimestep;
    
    this.deltaHistory = [];
    this.timeScalePrev = 1;
    
  }
  
  pauseTick(){
    
    ticker.remove(this.tick, this);
    
  }

  resumeTick(){
    
    this.pauseTick();
    ticker.add(this.tick, this);
    
  }

  tick(){
    
    let delta = this.targetDelta;
    let correction = 1;
    if (!this.fixedTimestep){
        
      // https://pixijs.download/dev/docs/PIXI.Ticker.html
      // https://brm.io/matter-js/docs/files/src_core_Runner.js.html

      delta = ticker.elapsedMS; // this value is neither capped nor scaled
      
      // optimistically filter delta over a few frames, to improve stability
      this.deltaHistory.push(delta)
      this.deltaHistory = this.deltaHistory.slice(-60); // Limit sample to 60
      delta = Math.min.apply(null, this.deltaHistory);    
      
      // limit delta
      delta = delta < this.deltaMin ? this.deltaMin : delta;
      delta = delta > this.deltaMax ? this.deltaMax : delta;
                                            
      // correction = dt // USe this if no filtering and limiting of delta
      correction = delta/this.targetDelta;
      
    }
    
    // time correction for time scaling
    if (this.timeScalePrev !== 0) {
      correction *= Math.min(2.0, this.engine.timing.timeScale / this.timeScalePrev);
      // correction *= engine.timing.timeScale / this.timeScalePrev
    }

    if (this.engine.timing.timeScale === 0) {
      correction = 0;
    }
    
    this.timeScalePrev = this.engine.timing.timeScale;

    Engine.update(this.engine, delta, correction); // 60 fps 16.666*dt
    
    // this.render.world(this.engine.world);
    for (let i = 0; i < this.renders.length; i++){
      this.renders[i].drawRender(this.engine.world);
    }
    
    if (this.renderCallback){
      this.renderCallback();
    }
    
  }
  
  // Must be called manually
  dispose(){
    
    this.deltaHistory = null;    
    this.engine = null;    
    
    //this.render.dispose();
    for (var i = 0; i < this.renders.length; i++) {
      this.renders[i] = null;      
    }
    this.renders = null;
    
  }
  
}

// JRender
// -------

// Integrates between storymode / Pixi sprites and Matter physics objects / engine
// - As a rule PIXI always syncs to matter.js, rather than the other way around

class JRender {
  
  constructor(options){
    
    let defaults = {
      ptsPerMeterFactor: 1.0
      // wireframeEnabled: false
    };
    
    options = utils.extend(defaults, options);
    
    this.ptm = options.ptsPerMeterFactor; // points to meter: Multiply by this to translate (art) pt to matter.js units (in meters)
    this.mtp = 1.0/options.ptsPerMeterFactor; // meters to points: Multiply by this to translate matter.js units (in meters) to (art) pts
    
    this.valueModifiers = {x:0.0,y:0.0}; // This only affects links
    
    this.links = {};
    
  }
  
  // Tools 
  
  artPtsToPhysMtrs(artPts){
    return this.ptm*artPts;
  }
  
  physMtrsToArtPts(physMtrs){
    return this.mtp*physMtrs;
  }
  
  screenXToPhysMtrs(screenX){
    return scaler.proj.default.transScreenX(screenX)*this.ptm;
  }
  
  screenYToPhysMtrs(screenY){
    return scaler.proj.default.transScreenY(screenY)*this.ptm;
  }
  
  screenPtsToPhysMtrs(screenPts){
    return screenPts*(1.0/scaler.scale)*this.ptm;
  }
  
  physMtrsToScreenPts(physMtrs){
    return physMtrs*this.mtp*scaler.scale
  }
  
  // ---
  
  dispoToBodyDef(dispo){
    
    let def = {};
    
    def.width = this.screenPtsToPhysMtrs(dispo.width);
    def.height = this.screenPtsToPhysMtrs(dispo.height);
    
    if (dispo.txInfo){ // Consider reg perc      
      def.cx = ((this.screenXToPhysMtrs(dispo.x) - def.width*dispo.txInfo.regPercX) + def.width*0.5) 
      def.cy = ((this.screenYToPhysMtrs(dispo.y) - def.height*dispo.txInfo.regPercY) + def.height*0.5) 
    } else { // Assume center reg
      def.cx = this.screenXToPhysMtrs(dispo.x);
      def.cy = this.screenYToPhysMtrs(dispo.y);
    }
    
    return def;    
    
  }
  
  // |txInfo| can be a txPath (eg `myart.psd/mysprite`)
  txInfoToBodyDef(txInfo){
    
    if (typeof txInfo === 'string'){
      txInfo = ui.txInfo[txInfo];
      if (!txInfo){
        throw new Error('JRender: Texture path not found `'+txInfo+'`');
      }
    }
  
    let def = {};
    def.cx = ((txInfo.x - txInfo.width*txInfo.regPercX) + txInfo.width*0.5) * this.ptm;
    def.cy = ((txInfo.y - txInfo.height*txInfo.regPercY) + txInfo.height*0.5) * this.ptm;
    def.width = txInfo.width * this.ptm;
    def.height = txInfo.height * this.ptm;
  
    return def;
    
  }
  
  rectToBodyDef(rect){
    let def = {};
    def.width = this.screenPtsToPhysMtrs(rect.width);
    def.height = this.screenPtsToPhysMtrs(rect.height);
    def.cx = this.screenXToPhysMtrs(rect.x) + def.width*0.5;
    def.cy = this.screenYToPhysMtrs(rect.y) + def.width*0.5;
    return def;
  }
  
  drawRender(world){
    
    let link;
    let pxScale = 1.0/scaler.artboardScaleFactor

    for (let label in this.links){
      link = this.links[label];
      
      if (link.syncProps.x){
        // Assumes dispo reg is 0.5,0.5
        link.to.x = scaler.proj.default.transArtX(this.mtp*(link.from.position.x+link.valueModifiers.x + this.valueModifiers.x)) // Convert from matter.js meters to pts
      }
      
      if (link.syncProps.y){
        // Assumes dispo reg is 0.5,0.5
        link.to.y = scaler.proj.default.transArtY(this.mtp*(link.from.position.y+link.valueModifiers.y + this.valueModifiers.y)); 
      }
      
      if (link.syncProps.rotation){
        link.to.rotation = link.from.angle + utils.degToRad(link.valueModifiers.rotation); 
      }
      
      if (link.syncProps.scale){
        let s = scaler.scale*(1.0/scaler.artboardScaleFactor)*link.from._scale*link.valueModifiers.scale;
        link.to.scale.set(s,s);
      }
    }
  }
  
  get mouseElement(){
    return pixiApp.resizeTo == window ? htmlEle : pixiApp.resizeTo; //pixiApp.resizeTo; // document.body
  }
  
  adjustMouseToStage(mouse){
    Mouse.setOffset(mouse, {x:this.ptm*(-scaler.proj.default.topLeft.x*(1.0/scaler.scale)), y:this.ptm*(-scaler.proj.default.topLeft.y*(1.0/scaler.scale))}); //scaler.proj.default.transArtY(0.0)
    Mouse.setScale(mouse, {x:this.ptm*(1.0/scaler.scale), y:this.ptm*(1.0/scaler.scale)})
  }
  
  // - Sync props: x,y,rotation(in radians),scale
  addSyncLink(label, from, to, syncProps = null, valueModifiers = null){
    
    if (!from.id || !from.type || from.type !== 'body'){
      throw new Error('Jrender: Target must be a physics body');
    } 
    from._scale = typeof from._scale !== 'undefined' ? from._scale : 1.0; // Track scale
    
    syncProps = syncProps ? syncProps : {};
    
    // If all syncProps are false, the remaining are assumed true
    // If any sync props are true, the remaining are assumed false.
    // Apart from rotation and scale that are always assumed false
    let syncPropDefault = true
    for (let p in syncProps){
      if (syncProps[p] === true){
        syncPropDefault = false;
        break;
      }
    }
    
    syncProps = utils.extend({x:syncPropDefault,y:syncPropDefault,rotation:false,scale:false}, syncProps);
    valueModifiers = utils.extend({x:0.0,y:0.0,rotation:0.0, scale:1.0}, valueModifiers); // Note these need to be relative to metter / meters
    let link = new JSyncLink(from, to, syncProps, valueModifiers);
    this.links[label] = link;
    return link;
  }
  
  dispose(){
    for (let label in this.links){
      this.links[label].dispose();
      this.links[label] = null
    }    
    this.links = null;
  }
  
}


// JLink
// -----

// Represents a link between PIXI and matterjs
// - Just a light class with refs. Calculations are done on the render.
class JSyncLink {
  constructor(from, to, syncProps, valueModifiers) {
    this.from = from;
    this.to = to;
    this.syncEnabled = true;
    this.syncProps = syncProps;
    this.valueModifiers = valueModifiers;
  }
  dispose(){
    this.from = null;
    this.to = null;
  }
}


  /*
  syncToDispo(){
    
    // https://github.com/liabru/matter-js/blob/master/src/body/Body.js#L180
    
    if (this.syncProps.x || this.syncProps.y){
      let position = {}
      if (this.syncProps.x){
        position.x = this.ptm*scaler.proj.default.transScreenX(this.dispo.x)   
        if (!this.syncProps.y){
          position.y =  this.body.position.y
        } 
      }
      if (this.syncProps.y){
        position.y = this.ptm*scaler.proj.default.transScreenY(this.dispo.y)    
        if (!this.syncProps.x){
          position.x =  this.body.position.x
        } 
      }
      Body.setPosition(this.body, position);
    }
    
    if (this.syncProps.rotation){
      Body.setAngle(this.body, this.dispo.rotation);
    }
    

*/

// JWireframeRender
// ----------------

// A wireframe renderer for storymode
// - This is intended for development purposes.
/*
Usage:
```js

let jwireframeRender =  new physics.JWireframeRender(mouse);
this.addChild(jwireframeRender); // Should be auto disposed on scene dispose
this.jrunner.renders.push(jwireframeRender); // Attach to runner.render list

```
*/

class JWireframeRender extends PIXI.Graphics {
  
  constructor(mouse, options){
    
    super();
    
    let defaults = {
      lineThickness: 3.0,
      ptsPerMeterFactor: 1.0
    };
    options = utils.extend(defaults, options);
    
    this.mouse = mouse;
    this.lineThickness = options.lineThickness;
    
    this.ptm = options.ptsPerMeterFactor; // points to meter: Multiply by this to translate (art) pt to matter.js units (in meters)
    this.mtp = 1.0/options.ptsPerMeterFactor; // meters to points: Multiply by this to translate matter.js units (in meters) to (art) pts
    
    this.onStageDimChange();
    this.on('removed',  this.dispose); // Auto dispose
    
  }
  
  onStageDimChange(){
    
    this._stageW = scaler.stageW;
    this._stageH = scaler.stageH;

    this.scale.set(scaler.scale*this.mtp);
    this.x = scaler.proj.default.topLeft.x; // scaler.proj.default.transArtX(0.0)
    this.y = scaler.proj.default.topLeft.y; // scaler.proj.default.transArtY(0.0)   
    
  }
  
  // Entry point to render
  drawRender(world){
    
    // https://github.com/liabru/matter-js/blob/master/src/render/Render.js Line 319
    // https://pixijs.download/dev/docs/PIXI.Graphics.html

    if (this._stageW !== scaler.stageW || this._stageH !== scaler.stageH){
      // Detect stage change
      this.onStageDimChange();
    } 
    
    this.clear();
    
    this.bodies(Composite.allBodies(world))
    this.constraints(Composite.allConstraints(world));
    
    if (this.mouse){
      this.mousePosition(this.mouse)
    } 
    
  }
  
  bodies(bodies){
    
    this.lineStyle(this.lineThickness/this.scale.x, body.isSensor ? 0x00ffff : 0xffffff, body.isSleeping ? 0.5 : 1.0);
    
    let part, k;
    
    for (let body of bodies){
      
      for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
        
        part = body.parts[k];
        
        if (part.circleRadius) {

          this.drawCircle(part.position.x, part.position.y, body.circleRadius);
          this.moveTo(part.position.x, part.position.y);    
          this.lineTo(part.position.x + part.circleRadius*Math.cos(body.angle), body.position.y + body.circleRadius*Math.sin(body.angle)); 
          
        } else {
          
          if (part.vertices.length > 0){
            this.moveTo(part.vertices[0].x, part.vertices[0].y);                
            for (let v of part.vertices){    
              this.lineTo(v.x, v.y);   
            }
            this.closePath();
          }
        }
      }
    }
    
  }
  
  // https://github.com/liabru/matter-js/blob/master/src/render/Render.js#L1
  // Line 633
  constraints(constraints){
    
    for (var i = 0; i < constraints.length; i++) {
      
      var constraint = constraints[i];
      
      if (!constraint.pointA || !constraint.pointB){
        continue;
      }
      
      var bodyA = constraint.bodyA,
        bodyB = constraint.bodyB,
        start,
        end;
      
      if (bodyA) {
        start = {x:bodyA.position.x+constraint.pointA.x,y:bodyA.position.y+constraint.pointA.y}
      } else {
        start = constraint.pointA;
      }
      
      this.lineStyle(this.lineThickness/this.scale.x, 0x1b8ce3, 1.0);
      
      if (constraint.render.type === 'pin') {
          this.drawCircle(start.x, start.y, body.circleRadius);
      } else {
        
          if (bodyB) {
              end = {x:bodyB.position.x+constraint.pointB.x,y:bodyB.position.y+constraint.pointB.y} 
          } else {
              end = constraint.pointB;
          }
          
          this.moveTo(start.x, start.y);

          if (constraint.render.type === 'spring') {
            
              let delta = {x:end.x-start.x,y:end.y-start.y},
                  normal = this._vectorPerp(this._vectorNormalise(delta)),
                  coils = Math.ceil(this._commonClamp(constraint.length / 5, 12, 20)),
                  offset;

              for (let j = 1; j < coils; j += 1) {
                  offset = j % 2 === 0 ? 1 : -1;

                  this.lineTo(
                      start.x + delta.x * (j / coils) + normal.x * offset * this.ptm*(4.0),
                      start.y + delta.y * (j / coils) + normal.y * offset * this.ptm*(4.0)
                  );
              }
              
          }

          this.lineTo(end.x, end.y);
          
      }

      if (true) {
          
        this.lineStyle(this.lineThickness/this.scale.x, 0x1b8ce3, 1.0);
        this.drawCircle(start.x, start.y, this.ptm*(5.0));
        this.drawCircle(end.x, end.y, this.ptm*(5.0));
        
      }
    }
    
  }
  
  mousePosition(mouse){
    
    this.lineStyle(this.lineThickness/this.scale.x, 0x000000, 1.0);
    this.drawCircle(mouse.position.x, mouse.position.y, this.ptm*(5.0));
    this.drawCircle(mouse.position.x, mouse.position.y, this.ptm*(2.5));
    
  }
  
  // https://github.com/liabru/matter-js/blob/master/src/geometry/Vector.js
  
  _vectorNormalise(vector) {
      let magnitude = this._vectorMagnitude(vector);
      if (magnitude === 0) {
        return { x: 0, y: 0 };
      }
      return { x: vector.x / magnitude, y: vector.y / magnitude };
  };
  
  _vectorMagnitude(vector) {
    return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));
  };
  
  _vectorPerp(vector, negate) {
    negate = negate === true ? -1 : 1;
    return { x: negate * -vector.y, y: negate * vector.x };
  };
  
  _commonClamp(value, min, max) {
    if (value < min){
        return min;
    }
    if (value > max){
        return max;
    }
    return value;
  };

  dispose(){
    this.off('removed',  this._dispose);
    this.mouse = null;
    this.clear();
    // this.destroy(); // Already being called by scene.destroy chldren:true
  }
  
}





// Extensions
// ----------

class Jgsap {
  
  constructor(){
    this.tweens= {};
  }
  
  fromTo(target, dur, twFrom, twTo){
    return this._tween(target, dur, twFrom, twTo);
  }
  
  from(target, dur, tw){
    
    return this._tween(target, dur, tw, null);
    
  }
  
  to(target, dur, tw){
    
    return this._tween(target, dur, null, tw);
    
  }
  
  _tween(target, dur, twFrom, twTo){
    
    if (!target.id || !target.type){
      throw new Error('jsap: Target must be a physics body');
    } else if (!(target.type == 'body' || target.type == 'composite')){
      throw new Error('jsap: Unsupported target');
    }
    
    let cmd = 'fromTo';
    let tw;
    if (!twFrom){
      cmd = 'to'
      tw = twTo;
    } else if (!twTo){
      cmd = 'from'
      tw = twFrom;
    }
    
    // Create a temporary prop object to tween
    if (!this.tweens[target.id]){
      this.tweens[target.id] = {};
    }
    
    //this.tweens[target.id]._targetType = target.type;
    this.tweens[target.id]._syncProps = {}; // Track which props to update
    
    // Assign callbacks
    let _tw = (cmd === 'fromTo') ? twTo : tw;
    _tw.onUpdateParams = [target, _tw.onUpdate, _tw.onUpdateParams]
    _tw.onUpdate = this.onTwUpdate.bind(this);      
    _tw.onCompleteParams = [target, _tw.onComplete, _tw.onCompleteParams]
    _tw.onComplete = this.onTwComplete.bind(this);      
  
    // Record starting value
    if (cmd === 'fromTo'){
      
      if (target.type == 'composite'){
        throw new Error('jsap: Composite tweens can only be relative');
      }
      
      // Set starting values
      
      if ('x' in twFrom){
        this.tweens[target.id]._syncProps.x = true;        
        this.tweens[target.id].x = twFrom.x
      } 
      if ('y' in twFrom){
        this.tweens[target.id]._syncProps.y = true;        
        this.tweens[target.id].y = twFrom.y
      } 
      
      if ('rotation' in twFrom){
        this.tweens[target.id]._syncProps.rotation = true;
        twFrom.rotation = utils.degToRad(twFrom.rotation);
        twTo.rotation = utils.degToRad(twTo.rotation);      
        this.tweens[target.id].rotation = twFrom.rotation;
      }
      
      gsap.fromTo(this.tweens[target.id], dur, twFrom, twTo);
      
    } else {
      
      // Set starting values
      if ('x' in tw){
        this.tweens[target.id]._syncProps.x = true;    
        if (target.type == 'composite'){
          this.tweens[target.id].x = 0.0
          this.tweens[target.id]._x = 0.0
        } else {
          this.tweens[target.id].x = target.position.x;
        }
      } 
      
      if ('y' in tw){
        this.tweens[target.id]._syncProps.y = true;        
        if (target.type == 'composite'){
          this.tweens[target.id].y = 0.0
          this.tweens[target.id]._y = 0.0
        } else {
          this.tweens[target.id].y = target.position.y;
        }
      } 
      
      if ('rotation' in tw){
        this.tweens[target.id]._syncProps.rotation = true;
        this.tweens[target.id].rotation = target.angle;
        tw.rotation = utils.degToRad(tw.rotation); // Convert from degs to radians
      }
      
      if ('scale' in tw){
        target._scale = typeof target._scale !== 'undefined' ? target._scale : 1.0; // Track scale
        this.tweens[target.id]._syncProps.scale = true;
        this.tweens[target.id].scale = target._scale;
        this.tweens[target.id]._scale = this.tweens[target.id].scale;
      }
      
      gsap[cmd](this.tweens[target.id], dur, tw);
      
    }
  }
  
  onTwUpdate(target, _onUpdate = null, _onUpdateParams = null){
    
    if (this.tweens[target.id]._syncProps.x || this.tweens[target.id]._syncProps.y){
      
      if (target.type == 'composite'){
        
        Composite.translate(target, {
          x: this.tweens[target.id]._syncProps.x ? this.tweens[target.id].x-this.tweens[target.id]._x : 0.0,
          y: this.tweens[target.id]._syncProps.y ? this.tweens[target.id].y-this.tweens[target.id]._y : 0.0,
        }, false);
        
        // Store previous values;
        if (this.tweens[target.id]._syncProps.x){
          this.tweens[target.id]._x = this.tweens[target.id].x;
        }
        if (this.tweens[target.id]._syncProps.y){
          this.tweens[target.id]._y = this.tweens[target.id].y;
        }
        
      } else {
        
        let _x = this.tweens[target.id]._syncProps.x ? this.tweens[target.id].x : target.position.x;
        let _y = this.tweens[target.id]._syncProps.y ? this.tweens[target.id].y : target.position.y;
        Body.setPosition(target, {x:_x, y:_y});
        
      }
    }
    
    if (this.tweens[target.id]._syncProps.rotation){
      Body.setAngle(target, this.tweens[target.id].rotation);
    }
    
    if (this.tweens[target.id]._syncProps.scale){   
      let s = this.tweens[target.id].scale / Math.max(0.00001, this.tweens[target.id]._scale);
      Body.scale(target, s, s); // Apply *relative* scale
      target._scale = this.tweens[target.id].scale; // Keep this prop up to date
      this.tweens[target.id]._scale = this.tweens[target.id].scale
    }
    
    if (_onUpdate){
      _onUpdate.apply(null, _onUpdateParams);
    }
    
  }
  
  onTwComplete(target, _onComplete = null, _onCompleteParams = null){
    
    if (!target){
      return;
    }    
    let tws = gsap.getTweensOf(this.tweens[target.id]);
    let anyTweens = false;
    if (tws.length > 0){
      for (let tw of tws){ 
        let p = tw.progress();
        if (p < 1){
          anyTweens = true;
          break;
        }
      }
    }
    if (!anyTweens){
      this.killTweensOf(target);
    }
    if (_onComplete){
      _onComplete.apply(null, _onCompleteParams);
    }
    
  }
  
  killAll(){
    for (var id in this.tweens){
      gsap.killTweensOf(this.tweens[id]);
    }
    this.tweens = {};
  }
  
  killTweensOf(target){
    if (this.tweens[target.id]){
      gsap.killTweensOf(this.tweens[target.id]);
    }
    delete this.tweens[target.id];
  }
  
}

let jgsap = new Jgsap();

// Body and Composite - tracking position and scale attributes

export default { JRunner, JRender, JWireframeRender, jgsap}
    