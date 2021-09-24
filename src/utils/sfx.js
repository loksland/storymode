import { utils, nav, store } from './../storymode.js';

// Sound Effect class
// ------------------

// Requires:
// - bin/js/pixi-sound.js
// - bin/js/pixi-sound.js.map (optional)

// USAGE:
/*
if (!sfx.ready){
  sfx.on('ready', this.onSfxReady, this)
} else {
  onSfxReady();
}
// ...
onSfxReady(){
  sfx.off('ready', this.onSfxReady, this)
}
*/

export default class SFX extends PIXI.utils.EventEmitter {
  
  constructor(){  
    
    super();
    
    this._ready = false;

    let _sfxEnabled = store.load('sfx.sfxEnabled')
    this._sfxEnabled = _sfxEnabled === '1';

    let _bgLoopEnabled = store.load('sfx.bgLoopEnabled')
    this._bgLoopEnabled = _bgLoopEnabled === '1';
    
    this._globalSfxResources = null;
    this._preloadCallback = null;
    this._preloadCalled = false;
    
    this._sfxVolume = 1.0;
    this._bgLoopVolume = 1.0;
    this._volume = 1.0;
    
    this.resources = {};
    this.bgLoopSlug = null;
    
    
  }
  
  get ready(){
    return this._ready;
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
  
  
  // May be called multiple times, 
  // subsequent calls will be ignored
  preload(globalSfxResources, callback){
    
    if (this._preloadCalled){
      return;
    }
    this._preloadCalled = true;
    
    this._globalSfxResources = globalSfxResources
    this._preloadCallback = callback;
    
    // Check if any resources are loaded 
    if ((globalSfxResources && Object.keys(globalSfxResources).length > 0) || this.anySfxResources()){
      // Wait for interaction then load sound
      let pointerupFn = () => {
        document.removeEventListener('pointerup', pointerupFn);
        utils.loadScript('js/pixi-sound.js', this.onScriptLoaded.bind(this))
      }
      document.addEventListener('pointerup', pointerupFn);
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
  
  onScriptLoaded(){

    //PIXI.sound.Sound.volumeAll(0.5);
    
    // Set global volume
    // PIXI.sound.volumeAll = 0.1;
    
    // console.log('PIXI.sound.volumeAll', PIXI.sound.volumeAll)
    
    // Load all resources registered with static scene method: `getSfxResources()`
    
    this._loader = new PIXI.Loader();
  
    let _resources = this._globalSfxResources ? this._globalSfxResources : {};
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
    
    for (let _rprop in _resources){
      this._loader.add(_rprop, _resources[_rprop]); 
    }
    
    this._loader.load(this.onResourcesLoaded.bind(this));
  
  }
  
  onResourcesLoaded(loader, resources){
    this._loader = null;
  
    this.resources = resources;
    this._ready = true;
    this._globalSfxResources = null;
    if (this._preloadCallback){
      const cb = this._preloadCallback;
      cb();
    }
    this._preloadCallback = null;
    if (this._pendingBgLoopSlug){
      const tmpPendingBgLoopSlug = this._pendingBgLoopSlug;
      this._pendingBgLoopSlug = null;
      this.setBgLoop(tmpPendingBgLoopSlug);
    }
    
    this.emit('ready');
    
  }
    
  stopAll(){
    if (!this._ready){
      return;
    }
    PIXI.sound.stopAll();
  }
  
  playSFX(slug){
    if (!this._ready || !this._sfxEnabled){
      return;
    }
    if (this.resources[slug]){
      this.resources[slug].sound.play({loop: false, singleInstance: false, volume: this._sfxVolume*this._volume});
    } else {
      console.log('SFX resource not found `'+slug+'`')
    }
  }
  
  setBgLoop(slug){
    
    if (!this._ready){
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
      this.resources[this.bgLoopSlug].sound.play({loop: true, singleInstance: true, volume: this._bgLoopVolume*this._volume});
    }
  }
  
  updateBgLoopVolume(){
    
    if (this.resources && this.bgLoopSlug && this.resources[this.bgLoopSlug].sound){
      this.resources[this.bgLoopSlug].sound.volume = this._bgLoopVolume*this._volume
    }
    
  }
  
}
    