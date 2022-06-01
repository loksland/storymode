import { utils, nav, store } from './../storymode.js';

// Sound Effect class
// ------------------

// Requires:
// - bin/js/pixi-sound.js
// - bin/js/pixi-sound.js.map (optional)

// USAGE:
// if (!sfx.ready){
//   sfx.on('ready', this.onready, this)
// } else {
//   onready();
// }
// // ...
// onready(){
//   sfx.off('ready', this.onready, this)
// }

const DEFAULT_SFX_ENABLED = true;
const DEFAULT_BGLOOP_ENABLED = true;

/**
 * Sound and audio manager utilising the PixiJS Sound plugin.
 * <br>Docs: <a href="https://pixijs.io/sound/docs/index.html" >https://pixijs.io/sound/docs/index.html</a>
 * <br>- If no audio assets are queued in the project then this script will not be requested and is not needed.
 * <br>- If the PIXI Sound script is not already loaded by the HTML, it will be loaded on first user interaction with the document from the following file path: 
 * <br>- `(build0)/js/pixi-sound.js`
 * @extends PIXI.utils.EventEmitter
 * @hideconstructor
 * @example
// app.js 
sfx.bgLoopVolume = 0.6; // Set bg audio volume factor.
sfx.volume = 0.8; // Global volume factor.
sfx.waitForInteractionToLoad = false; // Will load immediately when able after initial assets and scene are ready.
sfx.setBgLoop('bg_loop'); // Assign bg loop.
sfx.enqueueBgResources({bg_loop_parent: {path: 'audio/bg_loop.mp3', sprites: {bg_loop: {start:0.5, end:4.5}}); // A bg audio as sprite to assist looping.
createApp(...)

// sampleScene.js
const {sfx} = require(`storymode`);
export default class MyClass extends Scene {
    static getSfxResources(){
      return {
        ding: 'sfx/ding.mp3',
        dong: {path: 'sfx/dong.mp3'}, // Optional path property
        mastertrack: {path:'sfx/master-track.mp3', sprites:{ // Optionally define sprites
          explosion: {start:0.5, end:1.0},          
          success_bling: {start:1.0, end: 2.0}
        }},
        _fireloop: {path:'audio/fire.mp3', sprites:{
          fireloop: {start:0.2, end:2.8, loop:true}, // Looping
        }},
        ouch: {multi:true, total:3, prefix:'_ouch_', random:true, rezero:false}, // Create a multi sound that will step through members each subsequent call
        _ouch_0: {path:'sfx/ouch_0.mp3'},
        _ouch_1: {path:'sfx/ouch_1.mp3'},
        _ouch_2: {path:'sfx/ouch_2.mp3'},
      };            
    }
    // ...
    sfx.playSFX('ding');
    sfx.playSFX('explosion'); // Play sprite
  }
}
 */
class SFX extends PIXI.utils.EventEmitter {
  
  /**
   * Creates a new SFX module.
   * <br>This instance is created by `storymode` during startup. 
   * @constructor
   */
  constructor(){  
    
    super();
    
    this._sfxready = false;
    this._bgready = false;
    
    this._bgResources = null;
    this._enableLoadCalled = false;
    
    this._sfxVolume = 1.0;
    this._bgLoopVolume = 1.0;
    this._volume = 1.0;
    
    this.resources = {};
    this.bgLoopSlug = null;
  
    this._sfxEnabled = false;
    this._bgLoopEnabled = false;
    
    this._waitForInteractionToLoad = true;
    
    this._useSfxStateForBg = false;
    
  }
  
  // Called after store has chance to be configured
  
  loadPrefs(){

    let _sfxEnabled = store.load('sfx.sfxEnabled')
    this._sfxEnabled = _sfxEnabled === null ? DEFAULT_SFX_ENABLED : _sfxEnabled === '1';

    let _bgLoopEnabled = store.load('sfx.bgLoopEnabled')
    this._bgLoopEnabled = _bgLoopEnabled === null ? DEFAULT_BGLOOP_ENABLED : _bgLoopEnabled === '1';
  
    this.syncBgState();
    
  }
  
  /**
   * Will be `true` when the sound engine and registered audio assets are all loaded and ready to play.
   * <br>This will be set to true before background audio assets are loaded.
   * @readonly
   * @type {!boolean}
   */
  get sfxready(){
    return this._sfxready;
  }
  
  /**
   * Will be `true` when the background audio assets queued by `sfx.enqueueBgResources()` are loaded.
   * @readonly
   * @type {!boolean}
   */
  get bgready(){
    return this._bgready;
  }
  
  /**
   * Whether sound effects are enabled. 
   * @type {boolean}
   */
  get sfxEnabled(){
    return this._sfxEnabled;
  }
  
  set sfxEnabled(enabled){
    if (enabled === this._sfxEnabled){
      return;
    }    
    this.toggleSfxEnabled();
  }
  
  /**
   * Whether background audio is enabled. 
   * @type {boolean}
   */
  get bgLoopEnabled(){
    return this._bgLoopEnabled;
  }
  
  set bgLoopEnabled(enabled){
    if (enabled === this._bgLoopEnabled){
      return;
    }
    this.toggleBgLoopEnabled();
  }
  
  /**
   * If `true` then will piggy back bg loop enabled to auto update to always follow sfx volume. 
   * @type {boolean}
   */
  set useSfxStateForBg(_useSfxStateForBg){
    this._useSfxStateForBg = _useSfxStateForBg;
    this.syncBgState();
  }
  
  /**
   * If `useSfxStateForBg` is set to `true` will update `bgLoopEnabled` to match `_sfxEnabled`
   * @private
   */
  syncBgState(){
    if (this._useSfxStateForBg){
      this.bgLoopEnabled = this._sfxEnabled;
    }
  }
  
  /**
   * Toggle sound effect enabled state.
   */
  toggleSfxEnabled(){
    
    this._sfxEnabled = !this._sfxEnabled;
    store.save('sfx.sfxEnabled', this._sfxEnabled ? '1' : '0')   
    
    /**
     * Called when sound effects enabled state changes.
     * @event SFX#sfx_enabled_change
     */
    this.emit('sfx_enabled_change');
    this.syncBgState();
    
  }
  
  /**
   * Toggle background audio enabled state.
   */
  toggleBgLoopEnabled(){
    
    this._bgLoopEnabled = !this._bgLoopEnabled;
    store.save('sfx.bgLoopEnabled', this._bgLoopEnabled ? '1' : '0')
    if (this._bgLoopEnabled){
      this._resumeBgLoop();
    } else {
      this._stopBgLoop();
    }
    
    /**
     * Called when bg loop enabled state changes.
     * @event SFX#bgloop_enabled_change
     */
    this.emit('bgloop_enabled_change');
    
  }
  
  // Volume
  // ------
  
  /**
   * The sfx volume level from 0.0 to 1.0.
   * @type {number}
   */
  get sfxVolume(){
    return this._sfxVolume;
  }
  set sfxVolume(volume){
    this._sfxVolume = volume;
  }
  
  /**
   * The background volume level from 0.0 to 1.0.
   * @type {number}
   */
  get bgLoopVolume(){
    return this._bgLoopVolume;
  }
  set bgLoopVolume(volume){
    this._bgLoopVolume = volume;
    this.updateBgLoopVolume();
  }

  /**
   * Global volume factor.
   * @type {number}
   */
  get volume(){
    return this._volume;
  }
  set volume(volume){
    this._volume = volume;
    this.updateBgLoopVolume();
  }
  

  /**
   * Optionally call this method to queue global background audio resources.
   * <br>- These assets will be loaded after all other assets are loaded and ready to use.
   * <br>- Should be called before or during `storymode.createApp()` callback.
   * @param {Object} bgResources - Global resources to load. Eg. `{ding: 'sfx/ding.mp3', dong: 'sfx/dong.mp3'}`.
   * @example
// app.js
sfx.waitForInteractionToLoad = false;
sfx.setBgLoop('cello'); // Will be played when ready
sfx.enqueueBgResources({cello: 'audio/cello.mp3'}); 
createApp(...)

// Alternatively use a sprite for smoother looping:

// app.js
sfx.setBgLoop('spriteloop'); 
sfx.enqueueBgResources({bg_loop: 'audio/bg_loop.mp3',
bg_loop_sprite: {path:'audio/my-music.mp3', sprites:{
 spriteloop: {start:0.1, end:4.9},
}}}); 
   */
  enqueueBgResources(bgResources){
    this._bgResources = bgResources;
  }
  
  // If `false` then will load immediately when able, rather than waiting for user to interact with the DOM
  // Must be caled before or during storymode.createApp callback
  
  /**
   * If `false` then will load immediately when able, rather than waiting for user to interact with the DOM. Should be called before or during `storymode.createApp()` callback.
   * @type {boolean}  
   */
  set waitForInteractionToLoad(_waitForInteractionToLoad){
    this._waitForInteractionToLoad = _waitForInteractionToLoad;
  }
  
  get waitForInteractionToLoad(){
    return this._waitForInteractionToLoad
  }
  
  /**
   * Called by `storymode` after initial load. Indicates that audio can commence loading.
   * @private
   */
  _enableLoad(){
    
    // Ensure this method is only call once
    if (this._enableLoadCalled){
      return;
    }
    this._enableLoadCalled = true;
    
    // Check if any resources are loaded 
    if ((this._bgResources && Object.keys(this._bgResources).length > 0) || this.anySfxResources()){
      if (this._waitForInteractionToLoad){
        // Wait for interaction then load sound
        let pointerupFn = () => {
          document.removeEventListener('pointerup', pointerupFn);
          this.beginLoad();
        }
        document.addEventListener('pointerup', pointerupFn);
      } else {
        this.beginLoad();
      }
    }
  }
  
  /**
   * Scans scenes fror registered sfx resources and returns `true` if any were found.
   * @returns {boolean} resourcesFound 
   * @private
   */
  anySfxResources(){
    
    for (let _sceneid in nav.scenes){
      let _r = nav.scenes[_sceneid].class.getSfxResources();
      if (_r){        
        if (Object.keys(_r).length > 0){
          return true;
        }
      }
    }
    
    return false;
    
  }
  
  // First the script must be loaded - if not already
  
  /**
   * Begin the loading of queued resources.
   * <br>Ensures that `pixi-sound.js` is loaded before continuing. 
   * @private
   */
  beginLoad(){
    if (PIXI.sound){
      this.onScriptLoaded();
    } else {
      utils.loadScript('js/vendor/pixi-sound.js', this.onScriptLoaded.bind(this))
    }
  }
  
  /**
   * Commence resource loading, after pixi sound JS is loaded.
   * @private
   */  
  onScriptLoaded(){

    // PIXI.sound.Sound.volumeAll(0.5);
    
    // Set global volume
    // PIXI.sound.volumeAll = 0.1;
    
    // Load all resources registered with static scene method: `getSfxResources()`
    
    this._loader = new PIXI.Loader();
    this.spritesByParentSound = {};
    this.parentSoundBySprite = {};
    this.multis = {};
    this.concurrentTracking = {};
    this.loopSfx = {};
    let _resources = {};
    
    for (let _sceneid in nav.scenes){
      let _r = nav.scenes[_sceneid].class.getSfxResources();
      if (_r){
        
        for (let _soundID in _r){
          if (_resources[_soundID]){  
            if (_r[_soundID] !== _resources[_soundID]){ // Identical queued; ignore
              throw new Error('SFX: Duplicate resource identifier: `'+_soundID+'`');
            }
          } else {            
            // Optionally set concurrent to limit how many of this sfx (or multi) can play concurrently
            if (_r[_soundID].multi){
              // Multi sounds are lists of other sounds 
              // - Each time they are called they step through their list 
              // - They have the option to be randomised
              let m = {};     
              if (_r[_soundID].prefix && _r[_soundID].total){
                m.ids = [];
                for (let j = 0; j < _r[_soundID].total; j++){
                  m.ids.push(_r[_soundID].prefix + String(j));
                }
              } else if (_r[_soundID].ids){
                m.ids = _r[_soundID].ids              
              } else {
                throw new Error('SFX: Misconfigured multisound');
              }
              m.random =  _r[_soundID].random ? true : false; // Items will be shuffled on start and every manual reset
              m.rezero =  _r[_soundID].rezero === false ? false : true; // Whether to go back to index 0 automatically or stay on last index        
              m._orig_ids = m.ids.slice();
              
              this.multis[_soundID] = m;
              if (_r[_soundID].concurrent && _r[_soundID].concurrent > 0){
                this.concurrentTracking[_soundID] = {concurrent: _r[_soundID].concurrent, _playcount:0};
              }      
              if (_r[_soundID].loop){
                throw new Error('SFX: Multi sounds don\'t support `loop` ('+_soundID+').');
              }
              
              this.resetMulti(_soundID, true);
            } else {
              const path = _r[_soundID].path ? _r[_soundID].path : _r[_soundID];       
              if (_r[_soundID].sprites){
                if (_r[_soundID].concurrent){
                  throw new Error('SFX: Sprite parents don\'t support `concurrent` ('+_soundID+').');
                }
                if (_r[_soundID].loop){
                  throw new Error('SFX: Sprite parents don\'t support `loop` ('+_soundID+').');
                }
                this.spritesByParentSound[_soundID] = _r[_soundID].sprites;
                for (let _spriteID in _r[_soundID].sprites){
                  // Individual spriute
                  this.parentSoundBySprite[_spriteID] = _soundID;
                  if (_r[_soundID].sprites[_spriteID].concurrent && _r[_soundID].sprites[_spriteID].concurrent > 0){
                    this.concurrentTracking[_spriteID] = {concurrent: _r[_soundID].sprites[_spriteID].concurrent, _playcount:0};
                    delete _r[_soundID].sprites[_spriteID].concurrent; // Remove any props except start/end
                  }
                  if (_r[_soundID].sprites[_spriteID].loop){
                    this.loopSfx[_spriteID] = true;
                    delete _r[_soundID].sprites[_spriteID].loop; // Remove any props except start/end
                  }                  
                }
              } else { // Non sprite sound effect
                if (_r[_soundID].concurrent && _r[_soundID].concurrent > 0){
                  this.concurrentTracking[_soundID] = {concurrent: _r[_soundID].concurrent, _playcount:0};
                }
                if (_r[_soundID].loop){
                  this.loopSfx[_soundID] = true;
                } 
              }      
              _resources[_soundID] = path;        
            } 
          }
        }
      }
    }
    
    let anySfx = false;
    for (let _soundID in _resources){
      anySfx = true;
      this._loader.add(_soundID, _resources[_soundID]); 
    }
    
    if (anySfx){
      this._loader.load(this.onResourcesLoaded.bind(this));
    } else {
      this.onResourcesLoaded(this._loader, {});
    }
  
  }
  
  /**
   * Resets the counter associated with the multisound to zero, if random is set to true will shuffle its members.
   * @param {string} soundID - The multi sound identifier.
   */  
  resetMulti(soundID, force = false, enableRandom = true){
    if (!force && (!this._sfxready || !this._sfxEnabled || !this.multis || !this.multis[soundID])){
      return;
    }
    this.multis[soundID]._index = -1;
    if (!enableRandom){      
      this.multis[soundID].ids = this.multis[soundID]._orig_ids.slice(); // Restore original order
    } else if (this.multis[soundID].random){
      this.multis[soundID].ids = utils.shuffle(this.multis[soundID].ids);
    }
  }
  
  /**
   * Gets the current counter index for the given multisound. 
   * @param {string} soundID - The multi sound identifier.
   * @returns {int} counter - The multi sound counter (zero-indexed).
   */  
  getMultiCounter(soundID){
    if (!this._sfxready || !this._sfxEnabled || !this.multis || !this.multis[soundID]){
      return -1;
    }
    return this.multis[soundID]._index;
  }
  
  /**
   * Gets the total individual sounds for the given multisound. 
   * @param {string} soundID - The multi sound identifier.
   * @returns {int} total 
   */  
  getMultiTotal(soundID){
    if (!this._sfxready || !this._sfxEnabled || !this.multis || !this.multis[soundID]){
      return -1;
    }
    return this.multis[soundID].ids.length
  }
  
  /**
   * Sets whether the given multisound should rezero after getting to the last sound in the sequence.
   * @param {string} soundID - The multi sound identifier.
   * @param {boolean} rezero - Whether to go back to zero or stay on last sound.
   */  
  setMultiRezero(soundID, rezero){
    if (!this._sfxready || !this._sfxEnabled || !this.multis || !this.multis[soundID]){
      return -1;
    }
    return this.multis[soundID].rezero = rezero;
  }
  
  /**
   * Called after sfx assets are loaded and ready to play.
   * <br>- SFX will be playable after this method is called.
   * @param {PIXI.Loader} loader - The loader instance.
   * @param {Object} resources - Loaded sfx audio assets.
   * @private
   */  
  onResourcesLoaded(loader, resources){
    
    this._loader = null;
    this.resources = resources;
    this._sfxready = true;
    
    // Add sprites to any loaded SFX sounds
    for (let _soundID in this.spritesByParentSound){
      if (this.resources[_soundID] && this.resources[_soundID].sound){
        this.resources[_soundID].sound.addSprites(this.spritesByParentSound[_soundID]);
      } 
    }
    // Configure all sounds
    for (let _soundID in this.resources){
      this.resources[_soundID].sound.loop = false;
      this.resources[_soundID].sound.singleInstance = false;
    }
    delete this.spritesByParentSound;
    
    //delete this.spritesByParentSound[_soundID]; // No longer needed
    /**
     * Called when audio library and audio files are loaded, though background files may still be downloading.
     * @event SFX#sfxready
     * @example 
if (!sfx.sfxready){
 sfx.on('sfxready', this.onSfxReady, this)
} else {
 onSfxReady();
}

onSfxReady() {
 sfx.off('sfxready', this.onSfxReady, this)
}
     */
    this.emit('sfxready');
    
    // SFX can now be played. Load the background next.
    this.loadBgResources();
    
  }
  
  /**
   * Begin the load of background (low priority) resournces.
   * @private
   */  
  loadBgResources(){

    if (this._bgResources){
      
      this.spritesByParentSound = {};
      
      this._loader = new PIXI.Loader();
      
      for (let _soundID in this._bgResources){
        const path = this._bgResources[_soundID].path ? this._bgResources[_soundID].path : this._bgResources[_soundID];           
        
        if (this._bgResources[_soundID].sprites){
          // Save the sprites to apply to the sound after it has loaded
          this.spritesByParentSound[_soundID] = this._bgResources[_soundID].sprites;
          for (let _spriteID in this._bgResources[_soundID].sprites){
            // Individual spriute
            this._bgResources[_soundID].sprites[_spriteID].loop = true
            this.parentSoundBySprite[_spriteID] = _soundID;
          }
        }
        
        this._loader.add(_soundID, path); 
      }
      
      this._loader.load(this.onBgResourcesLoaded.bind(this));
      
    }
    
  }
  
  
  /**
   * Called after background assets are loaded and ready to play.
   * <br>- Bg sounds will be playable after this method is called.
   * @param {PIXI.Loader} loader - The loader instance.
   * @param {Object} resources - Loaded bg audio assets.
   * @private
   */  
  onBgResourcesLoaded(loader, resources){
    
    if (resources){
      // Add sprites to any loaded bg sounds
      for (let _soundID in this.spritesByParentSound){
        if (resources[_soundID] && resources[_soundID].sound){
          resources[_soundID].sound.addSprites(this.spritesByParentSound[_soundID]);
        } 
      }
    } 
    
    delete this.spritesByParentSound;
    
    this._loader = null;
    this.resources = utils.extend(this.resources, resources); 
    this._bgready = true;
    
    /**
     * Called when background audio files are loaded, this will be after all other audio files queued by scenes.
     * @event SFX#bgready
     * @example 
if (!sfx.bgready){
 sfx.on('bgready', this.onBgReady, this)
} else {
 onBgReady();
}

onBgReady() {
 sfx.off('bgready', this.onBgReady, this)
}
     */
    this.emit('bgready');
    
    this._bgResources = null;

    if (this._pendingBgLoopSlug){
      const tmpPendingBgLoopSlug = this._pendingBgLoopSlug;
      this._pendingBgLoopSlug = null;
      this.setBgLoop(tmpPendingBgLoopSlug);
    }
    
  }
  
  /**
   * Stop all sound playback.
   */  
  stopAll(){
    
    if (!this._sfxready){
      return;
    }
    
    PIXI.sound.stopAll();
    
  }
  

  
  /**
   * Register a mixer object to affect volume factor of specified sounds.
   * <br>Set to null to remove.
   * <br>Supports simple prefix glob patterns in the format of `mysound_*`.
   * @param {Object} [mixerObj=null] - The configuration object. Eg. {sound_effect_1: 1.0, sound_effect_2:1.0, vo_*:1.0}.
   */  
  registerMixer(mixerObj){
    this.mixerObj = mixerObj;    
    // Make a look up for glob patterns. Eg. `mysound_*`
    this.mixerObjGlobs = [];
    this.mixerObjGlobFirstChar = '';    
    if (this.mixerObj){
      for (let soundID in this.mixerObj){
        if (soundID.split('*').length > 1){
          if (!this.mixerObjGlobFirstChar.includes(soundID.charAt(0))){
            this.mixerObjGlobFirstChar+=soundID.charAt(0)
          }
          this.mixerObjGlobs.push(soundID);
        }
      }
    }
  }
  


  /**
   * Called after initial assets are loaded.
   *
   * @typedef {Object} SFX.PlaybackOptions
   * @property {number} [delay=0] Delay before playback, in seconds.
   * @property {volume} [volume=1.0] Volume multiplier.
   * @memberOf SFX
   */

  /**
   * Plays requested audio resource.
   * @param {string} soundID - The multi sound identifier.
   * @param {SFX.PlaybackOptions|number} options - Playback options, if a number then will be set as the delay value.
   */  
  playSFX(soundID, options = null, _concurrentSoundID = null){
    
    if (!this._sfxready || !this._sfxEnabled){
      return;
    }
    
    // Defaults - Can be supplied as option params
    let delay = -1;
    let volume = 1.0;
    
    if (typeof options === 'number'){
      delay = options; // Assume number is delay;
      options = null;
    }  else if (options && typeof options === 'object'){   
      if (typeof options.volume === 'number'){
        volume = options.volume;
      }
      if (typeof options.delay === 'number'){
        delay = options.delay;
        delete options.delay; // Remove delay as it will be applied now
      }
    }
    
    if (delay > 0.0){
      utils.wait(this, delay, this.playSFX, [soundID, options]);
      return;
    }
    
    if (this.mixerObj) {
      
      let mixerFactor = 1.0;
      if (typeof this.mixerObj[soundID] !== 'undefined'){
        mixerFactor = this.mixerObj[soundID];
      } else if (this.mixerObjGlobs.length > 0 && this.mixerObjGlobFirstChar.includes(soundID.charAt(0))){ // Check if first char is registered as a glob
        // Check if glob if not exact match
        for (let mixerGlob of this.mixerObjGlobs){
          if (utils.globMatch(soundID, mixerGlob)){
            mixerFactor = this.mixerObj[mixerGlob];
            break;
          }
        }
      }
      
      if (mixerFactor !== 1.0){  
        volume *= mixerFactor;
        // Apply volume to options, create options if it doens't exist
        // This is so a multi sound will have it's parent mixer volume
        if (options && typeof options === 'object'){   
          options.volume = volume;
        } else {
          options = {volume:volume}
        }
      }
    }
    
    // Concurrent limits (per sound - not multi)
    let concurrentLimit = -1;       
    let multiCall = _concurrentSoundID ? true : false;

    let concurrentSoundID = _concurrentSoundID ? _concurrentSoundID : soundID;
    if (this.concurrentTracking[concurrentSoundID]){
      concurrentLimit = this.concurrentTracking[concurrentSoundID].concurrent;  
    }
    
    if (this.multis[soundID]){ 
      
      // Multi 
      
      if (concurrentLimit > 0){ // Check if over limit so index doesn't have to tick uncessecarily
        if (this.concurrentTracking[concurrentSoundID]._playcount == concurrentLimit){
          return;
        }
      }
      
      this.multis[soundID]._index++;
      if (this.multis[soundID]._index >= this.multis[soundID].ids.length){
        if (this.multis[soundID].rezero){
          this.multis[soundID]._index = 0;
        } else {
          this.multis[soundID]._index = this.multis[soundID].ids.length-1;
        }
      }
      this.playSFX(this.multis[soundID].ids[this.multis[soundID]._index], options, soundID); // Pass 3rd parram to track concurrent limits
      
    } else {
      
      // Sprite / Non-sprite
      
      let options = {};
      options.volume = Math.max(0.0, Math.min(1.0, this._sfxVolume*this._volume*volume)); 
    
      // Get sound object based on if sprite or not
      let result = this.getSoundForID(soundID);
      if (result.isSprite){
        options.sprite = soundID
      }
      
      let sound = result.sound;
      
      if (sound){
        
        if (!multiCall && this.loopSfx[soundID]){ // Looping is ignored if called as child of multi
          options.loop = true;
          // Looping SFX have a concurrent limit of 1 applied automatically 
          concurrentLimit = 1;
          if (!this.concurrentTracking[soundID]){
            this.concurrentTracking[soundID] = {}
            this.concurrentTracking[soundID].concurrent = 1;
            this.concurrentTracking[soundID]._playcount = 0;
          }
        } 
        
        if (concurrentLimit > 0){        
          if (this.concurrentTracking[concurrentSoundID]._playcount == concurrentLimit){
            return;
          }
          // Track how many are playing for current `concurrentSoundID`
          this.concurrentTracking[concurrentSoundID]._playcount++; 
          if (!options.loop){ // No callback needed for loop
            let self = this;
            options.complete = ()=>{
              self.concurrentTracking[concurrentSoundID]._playcount = Math.max(0, self.concurrentTracking[concurrentSoundID]._playcount-1);
            }
          }
        }        
        sound.play(options);
      } else {
        window['con' + 'sole']['log']('SFX resource not found `'+soundID+'`')
      }
      
    }
  }
  
  /**
   * Stops playback of looping sfx audio.
   * @param {string} [soundID=null] - The sound identifier, set to null or '*' to stop all looping sfx audio.
   */  
  stopSFX(soundID = null){
    
    if (!soundID || soundID == '*'){
      // Stop all looping SFX
      for (let soundID in this.loopSfx){
        this.stopSFX(soundID);
      }
      return;
    }
    if (!this.loopSfx[soundID] || !this.concurrentTracking[soundID]){
      return
    }
    
    this.concurrentTracking[soundID]._playcount = 0;
    let result = this.getSoundForID(soundID);
    if (result.sound){
      result.sound.stop();
    }
    
  }
  
  /**
   * Gets info about a registered sound.
   * @param {string} soundID - The sound identifier.
   * @returns {Object} info 
   * @private
   */  
  getSoundForID(soundID){
    let result = {};
    if (this.parentSoundBySprite[soundID] && this.resources[this.parentSoundBySprite[soundID]]){
      result.sound = this.resources[this.parentSoundBySprite[soundID]].sound
      result.isSprite = true;
    } else if (this.resources[soundID]){
      result.sound = this.resources[soundID].sound;
      result.isSprite = false;
    } 
    return result;
  }
  
  /**
   * Sets the resource id to be the looping background music track.
   * @param {string} soundID - The sound identifier.
   */  
  setBgLoop(soundID){
    
    // Hold on to for later
    if (!this._bgready){
      this._pendingBgLoopSlug = soundID
      return;
    }
    
    this._stopBgLoop();
    
    if (this.bgLoopSlug && this.bgLoopSlug == soundID){
      return;
    }
    
    if (soundID == null){
      this.bgLoopSlug = null;
      return;
    }
    
    let result = this.getSoundForID(soundID);
    if (result.sound){
      this.bgLoopSlug = soundID;
      if (this._bgLoopEnabled){
        this._resumeBgLoop();
      }
    } else {
      window['con' + 'sole']['log']('BG loop resource not found `'+soundID+'`')
    }
  }
  
  /**
   * Stops background playback.
   * @private
   */  
  _stopBgLoop(){
    if (this.bgLoopSlug){
      let result = this.getSoundForID(this.bgLoopSlug);
      if (result.sound){
        result.sound.stop();
      }
    } 
  }
  
  /**
   * Resumes paused background playback.
   * @private
   */  
  _resumeBgLoop(){
    if (this._bgLoopEnabled && this.bgLoopSlug){
      let result = this.getSoundForID(this.bgLoopSlug);
      if (result.sound){
        let options = {singleInstance: true, volume: this._bgLoopVolume*this._volume}
        if (result.isSprite){
          options.sprite = this.bgLoopSlug;
        }
        result.sound.play(options);
      }
    } 
  }
  
  /**
   * Resyncs the background playback volume.
   * @private
   */  
  updateBgLoopVolume(){
    if (this.resources && this.bgLoopSlug){
      let result = this.getSoundForID(this.bgLoopSlug);
      if (result.sound){
        result.sound.volume = this._bgLoopVolume*this._volume
      } 
    }
  }
    
}

export default SFX;
    