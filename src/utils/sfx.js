import { utils, nav, store } from './../storymode.js';

// Sound Effect class
// ------------------

// Requires:
// - bin/js/pixi-sound.js
// - bin/js/pixi-sound.js.map (optional)

// USAGE:
/*
if (!sfx.ready){
  sfx.on('ready', this.onready, this)
} else {
  onready();
}
// ...
onready(){
  sfx.off('ready', this.onready, this)
}
*/

const DEFAULT_SFX_ENABLED = true;
const DEFAULT_BGLOOP_ENABLED = true;

export default class SFX extends PIXI.utils.EventEmitter {
  
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
    
  }
  
  get sfxready(){
    return this._sfxready;
  }
  
  get bgready(){
    return this._bgready;
  }
  
  get sfxEnabled(){
    return this._sfxEnabled;
  }
  
  set sfxEnabled(enabled){
    if (enabled === this._sfxEnabled){
      return;
    }    
    this.toggleSfxEnabled();
  }
  
  get bgLoopEnabled(){
    return this._bgLoopEnabled;
  }
  
  set bgLoopEnabled(enabled){
    if (enabled === this._bgLoopEnabled){
      return;
    }
    this.toggleBgLoopEnabled();
  }
  
  set useSfxStateForBg(_useSfxStateForBg){
    this._useSfxStateForBg = _useSfxStateForBg;
    this.syncBgState();
  }
  
  syncBgState(){
    if (this._useSfxStateForBg){
      this.bgLoopEnabled = this._sfxEnabled;
    }
  }
  
  toggleSfxEnabled(){
    
    this._sfxEnabled = !this._sfxEnabled;
    store.save('sfx.sfxEnabled', this._sfxEnabled ? '1' : '0')   
    this.emit('sfx_enabled_change');
    this.syncBgState();
    
  }
  
  toggleBgLoopEnabled(){
    
    this._bgLoopEnabled = !this._bgLoopEnabled;
    store.save('sfx.bgLoopEnabled', this._bgLoopEnabled ? '1' : '0')
    if (this._bgLoopEnabled){
      this._resumeBgLoop();
    } else {
      this._stopBgLoop();
    }
    
    this.emit('bgloop_enabled_change');
  }
  
  // Volume
  // ------
  
  get sfxVolume(){
    return this._sfxVolume;
  }
  set sfxVolume(volume){
    this._sfxVolume = volume;
  }
  
  get bgLoopVolume(){
    return this._bgLoopVolume;
  }
  set bgLoopVolume(volume){
    this._bgLoopVolume = volume;
    this.updateBgLoopVolume();
  }

  get volume(){
    return this._volume;
  }
  set volume(volume){
    this._volume = volume;
    this.updateBgLoopVolume();
  }
  
  // Load global, low priority sounds.
  // It's assumed these are larger files - they will be loaded last and will not 
  // prevent sound effects from being loaded and played in the meantime
  // Must be called before or during storymode.createApp callback
  enqueueBgResources(bgResources, callback){
    
    this._bgResources = bgResources;
    
  }
  
  // If `false` then will load immediately when able, rather than waiting for user to interact with the DOM
  // Must be caled before or during storymode.createApp callback
  set waitForInteractionToLoad(_waitForInteractionToLoad){
    this._waitForInteractionToLoad = _waitForInteractionToLoad;
  }
  
  get waitForInteractionToLoad(){
    return this._waitForInteractionToLoad
  }
  
  // Called after primary load by app.js
  _enableLoad(){
    
    // Only call once
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
  
  beginLoad(){
    if (PIXI.sound){
      this.onScriptLoaded();
    } else {
      utils.loadScript('js/vendor/pixi-sound.js', this.onScriptLoaded.bind(this))
    }
  }
  
  onScriptLoaded(){

    // PIXI.sound.Sound.volumeAll(0.5);
    
    // Set global volume
    // PIXI.sound.volumeAll = 0.1;
    
    // console.log('PIXI.sound.volumeAll', PIXI.sound.volumeAll)
    
    // Load all resources registered with static scene method: `getSfxResources()`
    
    this._loader = new PIXI.Loader();
    this.spritesByParentSound = {};
    this.parentSoundBySprite = {};
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
            const path = _r[_soundID].path ? _r[_soundID].path : _r[_soundID];             
            if (_r[_soundID].sprites){
              this.spritesByParentSound[_soundID] = _r[_soundID].sprites;
              for (let _spriteID in _r[_soundID].sprites){
                this.parentSoundBySprite[_spriteID] = _soundID;
              }
            }        
            _resources[_soundID] = path;        
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
    
    this.emit('sfxready');
    
    // SFX can now be played. Load the background next.
    if (this._bgResources){
      
      this._loader = new PIXI.Loader();
      
      for (let _soundID in this._bgResources){
        const path = this._bgResources[_soundID].path ? this._bgResources[_soundID].path : this._bgResources[_soundID];           
        this._loader.add(_soundID, path); 
      }
      
      this._loader.load(this.onBgResourcesLoaded.bind(this));
      
    }
    
  }
  
  onBgResourcesLoaded(loader, resources){
    
    this._loader = null;
    this.resources = utils.extend(this.resources, resources); 
    this._bgready = true;
    
    this.emit('bgready');
    
    this._bgResources = null;

    if (this._pendingBgLoopSlug){
      const tmpPendingBgLoopSlug = this._pendingBgLoopSlug;
      this._pendingBgLoopSlug = null;
      this.setBgLoop(tmpPendingBgLoopSlug);
    }
    
  }
    
  stopAll(){
    
    if (!this._sfxready){
      return;
    }
    
    PIXI.sound.stopAll();
    
  }
  
  playSFX(soundID, delay = -1.0){
    
    if (!this._sfxready || !this._sfxEnabled){
      return;
    }
    
    if (delay > 0.0){
      utils.wait(this, delay, this.playSFX, [soundID]);
      return;
    }
    
    
    /*
    if (options){ 
      let defaults = {
        pan: 0.0
      };
      options = utils.extend(defaults, options);        
      if (options.pan != 0.0){
        const stereo = new PIXI.sound.filters.StereoFilter()
        stereo.pan = options.pan; // from -1 to 1
        this.resources[soundID].sound.filters = [stereo];
      }
      // true to disallow playing multiple layered instances at once.
    }
    */
        
    //this.resources[soundID].sound.preload = true;
    if (this.parentSoundBySprite[soundID] && this.resources[this.parentSoundBySprite[soundID]]){
      this.resources[this.parentSoundBySprite[soundID]].sound.volume = this._sfxVolume*this._volume
      this.resources[this.parentSoundBySprite[soundID]].sound.play(soundID); //,{loop: false, singleInstance: false, volume: this._sfxVolume*this._volume});
    } else if (this.resources[soundID]){
      this.resources[soundID].sound.play({volume: this._sfxVolume*this._volume});
    } else {
      console.log('SFX resource not found `'+soundID+'`')
    }
  }
  
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
    if (this.resources[soundID]){
      this.bgLoopSlug = soundID;
      if (this._bgLoopEnabled){
        this._resumeBgLoop();
      }
    } else {
      console.log('BG loop resource not found `'+soundID+'`')
    }
  }

  _stopBgLoop(){
    
    if (this.bgLoopSlug && this.resources[this.bgLoopSlug]){
      this.resources[this.bgLoopSlug].sound.stop();
    }
    
  }
  
  _resumeBgLoop(){
    if (this._bgLoopEnabled && this.bgLoopSlug){
      this.resources[this.bgLoopSlug].sound.play({loop: true, singleInstance: true, volume: this._bgLoopVolume*this._volume});
    }
  }
  
  updateBgLoopVolume(){
    if (this.resources && this.bgLoopSlug && this.resources[this.bgLoopSlug].sound){
      this.resources[this.bgLoopSlug].sound.volume = this._bgLoopVolume*this._volume
    }
  }
  
}
    