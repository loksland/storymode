import { utils, mutils, scaler, pixiApp, htmlEle, ui} from './../storymode.js';

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
//
//
// -

// Requires:
/*
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.18.0/matter.min.js" integrity="sha512-5T245ZTH0m0RfONiFm2NF0zcYcmAuNzcGyPSQ18j8Bs5Pbfhp5HP1hosrR8XRt5M3kSRqzjNMYpm2+it/AUX/g==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
*/

/**
 * Handles translation between `Matter.js` (v0.18.0) and `PIXI` coord space.
 * <br>- See {@link  https://brm.io/matter-js/}
 * <br>- When there is syncing, PIXI display objects sync to the engine bodies.
 * <br>- Modifiers and tweens involving physics bodies are always in physics coords.
 * <br>- Bodies and their synced dispos have center registrations.
 * @namespace physics
 */

// JRunner
// -------

/**
 * Handles the link between the `PIXI` ticker and `Matter.js` time.
 * <br>- Handles the `matter.js` engine time update
 * @memberof physics
 * @example
const {..., physics} = require(`storymode`);
// Create jrender instance:
this.jrender = new physics.JRender({ptsPerMeterFactor:0.5});
this.jrunner = new physics.JRunner(this.engine, this.jrender, this.onRender.bind(this), {fixedTimestep: false});
 */
class JRunner { // } extends PIXI.utils.EventEmitter {

/**
 * Called after every `Matter.js` render.
 * @callback physics.JRunner.onRender
 * @param {number} elapsedMS - Time elapsed in milliseconds from last frame to this frame.
 */

 /**
  * JRunner config options.
  * @typedef {Object} physics.JRunner.Options
  * @property {boolean} [fixedTimestep=true] If timing is fixed, then the apparent simulation speed will change depending on the frame rate (but behaviour will be deterministic).<br>If the timing is variable, then the apparent simulation speed will be constant (approximately, but at the cost of determininism).
  * @memberOf physics.JRunner
  */

 /**
  * @param {Matter.Engine} engine - `Matter.js` engine instance.
  * @param {physics.JRender} render - `JRender` class instance.
  * @param {physics.JRunner.onRender} [renderCallback=null] - Function to be called every render, immediately after the `render.drawRender()` is called.
  * @param {physics.JRunner.Options} [options=null] - Configuration object.
  * @constructor
  */
  constructor(engine, render, renderCallback, options){

    this.engine = engine;

    /**
     * A list of `JRender` instances managed by the runner.
     * @readonly
     * @type {Array}
     */
    this.renders = Array.isArray(render) ? render : [render];
    this.renderCallback = renderCallback;

    let defaults = {
      fixedTimestep: true
    };

    options = utils.extend(defaults, options);

    //if (options.fixedTimestep && PIXI.Ticker.shared.maxFPS === 0){
    //  console.log('Physics: Limiting PIXI.Ticker.shared.maxFPS to targetFPS is reccomended for fixed time step.')
    //}

    let targetFPS = 60.0;
    this.targetDelta = 1000.0/targetFPS;
    this.deltaMin = 1000.0/targetFPS;
    this.deltaMax = 1000.0/(targetFPS * 0.5)
    this.fixedTimestep = options.fixedTimestep;

    this.deltaHistory = [];
    this.timeScalePrev = 1;
    this.ticking = false;
    this.accumulator = 0;

  }

  /**
   * Pauses the ticker.
   * @example
onDidExit(fromModal){
 super.onDidExit(fromModal);
 this.jrunner.pauseTick();
}
   */
  pauseTick(){
    this.ticking = false;
    ticker.remove(this.tickFixed, this);
    ticker.remove(this.tickVariable, this);
  }

  /**
   * Resumes the ticker.
   * @example
onWillArrive(fromModal){
 super.onWillArrive(fromModal);
 this.jrunner.resumeTick();
}
   */
  resumeTick(){
    if (this.ticking){
      return;
    }
    this.pauseTick();
    ticker.add(this.fixedTimestep ? this.tickFixed : this.tickVariable, this);
  }

  /**
   * Internal fixed timestep tick function.
   * <br>- If the frame rate slows below the target rate, more engine updates are called to compensate before calling the render.
   * <br>- See {@link https://gafferongames.com/post/fix_your_timestep/}
   */
  tickFixed(){

    this.accumulator += ticker.elapsedMS; // Time elapsed in milliseconds from last frame to this frame.;

    while ( this.accumulator >= this.targetDelta ){
        Engine.update(this.engine, this.targetDelta, 1.0);
        this.accumulator -= this.targetDelta;
        //t += dt;
    }

    // Render
    for (let i = 0; i < this.renders.length; i++){
      this.renders[i].drawRender(this.engine.world);
    }

    if (this.renderCallback){
      this.renderCallback(ticker.elapsedMS);
    }

  }

  /**
   * Internal variable timestep tick function.
   */
  tickVariable(){

    // https://pixijs.download/dev/docs/PIXI.Ticker.html
    // https://brm.io/matter-js/docs/files/src_core_Runner.js.html

    let delta = ticker.elapsedMS; // this value is neither capped nor scaled

    // optimistically filter delta over a few frames, to improve stability
    this.deltaHistory.push(delta)
    this.deltaHistory = this.deltaHistory.slice(-60); // Limit sample to 60
    delta = Math.min.apply(null, this.deltaHistory);

    // limit delta
    delta = delta < this.deltaMin ? this.deltaMin : delta;
    delta = delta > this.deltaMax ? this.deltaMax : delta;

    // correction = dt // USe this if no filtering and limiting of delta
    let correction  = delta/this.targetDelta;

    // time correction for time scaling
    if (this.timeScalePrev !== 0) {
      correction *= Math.min(3.0, this.engine.timing.timeScale / this.timeScalePrev); // Need to throttle
      //correction *= this.engine.timing.timeScale / this.timeScalePrev
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
      this.renderCallback(ticker.elapsedMS);
    }

  }

  /**
   * Clean up method, must be called manually.
   */
  dispose(){

    this.pauseTick();

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

//
//


/**
 * Handles the relationship between `PIXI` display objects and `Matter.js` physics objects and engine.
 * <br>- As a rule `PIXI` always syncs to matter.js, rather than the other way around.
 * @memberof physics
 * @example
// Create jrender instance:
this.jrender = new physics.JRender({ptsPerMeterFactor:0.5});
 */
class JRender {

  /**
   * JRender config options.
   * @typedef {Object} physics.JRender.Options
   * @property {number} [ptsPerMeterFactor=1.0] Art points to `matter.js` meters factor. This will affect how heavy / light the simulation will feel.
   * @memberOf physics.JRunner
   */

  /**
   * @param {physics.JRender.Options} [options=null] - Configuration object.
   * @constructor
   */
  constructor(options){

    let defaults = {
      ptsPerMeterFactor: 1.0
    };

    options = utils.extend(defaults, options);

    /**
     * Points to meters: Multiply by this to translate (art) pt to `matter.js` units (in meters).
     * <br>- This property is used by the conversion methods.
     * @type {number}
     * @public
     */
    this.ptm = options.ptsPerMeterFactor;

    /**
     * Meters to points: Multiply by this to translate `matter.js` units (in meters) to (art) pts.
     * <br>- This property is used by the conversion methods.
     * @type {number}
     * @public
     */
    this.mtp = 1.0/options.ptsPerMeterFactor;

    this.valueModifiers = {x:0.0,y:0.0}; // This only affects links

    /**
     * Lookup of `JSyncLink` instances.
     * <br>- Each link will be referenced by its label.
     * @type {Object}
     * @public
     */
    this.links = {};

  }

  /**
   * Static method that converts physics engine coordinate space meters measurement to PSD art pts.
   * @param {number} physMtrs - Physics engine meters.
   * @param {number} ptsPerMeterFactor - Art points to `matter.js` meters factor.
   * @returns {number} artPts - PSD art pts.
   * @private
   */
  static _physMtrsToArtPts(physMtrs, ptsPerMeterFactor){
    const mtp = 1.0/ptsPerMeterFactor;
    return mtp*physMtrs;
  }

  // Tools

  /**
   * Converts PSD art pts measurement to the physics engine coordinate space meters.
   * @param {number} artPts - PSD art pts.
   * @returns {number} physMtrs - Physics engine meters.
   */
  artPtsToPhysMtrs(artPts){
    return this.ptm*artPts;
  }

  /**
   * Converts physics engine coordinate space meters measurement to PSD art pts.
   * @param {number} physMtrs - Physics engine meters.
   * @returns {number} artPts - PSD art pts.
   */
  physMtrsToArtPts(physMtrs){
    return this.mtp*physMtrs;
  }

  /**
   * Convert screen x pt position to physics engine coordinate space meters.
   * <br>- This will take into account the offset of the projected artboard.
   * <br>- Default scaler projection assumed.
   * @param {number} screenX - Screen x position in pts (css).
   * @returns {number} physMtrsX - Physics engine meters.
   */
  screenXToPhysMtrs(screenX){
    return scaler.proj.default.transScreenX(screenX)*this.ptm;
  }

  /**
   * Convert screen y pt position to physics engine coordinate space meters.
   * <br>- This will take into account the offset of the projected artboard.
   * <br>- Default scaler projection assumed.
   * @param {number} screenY - Screen y position in pts (css).
   * @returns {number} physMtrsY - Physics engine meters.
   */
  screenYToPhysMtrs(screenY){
    return scaler.proj.default.transScreenY(screenY)*this.ptm;
  }

  /**
   * Convert screen pts (css) measurement to physics engine coordinate space meters.
   * <br>- Default scaler projection assumed.
   * @param {number} screenPts - Screen pt measurement (css).
   * @returns {number} physMtrs - Physics engine meters.
   */
  screenPtsToPhysMtrs(screenPts){
    return screenPts*(1.0/scaler.scale)*this.ptm;
  }

  /**
   * Convert physics engine coordinate space meters measurement to screen pts (css).
   * @param {number} physMtrs - Physics engine meters.
   * @returns {number} screenPts - Screen pt measurement (css).
   */
  physMtrsToScreenPts(physMtrs){
    return physMtrs*this.mtp*scaler.scale
  }

  // ---

  /**
   * A `matter.js` object defining properties to be used to create a physics body.
   * @typedef {Object} JRender.BodyDef
   * @property {number} width - Width.
   * @property {number} height - Height.
   * @property {number} cx - Center x.
   * @property {number} cy - Center y.
   * @memberOf physics
   */

  /**
   * Converts a PIXI display object to a `matter.js` body definition to be used to create a physics body.
   * @param {PIXI.DisplayObject} dispo - Display Object. Center registration is assumed.
   * @returns {JRender.BodyDef} bodyDef - Body definition.
   */
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

  /**
   * Convert `storymode` `txInfo` (or string `txPath`) to a `matter.js` body definition.
   * <br>- Will throw an error if texture path not found.
   * @param {string|Object} txInfo - Texture info path (eg. `myart.psd/mysprite`) or object.
   * @returns {JRender.BodyDef} bodyDef - Body definition.
   */
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

  /**
   * Convert PIXI.Rectangle to a `matter.js` body definition.
   * @param {PIXI.Rectangle} rectangle
   * @returns {JRender.BodyDef} bodyDef - Body definition.
   */
  rectToBodyDef(rect){
    let def = {};
    def.width = this.screenPtsToPhysMtrs(rect.width);
    def.height = this.screenPtsToPhysMtrs(rect.height);
    def.cx = this.screenXToPhysMtrs(rect.x) + def.width*0.5;
    def.cy = this.screenYToPhysMtrs(rect.y) + def.width*0.5;
    return def;
  }

  /**
   * Called by `JRunner` once every tick, after physics engine has updated.
   * <br>- Each link will be synced to the new physics engine state.
   * @param {PIXI.Rectangle} rectangle
   */
  drawRender(world){

    let link;
    let pxScale = 1.0/scaler.artboardScaleFactor;
    for (let label in this.links){
      this.applySync(label);
    }
  }

  /**
   * Syncs the link to the physics engine state.
   * @param {string} label - Label associated with link.
   * @param {boolean} [label=false] - If true will update the link regardless of its `syncEnabled` state.
   */
  applySync(label, force = false){
    const link = this.links[label];

    if (link.syncEnabled || force){
      if (link.syncProps.x){
        // Assumes dispo reg is 0.5,0.5
        link.to.x = scaler.proj.default.transArtX(this.mtp*(link.from.position.x+link.valueModifiers.x + this.valueModifiers.x)) // Convert from matter.js meters to pts
      }
      if (link.syncProps.y){
        // Assumes dispo reg is 0.5,0.5
        link.to.y = scaler.proj.default.transArtY(this.mtp*(link.from.position.y+link.valueModifiers.y + this.valueModifiers.y));
      }
      if (link.syncProps.rotation){
        link.to.rotation = link.from.angle + mutils.degToRad(link.valueModifiers.rotation);
      }
      if (link.syncProps.scale){
        // Assumes uniform density assets. Consider using: let resetingScale = dispo.txInfo.pxtopt*scaler.scale;
        let s = scaler.scale*(1.0/scaler.artboardScaleFactor)*link.from._scale*link.valueModifiers.scale;
        link.to.scale.set(s,s);
      }
      if (link.syncCallback){
        link.syncCallback(link);
      }
    }
  }

  /**
   * Returns the appropriate HMTL element to supply to the constructor of the `matter.js` Mouse.
   * @readonly
   * @type {!DOMElement}
   * @example
this.mouse = Mouse.create(this.jrender.mouseElement);
   */
  get mouseElement(){
    return pixiApp.resizeTo == window ? htmlEle : pixiApp.resizeTo; //pixiApp.resizeTo; // document.body
  }

  /**
   * Adjusts a `matter.js` mouse instance to match the current stage dimensions.
   * @param {Matter.Mouse} mouse - Mouse instance.
   */
  adjustMouseToStage(mouse){
    Mouse.setOffset(mouse, {x:this.ptm*(-scaler.proj.default.topLeft.x*(1.0/scaler.scale)), y:this.ptm*(-scaler.proj.default.topLeft.y*(1.0/scaler.scale))}); //scaler.proj.default.transArtY(0.0)
    Mouse.setScale(mouse, {x:this.ptm*(1.0/scaler.scale), y:this.ptm*(1.0/scaler.scale)})
  }

  // - Sync props: x,y,rotation(in radians),scale

 /**
  * A config object indicating which properties to sync.
  * <br>-If all syncProps are false (or not properties defined), the remaining are assumed true
  * <br>-If any sync props are true, the remaining are assumed false.
  * @typedef {Object} JRender.SyncProps
  * @property {boolean} x - Sync x position.
  * @property {boolean} y - Sync y position.
  * @property {boolean} rotation - Sync rotation.
  * @property {boolean} scale - Sync scale.
  * @memberOf physics
  */

 /**
  * Adjust the values being synced to the display object.
  * @typedef {Object} JRender.SyncValueModifiers
  * @property {number} [x=0] - X value to be added to the sync value (in physics meters).
  * @property {number} [y=0] - Y value to be added to the sync value (in physics meters).
  * @property {number} [rotatio=0] - Rotation to be added to the sync value (in radians).
  * @property {number} [scale=1.0] - Scale to be multiplied by the sync value.
  * @memberOf physics
  */

  /**
   * An optional callback fired at the end of each link sync.
   * @callback JRender.SyncCallback
   * @param {physics.JSyncLink} link - The link being synced.
   * @memberOf physics
   */

  /**
   * Creates a new `JSyncLink` and adds to the JRender's `links`.
   * @param {string} label - Label for the link.
   * @param {Matter.Body} from - Physics body (the leader).
   * @param {PIXI.DisplayObject} to - Display object (the follower).
   * @param {JRender.SyncProps} [syncProps=null] - Which properties to sync.
   * @param {JRender.SyncValueModifiers} [valueModifiers=null] - Sync value modfiers.
   * @param {JRender.SyncCallback} [syncCallback=null] - Optional function to call after each sync.
   * @returns {physics.JSyncLink} link - The newly created link object.
   */
  createSyncLink(label, from, to, syncProps = null, valueModifiers = null, syncCallback = null){

    if (!from.id || !from.type || from.type !== 'body'){
      throw new Error('Jrender: Target must be a physics body');
    }
    from._scale = typeof from._scale !== 'undefined' ? from._scale : 1.0; // Track scale

    syncProps = syncProps ? syncProps : {};

    // If all syncProps are false, the remaining are assumed true
    // If any sync props are true, the remaining are assumed false.
    let syncPropDefault = true
    for (let p in syncProps){
      if (syncProps[p] === true){
        syncPropDefault = false;
        break;
      }
    }

    syncProps = utils.extend({x:syncPropDefault,y:syncPropDefault,rotation:syncPropDefault,scale:syncPropDefault}, syncProps);
    valueModifiers = utils.extend({x:0.0,y:0.0,rotation:0.0, scale:1.0}, valueModifiers); // Note these need to be relative to metter / meters
    let link = new JSyncLink(from, to, syncProps, valueModifiers, syncCallback);
    this.links[label] = link;
    return link;

  }

  /**
   * Adds a sync link to the JRender's `links`.
   * <br>- This is automatically performed by the `createSyncLink()` method.
   * @param {string} label - Label for the link.
   * @param {physics.JSyncLink} link - The link to added.
   * @returns {physics.JSyncLink} link - The newly added link object.
   */
  addSyncLink(label, link){
    this.links[label] = link;
    return this.links[label];
  }

  /**
   * Removes a sync link from JRender's `links`.
   * @param {string} label - Label for the link.
   * @param {boolean} [dispose=true] - Whether to destroy the link.
   * @returns {physics.JSyncLink} link - The removed link.
   */
  removeSyncLink(label, dispose = true){
    if (!this.links[label]){
      return null;
    }
    const link = this.links[label]
    if (dispose){
      this.links[label].dispose();
    }
    this.links[label] = null
    delete this.links[label];
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

/**
 * Represents a relationship between a display object and a `matter.js` physics body.
 * <br>- Primarily used for storage.
 * <br>- Created, stored and managed in the `JRender` Class.
 * @memberof physics
 * @example
this.jrender.link.ball_0.autoSync = false;
this.jrender.link.ball_0.from.isStatic = true;
 */
class JSyncLink {

  /**
  * This constructor is handled by `JRender.addSyncLink()` in most cases.
  * @param {Matter.Body} from - Physics body (the leader).
  * @param {PIXI.DisplayObject} to - Display object (the follower).
  * @param {JRender.SyncProps} [syncProps=null] - Which properties to sync.
  * @param {JRender.SyncValueModifiers} [valueModifiers=null] - Sync value modfiers.
  * @param {JRender.SyncCallback} [syncCallback=null] - Optional function to call after each sync.
  * @constructor
  */
  constructor(from, to, syncProps, valueModifiers, syncCallback = null) {

    /**
     * Physics body (the leader).
     * @type {Matter.Body}
     * @public
     */
    this.from = from;

    /**
     * Display object (the follower).
     * @type {PIXI.DisplayObject}
     * @public
     */
    this.to = to;

    /**
     * Whether syncing is enabled. Default is true.
     * @type {boolean}
     * @public
     */
    this.syncEnabled = true;

    /**
     * Which properties to sync.
     * @type {JRender.SyncProps}
     * @public
     */
    this.syncProps = syncProps;

    /**
     * Sync value modfiers.
     * @type {JRender.SyncValueModifiers}
     * @public
     */
    this.valueModifiers = valueModifiers;

    /**
     * An object where any additional data can be defined for later reference.
     * @type {Object}
     * @public
     */
    this.data = {}

    /**
     * Optional function to call after each sync.
     * @type {JRender.SyncCallback}
     * @public
     */
    this.syncCallback = syncCallback;

  }

  /**
  * Manually removes data from the sync link.
  * <br>- This method is called by `JRender` when it is manually disposed.
  */
  dispose(){
    if (this.data){
      for (let p in this.data){
        this.data[p] = null;
        delete this.data[p];
      }
      this.data = null;
    }
    this.from = null;
    this.to = null;
    this.syncCallback = null;
  }
}


// JWireframeRender
// ----------------

/**
 * JWireframeRender config options. *
 * @typedef {Object} physics.JWireframeRender.Options
 * @property {number} [lineThickness=3.0] - The line thickness for the render, in screen pts (css).
 * @property {number} [ptsPerMeterFactor=1.0] - Art points to `matter.js` meters factor. Should match that of the main JRender.
 * @memberOf physics.JWireframeRender
 */


/**
 * A wireframe renderer to be used in development environments.
 * <br>- Will render bodies, springs, pins and mouse.
 * <br>- Needs to be added to the `JRunner` list of renders.
 * @extends PIXI.Graphics
 * @memberof physics
 * @example
didLoad(ev){

 // ...

 this.jrender = ...
 this.jrunner = ...
 this.mouse = ...

 if (true){
   let jwireframeRender =  new physics.JWireframeRender(this.mouse, {lineThickness:1.0, ptsPerMeterFactor: this.jrender.ptm});
   this.addChild(jwireframeRender); // Should be auto disposed on scene dispose
   this.jrunner.renders.push(jwireframeRender); // Attach to runner.render list
 }

 this.ready();

}
 */
class JWireframeRender extends PIXI.Graphics {

  /**
   * @param {Matter.Mouse} mouse - `Matter.js` mouse instance.
   * @param {physics.JWireframeRender.Options} [options=null] - Configuration object.
   * @constructor
   */
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

          if (constraint.render.type === 'spring' && false) {

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


/**
 * This class acts as a proxy for `gsap` to animate basic properties of `matter.js` bodies and composites.
 * @hideconstructor
 * @alias physics.jgsap
 * @memberof physics
 * @example
physics.jgsap.to(this.box, 2.0, {scale:0.5, x:this.jrender.screenXToPhysMtrs(this.art.ball_3.x),y:this.jrender.screenYToPhysMtrs(this.art.ball_3.y), rotation:180.0, ease:Back.easeInOut, yoyo:true, repeat:-1});
 */
class Jgsap {

  constructor(){
   this.c = 0;
   this.tweens = {};
   this.delays = {};
   this._tweenBind = this._tween.bind(this)
  }

  /**
   * Replacement for `gsap.fromTo` for targeting `Matter.js` bodies, with the same arguments.
   * @param {Matter.Body|Matter.Composite} target - The body or composite to animate.
   * @param {number} dur - Duration, in seconds.
   * @param {Object} twFrom - From gsap tween properties.
   * @param {Object} twTo - To gsap tween properties.
   */
  fromTo(target, dur, twFrom, twTo){
    this._tween(target, dur, twFrom, twTo);
  }

  /**
   * Replacement for `gsap.from` for targeting `Matter.js` bodies, with the same arguments.
   * @param {Matter.Body|Matter.Composite} target - The body or composite to animate.
   * @param {number} dur - Duration, in seconds.
   * @param {Object} tw - From gsap tween properties.
   */
  from(target, dur, tw){
    if (tw.delay && tw.delay > 0.0){
      let delay = tw.delay;
      tw.delay = 0.0;
      let delayID = this.generateID();
      let delayedCall = gsap.delayedCall(delay, this._tweenBind, [target, dur, tw, null, delayID]);
      if (!this.delays[target.id]){
        this.delays[target.id] = {};
      }
      this.delays[target.id][delayID] = delayedCall;
    } else {
      this._tween(target, dur, tw, null);
    }
  }

  /**
   * Replacement for `gsap.to` for targeting `Matter.js` bodies, with the same arguments.
   * @param {Matter.Body|Matter.Composite} target - The body or composite to animate.
   * @param {number} dur - Duration, in seconds.
   * @param {Object} tw - To gsap tween properties.
   */
  to(target, dur, tw){
    if (tw.delay && tw.delay > 0.0){
      let delay = tw.delay;
      tw.delay = 0.0;
      let delayID = this.generateID();
      let delayedCall = gsap.delayedCall(delay, this._tweenBind, [target, dur, null, tw, delayID]);
      if (!this.delays[target.id]){
        this.delays[target.id] = {};
      }
      this.delays[target.id][delayID] = delayedCall;
    } else {
      this._tween(target, dur, null, tw);
    }
  }

  /**
   * Creates a new ID for each tween.
   * @private
   */
  generateID(){
    this.c++;
    return this.c;
  }

  /**
   * Internal method that performs the tween, registering listeners to apply the changes to the physics body.
   * @private
   */
  _tween(target, dur, twFrom, twTo, delayID = null){

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

    if (delayID){
      if (this.delays[target.id][delayID]){
        this.delays[target.id][delayID].kill();
      }
      delete this.delays[target.id][delayID];
    }

    // Create a temporary prop object to tween
    if (!this.tweens[target.id]){
      this.tweens[target.id] = {};
    }

    let twProps = {};
    twProps._syncProps = {}; // Track which props to update

    let twID = this.generateID();
    this.tweens[target.id][twID] = twProps

    // Assign callbacks
    let _tw = (cmd === 'fromTo') ? twTo : tw;
    _tw.onUpdateParams = [target, twID, _tw.onUpdate, _tw.onUpdateParams]
    _tw.onUpdate = this.onTwUpdate.bind(this);
    _tw.onCompleteParams = [target, twID, _tw.onComplete, _tw.onCompleteParams]
    _tw.onComplete = this.onTwComplete.bind(this);

    // Record starting value
    if (cmd === 'fromTo'){

      if (target.type == 'composite'){
        throw new Error('jsap: Composite tweens can only be relative');
      }

      // Set starting values

      if ('x' in twFrom){
        twProps._syncProps.x = true;
        twProps.x = twFrom.x
      }
      if ('y' in twFrom){
        twProps._syncProps.y = true;
        ttwProps.y = twFrom.y
      }

      if ('rotation' in twFrom){
        twProps._syncProps.rotation = true;
        twFrom.rotation = mutils.degToRad(twFrom.rotation);
        twTo.rotation = mutils.degToRad(twTo.rotation);
        twProps.rotation = twFrom.rotation;
      }

      gsap.fromTo(twProps, dur, twFrom, twTo);

    } else {

      // Set starting values - only when tween starts
      if ('x' in tw){
        twProps._syncProps.x = true;
        if (target.type == 'composite'){
          twProps.x = 0.0
          twProps._x = 0.0
        } else {
          twProps.x = target.position.x;
        }
      }

      if ('y' in tw){
        twProps._syncProps.y = true;
        if (target.type == 'composite'){
          twProps.y = 0.0
          twProps._y = 0.0
        } else {
          twProps.y = target.position.y;
        }
      }

      if ('rotation' in tw){
        twProps._syncProps.rotation = true;
        if (target.type == 'composite'){
          if (tw._rotationOrigin){
            let _rotationOrigin = tw._rotationOrigin;
            delete tw._rotationOrigin;
            twProps._rotationOrigin = _rotationOrigin;
          } else {
            twProps._rotationOrigin = {x:0.0,y:0.0}
          }
          twProps.rotation = 0.0;
          twProps._rotation = 0.0; // Previous value
        } else {
          twProps.rotation = target.angle;
        }
        tw.rotation = mutils.degToRad(tw.rotation); // Convert from degs to radians
      }

      if ('scale' in tw){

        twProps._syncProps.scale = true;
        target._scale = typeof target._scale !== 'undefined' ? target._scale : 1.0; // Track scale
        twProps.scale = target._scale;
        twProps._scale = twProps.scale;

        if (target.type == 'composite'){
          if (tw._scaleOrigin){
            let _scaleOrigin = tw._scaleOrigin;
            delete tw._scaleOrigin;
            twProps._scaleOrigin = _scaleOrigin;
          } else {
            twProps._scaleOrigin = {x:0.0,y:0.0}
          }
          twProps._compBodies = Matter.Composite.allBodies(target); // Store these bodies
          for (let b of twProps._compBodies){
            b._scale = typeof b._scale !== 'undefined' ? b._scale : 1.0; // Track scale
          }
        }


      }

      gsap[cmd](twProps, dur, tw);

    }
  }


  /**
   * Internal method receiving update events.
   * @private
   */
  onTwUpdate(target, twID, _onUpdate = null, _onUpdateParams = null){

    let twProps = this.tweens[target.id][twID];

    if (twProps._syncProps.x || twProps._syncProps.y){

      if (target.type == 'composite'){

        Composite.translate(target, {
          x: twProps._syncProps.x ? twProps.x-twProps._x : 0.0,
          y: twProps._syncProps.y ? twProps.y-twProps._y : 0.0,
        }, false);

        // Store previous values;
        if (twProps._syncProps.x){
          twProps._x = twProps.x;
        }
        if (twProps._syncProps.y){
          twProps._y = twProps.y;
        }

      } else {

        let _x = twProps._syncProps.x ? twProps.x : target.position.x;
        let _y = twProps._syncProps.y ? twProps.y : target.position.y;
        Body.setPosition(target, {x:_x, y:_y});

      }
    }

    if (twProps._syncProps.rotation){
      if (target.type == 'composite'){
        Matter.Composite.rotate(target, twProps.rotation-twProps._rotation, twProps._scaleOrigin);
        twProps._rotation = twProps.rotation;
      } else {
        Body.setAngle(target, twProps.rotation);
      }
    }

    if (twProps._syncProps.scale){
      let s = twProps.scale / Math.max(0.00001, twProps._scale);
      if (target.type == 'composite'){
        Matter.Composite.scale(target, s, s, twProps._scaleOrigin);
        for (let b of twProps._compBodies){
          b._scale = twProps._scale; // Track scale
        }
      } else {
        Body.scale(target, s, s); // Apply *relative* scale
      }

      target._scale = twProps.scale; // Keep this prop up to date
      twProps._scale = twProps.scale
    }

    if (_onUpdate){
      _onUpdate.apply(null, _onUpdateParams);
    }

  }

  /**
   * Internal method receiving complete events.
   * @private
   */
  onTwComplete(target, twID, _onComplete = null, _onCompleteParams = null){

    if (!target){
      return;
    }

    // Remove reference to this tween
    if (this.tweens[target.id][twID]._compBodies){
      this.tweens[target.id][twID]._compBodies = null;
      delete this.tweens[target.id][twID]._compBodies
    }
    delete this.tweens[target.id][twID];

    let anyTweens = (this.tweens[target.id] && Object.keys(this.tweens[target.id]).length > 0) || (this.delays[target.id] && Object.keys(this.delays[target.id]).length > 0); // Delays may not have ref to target if it never had a delay
    if (!anyTweens){
      this.killTweensOf(target); // Kill all associated with physics body
    }

    if (_onComplete){
      _onComplete.apply(null, _onCompleteParams);
    }

  }

  /**
   * Removes all pending and current animations and delayed calls.
   */
  killAll(){
    gsap.killTweensOf(this._tweenBind); // Removes all pending delayed calls
    for (var targetID in this.tweens){
      for (let twID in this.tweens[targetID]){
        if (this.tweens[targetID][twID]._compBodies){
          this.tweens[targetID][twID]._compBodies = null;
          delete this.tweens[targetID][twID]._compBodies
        }
        gsap.killTweensOf(this.tweens[targetID][twID]);
      }
    }
    this.tweens = {};
  }

  /**
   * Removes all pending and current animations and delayed calls for the given physics body or composite.
   * @param {Matter.Body|Matter.Composite} target - The body or composite to target.
   */
  killTweensOf(target){

    if (this.delays[target.id]){
      for (let delayID in this.delays[target.id]){
        this.delays[target.id][delayID].kill();
      }
    }
    delete this.delays[target.id];

    if (this.tweens[target.id]){
      for (let twID in this.tweens[target.id]){
        if (this.tweens[target.id][twID]._compBodies){
          this.tweens[target.id][twID]._compBodies = null;
          delete this.tweens[target.id][twID]._compBodies
        }
        gsap.killTweensOf(this.tweens[target.id][twID]);
      }
    }
    delete this.tweens[target.id];
  }

}

let jgsap = new Jgsap();

// Body and Composite - tracking position and scale attributes

export default { JRunner, JRender, JWireframeRender, jgsap}
