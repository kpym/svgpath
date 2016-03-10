// SVG Path transformations library
//
// Usage:
//
//    SVGPath('...')
//      .translate(-150, -100)
//      .scale(0.5)
//      .translate(-150, -100)
//      .round(1)
//      .toString()
//

/*eslint no-bitwise: 0*/
'use strict';


var pathParse       = require('./path_parse');
var transformParse  = require('./transform_parse');
var affineTransform = require('./affine_transform');
var a2c             = require('./a2c');
var ellipse        = require('./ellipse');
var box        = require('./box');


// Class constructor
//
function SVGPath(path) {
  if (!(this instanceof SVGPath)) { return new SVGPath(path); }

  var pstate = pathParse(path);

  // Array of path segments.
  // Each segment is array [command, param1, param2, ...]
  this.segments         = pstate.segments;

  // Error message on parse error.
  this.errs             = pstate.errs;

  // The current transform (identity at the beginning)
  this.affineTransform  = affineTransform();
}

// Precision used by normalize and toString
// (15 means precision 1e-15), must be integer in [0,20]
//
SVGPath.prototype.precision = 15;

// copy path
//
SVGPath.prototype.copy = function () {
  var newP = new SVGPath('');

  // copy segments
  for (var i = 0, n = this.segments.length; i < n; i++) {
    newP.segments[i] = this.segments[i].slice(0);
  }

  // copy err
  newP.errs = this.errs;

  // copy affineTransform
  newP.affineTransform = this.affineTransform.copy();

  return newP;
};

// Check if the path has parse errors
//
SVGPath.prototype.hasErrors = function () {
  return this.errs.length > 0;
};

// Return a string with all errors (one error per line)
//
SVGPath.prototype.errors = function () {
  var errStrings = [], n = this.errs.length, i;

  for (i = 0; i < n; i++) {
    errStrings.push('[pos:' + this.errs[i].position + ', seg:' + this.errs[i].segment + '] ' + this.errs[i].message);
  }

  return errStrings.join('\n');
};

// Apply transform and return the array of the entire path rounded to the precision.
// If errstop is set to true, only the segments before the first error are returned.
//
SVGPath.prototype.toArray = function (errstop) {
  errstop = !!errstop;

  this.doTransform().round(this.precision);

  return errstop && this.hasErrors() ?
          this.segments.concat.apply([], this.segments.slice(0, this.errs[0].segment - 1)) :
          this.segments.concat.apply([], this.segments);
};

// get the new ending point (not working for Zz)
//
function newPosition(s, oldP) {
  if (s.length <= 1) { return null; } // not working for Zz

  var newP = [ 0, 0 ], n;

  // calculate absolute X and Y
  switch (s[0]) {
    case 'h':
    case 'H':
      newP[0] = s[1];
      newP[1] = (s[0] === 'h') ? 0 : oldP[1];
      break;

    case 'v':
    case 'V':
      newP[0] = (s[0] === 'v') ? 0 : oldP[0];
      newP[1] = s[1];
      break;

    default:
      n = s.length - 2;
      newP[0] = s[n];
      newP[1] = s[n + 1];
  }
  // if relative
  if (s[0] === s[0].toLowerCase()) {
    newP[0] += oldP[0];
    newP[1] += oldP[1];
  }

  return newP;
}

// Apply iterator function to all segments. If function returns result,
// current segment will be replaced to array of returned segments.
// If empty array is returned, current segment will be deleted.
//
SVGPath.prototype.iterate = function (iterator) {
  var self = this,
      segments = this.segments,
      replacements = [],
      newSegments = [],
      needReplace = false,
      lastP = [ 0, 0 ],
      countourStartP = [ 0, 0 ];

  segments.forEach(function (s, index) {
    var res = iterator.call(self, s, index, lastP[0], lastP[1]);

    if (Array.isArray(res)) {
      replacements[index] = res;
      needReplace = true;
    }

    if (s[0] === 'z' || s[0] === 'Z') {
      lastP = countourStartP.slice();
    } else {
      lastP = newPosition(s, lastP);
      if (s[0] === 'm' || s[0] === 'M') {
        countourStartP = lastP.slice();
      }
    }
  }); // end forEach

  if (!needReplace) { return this; }

  // Replace segments if iterator return results
  for (var i = 0, n = segments.length; i < n; i++) {
    if (typeof replacements[i] !== 'undefined') {
      newSegments.push.apply(newSegments, replacements[i]); // add replacement segments
    } else {
      newSegments.push(segments[i]); // add the old segment
    }
  }

  this.segments = newSegments;

  return this;
};

//  Apply the affine transform to the path
//
function __transform(path, at) {

  path.iterate(function (s, index, x, y) {
    var p, result, name, isRelative;

    switch (s[0]) {

      case 'v':
        p      = at.calc(0, s[1], true);
        result = at.preserveV() ? [ 'v', p[1] ] : [ 'l', p[0], p[1] ];
        break;

      case 'V':
        p      = at.calc(x, s[1], false);
        result = at.preserveV() ? [ 'V', p[1] ] : [ 'L', p[0], p[1] ];
        break;

      case 'h':
        p      = at.calc(s[1], 0, true);
        result = at.preserveH() ? [ 'h', p[0] ] : [ 'l', p[0], p[1] ];
        break;

      case 'H':
        p      = at.calc(s[1], y, false);
        result = at.preserveH() ? [ 'H', p[0] ] : [ 'L', p[0], p[1] ];
        break;

      case 'a': // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
      case 'A':
        // Transform rx, ry and the x-axis-rotation
        var e = ellipse(s[1], s[2], s[3], this.precision).transform(at.toArray());

        // Transform end point as usual (without translation for relative notation)
        p = at.calc(s[6], s[7], s[0] === 'a');

        // if the resulting ellipse is (almost) a segment ...
        if (e.isDegenerate()) {
          // replace the arc by a line
          result = [ s[0] === 'a' ? 'l' : 'L', p[0], p[1] ];
        } else {
          // if it is a real ellipse
          // s[0] and s[4] are not modified
          // s[5] (sweep-flag) is fliped if the transform is not orientation preserving
          if (at.det() < 0) {
            s[5] = s[5] ? 0 : 1;
          }
          result = [ s[0], e.rx, e.ry, e.ax, s[4], s[5], p[0], p[1] ];
        }

        break;

      default:
        name       = s[0];
        result     = [ name ];
        isRelative = (name.toLowerCase() === name) && index; // m at position 0 should be like M

        // Apply transformations to the segment
        for (var i = 1, n = s.length; i < n; i += 2) {
          p = at.calc(s[i], s[i + 1], isRelative);
          result.push(p[0], p[1]);
        }
    } // end switch

    // path.segments[index] = result;
    return [result];
  }); // end iterate
}

// Apply stacked commands
//
SVGPath.prototype.doTransform = function () {
  if (this.affineTransform.isIdentity()) { return this; }

  __transform(this, this.affineTransform);
  this.affineTransform.reset();

  return this;
};

// Translate path to (x [, y])
//
SVGPath.prototype.translate = function (x, y) {
  this.affineTransform.translate(x, y || 0);
  return this;
};

// Scale path to (sx [, sy])
// sy = sx if not defined
//
SVGPath.prototype.scale = function (sx, sy) {
  this.affineTransform.scale(sx, isNaN(sy) ? sx : sy);
  return this;
};

// Rotate path around point (sx [, sy])
// sy = sx if not defined
//
SVGPath.prototype.rotate = function (angle, rx, ry) {
  this.affineTransform.rotate(angle, rx || 0, ry || 0);
  return this;
};

// Skew the X-coordinate according to a certain angle specified in degrees
//
SVGPath.prototype.skewX = function (angle) {
  this.affineTransform.skewX(angle);
  return this;
};

// Skew the Y-coordinate according to a certain angle specified in degrees
//
SVGPath.prototype.skewY = function (angle) {
  this.affineTransform.skewY(angle);
  return this;
};

// Apply matrix transform (array of 6 elements)
//
SVGPath.prototype.matrix = function (m) {
  this.affineTransform.compose(m);
  return this;
};

// Transform path according to 'transform' attr of SVG spec
//
SVGPath.prototype.transform = function (transformString) {
  if (!transformString.trim()) {
    return this;
  }
  this.affineTransform.compose(transformParse(transformString));
  return this;
};


// round a decimal number
//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
//  for integers ~~" "  is faster then +" " and ~~undefined=0
//
function round(value, exp) {
  // convert exp to integer (undefined => 0)
  exp = ~~exp;
  // If the exp is undefined or zero...
  if (exp === 0) {
    return Math.round(value);
  }
  // convert value to number
  value = +value;
  // If the value is not a number...
  if (isNaN(value)) {
    return NaN;
  }
  // Shift
  value = value.toString().split('e');
  value = Math.round(+value[0] + 'e' + (~~value[1] + exp));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (~~value[1] - exp));
}

// Round coords with given decimal precision.
// 0 by default (to integers)
//
SVGPath.prototype.round = function (d) {
  this.precision = d = ~~d;

  var contourStartDeltaX = 0, contourStartDeltaY = 0,
      deltaX = 0, deltaY = 0;

  this.doTransform();

  this.segments.forEach(function (s) {
    var isRelative = (s[0].toLowerCase() === s[0]),
        oldX, oldY, l;

    switch (s[0]) {
      case 'H':
      case 'h':
        if (isRelative) { s[1] += deltaX; }
        oldX = s[1];
        s[1] = round(oldX, d);
        deltaX = oldX - s[1];
        return;

      case 'V':
      case 'v':
        if (isRelative) { s[1] += deltaY; }
        oldY = s[1];
        s[1] = round(oldY, d);
        deltaY = oldY - s[1];
        return;

      case 'Z':
      case 'z':
        deltaX = contourStartDeltaX;
        deltaY = contourStartDeltaY;
        return;

      case 'A':
      case 'a':
        // [cmd, rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        s[1] = round(s[1], d);
        s[2] = round(s[2], d);
        s[3] = round(s[3], d + 2); // better precision for rotation
        if (isRelative) {
          s[6] += deltaX;
          s[7] += deltaY;
        }
        // round x,y
        oldX = s[6];
        oldY = s[7];
        s[6] = round(oldX, d);
        s[7] = round(oldY, d);
        deltaX = oldX - s[6];
        deltaY = oldY - s[7];
        return;

      default:
        // Mm Ll Cc Qq Ss Tt
        l = s.length - 3;
        if (isRelative) {
          s[l + 1] += deltaX;
          s[l + 2] += deltaY;
        }
        // round x,y
        oldX = s[l + 1];
        oldY = s[l + 2];
        s[l + 1] = round(oldX, d);
        s[l + 2] = round(oldY, d);
        deltaX = oldX - s[l + 1];
        deltaY = oldY - s[l + 2];
        // round the control points (if any)
        for (; l > 0; l--) {
          s[l] = round(s[l], d);
        }

        if (s[0].toLowerCase() === 'm') {
          contourStartDeltaX = deltaX;
          contourStartDeltaY = deltaY;
        }

        return;
    }
  });

  return this;
};

// Converts segments from relative to absolute
//
SVGPath.prototype.abs = function () {

  this.iterate(function (s, index, x, y) {
    var name = s[0],
        nameUC = name.toUpperCase();

    // Skip absolute commands
    if (name === nameUC) { return; }

    s[0] = nameUC;

    switch (name) {
      case 'v':
        // v has shifted coords parity
        s[1] += y;
        return;

      case 'a':
        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        // touch x, y only
        s[6] += x;
        s[7] += y;
        return;

      default:
        for (var i = 1, n = s.length; i < n; i++) {
          s[i] += i % 2 ? x : y; // odd values are X, even - Y
        }
    }
  }); // end iterate

  return this;
};


// Converts segments from absolute to relative
//
SVGPath.prototype.rel = function () {

  this.iterate(function (s, index, x, y) {
    var name = s[0],
        nameLC = name.toLowerCase();

    // Skip relative commands
    if (name === nameLC) { return; }

    // Don't touch the first M to avoid potential confusions.
    if (index === 0 && name === 'M') { return; }

    s[0] = nameLC;

    switch (name) {
      case 'V':
        // V has shifted coords parity
        s[1] -= y;
        return;

      case 'A':
        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        // touch x, y only
        s[6] -= x;
        s[7] -= y;
        return;

      default:
        for (var i = 1, n = s.length; i < n; i++) {
          s[i] -= i % 2 ? x : y; // odd values are X, even - Y
        }
    }
  }); // end iterate

  return this;
};

// Converts arcs to cubic bézier curves
//
SVGPath.prototype.unarc = function () {

  this.iterate(function (s, index, x, y) {
    var i, new_segments, nextX, nextY, result = [], name = s[0];

    // Skip anything except arcs
    if (name !== 'A' && name !== 'a') { return null; }

    if (name === 'a') {
      // convert relative arc coordinates to absolute
      nextX = x + s[6];
      nextY = y + s[7];
    } else {
      nextX = s[6];
      nextY = s[7];
    }

    new_segments = a2c(x, y, nextX, nextY, s[4], s[5], s[1], s[2], s[3]);

    new_segments.forEach(function (s) {
      result.push([ 'C', s[2], s[3], s[4], s[5], s[6], s[7] ]);
    });

    return result;
  }); // end iterate

  return this;
};

// Converts smooth curves (with missed control point) to generic curves
//
SVGPath.prototype.unshort = function () {
  var segments = this.segments;
  var prevControlX, prevControlY, prevSegment;
  var curControlX, curControlY;

  this.iterate(function (s, idx, x, y) {
    var name = s[0], nameUC = name.toUpperCase(), isRelative;

    // First command MUST be M|m, it's safe to skip.
    // Protect from access to [-1] for sure.
    if (!idx) { return; }

    if (nameUC === 'T') { // quadratic curve
      isRelative = (name === 't');

      prevSegment = segments[idx - 1];

      if (prevSegment[0] === 'Q') {
        prevControlX = prevSegment[1] - x;
        prevControlY = prevSegment[2] - y;
      } else if (prevSegment[0] === 'q') {
        prevControlX = prevSegment[1] - prevSegment[3];
        prevControlY = prevSegment[2] - prevSegment[4];
      } else {
        prevControlX = 0;
        prevControlY = 0;
      }

      curControlX = -prevControlX;
      curControlY = -prevControlY;

      if (!isRelative) {
        curControlX += x;
        curControlY += y;
      }

      segments[idx] = [
        isRelative ? 'q' : 'Q',
        curControlX, curControlY,
        s[1], s[2]
      ];

    } else if (nameUC === 'S') { // cubic curve
      isRelative = (name === 's');

      prevSegment = segments[idx - 1];

      if (prevSegment[0] === 'C') {
        prevControlX = prevSegment[3] - x;
        prevControlY = prevSegment[4] - y;
      } else if (prevSegment[0] === 'c') {
        prevControlX = prevSegment[3] - prevSegment[5];
        prevControlY = prevSegment[4] - prevSegment[6];
      } else {
        prevControlX = 0;
        prevControlY = 0;
      }

      curControlX = -prevControlX;
      curControlY = -prevControlY;

      if (!isRelative) {
        curControlX += x;
        curControlY += y;
      }

      segments[idx] = [
        isRelative ? 'c' : 'C',
        curControlX, curControlY,
        s[1], s[2], s[3], s[4]
      ];
    }
  }); // end iterate

  return this;
};


// check if the segment is empty
//
function emptySegment(s, oldP) {
  var newP = newPosition(s, oldP);

  if (s[0] === 'z' || s[0] === 'Z' || newP[0] !== oldP[0] || newP[1] !== oldP[1]) { return false; }

  // check for particular cases
  switch (s[0]) {
    case 'c':
      return (s[1] === 0) && (s[2] === 0) &&
             (s[3] === 0) && (s[4] === 0);
    case 'C':
      return (s[1] === oldP[0]) && (s[2] === oldP[1]) &&
             (s[3] === oldP[0]) && (s[4] === oldP[1]);
    case 's':
    case 'q':
      return (s[1] === 0) && (s[2] === 0);
    case 'S':
    case 'Q':
      return (s[1] === oldP[0]) && (s[2] === oldP[1]);
  }

  // Mm Ll Hh Vv Tt Aa are empty is newP == oldP
  return true;
}

// check if a segment is short
function shortSegment(s, oldP) {
  return (s && (s[0] === 'S' || s[0] === 's' || s[0] === 'T' || s[0] === 't'));
}

SVGPath.prototype.normalize_first_m = true; // Change first m to M ?
SVGPath.prototype.normalize_remove_empty = true; // Remove empty segments ? Never remove Mm and before SsTt.
SVGPath.prototype.normalize_smash_m = true; // Smash multiple Mm to one ?
SVGPath.prototype.normalize_smash_z = true; // Smash multiple Zz to one ?
SVGPath.prototype.normalize_a2l = true; // Arc with zero radii to line ?
SVGPath.prototype.normalize_arc_ellipse = true; // Scale up radii and set the angle in [0,90[
SVGPath.prototype.normalize_arc_flags = false; // Set arc flags to 0 or 1 (normally already done by the parser)

// convert string to normalize parameters
//
SVGPath.prototype.parseNormalizeFlags = function (flags) {
  if (typeof flags !== 'string') { return; }

  var f;

  // set normalize flags
  f = flags.match(/[Ff]/); if (f) { this.normalize_first_m = (f[0] === 'F'); }
  f = flags.match(/[Ee]/); if (f) { this.normalize_remove_empty = (f[0] === 'E'); }
  f = flags.match(/[Mm]/); if (f) { this.normalize_smash_m = (f[0] === 'M'); }
  f = flags.match(/[Zz]/); if (f) { this.normalize_smash_z = (f[0] === 'Z'); }
  f = flags.match(/[Ll]/); if (f) { this.normalize_a2l = (f[0] === 'L'); }
  f = flags.match(/[Ee]/); if (f) { this.normalize_arc_ellipse = (f[0] === 'E'); }
  f = flags.match(/[Gg]/); if (f) { this.normalize_arc_flags = (f[0] === 'G'); }
};

// perform some normalizations on the segments (drop some if useless)
//
SVGPath.prototype.normalize = function (flags) {

  this.parseNormalizeFlags(flags);

  var prevSegment = null,
      newP, type, prevtype, e,
      segments = this.segments;

  this.iterate(function (s, idx, x, y) {
    // the first must be 'M'
    if (idx === 0) {
      if (this.normalize_first_m && s[0] === 'm') { s[0] = 'M'; }
      prevSegment = s;
      return null; // no replacement needed
    }

    // get types of the segments in lower case
    type = s[0].toLowerCase();
    prevtype = prevSegment && prevSegment[0].toLowerCase();
    newP = newPosition(s, [x, y]);

    // drop or simplify (if followed by SsTt) empty segments that are not Mm
    if (this.normalize_remove_empty && type !== 'm' && emptySegment(s, [x, y])) {
      // drop the segment ?
      if (!shortSegment(segments[idx + 1])) {
        return []; // drop this empty segment
      }
      // simplify the segment ?
      if (type === 'c' || type === 's' || type === 'q' || type === 't'  || type === 'a') {
        if (type === s[0]) {
          // replace this segment by a line
          s[0] = 'l';
          s[1] = s[2] = 0;
        } else {
          s[0] = 'L';
          s[1] = newP[0];
          s[2] = newP[1];
        }
        s.splice(3);
        return null; // no replacement needed
      }
    }

    // if multiple Mm, keep only one M
    if (this.normalize_smash_m && prevSegment && prevtype === 'm' && type === 'm') {
      prevSegment[0] = 'M';
      prevSegment[1] = newP[0];
      prevSegment[2] = newP[1];
      return []; // drop usless move segment
    }

    // if multiple Zz, keep only one
    if (this.normalize_smash_z && prevSegment && prevtype === 'z' && type === 'z') {
      return []; // drop useless move segment
    }

    // normalise Aa
    if (type === 'a') {
      e = ellipse(s[1], s[2], s[3], this.precision);
      if (this.normalize_a2l && e.isDegenerate()) {
        // if one of the radii is (almost) zero
        s[0] = (s[0] === type) ? 'l' : 'L';
        s[1] = s[6];
        s[2] = s[7];
        s.splice(3);
        prevSegment = s;
        return null; // no replacement needed
      }
      if (this.normalize_arc_ellipse) {
        // normalise angle and scale up radii if needed
        e.normalise((newP[0] - x) / 2, (newP[0] - y) / 2);
        s[1] = e.rx;
        s[2] = e.ry;
        s[3] = e.ax;
      }
      if (this.normalize_arc_flags) {
        // normalise the flags (normally already done by the parser)
        s[4] = s[4] ? 1 : 0;
        s[5] = s[5] ? 1 : 0;
      }
    }

    // keep the segment for the next loop
    prevSegment = s;
    return null; // no replacement needed
  }); // end iterate

  return this;
};

// auto-normalise before toString ?
SVGPath.prototype.normalize_before_tostring = true;
//  (integer >=0) the minimal number of digits before in the integer part
SVGPath.prototype.leading_zeros = 0;
//  (integer >=0) the minimal number of digits before in the integer part
SVGPath.prototype.trailing_zeros = 0;
//  ('' | ',' | ', ' | ' , ') the coordinate separator (used also for Aa flags)
SVGPath.prototype.coordinate_separator  = '';
//  zip the string ?
SVGPath.prototype.zip_space_before_command = true; // format flag : B
SVGPath.prototype.zip_space_after_command = true; // format flag : A
SVGPath.prototype.zip_space_after_z = true; // format flag : Z
SVGPath.prototype.zip_space_before_minus = true; // format flag : M
SVGPath.prototype.zip_space_before_dot = false; // format flag : D
SVGPath.prototype.zip_space_use_e = false; // format flag : E
SVGPath.prototype.zip_remove_repeats = true; // format flag : R
SVGPath.prototype.zip_remove_l_after_m = false; // format flag : L

// convert string to parameters
//  - format :
//    - nice : '0.00XX,bazmdeRL' = '0.00XX,-RL'
//    - zip : '.XXXXBAZMDERL' = '.XXXX+'
//
SVGPath.prototype.parseOutputFormat = function (format) {
  if (typeof format !== 'string') { return; }

  var f;

  // set zip flags
  f = format.match(/[+-]/); if (f) { format += (f[0] === '+') ? 'BAZMDERL' : 'bazmderl'; }
  f = format.match(/[Bb]/); if (f) { this.zip_space_before_command = (f[0] === 'B'); }
  f = format.match(/[Aa]/); if (f) { this.zip_space_after_command = (f[0] === 'A'); }
  f = format.match(/[Zz]/); if (f) { this.zip_space_after_z = (f[0] === 'Z'); }
  f = format.match(/[Mm]/); if (f) { this.zip_space_before_minus = (f[0] === 'M'); }
  f = format.match(/[Dd]/); if (f) { this.zip_space_before_dot = (f[0] === 'D'); }
  f = format.match(/[Ee]/); if (f) { this.zip_space_use_e = (f[0] === 'E'); }
  f = format.match(/[Rr]/); if (f) { this.zip_remove_repeats = (f[0] === 'R'); }
  f = format.match(/[Ll]/); if (f) { this.zip_remove_l_after_m = (f[0] === 'L'); }
  // set coordinate separator
  f = format.match(/\s?,\s?/); if (f) { this.coordinate_separator = f[0]; }
  // set precision and number format
  f = format.match(/(?:0*\.[0X]*|0+)/);
  if (f) {
    f = f[0].split('.');
    this.leading_zeros = f[0].length;
    if (f.length > 1) {
      this.precision = Math.min(f[1].length, 20);
      this.trailing_zeros = f[1].split('X')[0].length;
    }
  }
};

function padLeft(s, n) {
  while (s.length < n) { s = '0' + s; }
  return s;
}

function padRight(s, n) {
  while (s.length < n) { s += '0'; }
  return s;
}

SVGPath.prototype.numToString = function (n, safe) {
  // round the number
  n = round(n, this.precision);
  // set the safe space
  var safespace = (safe || this.zip_space_before_minus && n < 0) ? '' : ' ';
  // set the sign (after that n is positive)
  var signstr = '';
  if (n < 0) { signstr = '-'; n = -n; }
  // split to integer and fractional part (do not use toString to avoid scientific notations)
  var s = n.toFixed(this.precision).split('.');
  // in case no fractional part
  if (typeof s[1] !== 'string') { s[1] = ''; }
  // remove trailing 0s from the fractional part
  s[1] = s[1].replace(/0*$/, '');
  // in case s[0] could be reduced to ''
  if (s[0] === '0' && s[1]) { s[0] = ''; }
  // exponential or decimal
  if (this.zip_space_use_e) {
    var shift, temp;
    if (!s[1]) {
      // if no fractional part
      temp = s[0];
      shift = temp.match(/0*$/)[0].length;
      if (shift > 2) {
        s[0] = temp.slice(0, -shift) + 'e' + shift;
      }
    } else if (!s[0]) {
      // if no integer part
      temp = (+s[1]) + 'e' + (-s[1].length);
      if (temp.length < s[1].length + 1) {
        s[0] = temp;
        s[1] = '';
      }
    }
  } else {
    // format the integer part (add leading 0s if needed)
    s[0] = padLeft(s[0], this.leading_zeros);
    // format the fraction part (add trailing 0s if needed)
    s[1] = padRight(s[1], this.trailing_zeros);
  }

  return safespace + signstr + s[0] + (s[1] ? '.' + s[1] : '');
};

SVGPath.prototype.coordsToString = function (x, y, safe) {
  return this.numToString(x, safe)
          + this.coordinate_separator
          + this.numToString(y, this.coordinate_separator);
};

// Convert processed SVG Path back to string
//  - format : string that determine the number format and the zip level
//  - normalize : boolean if set to true (default) the path is normalized
//  - errstop : boolean if set to true, only the segments before the first error are used.
//
SVGPath.prototype.toString = function (format, normalize, errstop) {
  if (typeof format === 'boolean') { format = format ? '+' : '-'; }
  if (typeof format === 'string') { this.parseOutputFormat(format); }
  errstop = !!errstop;

  if (typeof normalize === 'undefined') { normalize = this.normalize_before_tostring; }

  if (normalize) {
    this.normalize();
  }
  this.doTransform().round(this.precision);

  var result = '', printcmd = false, type;
  for (var  i = 0,
            n = errstop && this.hasErrors() ? this.errs[0].segment - 1 : this.segments.length,
            s = this.segments[0],
            prevcmd = null;
        i < n;
            prevcmd = (!this.zip_remove_l_after_m || type !== 'm') ? s[0] : (s[0] === 'M' ? 'L' : 'l'),
            s = this.segments[++i]
            ) {
    // set the path type
    type = s[0].toLowerCase();

    // print repeating command ?
    printcmd = (!this.zip_remove_repeats || s[0] !== prevcmd);
    if (printcmd) {
      if (!this.zip_space_before_command) { result += ' '; }
      result += s[0];
      if (!this.zip_space_after_command && type !== 'z'
          || type === 'z' && !this.zip_space_after_z && this.zip_space_before_command) { result += ' '; }
    }

    switch (type) {
      case 'h':
      case 'v':
        result += this.numToString(s[1], printcmd);
        break;
      case 'a':
        result += this.coordsToString(s[1], s[2], printcmd)
                + this.numToString(s[3])
                + this.coordsToString(s[4], s[5])
                + this.coordsToString(s[6], s[7]);
        break;
      case 'z':
        break;
      default:
        for (var j = 1, m = s.length, safe = printcmd; j < m; j += 2, safe = false) {
          result += this.coordsToString(s[j], s[j + 1], safe);
        }
        break;
    }
  }
  // zip space before dots may be
  if (this.zip_space_before_dot && this.leading_zeros === 0) {
    return result.trim().replace(/(\.\d+) 0?(?=\.)/g, '$1');
  }

  return result.trim();
};

// Return the bounding box (Box object) of the path path.
// The path is converted before with .abs().unarc().unshort()
//
SVGPath.prototype.toBox = function () {
  var bb = box();

  if (this.segments.length === 0) {
    return bb;
  }

  var P = this.copy().abs().unarc().unshort().doTransform();

  P.iterate(function (s, i, x, y) {
    switch (s[0]) {
      case 'H':
        bb.addX(s[1]);
        break;
      case 'V':
        bb.addY(s[1]);
        break;
      case 'M':
      case 'L':
        bb.addX(s[1]);
        bb.addY(s[2]);
        break;
      case 'Q':
        bb.addXQ([ x, s[1], s[3] ]);
        bb.addYQ([ y, s[2], s[4] ]);
        break;
      case 'C':
        bb.addXC([ x, s[1], s[3], s[5] ]);
        bb.addYC([ y, s[2], s[4], s[6] ]);
        break;
    } // end switch
  }); // end iterate

  // round with the current precision
  bb.minX = round(bb.minX, this.precision);
  bb.minY = round(bb.minY, this.precision);
  bb.maxX = round(bb.maxX, this.precision);
  bb.maxY = round(bb.maxY, this.precision);

  return bb;
};

// Return the bounding box as viewBox string 'minX minY width height'
// (with the path precision, set for example with .round())
//
SVGPath.prototype.toBoxString = function (format) {
  // parse the parameters
  this.parseOutputFormat(format);
  // get the bounding box
  var b = this.toBox();
  // convert the box to string using the format parameters
  return [ this.numToString(b.minX, true), this.numToString(b.minY, true),
            this.numToString(b.width(), true), this.numToString(b.height(), true) ].join(' ');
};

// translate and scale the path to fit in a box
// controlled by the following parameters :
// - type:
//  - fit(=none) : scale the path (aspect ratio is not preserved) to fit the box
//  - meet (the default) : scale the path (aspect ratio is preserved) as much as possible
//                         to fit the entire path in the box
//  - slice : scale the path (aspect ratio is preserved) as less as possible to cover the box
//  - move : translate only (no scale) the path according to x???y??? parameter
// - position x(Min|Mid|Max)Y(Min|Mid|Max).
//  example : .inbox('-10 10 300 400 meet xMidYMin')
//            .inbox(-10, 10, 300, 400, 'meet xMidYMin')
//
SVGPath.prototype.inbox = function (parameters) {
  if (typeof parameters !== 'string') {
    // [-10, 10, 300, 400, 'meet xMidYMin'] => '-10 10 300 400 meet xMidYMin'
    parameters = Array.prototype.join.call(arguments, ' ');
  }
  this.matrix(this.toBox().inboxMatrix(parameters));

  return this;
};

module.exports = SVGPath;
