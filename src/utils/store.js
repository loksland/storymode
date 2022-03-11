
// Local Storage 
// -------------

let prefix = 'stm';
const STORAGE_ENABLED = true;

if(!STORAGE_ENABLED){
  console.log('WARNING: Local Storage is disabled');
}

let sessionData = {}; // Fallback just for this session

export const enabled = _localStorageAvailable();

export function setPrefix(_prefix){
  prefix = _prefix;
}

export function save(key, val){  
  key = prefix + '.' + key;
  if (!enabled){    
    sessionData[key] = val;
    return false;
  }
  localStorage.setItem(key, val);    
  return true;
}

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

export function removeAll(){
  if (!enabled){
    sessionData = {}
    return null;
  }
  localStorage.clear();
}

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