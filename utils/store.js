
// Local Storage 
// -------------

export let prefix = 'stm';
const STORAGE_ENABLED = true;

if(!STORAGE_ENABLED){
  console.log('WARNING: Local Storage is disabled');
}

export const enabled = _localStorageAvailable();

export function save(key, val){  
  if (!enabled){
    return false;
  }
  key = prefix + '.' + key;
  localStorage.setItem(key, val);    
  return true;
}

export function load(key){
  if (!enabled){
    return null;
  }
  key = prefix + '.' + key;
  let data = localStorage.getItem(key);
  return data ? data : null;
}

export function remove(key){
  if (!enabled){
    return;
  }
  key = prefix + '.' + key;
  localStorage.removeItem(key);
}

export function removeAll(){
  if (!enabled){
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