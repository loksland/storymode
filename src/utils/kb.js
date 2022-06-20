

// NOTE: Props cannot be less than 2 chars in length
const KEYS = {};
KEYS.ENTER = 13;
KEYS.SPACE = 32;

KEYS.ESC = 27;

KEYS.LEFT = 37;
KEYS.RIGHT = 39;
KEYS.UP = 38;
KEYS.DOWN = 40;

KEYS.META = 91; //(COMMAND)
KEYS.CNTRL = 17;

let keyLookup = {};
for (let p in KEYS){
  keyLookup['kc:' + String(KEYS[p])] = p;
}

// Key event types

const KEYDOWN = 'keydown';
const KEYUP = 'keyup';

// Emitter method types 

const EMIT_ON = 'on'
const EMIT_ONCE = 'once'

/**
 * Keyboard input listener.
 * <br>- EventEmitter: {@link https://github.com/primus/eventemitter3}
 * <br>- Key code info: {@link https://keycode.info/}
 * @extends PIXI.utils.EventEmitter
 * @hideconstructor
 * @alias kb
 * @example
kb.onKeyUp(this, this.myListenerFn, 'ENTER', 'q', 32);
// ...
myListenerFn(key, keyCode, ev){
 if (keyCode == 13){
   // ENTER pressed
 } else if (key == 'SPACE'){
   // SPACE PRESSED
 }
}
// ...
kb.off(this);
 */
class KB extends PIXI.utils.EventEmitter {
  
  constructor(){   
    
    super();
    
    this.inited = false;
    this.init();
    
  }
  
  init(){
    
    if (this.inited){
      return;
    }
    
    this.inited = true;
    
    this.downKeys = {};
    
    this._keydown = this.keydown.bind(this);
    window.addEventListener(
      'keydown', this._keydown, false
    );
    
    this._keyup = this.keyup.bind(this);
    window.addEventListener(
      'keyup', this._keyup, false
    );
    
  }
  
  // Incoming keyboard events
  // ------------------------
  
  /**
   * Handles window 'keydown' event.
   * @private
   */ 
  keydown(ev){
    this._keyEvent(KEYDOWN, ev);
  };
  
  /**
   * Handles window 'keyup' event.
   * @private
   */ 
  keyup(ev){
    this._keyEvent(KEYUP, ev);
  };
  
  /**
   * Central method for handling all window keyboard events.
   * @private
   */ 
  _keyEvent(evType, ev){
    
    const keyProp = keyLookup['kc:' + String(ev.keyCode)];
    const key = keyProp ? keyProp : String(ev.key);
    const evName = evType + '|' + key;
    // console.log('Firing event:`'+evName+'` (keycode:`'+ev.keyCode+'`)');
    this.downKeys[key] = evType == KEYDOWN;
    this.emit(evName, key, ev);
    // Fire wildcard
    const evNameWild = evType + '|' + '*';
    this.emit(evNameWild, key, ev.keyCode, ev);
    
    // event.preventDefault();
    
  }
  
  // Register listeners
  // ------------------

  /**
   * A callback fired after a registered keyboard event fires.
   * @callback kb.KeyEventCallback
   * @param {string} key - Key represented as a string.
   * @param {integer} keyCode - The key code.
   * @param {Event} ev - Event that triggered the callback.
   * @memberOf kb
   */
   
   /**
    * A string constant representing a specific key.
    * <br>-"META" is the command key on Mac.
    * @typedef {"ENTER" | "SPACE" | "ESC" | "LEFT" | "RIGHT" | "UP" | "META" | "CNTRL"} kb.KeyConstant
    * @memberOf kb
    */
  
  /**
   * Registers callback on key down event for provided key/s.
   * @param {*} [context=null] - Optional context for callback.
   * @param {kb.KeyEventCallback} listener - Callback function.
   * @param {...(integer|string|kb.KeyConstant|"*")} key - An integer key code, a single character string or a key constant. Can be an asterix for all (`*`).
   */ 
  onKeyDown(context, listener, ...keys){
    for (let key of keys){
      this._registerKeyEvent(EMIT_ON, KEYDOWN, key, listener, context);
    }
  }
  
  /**
   * Registers callback on key up event for provided key/s.
   * @param {*} [context=null] - Optional context for callback.
   * @param {kb.KeyEventCallback} listener - Callback function.
   * @param {...(integer|string|kb.KeyConstant|"*")} key - An integer key code, a single character string or a key constant. Can be an asterix for all (`*`).
   */ 
  onKeyUp(context, listener, ...keys){
    for (let key of keys){
      this._registerKeyEvent(EMIT_ON, KEYUP, key, listener, context);
    }
  }
  
  /**
   * Registers callback on key down event for provided key/s.
   * <br>- Will only be fired once.
   * @param {*} [context=null] - Optional context for callback.
   * @param {kb.KeyEventCallback} listener - Callback function.
   * @param {...(integer|string|kb.KeyConstant|"*")} key - An integer key code, a single character string or a key constant. Can be an asterix for all (`*`).
   */ 
  onceKeyDown(context, listener, ...keys){
    for (let key of keys){
      this._registerKeyEvent(EMIT_ONCE, KEYDOWN, key, listener, context);
    }
  }
  
  /**
   * Registers callback on key up event for provided key/s.
   * <br>- Will only be fired once.
   * @param {*} [context=null] - Optional context for callback.
   * @param {kb.KeyEventCallback} listener - Callback function.
   * @param {...(integer|string|kb.KeyConstant|"*")} key - An integer key code, a single character string or a key constant. Can be an asterix for all (`*`).
   */ 
  onceKeyUp(context, listener, ...keys){
    for (let key of keys){
      this._registerKeyEvent(EMIT_ONCE, KEYUP, key, listener, context);
    }
  }
  
  /**
   * Central method for handling all listener registrations.
   * @private
   */ 
  _registerKeyEvent(emitterMethod, evType, key, listener, context){
    
    key = this.parseKey(key);
    const evName = evType + '|' + key
    // console.log('Registering listener:`'+evName+'`');
    this[emitterMethod](evName, listener, context); // Key code
    
  }
  
  // Unregister listeners
  // --------------------

  /**
   * Unregisters key down callback with matching criteria.
   * <br>- Same as `off()` though only targets up events.
   * @param {*} [context=null] - Optional context for callback.
   * @param {kb.KeyEventCallback} [listener=null] - Callback function.
   * @param {...(integer|string|kb.KeyConstant|"*")} [key=null] - An integer key code, a single character string or a key constant. Can be an asterix for all (`*`).
   */ 
  offKeyDown(context, listener, ...keys){
    if (keys && keys.length > 0){
      for (let key of keys){
        this._off(KEYDOWN, key, listener, context);
      }
    } else {
      this._off(KEYDOWN, null, listener, context);
    }
  }
  
  /**
   * Unregisters key up callback with matching criteria.
   * <br>- Same as `off()` though only targets up events.
   * @param {*} [context=null] - Optional context for callback.
   * @param {kb.KeyEventCallback} [listener=null] - Callback function.
   * @param {...(integer|string|kb.KeyConstant|"*")} [key=null] - An integer key code, a single character string or a key constant. Can be an asterix for all (`*`).
   */ 
  offKeyUp(context, listener, ...keys){
    if (keys && keys.length > 0){
      for (let key of keys){
        this._off(KEYUP, key, listener, context);
      }
    } else {
      this._off(KEYUP, null, listener, context);
    }
  }
  
  
  /**
   * Unregisters key up and key down listeners.
   * @param {*} [context=null] - Optional context for callback. If only supplied argument then all events registered with the supplied context will be unregistered.
   * @param {kb.KeyEventCallback} [listener=null] - Callback function.  If supplied without any keys specified (or `*` key) then all key listeners associated with the given listener will be removed.
   * @param {...(integer|string|kb.KeyConstant|"*")} [key=null] - An integer key code, a single character string or a key constant. Can be an asterix for all (`*`).
   * @example 
kb.off(this); // Removes all keyboard event listeners for instance
   */ 
  off(context, listener, ...keys){
    
    if (keys && keys.length > 0){
      for (let key of keys){
        this._off(null, key, listener, context);
      }
    } else {
      this._off(null, null, listener, context);
    }
  }
  
  /**
   * Central method for handling all listener removals.
   * @private
   */ 
  _off(evType, key, listener, context){
    
    let evTypes = evType == null ? [KEYDOWN,KEYUP] : [evType];
    
    for (let _evType of evTypes){
    
      if (key != null && key != '*'){
        key = this.parseKey(key);      
        const evName = _evType + '|' + key;
        super.off(evName, listener, context);
      
      } else {
    
        //this.off(null, listener, context);
        let evNames = [];
        for (let evName in this._events){ // https://github.com/primus/eventemitter3/blob/master/index.js        
          const parts = evName.split('|');
          if (parts[0] == _evType){
            evNames.push(evName);
          }
        }
        for (let _evName of evNames){
          super.off(_evName, listener, context);
        }
        
      }
    }
  }
  
  // - - -
  
  /**
   * Returns the down state of given key.
   * @param {integer|string|kb.KeyConstant|"*"} key - May be an integer key code, Key constant or single character string.
   * @returns {boolean} isDown - Key down state.
   */ 
  isDown(key){
    return this.downKeys[this.parseKey(key)]
  }
  
  // Utils 
  // -----
  
  /**
   * Used internally to convert a key to a consistent data type.
   * @param {integer|string|kb.KeyConstant|"*"} key - May be an integer key code, Key constant or single character string.
   * @returns {integer|string} key - Key representation.
   * @private
   */ 
  parseKey(key){
    
    let keyProp;
    if (typeof key == 'number'){
      keyProp = keyLookup['kc:' + String(key)];
      key = keyProp ? keyProp : String.fromCharCode(key);
    } else {    
      key = String(key)
      if (key.length == 1){
        // Eg. Replace ' ' with 'SPACE' - only want 1 event associated with each key
        keyProp = keyLookup['kc:' + String(key.charCodeAt(0))];
        key = keyProp ? keyProp : key;
      } else if (key.length > 1 && !KEYS[String(key)]){
        throw new Error('kb: Key `'+key+'` not found');
      }
    }
    
    return key;
    
  }
  
  /**
   * Called by `storymode.destroy()`.
   * @param {boolean} reset - If true then will be able to be used again after calling `fx.init()`
   * @private
   */
  destroy(reset){
    this.inited = false;
    if (this._keydown){
      window.removeEventListener('keydown', this._keydown);
      this._keydown = null;
    }
    if (this._keyup){
      window.removeEventListener('keyup', this._keyup);
      this._keyup = null;
    }
    this.removeAllListeners();
    this.downKeys = null;
    
  }
  
  
}

export default KB;
