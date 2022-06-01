/**
 * This class provides a convenience wrapper around basic local storage support testing, saving and retrieving. 
 * <br>- Values are expected to be strings, return values will always be strings.
 * <br>- If local storage is not supported the data will be saved for the life of the `store` instance as a fallback.
 * <br>- See {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API}
 * @module store
 */

/**
 * Will be added as a prefix to local storage variables.
 * <br>- Use `store.setPrefix()` to set this variable before app initialises.
 * @type {string}
 * @readonly
 * @private
 */
let prefix = 'stm';
const STORAGE_ENABLED = true;

if(!STORAGE_ENABLED){
  console.log('WARNING: Local Storage is disabled');
}

let sessionData = {}; // Fallback just for this session

/**
 * Will be true if local storage is supported / enabled on the current device.
 * @type {boolean}
 * @readonly
 */
export const enabled = _localStorageAvailable();

/**
 * Override the default storage prefix.
 * <br>- To be called before `storymode.createApp()`.
 * @param {string} prefix - Will be added as a prefix to local storage variables.
 */
export function setPrefix(_prefix){
  prefix = _prefix;
}

/**
 * Save a value in local storage.
 * @param {string} key - The storage key.
 * @param {string} val - The string value to set.
 * @returns {boolean} success - If false then data was saved to the `store` instance until the page is reloaded.
 */
export function save(key, val){  
  key = prefix + '.' + key;
  if (!enabled){    
    sessionData[key] = val;
    return false;
  }
  localStorage.setItem(key, val);    
  return true;
}

/**
 * Retrieve a value from local storage.
 * @param {string} key - The storage key.
 * @returns {string|null} value - If data for the key is not found then will return null.
 */
export function load(key){
  key = prefix + '.' + key;
  if (!enabled){    
    if (typeof sessionData[key] !== 'undefined'){
      return sessionData[key];
    }    
    return null;
  }  
  let data = localStorage.getItem(key);
  return data ? data : null;
}

/**
 * Removes a key from local storage.
 * @param {string} key - The storage key.
 */
export function remove(key){
  if (!enabled){
    if (typeof sessionData[key] !== 'undefined'){
      sessionData[key] = null;
      delete sessionData[key];
    }
    return;
  }
  key = prefix + '.' + key;
  localStorage.removeItem(key);
}

/**
 * Removes all storage data from the store instance.
 */
export function removeAll(){
  if (!enabled){
    sessionData = {}
    return null;
  }
  localStorage.clear();
}

/**
 * Check if the device supports local storage.
 * @private
 */
function _localStorageAvailable() {
    if (!STORAGE_ENABLED){
      return false;
    }
    let storage;
    try {
        storage = window['localStorage'];
        let x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}