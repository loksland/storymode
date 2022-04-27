/** @module utils */

import objectAssignDeep from './objectAssignDeep.js';
export {objectAssignDeep}


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
 * Given source dimensions, returns the scale needed to completely cover the given bounds while maintaining aspect ratio.
 * @param {number} sourceWidth - The source width.
 * @param {number} sourceHeight - The source height.
 * @param {number} boundsWidth - The bounds width.
 * @param {number} boundsHeight - The bounds height.
 * @returns {number} scale - The resulting scale.
 */
export function coverScale(srcW, srcH, boundsW, boundsH) {

	var ratioSrc = srcW/srcH;
	var ratioBounds = boundsW/boundsH;
	
	if (ratioSrc<ratioBounds) {
		return boundsW/srcW;
	} else {
		return boundsH/srcH;
	}
	
};

/**
 * Returns the scale needed to contain the source dimensions exactly within the given bounds while maintaining aspect ratio.
 * @param {number} sourceWidth - The source width.
 * @param {number} sourceHeight - The source height.
 * @param {number} boundsWidth - The bounds width.
 * @param {number} boundsHeight - The bounds height.
 * @returns {number} scale - The resulting scale.
 */
export function containScale(srcW, srcH, boundsW, boundsH) {

	var ratioSrc = srcW/srcH;
	var ratioBounds = boundsW/boundsH;
	
	if (ratioSrc>=ratioBounds) {
		return boundsW/srcW;
	} else {
		return boundsH/srcH;
	}
	
};


/**
 * Given a 1-2 character description of a horizontal and/or vertical alignment, will return the alignment as a vector representation.
 * @param {string} alignmentDescription - The alignment description as initials. Eg. `CT` for center / top. Case independent.
 * @param {boolean} [defineSingleAxisMode=false] - If true: C means centered on x axis, M means centered on y axis and any unset axis will return null. If false: Both x and y will resolve, C applies to both x and y, M means centered on y axis, will default to 0 (centered).
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

// Maths 
// -----

/**
 * Returns the distance between 2 vector points.
 * @param {vector} pointA - An object with `x` and `y` properties.
 * @param {vector} pointB - An object with `x` and `y` properties.
 * @returns {number} distance
 */
export function distanceBetweenPoints(ptA, ptB) {
  
  const dx = ptA.x - ptB.x;
  const dy = ptA.y - ptB.y;
  
  return Math.sqrt(dx * dx + dy * dy);
  
}

/**
 * Restricts a given value between 0 and 1 (inclusive).
 * @param {number} value 
 * @returns {number} restrictedValue
 */
export function clamp01(value){
  return value < 0 ? 0 : (value > 1 ? 1 : value);
}

/**
 * Restricts a given value between -1 and 1 (inclusive).
 * @param {number} value 
 * @returns {number} restrictedValue
 */
export function clampNeg1Pos1(value){
  return value < -1 ? -1 : (value > 1 ? 1 : value);
}

/**
 * Returns the angle in radians between 2 points.
 * @param {vector} originPoint - An object with `x` and `y` properties.
 * @param {vector} destinationPoint - An object with `x` and `y` properties.
 * @returns {number} angleRadians - The angle in radians.
 */
export function angleRadsBetweenPoints(ptA, ptB){
  
  return Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x);
  
}

/**
 * Returns the angle in degrees between 2 points.
 * @param {vector} originPoint - An object with `x` and `y` properties.
 * @param {vector} destinationPoint - An object with `x` and `y` properties.
 * @returns {number} angleDegrees - The angle in degrees.
 */
export function angleDegsBetweenPoints(ptA, ptB){
  
  return Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x) / Math.PI * 180.0
  
}

/**
 * Projects from a point at a given radian angle and distance.
 * @param {vector} originPoint - An object with `x` and `y` properties.
 * @param {number} angleRadians - The rotation angle, in radians.
 * @param {number} distance - The distance to project.
 * @returns {PIXI.Point} projectedPoint - A new point object.
 */
export function projectFromPointRad(pt, angleRads, dist) {

  return new Point(pt.x + dist * Math.cos(angleRads), pt.y + dist * Math.sin(angleRads));		
  
}

/**
 * Projects from a point at a given degree angle and distance.
 * @param {vector} originPoint - An object with `x` and `y` properties.
 * @param {number} angleDegrees - The rotation angle, in degrees.
 * @param {number} distance - The distance to project.
 * @returns {PIXI.Point} projectedPoint - A new point object.
 */
export function projectFromPointDeg(pt, angleDegs, dist) {
  
  let angleRads = angleDegs / 180.0 * Math.PI;   
  return new Point(pt.x + dist * Math.cos(angleRads), pt.y + dist * Math.sin(angleRads));		
  
}

/**
 * Returns the point projecting from one point to another at a set distance.
 * @param {vector} originPoint - An object with `x` and `y` properties.
 * @param {vector} targetPoint - An object with `x` and `y` properties.
 * @param {number} distance - The distance to project.
 * @returns {PIXI.Point} projectedPoint - A new point object.
 */
export function projectDistance(ptA, ptB, dist){
  
  const dx = ptA.x - ptB.x;
  const dy = ptA.y - ptB.y;
  const fullDist = Math.sqrt(dx * dx + dy * dy);
  return new Point(ptA.x - dx*(dist/fullDist), ptA.y - dy*(dist/fullDist));			
  
}

/**
 * Rotates one point around another a given angle (in radians)
 * @param {vector} centerPoint - An object with `x` and `y` properties.
 * @param {vector} subjectPoint - An object with `x` and `y` properties.
 * @param {number} angleRadians - The rotation angle, in radians.
 * @param {boolean} overwrite - If true: `subjectPoint` will be updated with the result. If false: a new PIXI.Point object will be returned.
  * @returns {PIXI.Point|null} result - The resulting coordinate.
 */
export function rotatePtAroundPtRad(centerPt, pt, angRads, overwrite = false){
  
  if (overwrite){
    pt.set(Math.cos(angRads) * (pt.x - centerPt.x) - Math.sin(angRads) * (pt.y-centerPt.y) + centerPt.x, Math.sin(angRads) * (pt.x - centerPt.x) + Math.cos(angRads) * (pt.y - centerPt.y) + centerPt.y);
  } else {
    return new Point(Math.cos(angRads) * (pt.x - centerPt.x) - Math.sin(angRads) * (pt.y-centerPt.y) + centerPt.x, Math.sin(angRads) * (pt.x - centerPt.x) + Math.cos(angRads) * (pt.y - centerPt.y) + centerPt.y);
  }
  
}

/**
 * Rotates one point around another a given angle (in degrees)
 * @param {vector} centerPoint - An object with `x` and `y` properties.
 * @param {vector} subjectPoint - An object with `x` and `y` properties.
 * @param {number} angleDegrees - The rotation angle, in degrees.
 * @param {boolean} overwrite - If true: `subjectPoint` will be updated with the result. If false: a new PIXI.Point object will be returned.
  * @returns {PIXI.Point|null} result - The resulting coordinate.
 */
export function rotatePtAroundPtDeg(centerPt, pt, angDegs, overwrite = false){
  
  return rotatePtAroundPtRad(centerPt, pt, degToRad(angDegs), overwrite);
  
}


// result is in radians, NOT degress

/**
* Return the shortest angular offset (in radians) from a source angle (in radians) to a target angle (in radians). 
* <br>The result may be negative.
 * @param {number} sourceAngleRadians - The source angle in radians.
 * @param {number} targetAngleRadians - The target angle in radians.
 * @returns {number} offsetAngleRadians - The offset in radians.
 */
export function angularDeltaFromAnglesRad(sourceAngRads, targetAngRads){
  
  return Math.atan2(Math.sin(targetAngRads-sourceAngRads), Math.cos(targetAngRads-sourceAngRads)); 
  
}

/**
 * Return the shortest angular offset (in degrees) from a source angle (in degrees) to a target angle (in degrees). 
 * <br>The result may be negative.
 * @param {number} sourceAngleDegrees - The source angle in degrees.
 * @param {number} targetAngleDegrees - The target angle in degrees.
 * @returns {number} offsetAngleDegrees - The offset in degrees.
 */
export function angularDeltaFromAnglesDeg(sourceAngDegs, targetAngDegs){
  
  return radToDeg(angularDeltaFromAnglesRad(degToRad(sourceAngDegs), degToRad(targetAngDegs)));
  
}

/**
 * Converts angle from degrees to radians.
 * @param {number} angleDegrees - Angle in degrees.
 * @returns {number} angleRadians - Angle in radians.
 */
export function degToRad(deg){
	
	return deg / 180.0 * Math.PI;   

}

/**
 * Converts angle from radians to degrees.
 * @param {number} angleRadians - Angle in radians.
 * @returns {number} angleDegrees - Angle in degrees.
 */
export function radToDeg(rad){

	return rad / Math.PI * 180.0;  

}


/**
 * Returns if a string matches a glob pattern.
 * <br>Supports patterns such as '!pattern','pattern*','!dingo*','*dingo'.
 * @param {string} subject - The subject string.
 * @param {string} glob - The glob pattern. 
 * @returns {boolean} match - Whether the subject matched the glob pattern.
 * @example
 * utils.globMatch('kitten', '*ten'); // Returns true.
 */
let _globMatchCache = {}; // Caches regex
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
 * Returns the intersection point between two infinite length lines.
 * @param {vector} lineApoint0 - An object with `x` and `y` properties.
 * @param {vector} lineApoint1 - An object with `x` and `y` properties.
 * @param {vector} lineBpoint0 - An object with `x` and `y` properties.
 * @param {vector} lineBpoint1 - An object with `x` and `y` properties.
 * @returns {PIXI.Point|null} intersectionPoint - Will return null if lines don't intersect.
 */
export function intersectLineLine(a1, a2, b1, b2, applyToVector = null) {
  
  let res = null;
  const ua_t = (b2.x-b1.x)*(a1.y-b1.y)-(b2.y-b1.y)*(a1.x-b1.x);
  const ub_t = (a2.x-a1.x)*(a1.y-b1.y)-(a2.y-a1.y)*(a1.x-b1.x);
  const u_b = (b2.y-b1.y)*(a2.x-a1.x)-(b2.x-b1.x)*(a2.y-a1.y);
  if (u_b != 0) {
    const ua = ua_t/u_b;
    const ub = ub_t/u_b;
    if (applyToVector){
      applyToVector.x = a1.x+ua*(a2.x-a1.x);
      applyToVector.y = a1.y+ua*(a2.y-a1.y);
      return null;
    }
    res = new Point(a1.x+ua*(a2.x-a1.x), a1.y+ua*(a2.y-a1.y));
  } 
  return res;
}

/**
 * Returns the intersection point between two closed lines.
 * @param {vector} lineApoint0 - An object with `x` and `y` properties.
 * @param {vector} lineApoint1 - An object with `x` and `y` properties.
 * @param {vector} lineBpoint0 - An object with `x` and `y` properties.
 * @param {vector} lineBpoint1 - An object with `x` and `y` properties.
 * @returns {PIXI.Point|null} intersectionPoint - Will return null if segments don't intersect.
 */
export function intersectSegmentSegment(a1, a2, b1, b2) {
  
  var res = null;
  var ua_t = (b2.x-b1.x)*(a1.y-b1.y)-(b2.y-b1.y)*(a1.x-b1.x);
  var ub_t = (a2.x-a1.x)*(a1.y-b1.y)-(a2.y-a1.y)*(a1.x-b1.x);
  var u_b = (b2.y-b1.y)*(a2.x-a1.x)-(b2.x-b1.x)*(a2.y-a1.y);
  if (u_b != 0) {
    var ua = ua_t/u_b;
    var ub = ub_t/u_b;
    if (0<=ua && ua<=1 && 0<=ub && ub<=1) {
      res = new Point(a1.x+ua*(a2.x-a1.x), a1.y+ua*(a2.y-a1.y));
    } 
  } 
  
  return res;
};


/**
 * Returns the intersection point between two rays.
 * <br>A ray is an infinite line from origin point through the target point.
 * @param {vector} lineAorigin - An object with `x` and `y` properties.
 * @param {vector} lineAtarget - An object with `x` and `y` properties.
 * @param {vector} lineBorigin - An object with `x` and `y` properties.
 * @param {vector} lineBtarget - An object with `x` and `y` properties.
 * @returns {PIXI.Point|null} intersectionPoint - Will return null if the rays don't intersect.
 */
export function intersectRayRay(a1, a2, b1, b2) {

  var res = null;
  var ua_t = (b2.x-b1.x)*(a1.y-b1.y)-(b2.y-b1.y)*(a1.x-b1.x);
  var ub_t = (a2.x-a1.x)*(a1.y-b1.y)-(a2.y-a1.y)*(a1.x-b1.x);
  var u_b = (b2.y-b1.y)*(a2.x-a1.x)-(b2.x-b1.x)*(a2.y-a1.y);
  if (u_b != 0) {
    var ua = ua_t/u_b;
    var ub = ub_t/u_b;
    if (ua>=0 && ub>=0) {
      res = new Point(a1.x+ua*(a2.x-a1.x), a1.y+ua*(a2.y-a1.y));
    } 
  }
  
  return res;

};


/**
 * Returns the intersection point between a line segment and the edges of a box.
 * @param {vector} segmentPoint0 - An object with `x` and `y` properties.
 * @param {vector} segmentPoint1 - An object with `x` and `y` properties.
 * @param {number} boxLeftX - The leftmost position of the box.
 * @param {number} boxTopY - The topmost position of the box.
 * @param {number} boxWidth - The box width.
 * @param {number} boxHeight - The box height.
 * @returns {PIXI.Point|null} intersectionPoint - Will return null if the segment doesn't intersect the box edge.
 * @private
 */
export function intersectSegmentBox(l1, l2, xb, yb, wb, hb) {
  
  return intersectSegmentSegment(l1.x, l1.y, l2.x, l2.y, xb, yb, xb, yb + hb) || 
        intersectSegmentSegment(l1.x, l1.y, l2.x, l2.y, xb + wb, yb, xb + wb, yb + hb) ||
        intersectSegmentSegment(l1.x, l1.y, l2.x, l2.y, xb, yb + hb, xb + wb, yb + hb) ||
        intersectSegmentSegment(l1.x, l1.y, l2.x, l2.y, xb, yb, xb + wb, yb) 
  
}

/**
 * Returns the intersection point between a line segment and the edges of a box.
 * @param {vector} segmentPoint0 - An object with `x` and `y` properties.
 * @param {vector} segmentPoint1 - An object with `x` and `y` properties.
 * @param {rectangle} rectangle - An object with `x`, `y`, `width` and `height` properties.
 * @returns {PIXI.Point|null} intersectionPoint - Will return null if the segment doesn't intersect the box edge.
 * @private
 */
export function intersectSegmentRect(l1, l2, rect) {
  return intersectSegmentBox(l1, l1, rect.x, rect.y, rect.width, rect.height)
}

// Returns an array of intersection points (0-2) between a circle and line segment
export function intersectionPtsBetweenCircleAndLineSeg(lineSegP0, lineSegP1, circleCenter, circleRadius){
  
    // circle, line
    let a, b, c, d, u1, u2, ret, retP1, retP2, v1, v2;
    v1 = {};
    v2 = {};
    v1.x = lineSegP1.x - lineSegP0.x;
    v1.y = lineSegP1.y - lineSegP0.y;
    v2.x = lineSegP0.x - circleCenter.x;
    v2.y = lineSegP0.y - circleCenter.y;
    b = (v1.x * v2.x + v1.y * v2.y);
    c = 2 * (v1.x * v1.x + v1.y * v1.y);
    b *= -2;
    d = Math.sqrt(b * b - 2 * c * (v2.x * v2.x + v2.y * v2.y - circleRadius * circleRadius));
    if(isNaN(d)){ // no intercept
      return [];
    }
    u1 = (b - d) / c;  // these represent the unit distance of point one and two on the line
    u2 = (b + d) / c;    
    retP1 = {};   // return points
    retP2 = {}  
    ret = []; // return array
    if(u1 <= 1 && u1 >= 0){  // add point if on the line segment
        retP1.x = lineSegP0.x + v1.x * u1;
        retP1.y = lineSegP0.y + v1.y * u1;
        ret.push(retP1);
    }
    if(u2 <= 1 && u2 >= 0){  // second add point if on the line segment
        retP2.x = lineSegP0.x + v1.x * u2;
        retP2.y = lineSegP0.y + v1.y * u2;
        ret.push(retP2);
    }       
    return ret;
    
}

export function getIntersectionPointsBetweenTwoCircles(pt_circle0_pos, int_circle0_radius, pt_circle1_pos, int_circle1_radius) {

	//http://local.wasp.uwa.edu.au/~pbourke/geometry/2circle/

	var d = this.distanceBetweenPoints(pt_circle0_pos, pt_circle1_pos);

	if (d>int_circle0_radius+int_circle1_radius || d<Math.abs(int_circle0_radius-int_circle1_radius)) {

		return [];

	} else {

		var a = (Math.pow(int_circle0_radius, 2)-Math.pow(int_circle1_radius, 2)+Math.pow(d, 2))/(2*d);
		var h = Math.sqrt(Math.pow(int_circle0_radius, 2)-Math.pow(a, 2));

		var pt_p2 = new Object();
		pt_p2["x"] = pt_circle0_pos["x"]+((a*(pt_circle1_pos["x"]-pt_circle0_pos["x"]))/d);
		pt_p2["y"] = pt_circle0_pos["y"]+((a*(pt_circle1_pos["y"]-pt_circle0_pos["y"]))/d);
		var pt_p3_a = {x:pt_p2["x"]+(h*(pt_circle1_pos["y"]-pt_circle0_pos["y"]))/d, y:pt_p2["y"]-(h*(pt_circle1_pos["x"]-pt_circle0_pos["x"]))/d};
		//var pt_p3_b = {x:pt_p2["x"]  - (h * ( pt_circle1_pos["y"] - pt_circle0_pos["y"] )) / d,y:pt_p2["y"] + (h * ( pt_circle1_pos["x"] - pt_circle0_pos["x"] )) / d};
		// The above line has been optimised to the one below ->
		var pt_p3_b = {x:-pt_p3_a["x"]+(2*pt_p2["x"]), y:-pt_p3_a["y"]+(2*pt_p2["y"])};

		return [pt_p3_a, pt_p3_b];

	}
};


export function ellipsePerimeter(radX, radY){
   
  return 2.0 * 3.14 * Math.sqrt((radX * radX + radY * radY) / (2.0 * 1.0));
  
}

// Usage: const _psdInfo = requireAll(require.context('./../../app/ui', false, /.json$/));
export function requireAll( requireContext ) {
  return requireContext.keys().map( requireContext );
}

// Returns object with original filename as the key.
// Eg.
// webpack.config:
// module: { // Allow require HTML as a strong. See: https://webpack.js.org/guides/asset-modules/
//   rules: [{
//     test: /\.html$/,
//     type: 'asset/source', // Exports the source code of the asset. Previously achievable by using raw-loader.
//   }],
// },
// const modals = utils.requireAllLookup(require.context('./modals', false, /.html$/));
export function requireAllLookup(requireContext){
  let lookup = {}
  requireContext.keys().forEach((key) => {
    let safeKey = key.replace(/^[\.\\//]*/g, "");
    lookup[safeKey] = requireContext(key)
  });
  return lookup;
} 

// From underscore.js
// Usage: app.renderer.on('resize', debounce(onResize, 1000));
export function debounce(func, wait, immediate) {
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


// TweenMax convenience methods

export function killWaitsFor(callback) {
  TweenMax.killTweensOf(callback);
}

// Optionally set (this) as first arg and will be used as *this* argument
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
  
  return TweenMax.delayedCall.apply(thisArg, args);
  
}


/*
// returns true if the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
export function intersects(a,b,c,d,p,q,r,s) {
  var det, gamma, lambda;
  det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) {
    return false;
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
};

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

// Usage:
// utils.darkenCol(0xff3300, 0.5); // 50% darken
// - amt % int from -1.0 (darken) to 1.0 (lighten)
export function darkenCol(col, amt) {
  return lightenCol(col, -Math.abs(amt))
}
  
  
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

export function isTouchDevice() {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0) ||
     (navigator.msMaxTouchPoints > 0));
}

// Class utils 

export function hasClass(el, className) {
  
    if (el.classList) {
      return el.classList.contains(className);
    }
    return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
    
}

export function addClass(el, className) {
  
    if (el.classList) {
        el.classList.add(className)
    } else if (!hasClass(el, className)) {
        el.className += " " + className;
    }
    
}

export function removeClass(el, className){
  
    if (el.classList) {
      
        el.classList.remove(className)
        
    } else if (hasClass(el, className)) {
        var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
        el.className = el.className.replace(reg, ' ');
    }
    
}

// Offset is an optional argument specifying a value that is on the round beat.
export function roundToNearest(number, step, offset = 0) {
	if (offset != 0) {
		offset = offset-(Math.round(offset/step)*step);
		return offset+Math.round((number-offset)/step)*step;
	} else {
		return (Math.round(number/step)*step);
	}
};

// Loads a js file at runtime
// Usage: loadScript('js/pixi-sound.js', this.onScriptLoaded.bind(this))
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


// Usage:
/*
constructor(options) {

  let defaults = {
      color: 0xff3300,
      isLabel: true
  };

  options = utils.extend(defaults, options);
  
  // use options.color
  
*/
// Source: https://github.com/liabru/matter-js/blob/master/src/core/Common.js
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


// Maths
export function random1PlusMinus() {			
  return Math.random() > 0.5 ? -1.0 : 1.0;
}


export function randFloatNegOneToOne() {			
  return Math.random() * 2.0 - 1.0; 
}

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




