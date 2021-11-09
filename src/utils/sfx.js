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

export default class SFX extends PIXI.utils.EventEmitter {
  
  constructor(){  
    
    super();
    
    this._sfxready = false;
    this._bgready = false;
    
    let _sfxEnabled = store.load('sfx.sfxEnabled')
    this._sfxEnabled = _sfxEnabled === '1';

    let _bgLoopEnabled = store.load('sfx.bgLoopEnabled')
    this._bgLoopEnabled = _bgLoopEnabled === '1';
    
    this._bgResources = null;
    this._enableLoadCalled = false;
    
    this._sfxVolume = 1.0;
    this._bgLoopVolume = 1.0;
    this._volume = 1.0;
    
    this.resources = {};
    this.bgLoopSlug = null;
  
    this._waitForInteractionToLoad = true;
    
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

  toggleSfxEnabled(){
    this._sfxEnabled = !this._sfxEnabled;
    store.save('sfx.sfxEnabled', this._sfxEnabled ? '1' : '0')    
    this.emit('sfx_enabled_change');
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
  
  get  waitForInteractionToLoad(){
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
  
    let _resources = {};
    
    for (let _sceneid in nav.scenes){
      let _r = nav.scenes[_sceneid].class.getSfxResources();
      if (_r){
        for (let _rprop in _r){
          if (_resources[_rprop]){
            if (_r[_rprop] !== _resources[_rprop]){ // Identical queued; ignore
              throw new Error('SFX: Duplicate resource identifier: `'+_rprop+'`')
            }
          } else {
            _resources[_rprop] = _r[_rprop];          
          }
        }
      }
    }
    
    // this._bgResources ? this._bgResources : 
    let anySfx = false;
    for (let _rprop in _resources){
      anySfx = true;
      this._loader.add(_rprop, _resources[_rprop]); 
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
    this.emit('sfxready');
    
    if (this._bgResources){
      
      this._loader = new PIXI.Loader();
      
      for (let _rprop in this._bgResources){
        this._loader.add(_rprop, this._bgResources[_rprop]); 
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
  
  playSFX(slug, options = null){
    
    if (!this._sfxready || !this._sfxEnabled){
      return;
    }
    
    let defaults = {
      pan: 0.0
      // wireframeEnabled: false
    };
    
    options = utils.extend(defaults, options);
    
    if (this.resources[slug]){
      if (options && options.pan != 0.0){
        const stereo = new PIXI.sound.filters.StereoFilter()
        stereo.pan = options.pan; // from -1 to 1
        this.resources[slug].sound.filters = [stereo];
        // true to disallow playing multiple layered instances at once.
      }
      this.resources[slug].sound.play({loop: false, singleInstance: false, volume: this._sfxVolume*this._volume});
    } else {
      console.log('SFX resource not found `'+slug+'`')
    }
  }
  
  setBgLoop(slug){
    
    // Hold on to for later
    if (!this._bgready){
      this._pendingBgLoopSlug = slug
      return;
    }
    
    this._stopBgLoop();
    
    if (this.bgLoopSlug && this.bgLoopSlug == slug){
      return;
    }
    
    if (slug == null){
      this.bgLoopSlug = null;
      return;
    }
    if (this.resources[slug]){
      this.bgLoopSlug = slug;
      if (this._bgLoopEnabled){
        this._resumeBgLoop();
      }
    } else {
      console.log('BG loop resource not found `'+slug+'`')
    }
  }

  _stopBgLoop(){
    
    if (this.bgLoopSlug && this.resources[this.bgLoopSlug]){
      this.resources[this.bgLoopSlug].sound.stop();
    }
    
  }
  
  _resumeBgLoop(){
    if (this._bgLoopEnabled && this.bgLoopSlug){
      console.log('bg loop this.resources[this.bgLoopSlug].sound.play()')
      this.resources[this.bgLoopSlug].sound.play({loop: true, singleInstance: true, volume: this._bgLoopVolume*this._volume});
    }
  }
  
  updateBgLoopVolume(){
    if (this.resources && this.bgLoopSlug && this.resources[this.bgLoopSlug].sound){
      this.resources[this.bgLoopSlug].sound.volume = this._bgLoopVolume*this._volume
    }
  }
  
}
    