import { utils, scaler, pixiApp, htmlEle } from './../storymode.js';

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
// - Utilizes a JLink class to represent this relationship

class JRender {
  
  constructor(options){
    
    let defaults = {
      ptsPerMeterFactor: 1.0
      // wireframeEnabled: false
    };
    
    options = utils.extend(defaults, options);
    
    this.ptm = options.ptsPerMeterFactor; // points to meter: Multiply by this to translate (art) pt to matter.js units (in meters)
    this.mtp = 1.0/options.ptsPerMeterFactor; // meters to points: Multiply by this to translate matter.js units (in meters) to (art) pts
    
    this.links = {};
    this.subRenders = [];
    
  }
  
  addCircle(dispo, options = null){
    
    return this._addBody('circle', dispo, options);
    
  }
  
  addRect(dispo, options = null){
    
    return this._addBody('rect', dispo, options);
    
  }
  
  _addBody(type, dispo, options = null){
    
    if (this.links[dispo.name]){
      throw new Error('JRender: Duplicate display object name encountered.')
    }
    
    options = !options ? {} : options;
    if (!options.label){
      options.label = dispo.name;
    }
    
    let tlX = dispo.txInfo.x - dispo.txInfo.width*dispo.txInfo.regPercX;
    let tlY = dispo.txInfo.y - dispo.txInfo.height*dispo.txInfo.regPercY;
    
    let cX = tlX + dispo.txInfo.width*0.5;
    let cY = tlY + dispo.txInfo.height*0.5;
    
    let body;
    
    if (type == 'circle'){    
      body = Bodies.circle(this.ptm*(cX), this.ptm*(cY), this.ptm*(Math.max(dispo.txInfo.width, dispo.txInfo.height)*0.5), options);  // {restitution:0.9, friction: 0.7, label:dispo.name}
    } else if (type == 'rect'){
      body = Bodies.rectangle(this.ptm*(cX), this.ptm*(cY), this.ptm*(dispo.txInfo.width), this.ptm*(dispo.txInfo.height), options)
    }
    
    this.links[dispo.name] = new JLink(dispo, body, this.ptm, this.mtp);
    
    return body;
    
  }
  
  linkFor(nameDispoOrBody){
    
    if (typeof nameDispoOrBody == 'string'){
      return this.links[nameDispoOrBody]
    } else if (dispoOrBody instanceof PIXI.DisplayObject){
      return this.links[nameDispoOrBody.name]
    }
    return this.links[nameDispoOrBody.label]
    
  }
  
  drawRender(world){
    
    for (let label in this.links){
      this.links[label].sync();
    }
    
  }
  
  get mouseElement(){
    return pixiApp.resizeTo == window ? htmlEle : pixiApp.resizeTo; //pixiApp.resizeTo; // document.body
  }
  
  adjustMouseToStage(mouse){
    
    Mouse.setOffset(mouse, {x:this.ptm*(-scaler.proj.default.topLeft.x*(1.0/scaler.scaleFactor)), y:this.ptm*(-scaler.proj.default.topLeft.y*(1.0/scaler.scaleFactor))}); //scaler.proj.default.transArtY(0.0)
    Mouse.setScale(mouse, {x:this.ptm*(1.0/scaler.scaleFactor), y:this.ptm*(1.0/scaler.scaleFactor)})
    
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

// Represents a display object and matter object relationship.

class JLink {
  
  constructor(dispo, body, ptm, mtp){
    
    this.dispo = dispo; // Pixi dislay object
    this.body = body; // Matter body
    
    this.autoSync = true;
    
    this.ptm = ptm;
    this.mtp = mtp;
    
    this.syncProps = {x:true, y:true, rotation:true}; // Usage: jrender.linkFor(mySprite).syncProps.rotation = false;
    
  }
  
  sync(){
    
    if (this.autoSync){
      
      this.syncToBody();
      
    }
    
  }
  
  syncToBody(){
    
    if (this.syncProps.x){
      // Assumes dispo reg is 0.5,0.5
      // was scaler.proj[this.dispo.txInfo.projID]
      this.dispo.x = scaler.proj.default.transArtX(this.mtp*this.body.position.x); // Convert from matter.js meters to pts
    }
    
    if (this.syncProps.y){
      // Assumes dispo reg is 0.5,0.5
      this.dispo.y = scaler.proj.default.transArtY(this.mtp*this.body.position.y); 
    }
    
    if (this.syncProps.rotation){
      this.dispo.rotation = this.body.angle;
    }
    
  }
  
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
    
  }
  
  dispose(){
    
    this.dispo = null; // Pixi dislay object
    this.body = null;
    
  }
  
}

// JWireframeRender
// ----------------

// A wireframe renderer for storymode

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

    this.scale.set(scaler.scaleFactor*this.mtp);
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

/*
Mouse.prototype.updateToStageDimensions = function(){
  Mouse.setOffset(this, {x:-scaler.proj.default.transArtX(0.0)*(1.0/scaler.scaleFactor), y:-scaler.proj.default.transArtY(0.0)*(1.0/scaler.scaleFactor)}); 
  Mouse.setScale(this, {x:1.0/scaler.scaleFactor, y:1.0/scaler.scaleFactor})
}
*/

export default { JRunner, JRender, JWireframeRender }
    