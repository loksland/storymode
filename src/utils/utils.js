/**
 * Common utility methods
 * @module utils
 */


//import objectAssignDeep from './objectAssignDeep.js';
//export {objectAssignDeep}


/**
 * Given a font weight string description, will return the weight as a number compatible with the PIXI text system.
 * <br>- 100 - Thin
 * <br>- 200 - Extra Light (Ultra Light)
 * <br>- 300 - Light
 * <br>- 400 - Normal
 * <br>- 500 - Medium
 * <br>- 600 - Semi Bold (Demi Bold)
 * <br>- 700 - Bold
 * <br>- 800 - Extra Bold (Ultra Bold)
 * <br>- 900 - Black (Heavy)
 * @param {string} fontWeightStrToNum - The font weight description. 
 * @returns {number} fontWeight - The numeric font weight. If weight is undetermined will return 400 as default.
 * @example
 * utils.fontWeightStrToNum('extra bold'); // Returns 800
 */
export function fontWeightStrToNum(fontWeightStr){

  let str = fontWeightStr.trim().toLowerCase();
  
  // If a font weight number is supplied then return it as is
  if (!isNaN(Number(str)) && str.length == 3 && str.charAt(1) == '0' && str.charAt(2) == '0'){
    return Number(str);
  }

  if (str.split('thin').length > 1){
    return 100;
  }
  
  if (str.split('light').length > 1){
    if (str.split('ultra').length > 1 || str.split('extra').length > 1){
        return 200;
    }
    return 300;
  }
  
  if (str.split('normal').length > 1 || str.split('regular').length > 1){
    return 400;
  }

  if (str.split('medium').length > 1){
    return 500;
  }
  
  if (str.split('bold').length > 1){
    
    if (str.split('semi').length > 1 || str.split('demi').length > 1){
      return 600;
    } else if (str.split('ultra').length > 1 || str.split('extra').length > 1){
        return 800;
    }
    return 700;
  }
  
  if (str.split('black').length > 1){
      return 900;
  }

  return 400;

/*  
100 - Thin
200 - Extra Light (Ultra Light)
300 - Light
400 - Normal
500 - Medium
600 - Semi Bold (Demi Bold)
700 - Bold
800 - Extra Bold (Ultra Bold)
900 - Black (Heavy)
*/

  // Pixi supports:
  //  ('normal', 'bold', 'bolder', 'lighter' and '100', '200', '300', '400', '500', '600', '700', '800' or '900')
  
  
}
  
/**
 * Gets the computed style of the given HTML DOM element as a number value. 
 * @param {DOMElement} element - The DOM element to target.
 * @param {string} property - The property to retrieve. Eg. `width`.
 * @returns {integer} value - The property value.
 */
export function getProp(ele, prop){
	var style = window.getComputedStyle(ele, null);
	var val = parseInt(style[prop]);
	return(val);
}

/**
 * Returns the HTML DOM element with the given id.
 * @param {string} id - The id of the DOM element to retrieve.
 * @returns {DOMElement} [element=null] - The DOM element, if found.
 */
export function e(id){
  return id ? document.getElementById(id) : null;
}

/**
 * Performs a shallow clone of a given object. 
 * @param {Object} source - The object to clone.
 * @returns {Object} clone - The duplicate object.
 */
export function cloneObj(obj){
  return Object.assign({}, obj);
}

/**
 * Given a 1-2 character description of a horizontal and/or vertical alignment, will return the alignment as a vector representation.
 * @param {string} alignmentDescription - The alignment description as initials. Eg. `CT` for center / top. Case independent.
 * @param {boolean} [defineSingleAxisMode=false] - If true: `C` means centered on x axis,`M` means centered on y axis and any unset axes will return `null`. If false: Both x and y will resolve, `C` applies to both x and y, `M` means centered on y axis, will default to 0 (centered).
 * @returns {vector} alignment - The alignment as a vector. A value of -1 means left/top, a value of 0 means centered and a value of 1 means right/bottom.
 */
export function alignmentStringToXY(alignmentStr, defineSingleAxisMode = false){
  
  // let alignment = defaultAlignment ? defaultAlignment : {x:0,y:0};
  
  alignmentStr = alignmentStr.trim().toUpperCase();
  
  if (!defineSingleAxisMode && alignmentStr.length == 1 && alignmentStr == 'C'){
    return {x:0,y:0};
  } 
  
  if (alignmentStr == 'CC'){
    return {x:0,y:0};
  } 
  
  let alignment = {x:null,y:null}
  
  if (alignmentStr.split('L').length == 2){
    alignment.x = -1;
  } else if (alignmentStr.split('R').length == 2){
    alignment.x = 1;
  } else if (defineSingleAxisMode && alignmentStr.split('C').length == 2){
    alignment.x = 0;
  }
  
  if (alignmentStr.split('T').length == 2){
    alignment.y = -1;
  } else if (alignmentStr.split('B').length == 2){
    alignment.y = 1; 
  } else if (alignmentStr.split('M').length == 2){
    alignment.y = 0;
  } 
  
  // Interpret ambiguous `C`, eg `CT` will resolve `C` to x axis, `CR` will resolve `C` to y axis
  if (!defineSingleAxisMode){
    
    if (alignmentStr.split('C').length == 2){
      if (alignment.x === null && alignment.y !== null){
        alignment.x = 0;
      } else if (alignment.y === null && alignment.x !== null){
        alignment.y = 0;
      }
    }
    
    // Fallback to center if not set
    alignment.x = alignment.x === null ? 0 : alignment.x;
    alignment.y = alignment.y === null ? 0 : alignment.y;
    
  }
    
  return alignment;
  
}


/**
 * Set the path of an object with supplied value.
 * <br>If the path doesn't exist then it will be created.
 * <br>If the existing value is numeric and the value is a string prefixed with `-=` or `+=`, then the value will be updated relative to its existing value.
 * @param {Object} object - The target object.
 * @param {string} path - The path to set, as a single string with dot syntax.
 * @param {*} value - The value to apply.
 * @example
 * let obj = {foo:{bar:123}}
 * setObjPathVal(obj, 'foo.bar', 321);
 */
export function setObjPathVal(obj, path, val){

	var ref = obj;
	var pathParts = path.split('.');
  for (let i = 0; i < pathParts.length; i++){
    pathParts[i] = pathParts[i].split('(dot)').join ('.');
  }

	for (var i = 0; i < pathParts.length; i++){
		if (i == pathParts.length - 1){
      // Apply relative value mapping eg. `+22`
      if (typeof val === 'string' && val.length > 0 && (val.charAt(0) === '+' ||val.charAt(0) === '-') && !isNaN(Number(ref[pathParts[i]]))) {
        let mod = val.charAt(0) === '-' ? -1.0 : 1.0
        val = val.substr(1);
        if (val.charAt(0) === '='){
          val = val.substr(1);
        }
        let relVal = Number(val)
        if (!isNaN(relVal)){
          val = ref[pathParts[i]] + mod*relVal
        }
      }
      ref[pathParts[i]] = val;
		}	else if (ref[pathParts[i]] == undefined) {
			ref[pathParts[i]] =  {};
		}	
		ref = ref[pathParts[i]];
	}
  
}


/**
 * Returns the value of an object at a given path.
 * <br>Supports array indexes in the path. Eg. `path.to.arr[7]`.
 * @param {Object} object - The target object.
 * @param {string} path - The path to retrieve, as a single string with dot syntax.
 * @returns {Object} value - The value retrieved.
 * @example
 * let obj = {foo:{bar:['a','b','c']}}
 * getObjPath(obj, 'foo.bar[1]'); // Returns `b`
 */
export function getObjPath(obj, path){

	var ref = obj;
	var pathParts = path.split('.');

	for (var i = 0; i < pathParts.length; i++){

		var path = pathParts[i]

		if (ref[path] == undefined) {

			// Return object length
			if (path == 'length' && typeof obj == 'object' && !Array.isArray(ref)) {
				var k = 0;
				for (var p in ref){
					k++;
				}
				return k;
			}

			// Return array by [index]
			if (path.charAt(path.length-1) == ']' && path.split('[').length == 2){
				var parts = path.split('[');
				var index = parts[1].substr(0, parts[1].length-1);
				if (index >= 0 && ref[parts[0]] != undefined && Array.isArray(ref[parts[0]]) && ref[parts[0]].length > index) {
					return ref[parts[0]][index];
				}
			}

			return undefined;

		}
		ref = ref[path];

		if (i == pathParts.length - 1){

			return ref; // Made it to end
		}
	}

	return undefined;

}

/**
 * Pads string to a given length with supplied character.
 * <br>Supports array indexes in the path. Eg. `path.to.arr[7]`.
 * @param {string|number} subject - The target to pad.
 * @param {integer} targetLength - The desired string length.
 * @param {string} [padChar='0'] - The pad character to use.
 * @param {boolean} [padBefore=true] - If true: pad chars will be added to the start of the subject, otherwise will be added to the end.
 * @returns {string} padded - The padded string.
 * @example
 * pad(777, 5); // Returns `00777`
 */
export function pad(subject, targetLength, padChar = '0', padBefore = true){
  
  subject = String(subject);
  
  const padPart = targetLength>subject.length ? padChar.repeat(targetLength-subject.length) : '';
  
  return padBefore ? padPart + subject : subject + padPart;
}


let _globMatchCache = {}; // Caches regex
/**
 * Returns if a string matches a glob pattern.
 * <br>Supports patterns such as '!pattern','pattern*','!dingo*','*dingo'.
 * @param {string} subject - The subject string.
 * @param {string} glob - The glob pattern. 
 * @returns {boolean} match - Whether the subject matched the glob pattern.
 * @example
 * utils.globMatch('kitten', '*ten'); // Returns true.
 */
export function globMatch(subject, glob){
  
  let inverseResults;
  let pattern;
  
  if (!_globMatchCache[glob]){
    
    let _glob = glob;
    inverseResults = false;
    if (_glob.startsWith('!')){
      inverseResults = true;
      _glob = _glob.substr(1)
    }
    
    let asteriskParts = _glob.split('*');
    if (asteriskParts.length == 1){ 
      // Simple case insenstive string match
      pattern = _glob.toLowerCase();
    } else {
      _glob = asteriskParts.join('__asterisk__');
      _glob = escapeRegExp( _glob);
      _glob = _glob.split('__asterisk__').join('.*');
      _glob = '^' + _glob + '$'; // Start and end of subject
      pattern = new RegExp(_glob, 'i');
    }
    
    _globMatchCache[glob] = {inverseResults:inverseResults, pattern:pattern}
    
  } else {
    
    inverseResults = _globMatchCache[glob].inverseResults
    pattern = _globMatchCache[glob].pattern
    
  }
  const result = typeof pattern === 'string' ? subject.toLowerCase() == pattern : subject.match(pattern);
  return inverseResults ? !result : result;
  
}

/**
 * Escapes any regex reserved tokens from a string.
 * @param {string} subject - The subject string.
 * @returns {string} escapedSubject - The escaped string, ready to be used in a regex expression.
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}


/**
 * Requires all files with given context and returns an array of document content.
 * <br>>Note: Webpack may need to be configured to process the required file type.
 * @param {RequireContext} requireContext - A directory to search, a flag indicating whether subdirectories should be searched too, and a regular expression to match files against.
 * @returns {Array.<*>} documentContent - Each entry in the array represents the content of a matched document.
 * @example
 * const _psdInfo = requireAll(require.context('./ui', false, /.json$/));
 */
export function requireAll( requireContext ) {
  return requireContext.keys().map( requireContext );
}

/**
 * Requires all files with given context and returns an object with the original filename as the key.
 * <br>Note: Webpack may need to be configured to process the required file type. See: https://webpack.js.org/guides/asset-modules/
 * @param {RequireContext} requireContext - A directory to search, a flag indicating whether subdirectories should be searched too, and a regular expression to match files against.
 * @returns {Object.<string>} documentContent - An object with document filenames set at the key, populated with its content.
 */
export function requireAllLookup(requireContext){
  let lookup = {}
  requireContext.keys().forEach((key) => {
    let safeKey = key.replace(/^[\.\\//]*/g, "");
    lookup[safeKey] = requireContext(key)
  });
  return lookup;
} 


/**
 * Enforces a minimum wait time between multiple calls to a given function.
 * @param {Function} callback - Function to call.
 * @param {number} wait - Minimum time in milliseconds between calls.
 * @example
 * onResize(){
 *    utils.debounce(this.onResizeDebounced.bind(this), 1000);
 * }
 */
export function debounce(func, wait, _immediate = false) {
  let timeout;
  return function() {
    let args = arguments;
    let later = () => {
        timeout = null;
        if (!immediate) {
          func.apply(this, args);
        }
    };
    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(this, args);
    }
  }
}


/**
 * Enforces a minimum wait time between multiple calls to a function.
 * @param {Function} callback - Function associated with `utils.wait` call.
 * @example
 * utils.wait(this, 2.0, this.delayCall); 
 * utils.killWaitsFor(this.delayCall); // Cancels delay call
 */
export function killWaitsFor(callback) {
  gsap.killTweensOf(callback);
}

/**
 * Cancels a queued wait call.
 * @param {gsap.delayedCall} delayedCall - The result of `utils.wait`.
 * @example
 * let delayedCall = utils.wait(this, 2.0, this.delayCall); 
 * utils.killWait(delayedCall); // Cancels delay call
 */
export function killWait(delayedCall){
  if (delayedCall){
    delayedCall.kill();
  }
}

/**
 * Calls function after set delay.
 * @param {Object} [thisScope=null] - Optionally supply a scope in which to call the function.
 * @param {number} delay - The delay in seconds.
 * @param {Function} callback - The function to call.
 * @param {Array} [callpackParams=null] - An array of parameters to supply to the callback function.
 * @returns {gsap.delayedCall} delayedCall - The queued GSAP delayed call instance.
 * @example
 * utils.wait(this, 2.0, this.delayCall); 
 */
export function wait(){
  
  let args = Array.from(arguments);
  
  let thisArg = null;
  if (typeof args[0] !== 'number'){
    thisArg = args.shift();
  }
  
  if (args.length == 0){
    args[0] = 0.0; // Delay
  }
  
  if (args.length == 1){
    args[1] = null; // Callback
  }
  
  if (args.length == 2){
    args[2] = null; // params
  }
  
  if (thisArg !== null){
    args[3] = thisArg;
  }
  
  return gsap.delayedCall.apply(thisArg, args);
  
}

/**
 * Shuffles the element order of an array.
 * @param {Array} array - Array to shuffle.
 * @example
 * let tmp = ['one','two','three'];
 * utils.shuffle(tmp);
 */
export function shuffle(array) {
  let counter = array.length;
  while (counter > 0) {
    let index = Math.floor(Math.random() * counter);
    counter--;
    let temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }
  return array;
}

/**
 * Darkens color by set percentage.
 * @param {int} color - Color value, eg. 0xff3300.
 * @param {number} brightness - Amount to darken in the range of 0.0 to 1.0.
 * @returns {int} colorResult - Darkened color value.
 * @example
 * utils.darkenCol(0xff3300, 0.5); // 50% darken
 */  
export function darkenCol(col, amt) {
  return lightenCol(col, -Math.abs(amt))
}
  
/**
 * Lightens color by set percentage.
 * @param {int} color - Color value, eg. 0xff3300.
 * @param {number} brightness - Amount to brighten in the range of 0.0 to 1.0.
 * @returns {int} colorResult - Lightened color value.
 * @example
 * utils.lightenCol(0xff3300, 0.5); // 50% lighter
 */  
export function lightenCol(rgb, brite)
{
  var r;
  var g;
  var b;
  
  brite*= 100;
  
  if (brite == 0)
    return rgb;
  
  if (brite < 0)
  {
    brite = (100 + brite) / 100;
    r = ((rgb >> 16) & 0xFF) * brite;
    g = ((rgb >> 8) & 0xFF) * brite;
    b = (rgb & 0xFF) * brite;
  }
  else // bright > 0
  {
    brite /= 100;
    r = ((rgb >> 16) & 0xFF);
    g = ((rgb >> 8) & 0xFF);
    b = (rgb & 0xFF);
    
    r += ((0xFF - r) * brite);
    g += ((0xFF - g) * brite);
    b += ((0xFF - b) * brite);
    
    r = Math.min(r, 255);
    g = Math.min(g, 255);
    b = Math.min(b, 255);
  }

  return (r << 16) | (g << 8) | b;
}


/**
 * Determines if currently running on a touch device.
 * @returns {boolean} isTouch
 */  
export function isTouchDevice() {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0) ||
     (navigator.msMaxTouchPoints > 0));
}

// Class utils 

/**
 * Determines if the given HTML DOM Element has the class applied.
 * @param {DOMElement} htmlEle - The target element.
 * @param {string} className - The CSS class name.
 * @returns {boolean} classExists - Whether the class is applied. 
 */  
export function hasClass(el, className) {  
  if (el.classList) {
    return el.classList.contains(className);
  }
  return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));    
}

/**
 * Adds class to HTML DOM Element if not already applied.
 * @param {DOMElement} htmlEle - The target element.
 * @param {string} className - The CSS class name.
 */  
export function addClass(el, className) {  
  if (el.classList) {
      el.classList.add(className)
  } else if (!hasClass(el, className)) {
      el.className += " " + className;
  }
}

/**
 * Removes class from HTML DOM Element.
 * @param {DOMElement} htmlEle - The target element.
 * @param {string} className - The CSS class name.
 */  
export function removeClass(el, className){
  if (el.classList) {
    el.classList.remove(className)
  } else if (hasClass(el, className)) {
    var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
    el.className = el.className.replace(reg, ' ');
  }
}

/**
 * Loads a js document at runtime.
 * @param {string} jsFilePath - The path to js file.
 * @param {Function} loadCallback - The function to call after script is loaded.
 * @example 
 * loadScript('js/my-script.js', this.onScriptLoaded.bind(this))
 */
export function loadScript(url, callback) {
  
  // adding the script element to the head as suggested before
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  // then bind the event to the callback function 
  // there are several events for cross browser compatibility
  script.onreadystatechange = callback;
  script.onload = callback;
  // fire the loading
  head.appendChild(script);
}


/**
 * Extend an object with any properties defined in a second object.
 * @param {Object} baseObject - The base object.
 * @param {Object} extendObject - The object with properties to be applied to the base object.
 * @example 
 * constructor(options) {
 *   let defaults = {
 *     color: 0xff3300,
 *     isLabel: true
 *   };
 *   options = utils.extend(defaults, options);
 * }  
 */
export function extend(obj, deep) {
  
  var argsStart,
      args,
      deepClone;

  if (typeof deep === 'boolean') {
      argsStart = 2;
      deepClone = deep;
  } else {
      argsStart = 1;
      deepClone = true;
  }

  for (var i = argsStart; i < arguments.length; i++) {
    
      var source = arguments[i];

      if (source) {
          for (var prop in source) {
              if (deepClone && source[prop] && source[prop].constructor === Object) {
                  if (!obj[prop] || obj[prop].constructor === Object) {
                      obj[prop] = obj[prop] || {};
                      extend(obj[prop], deepClone, source[prop]);
                  } else {
                      obj[prop] = source[prop];
                  }
              } else {
                  obj[prop] = source[prop];
              }
          }
      }
  }
  
  return obj;
  
};


/**
 * Apply `Object.freeze` to an object and its child objects recursively.
 * @param {Object} targetObject - The object to freeze.
 */
export function deepFreeze(obj){
  // Retrieve the property names defined on object
  const propNames = Object.getOwnPropertyNames(obj);
  // Freeze properties before freezing self
  for (const name of propNames) {
    const value = obj[name];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}

/**
 * Retrieves a query variable from the current url.
 * @returns {string} value
 */
export function getQueryVar(varname){
  let params = (new URL(document.location)).searchParams;
  return params.get(varname);
}

// Clipboard 

function _fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left ='0';
  textArea.style.position = 'fixed';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    if (!successful){
      throw new Error('Unable to copyTextToClipboard()');
    }
  } catch (err) {
    throw err;
  }

  document.body.removeChild(textArea);
}

/**
 * Copies text to clipboard with fallback for legacy browsers.
 * @param {string} text - The text to copy. 
 */
export function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    _fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    //console.log('Async: Copying to clipboard was successful!');
  }, function(err) {
    throw err;
  });
}

/**
 * Detects if the page can scroll vertically.
 * @returns {boolean} scrollsVertically
 */
export function canPageScrollVertically(){
  let scrollHeight = Number(document.body.scrollHeight);
  let containingHeight = Number(document.body.clientHeight);
  if ((isNaN(containingHeight) || scrollHeight === containingHeight) && document.documentElement){
    let _containingHeight = Number(document.documentElement.clientHeight);
    if (!isNaN(_containingHeight) && _containingHeight > 0.0){
      containingHeight = _containingHeight;
    }
  }
  return scrollHeight > containingHeight;
}



