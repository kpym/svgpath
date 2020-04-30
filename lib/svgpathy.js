(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Convert an arc to a sequence of cubic bézier curves
//
'use strict';


var TAU = Math.PI * 2;


/* eslint-disable space-infix-ops */

// Calculate an angle between two unit vectors
//
// Since we measure angle between radii of circular arcs,
// we can use simplified math (without length normalization)
//
function unit_vector_angle(ux, uy, vx, vy) {
  var sign = (ux * vy - uy * vx < 0) ? -1 : 1;
  var dot  = ux * vx + uy * vy;

  // Add this to work with arbitrary vectors:
  // dot /= Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);

  // rounding errors, e.g. -1.0000000000000002 can screw up this
  if (dot >  1.0) { dot =  1.0; }
  if (dot < -1.0) { dot = -1.0; }

  return sign * Math.acos(dot);
}


// Convert from endpoint to center parameterization,
// see http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
//
// Return [cx, cy, theta1, delta_theta]
//
function get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi) {
  // Step 1.
  //
  // Moving an ellipse so origin will be the middlepoint between our two
  // points. After that, rotate it to line up ellipse axes with coordinate
  // axes.
  //
  var x1p =  cos_phi*(x1-x2)/2 + sin_phi*(y1-y2)/2;
  var y1p = -sin_phi*(x1-x2)/2 + cos_phi*(y1-y2)/2;

  var rx_sq  =  rx * rx;
  var ry_sq  =  ry * ry;
  var x1p_sq = x1p * x1p;
  var y1p_sq = y1p * y1p;

  // Step 2.
  //
  // Compute coordinates of the centre of this ellipse (cx', cy')
  // in the new coordinate system.
  //
  var radicant = (rx_sq * ry_sq) - (rx_sq * y1p_sq) - (ry_sq * x1p_sq);

  if (radicant < 0) {
    // due to rounding errors it might be e.g. -1.3877787807814457e-17
    radicant = 0;
  }

  radicant /=   (rx_sq * y1p_sq) + (ry_sq * x1p_sq);
  radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);

  var cxp = radicant *  rx/ry * y1p;
  var cyp = radicant * -ry/rx * x1p;

  // Step 3.
  //
  // Transform back to get centre coordinates (cx, cy) in the original
  // coordinate system.
  //
  var cx = cos_phi*cxp - sin_phi*cyp + (x1+x2)/2;
  var cy = sin_phi*cxp + cos_phi*cyp + (y1+y2)/2;

  // Step 4.
  //
  // Compute angles (theta1, delta_theta).
  //
  var v1x =  (x1p - cxp) / rx;
  var v1y =  (y1p - cyp) / ry;
  var v2x = (-x1p - cxp) / rx;
  var v2y = (-y1p - cyp) / ry;

  var theta1 = unit_vector_angle(1, 0, v1x, v1y);
  var delta_theta = unit_vector_angle(v1x, v1y, v2x, v2y);

  if (fs === 0 && delta_theta > 0) {
    delta_theta -= TAU;
  }
  if (fs === 1 && delta_theta < 0) {
    delta_theta += TAU;
  }

  return [ cx, cy, theta1, delta_theta ];
}

//
// Approximate one unit arc segment with bézier curves,
// see http://math.stackexchange.com/questions/873224
//
function approximate_unit_arc(theta1, delta_theta) {
  var alpha = 4/3 * Math.tan(delta_theta/4);

  var x1 = Math.cos(theta1);
  var y1 = Math.sin(theta1);
  var x2 = Math.cos(theta1 + delta_theta);
  var y2 = Math.sin(theta1 + delta_theta);

  return [ x1, y1, x1 - y1*alpha, y1 + x1*alpha, x2 + y2*alpha, y2 - x2*alpha, x2, y2 ];
}

module.exports = function a2c(x1, y1, x2, y2, fa, fs, rx, ry, phi) {
  var sin_phi = Math.sin(phi * TAU / 360);
  var cos_phi = Math.cos(phi * TAU / 360);

  // Make sure radii are valid
  //
  var x1p =  cos_phi*(x1-x2)/2 + sin_phi*(y1-y2)/2;
  var y1p = -sin_phi*(x1-x2)/2 + cos_phi*(y1-y2)/2;

  if (x1p === 0 && y1p === 0) {
    // we're asked to draw line to itself
    return [];
  }

  if (rx === 0 || ry === 0) {
    // one of the radii is zero
    return [];
  }


  // Compensate out-of-range radii
  //
  rx = Math.abs(rx);
  ry = Math.abs(ry);

  var lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }


  // Get center parameters (cx, cy, theta1, delta_theta)
  //
  var cc = get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi);

  var result = [];
  var theta1 = cc[2];
  var delta_theta = cc[3];

  // Split an arc to multiple segments, so each segment
  // will be less than τ/4 (= 90°)
  //
  var segments = Math.max(Math.ceil(Math.abs(delta_theta) / (TAU / 4)), 1);
  delta_theta /= segments;

  for (var i = 0; i < segments; i++) {
    result.push(approximate_unit_arc(theta1, delta_theta));
    theta1 += delta_theta;
  }

  // We have a bezier approximation of a unit circle,
  // now need to transform back to the original ellipse
  //
  return result.map(function (curve) {
    for (var i = 0; i < curve.length; i += 2) {
      var x = curve[i + 0];
      var y = curve[i + 1];

      // scale
      x *= rx;
      y *= ry;

      // rotate
      var xp = cos_phi*x - sin_phi*y;
      var yp = sin_phi*x + cos_phi*y;

      // translate
      curve[i + 0] = xp + cc[0];
      curve[i + 1] = yp + cc[1];
    }

    return curve;
  });
};

},{}],2:[function(require,module,exports){
'use strict';

// compose 2 matrices representing affine transforms
// if [Li,Ti] with
//    Li 2x2 matrix (the linear part) encoded by [m[0] m[2]]
//                                               [m[1] m[3]]
//    and Ti 1x2 matrix (the translation part) encoded by [m[4]]
//                                                        [m[5]]
//  then m1 x m2 = [L1*L2, L1*A2+A1]
//
function compose(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
  ];
}


// Class constructor
//  the parameter could be :
//    - an array : [a, c, b, d, tx, ty]
//      if the array is not complete it is completed by the missing elements of the identity
//      for example
//        - AffineTransform([]) or AffineTransform() creates the identity
//        - AffineTransform([a b c d]) creates a linear transform (translation part = [0 0])
//    - a string : "a c b d tx ty" then it is parsed to an array (and completed if needed)
//    - another AffineTransform : it is copied
//    - empty or something else : the identity transform is created
//
function AffineTransform(m) {
  if (!(this instanceof AffineTransform)) { return new AffineTransform(m); }
  // make the paramyter array if it is not
  if (!m) {
    // if m is empty, it becomes empty array
    m = [];
  } else {
    switch (m.constructor) {
      case String :
        m = m.trim().split(/\s+/).map(parseFloat);
        break;
      case AffineTransform :
        m = m.toArray();
        break;
      case Array :
        break;
      default:
        m = [];
    }
  }
  // complete the matrix by identity
  this.matrix = m.slice().concat([ 1, 0, 0, 1, 0, 0 ].slice(m.length));
}

// return true if the transform is identity
//
AffineTransform.prototype.copy = function (epsilon) {
  return new AffineTransform(this.matrix);
};

// return true if the transform is identity
//
AffineTransform.prototype.isIdentity = function (epsilon) {
  if (epsilon) {
    return ((this.matrix[0] - 1) * (this.matrix[0] - 1) +
             this.matrix[1] * this.matrix[1] +
             this.matrix[2] * this.matrix[2] +
            (this.matrix[3] - 1) * (this.matrix[3] - 1) +
             this.matrix[4] * this.matrix[4] +
             this.matrix[5] * this.matrix[5]) < epsilon;
  }

  return (this.matrix[0] === 1 && this.matrix[1] === 0 && this.matrix[2] === 0 && this.matrix[3] === 1) &&
           (this.matrix[4] === 0 && this.matrix[5] === 0);
};

// check if Ox is eigen vector of the linear part
//
AffineTransform.prototype.preserveH = function () {
  return !this.matrix[1];
};

// check if Oy is eigen vector of the linear part
//
AffineTransform.prototype.preserveV = function () {
  return !this.matrix[2];
};

// Get the determinant of the linear part.
// Needed to check if the transform is orientation preserving.
//
AffineTransform.prototype.det = function () {
  return this.matrix[0]*this.matrix[3] - this.matrix[1]*this.matrix[2];
};


// set the transform to identity
//
AffineTransform.prototype.reset = function () {
  this.matrix = [ 1, 0, 0, 1, 0, 0 ];

  return this;
};


// compose (multiply on the left) by at
//
AffineTransform.prototype.compose = function (at) {
  if (!at || at.constructor !== AffineTransform) {
    at = new AffineTransform(at);
  }

  if (at.isIdentity()) {
    return this;
  }

  this.matrix = compose(at.matrix, this.matrix);

  return this;
};

// compose (multiply on the left) by a translation
//
AffineTransform.prototype.translate = function (tx, ty) {
  this.matrix[4] += tx;
  this.matrix[5] += ty;
  return this;
};

// compose (multiply on the left) by a scale (diagonal matrix)
//
AffineTransform.prototype.scale = function (sx, sy) {
  if (sx !== 1 || sy !== 1) {
    this.matrix[0]  *= sx; this.matrix[2]  *= sx; this.matrix[4]  *= sx;
    this.matrix[1]  *= sy; this.matrix[3]  *= sy; this.matrix[5]  *= sy;
  }
  return this;
};

// compose (multiply on the left) by a rotation (diagonal matrix)
//
AffineTransform.prototype.rotate = function (angle, rx, ry) {
  var rad, cos, sin;

  if (angle !== 0) {
    rad = angle * Math.PI / 180;
    cos = Math.cos(rad);
    sin = Math.sin(rad);

    this
      .translate(-rx, -ry)
      .compose([ cos, sin, -sin, cos, 0, 0 ])
      .translate(rx, ry);
  }
  return this;
};

// compose (multiply on the left) by a skewW matrix
//
AffineTransform.prototype.skewX = function (angle) {
  if (angle !== 0) {
    this.compose([ 1, 0, Math.tan(angle * Math.PI / 180), 1, 0, 0 ]);
  }

  return this;
};


// compose (multiply on the left) by a skewY matrix
//
AffineTransform.prototype.skewY = function (angle) {
  if (angle !== 0) {
    this.compose([ 1, Math.tan(angle * Math.PI / 180), 0, 1, 0, 0 ]);
  }

  return this;
};


// Get the array representing the transform.
//
AffineTransform.prototype.toArray = function () {
  return this.matrix;
};


// Apply the transform to (x,y) point.
// If `isRelative` set, `translate` component of AffineTransform will be skipped
//
AffineTransform.prototype.calc = function (x, y, isRelative) {
  return [ this.matrix[0] * x + this.matrix[2] * y + (isRelative ? 0 : this.matrix[4]),
           this.matrix[1] * x + this.matrix[3] * y + (isRelative ? 0 : this.matrix[5]) ];
};


module.exports = AffineTransform;

},{}],3:[function(require,module,exports){
'use strict';

// New box : empty or parsed from string like '-10 10 300 400'
//
function Box(s) {
  if (!(this instanceof Box)) { return new Box(s); }

  // minX, minY, maxX, maxY : are not defined yet

  // parse the string parameter
  if (s && s.constructor === String) {
    var a = s.trim().split(/\s+/).map(parseFloat);

    this.addX(a[0]).addX(a[0] + a[2]).addY(a[1]).addY(a[1] + a[3]);
  }

  return this;
}

// Copy box
//
Box.prototype.copy = function () {
  var nb = new Box();

  nb.minX = this.minX;
  nb.minY = this.minY;
  nb.maxX = this.maxX;
  nb.maxY = this.maxY;

  return nb;
};

// width
//
Box.prototype.width = function () {
  return (typeof this.minX === 'undefined') ? 0 : this.maxX - this.minX;
};

// height
//
Box.prototype.height = function () {
  return (typeof this.minY === 'undefined') ? 0 : this.maxY - this.minY;
};

// check if box is not defined yet
//
Box.prototype.isUndefined = function () {
  return (typeof this.minX === 'undefined') || (typeof this.minY === 'undefined');
};

// add new X coordinate
//
Box.prototype.addX = function (x) {
  if (typeof this.minX === 'undefined') {
    this.minX = this.maxX = x;
  } else {
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x);
  }

  return this;
};

// add new Y coordinate
//
Box.prototype.addY = function (y) {
  if (typeof this.minY === 'undefined') {
    this.minY = this.maxY = y;
  } else {
    this.minY = Math.min(this.minY, y);
    this.maxY = Math.max(this.maxY, y);
  }

  return this;
};

// add new point
//
Box.prototype.addPoint = function (x, y) {
  return this.addX(x).addY(y);
};


// ------------------------------
// return [min,max]
// of A[0] * (1-t) * (1-t) + A[1] * 2 * (1-t) * t + A[2] * t * t
// for t in [0,1]
// ------------------------------
function minmaxQ(A) {
  var min = Math.min(A[0], A[2]),
      max = Math.max(A[0], A[2]);

  if (A[1] > A[0] ? A[2] >= A[1] : A[2] <= A[1]) {
    // if no extremum in ]0,1[
    return [ min, max ];
  }

  // check if the extremum E is min or max
  var E = (A[0] * A[2] - A[1] * A[1]) / (A[0] - 2 * A[1] + A[2]);
  return E < min ? [ E, max ] : [ min, E ];
}

// add new quadratic curve to X coordinate
//
Box.prototype.addXQ = function (A) {
  var minmax = minmaxQ(A);

  return this.addX(minmax[0]).addX(minmax[1]);
};

// add new quadratic curve to Y coordinate
//
Box.prototype.addYQ = function (A) {
  var minmax = minmaxQ(A);

  return this.addY(minmax[0]).addY(minmax[1]);
};

// precision for consider cubic polynom as quadratic one
var epsilon = 0.00000001;

// ------------------------------
// return [min,max]
// of A[0] * (1-t) * (1-t) * (1-t) + A[1] * 3 * (1-t) * (1-t) * t + A[2] * 3 * (1-t) * t * t + A[3] * t * t * t
// for t in [0,1]
// ------------------------------
function minmaxC(A) {
  // if the polynomial is (almost) quadratic and not cubic
  var K = A[0] - 3 * A[1] + 3 * A[2] - A[3];
  if (Math.abs(K) < epsilon) {
    return minmaxQ([ A[0], -0.5 * A[0] + 1.5 * A[1], A[0] - 3 * A[1] + 3 * A[2] ]);
  }


  // the reduced discriminant of the derivative
  var T = -A[0] * A[2] + A[0] * A[3] - A[1] * A[2] - A[1] * A[3] + A[1] * A[1] + A[2] * A[2];

  // if the polynomial is monotone in [0,1]
  if (T <= 0) {
    return [ Math.min(A[0], A[3]), Math.max(A[0], A[3]) ];
  }
  var S = Math.sqrt(T);

  // potential extrema
  var max = Math.max(A[0], A[3]),
      min = Math.min(A[0], A[3]);

  var L = A[0] - 2 * A[1] + A[2];
  // check local extrema
  for (var R = (L + S) / K, i = 1; i <= 2; R = (L - S) / K, i++) {
    if (R > 0 && R < 1) {
      // if the extrema is for R in [0,1]
      var Q = A[0] * (1 - R) * (1 - R) * (1 - R) +
              A[1] * 3 * (1 - R) * (1 - R) * R +
              A[2] * 3 * (1 - R) * R * R +
              A[3] * R * R * R;
      if (Q < min) { min = Q; }
      if (Q > max) { max = Q; }
    }
  }

  return [ min, max ];
}

// add new cubic curve to X coordinate
//
Box.prototype.addXC = function (A) {
  var minmax = minmaxC(A);

  return this.addX(minmax[0]).addX(minmax[1]);
};

// add new cubic curve to Y coordinate
//
Box.prototype.addYC = function (A) {
  var minmax = minmaxC(A);

  return this.addY(minmax[0]).addY(minmax[1]);
};

// return an array like [-10, 10, 290, 410] (=[minX, minY, maxX, maxY])
//
Box.prototype.toArray = function () {
  if (this.isUndefined()) {
    return [ 0,  0,  0,  0 ];
  }

  return [ this.minX, this.minY, this.maxX, this.maxY ];
};

// return a string like '-10 10 300 400' (='minX minY width height')
//
Box.prototype.toString = function (pr) {
  // if empty box
  if (this.isUndefined()) {
    return '0 0 0 0';
  }

  // else
  return  ((typeof pr === 'undefined') ?
              [ this.minX, this.minY, this.width(), this.height() ]
            :
              [
                this.minX.toFixed(pr), this.minY.toFixed(pr),
                this.width().toFixed(pr), this.height().toFixed(pr)
              ]
          ).join(' ');
};

// return the transform that translate and scale to fit in a box
// controlled by the following parameters :
// - type:
//  - fit(=none) : scale the box (aspect ratio is not preserved) to fit in the box
//  - meet (the default) : scale the box (aspect ratio is preserved) as much as possible
//                         to cover the destination box
//  - slice : scale the box (aspect ratio is preserved) as less as possible to cover the destination box
//  - move : translate only (no scale) the box according to x???y??? parameter
// - position x(Min|Mid|Max)Y(Min|Mid|Max).
//  example : inboxMatrix(src, '100 0 200 300 meet xMidYMin')
//
Box.prototype.inboxMatrix = function (parameters) {
  var dst = new Box(parameters.match(/(-|\d|\.|\s)+/)[0]);

  // get the action (default is 'meet')
  var action = ((parameters + 'meet').match(/(fit|none|meet|slice|move)/))[0];

  if (action === 'none') { // for compatibility with 'preserveAspectRatio'
    action = 'fit';
  }

  // set the scale factors based on the action
  var rx, ry;
  switch (action) {
    case 'fit':
      rx = this.width() ? dst.width() / this.width() : 1;
      ry = this.height() ? dst.height() / this.height() : 1;
      break;
    case 'slice' :
      if (this.width() !== 0 && this.height() !== 0) {
        rx = ry = Math.max(dst.width()  / this.width(), dst.height() / this.height());
        break;
      }
      // else falls through
    case 'meet' :
      rx = ry = (this.width() === 0 && this.height() === 0) ? 1 :
                Math.min(dst.width() / this.width(), dst.height() / this.height());
      break;
    case 'move':
      rx = ry = 1;
      break;
  }

  // get the position from string like 'xMidYMax'
  var position = {};
  position.X = ((parameters + 'xMid').match(/x(Min|Mid|Max)/i))[1].toLowerCase();
  position.Y = ((parameters + 'YMid').match(/Y(Min|Mid|Max)/i))[1].toLowerCase();

  //  variable that helps to loop over the two boxes
  var origin = {},
      box = {};
  box.src = this;
  box.dst = dst;

  // set the 'origin' of the two boxes based on the position parameters
  for (var c = 'X', i = 1; i <= 2; c = 'Y', i++) {
    for (var b = 'src', j = 1; j <= 2; b = 'dst', j++) {
      switch (position[c]) {
        case 'min':
          origin[b + c] = box[b]['min' + c];
          break;
        case 'mid':
          origin[b + c] = (box[b]['min' + c] + box[b]['max' + c]) / 2;
          break;
        case 'max':
          origin[b + c] = box[b]['max' + c];
          break;
      }
    }
  }

  // return the matrix that is equivalent to
  // .translate(-box.src.originX,-box.src.originY)
  // .scale(rx,ry)
  // .translate(box.dst.originX,box.dst.originY);
  return [ rx, 0, 0, ry, origin.dstX - rx * origin.srcX, origin.dstY - ry * origin.srcY ];
};

module.exports = Box;

},{}],4:[function(require,module,exports){
// use : browserify browserify_svgpath.js -o svgpathy.js
SVGPath = require('./svgpath');

console.log('svgpathy library loaded. Use it like this "SVGPath(\'M10,10h10v10\').abs().toString()" to obtain:');
console.log(SVGPath('M10,10h10v10').abs().toString());

},{"./svgpath":7}],5:[function(require,module,exports){
'use strict';

/* eslint-disable space-infix-ops */

// To convert degree in radians
//
var torad = Math.PI / 180;

// Class constructor :
//  an ellipse centred at 0 with radii rx,ry and x - axis - angle ax.
// The precision is used by methods .isDegenerate() .transform() and .normalize()
//
function Ellipse(rx, ry, ax, precision) {
  if (!(this instanceof Ellipse)) { return new Ellipse(rx, ry, ax, precision); }
  this.rx = rx;
  this.ry = ry;
  this.ax = ax;

  // The precision used to consider an ellipse as a circle or as degenerate
  this.epsilon = (typeof precision === 'undefined') ? 1e-7 : +('1e'+(-precision));
}

// Apply a linear transform m to the ellipse
// m is an array representing a matrix :
//    -         -
//   | m[0] m[2] |
//   | m[1] m[3] |
//    -         -
// return an ellipse with normalised angle :
//  - if circle the angle is 0
//  - in any case the angle is in [0,90]
//
Ellipse.prototype.transform = function (m) {
  // We consider the current ellipse as image of the unit circle
  // by first scale(rx,ry) and then rotate(ax) ...
  // So we apply ma =  m x rotate(ax) x scale(rx,ry) to the unit circle.
  var c = Math.cos(this.ax * torad), s = Math.sin(this.ax * torad);
  var ma = [ this.rx * (m[0]*c + m[2]*s),
             this.rx * (m[1]*c + m[3]*s),
             this.ry * (-m[0]*s + m[2]*c),
             this.ry * (-m[1]*s + m[3]*c) ];

  // ma * transpose(ma) = [ J L ]
  //                      [ L K ]
  // L is calculated later (if the image is not a circle)
  var J = ma[0]*ma[0] + ma[2]*ma[2],
      K = ma[1]*ma[1] + ma[3]*ma[3];

  // the sqrt of the discriminant of the characteristic polynomial of ma * transpose(ma)
  // this is also the geometric mean of the eigenvalues
  var D = Math.sqrt(((ma[0]-ma[3])*(ma[0]-ma[3]) + (ma[2]+ma[1])*(ma[2]+ma[1])) *
                    ((ma[0]+ma[3])*(ma[0]+ma[3]) + (ma[2]-ma[1])*(ma[2]-ma[1])));

  // the arithmetic mean of the eigenvalues
  var JK = (J + K) / 2;

  // check if the image is (almost) a circle
  if (D <= this.epsilon) {
    this.rx = this.ry = Math.sqrt(JK);
    this.ax = 0;
    return this;
  }

  // check if ma * transpose(ma) is (almost) diagonal
  if ( Math.abs(D - Math.abs(J - K)) <= this.epsilon) {
    this.rx = Math.sqrt(J);
    this.ry = Math.sqrt(K);
    this.ax = 0;
    return this;
  }

  // if it is not a circle, nor diagonal
  var L = ma[0]*ma[1] + ma[2]*ma[3];

  // {l1,l2} = the two eigen values of ma * transpose(ma)
  var l1 = JK + D/2,
      l2 = JK - D/2;

  // the x - axis - rotation angle is the argument of the l1 - eigenvector
  if (Math.abs(L) <= this.epsilon && Math.abs(l1-K) <= this.epsilon) { // if (ax == 90) => ax = 0 and exchange axes
    this.ax = 0;
    this.rx = Math.sqrt(l2);
    this.ry = Math.sqrt(l1);
    return this;
  }

  this.ax = Math.atan(Math.abs(L) > Math.abs(l1 - K) ?
                      (l1 - J) / L
                    :
                      L / (l1 - K)
                    ) / torad; // the angle in degree

  // if ax > 0 => rx = sqrt(l1), ry = sqrt(l2), else exchange axes and ax += 90
  if (this.ax >= 0) {
    // if ax in [0,90]
    this.rx = Math.sqrt(l1);
    this.ry = Math.sqrt(l2);
  } else {
    // if ax in ]-90,0[ => exchange axes
    this.ax += 90;
    this.rx = Math.sqrt(l2);
    this.ry = Math.sqrt(l1);
  }

  return this;
};

// Check if the ellipse is (almost) degenerate, i.e. rx = 0 or ry = 0
//
Ellipse.prototype.isDegenerate = function () {
  return (Math.abs(this.rx) <= this.epsilon || Math.abs(this.ry) <= this.epsilon);
};

// Normalise ellipse
//  - (dx,dy) must be non zero vector, the ellipse is scaled to put this vector inside it
//  - the angle is normalised to be in [0,90[
//
Ellipse.prototype.normalise = function (dx, dy) {
  // radii to >=0
  this.rx = Math.abs(this.rx);
  this.ry = Math.abs(this.ry);
  // if almost a circle
  if (Math.abs(this.rx-this.ry) <= this.epsilon) {
    // make it a circle
    this.ax = 0;
    this.rx = this.ry = (this.rx+this.ry)/2;
  } else {
    // normalise the angle
    this.ax = this.ax % 180; // set the angle in ]-180,180[
    if (this.ax < 0) { this.ax += 180; } // set the angle in [0,180[
    if (this.ax >= 90) {
      var tempr;
      // set the angle in [ 0,90 [ by exchanging axes
      tempr = this.rx;
      this.rx = this.ry;
      this.ry = tempr;
      this.ax = this.ax - 90;
    }
  }

  if (!dx && !dy) { return this; }

  // scale radii if needed
  var c = Math.cos(this.ax * torad), s = Math.sin(-this.ax * torad),
      ndx = (dx * c - dy * s) / this.rx,
      ndy = (dx * s + dy * c) / this.ry,
      k = Math.sqrt(ndx * ndx + ndy * ndy);
  if (k > 1) {
    this.rx *= k;
    this.ry *= k;
  }

  return this;
};


module.exports = Ellipse;

},{}],6:[function(require,module,exports){
// Fast tollerent parser
//
'use strict';

// number of parameters
var cmdParams = [];
cmdParams[0x61]  = 7; // A
cmdParams[0x63]  = 6; // C
cmdParams[0x68] = 1; // H
cmdParams[0x6c] = 2; // L
cmdParams[0x6d] = 2; // M
cmdParams[0x71] = 4; // Q
cmdParams[0x73] = 4; // S
cmdParams[0x74] = 2; // T
cmdParams[0x76] = 1; // V
cmdParams[0x7a] = 0; // Z

// pathParse : ' M 0 1 2 3 H 0 1 ' => [['M',0,1]['L',2,3],['H',0]['H,1]]
//
module.exports = function pathParse(s) {
  var l = s.length,
      i, // the current position in the string s
      c, // the current char
      cc, // the current char code
      numParams, // number of parameters for the current command
      numNum = 0, // numbers already founded
      parseNum = false, // parsing number now ?
      numBuf = '', // buffer containing the current parsed number
      addnum, // the current number to add
      hasDot = false, // is float ?
      hasE = false, // is exponential ?
      segments = [], // all segments
      curseg = [], // current segment
      errs = []; // errors array

  function addError(msg) {
    errs.push({
      position : i,
      segment  : segments.length + 1,
      message  : msg
    });
  }

  for (i = 0; i <= l; i++) {
    c = s[i] || 'z'; // the last 'z' is ignored
    cc = c.toLowerCase().charCodeAt(0);

    // c = 0,...,9 ?
    if (0x30 <= cc && cc <= 0x39) {
      numBuf += c;
      parseNum = true;
      // if this is not an arc flag, then continue parsing the number
      if ( (curseg[0] !== 'A' && curseg[0] !== 'a') || cc > 0x31 || numNum < 3 || numNum > 4 ) {
        continue;
      }
    }
    // c = + or -
    if ((cc === 0x2d || cc === 0x2b) &&
        (!parseNum || hasE && numBuf[numBuf.length - 1] === 'e')) {
      numBuf += c;
      parseNum = true;
      continue;
    }
    // c = .
    if (cc === 0x2e && !hasDot && !hasE) {
      numBuf += c;
      parseNum = true;
      hasDot = true;
      continue;
    }
    // c = E or e
    if (cc === 0x65 && parseNum && !isNaN(numBuf)) {
      numBuf += 'e';
      parseNum = true;
      hasE = true;
      continue;
    }

    // end parsing current number ?
    if (parseNum) {
      if (numParams) {
        // add the new number to the current segment ?
        addnum = +numBuf;
        if (isNaN(numBuf)) {
          addError('Bad formated number [' + numBuf + ']. I\'ll ignore it.');
        } else {
          curseg.push(addnum);
          numNum++;
        }
      } else {
        addError('Non expected number [' + numBuf + '] at this place. I\'ll ignore it.');
      }
      numBuf = '';
      parseNum = hasE = hasDot = false;
    } // end parse number

    // segment is ready ?
    if (numNum === numParams && curseg.length) {
      if (curseg[0] === 'A' || curseg[0] === 'a') {
        // set flags to 0 or 1
        curseg[4] = curseg[4] ? 1 : 0;
        curseg[5] = curseg[5] ? 1 : 0;
      }
      if (segments.length === 0 && curseg[0] !== 'm' && curseg[0] !== 'M') {
        addError('The path must start with M or m. I add \'M 0 0\' for you.');
        segments.push(['M', 0, 0]);
      }
      segments.push(curseg);
      // start new segment
      numNum = 0;
      switch (curseg[0]) {
        case 'M' :
          curseg = ['L'];
          break;
        case 'm' :
          curseg = ['l'];
          break;
        case 'Z' :
        case 'z' :
          curseg = [];
          break;
        default :
          curseg = [curseg[0]];
      }
    }

    // is space, tab, new line or coma ? ignore it
    if (cc === 0x20 || cc === 9 || cc === 0xa || cc === 0xd || cc === 0x2c) {
      continue;
    }

    // if new number start just after another with +-.
    if (cc === 0x2b || cc === 0x2d || cc === 0x2e) {
      numBuf = c;
      hasDot = (cc === 0x2e);
      parseNum = true;
      continue;
    }

    // if this is a known command ?
    if (!cmdParams.hasOwnProperty(cc)) {
      addError('Non expected character [' + c + ']. I\'ll ignore it.');
      continue;
    }

    // take the number of parameters
    numParams = cmdParams[cc];

    // if unfinished segment
    if (curseg.length > 1) {
      addError('Non complete segment [' + curseg.join(' ') + ']. I\'ll ignore it.');
    }

    // start new segment
    curseg = [c];
    numNum = 0;
  } // end for

  // last check
  if (curseg.length > 1) {
    // if unfinished segment
    addError('Non complete segment [' + curseg.join(' ') + '] (at the end of the path). I\'ll ignore it.');
  }

  return {
    errs: errs,
    segments: segments
  };
};

},{}],7:[function(require,module,exports){
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
// (7 means precision 1e-7), must be integer in [0,20]
//
SVGPath.prototype.precision = 7;

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
      lastP = [ 0, 0 ],
      countourStartP = [ 0, 0 ];

  segments.forEach(function (s, index) {
    var lastX = lastP[0], lastY = lastP[1];
    var res;

    if (s[0] === 'z' || s[0] === 'Z') {
      lastP = countourStartP.slice();
    } else {
      lastP = newPosition(s, lastP);
      if (s[0] === 'm' || s[0] === 'M') {
        countourStartP = lastP.slice();
      }
    }

    res = iterator.call(self, s, index, lastX, lastY);

    if (Array.isArray(res)) {
      replacements[index] = res;
    }
  }); // end forEach

  if (replacements.length === 0) { return this; }

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


// reverse the path direction (before the path is unshorten)
//
SVGPath.prototype.reverse = function () {
  var lastMX = 0, lastMY = 0; // the last move destination
  var tempX, tempY; // temp coordinates

  // it is not obvious how we should reverse short commands line S|s|T|t,
  // so we convert them to C|c|Q|q.
  this.unshort();

  // add the future new first M
  this.segments.push(['M', 0, 0]);

  // first we reverse the segments direction
  this.iterate(function (s, idx, x, y) {
    var name = s[0];

    // the first segments must be M
    if (!idx && name.toUpperCase() === 'M') {
      lastMX = s[1];
      lastMY = s[2];
      return []; // remove the first move
    }

    switch (name) {
      case 'M':
        lastMX = s[1]; lastMY = s[2];
        s[1] = x; s[2] = y;
        break;
      case 'L':
        s[1] = x; s[2] = y;
        break;
      case 'm':
        lastMX = x + s[1]; lastMY = y + s[2];
        s[1] = -s[1]; s[2] = -s[2];
        break;
      case 'l':
        s[1] = -s[1]; s[2] = -s[2];
        break;
      case 'H':
        s[1] = x;
        break;
      case 'h':
        s[1] = -s[1];
        break;
      case 'V':
        s[1] = y;
        break;
      case 'v':
        s[1] = -s[1];
        break;
      case 'Z':
        s[1] = x; s[2] = y; // this Z will become L
        break;
      case 'z':
        s[1] = x - lastMX; s[2] = y - lastMY; // this z will become l
        break;
      case 'Q':
        s[3] = x; s[4] = y;
        break;
      case 'q':
        s[1] -= s[3]; s[2] -= s[4];
        s[3] = -s[3]; s[4] = -s[4];
        break;
      case 'C':
        s[5] = x; s[6] = y;
        tempX = s[3]; tempY = s[4];
        s[3] = s[1]; s[4] = s[2];
        s[1] = tempX; s[2] = tempY;
        break;
      case 'c':
        tempX = s[1]; tempY = s[2];
        s[1] = s[3] - s[5]; s[2] = s[4] - s[6];
        s[3] = tempX - s[5]; s[4] = tempY - s[6];
        s[5] = -s[5]; s[6] = -s[6];
        break;
      case 'A':
        s[6] = x; s[7] = y;
        s[5] = s[5] ? 0 : 1;
        break;
      case 'a':
        s[6] = -s[6]; s[7] = -s[7];
        s[5] = s[5] ? 0 : 1;
        break;
    }
  });

  //and reverse the order of all segments
  this.segments.reverse();


  // correct all Z|z by replacing them by L|l and by adding new Z|z at the end of the connected part
  var zbefor = false;
  var mjustbefore = false;
  this.iterate(function (s, idx, x, y) {
    var result = null;

    switch (s[0]) {
      case 'z':
        s[0] = 'l';
        result = zbefor ? [['z'], ['l', s[1], s[2]]] : (mjustbefore ? null : [[ 'm', 0, 0], ['l', s[1], s[2]]]);
        zbefor = true;
        break;
      case 'Z':
        s[0] = 'L';
        result = zbefor ? [['Z'], ['L', s[1], s[2]]] : (mjustbefore ? null : [['m', 0, 0], ['L', s[1], s[2]]]);
        zbefor = true;
        break;
      case 'm':
        result = zbefor ? [['z'], ['m', s[1], s[2]]] : null;
        zbefor = false;
        mjustbefore = true;
        break;
      case 'M':
        result = zbefor ? [['Z'], ['M', s[1], s[2]]] : null;
        zbefor = false;
        mjustbefore = true;
        break;
      default:
        mjustbefore = false;
        result = null;
        break;
    }
    return result;
  });
  // if necessary add the final Z
  if (zbefor) {
    this.segments.push(['Z']);
  }

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
        e.normalise((newP[0] - x) / 2, (newP[1] - y) / 2);
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

},{"./a2c":1,"./affine_transform":2,"./box":3,"./ellipse":5,"./path_parse":6,"./transform_parse":8}],8:[function(require,module,exports){
'use strict';


var affineTransform = require('./affine_transform');

var numeric_params = {
  matrix: true,
  scale: true,
  rotate: true,
  translate: true,
  skewX: true,
  skewY: true
};

var CMD_SPLIT_RE    = /\s*((?:matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(?:.+?)\s*\))[\s,]*/;
var PARAMS_SPLIT_RE = /[\s(),]+/;


module.exports = function transformParse(transformString) {
  var theTransform = affineTransform();
  var transforms, cmd, params;

  // Split value into ['', 'translate(10 50)', '', 'scale(2)', '', 'rotate(-45)', '']
  // then eliminate empty strings with .filter(Boolean)
  transforms = transformString.split(CMD_SPLIT_RE).filter(Boolean);
  for (var i = transforms.length - 1; i >= 0; i--) {
    // params will be something like ["scale","1","2"]
    params = transforms[i].split(PARAMS_SPLIT_RE).filter(Boolean);

    // Skip bad commands (if any)
    if (params.length < 2) { continue; }

    // separate the command from the parameters
    cmd = params.shift();
    // if all parameters should be numeric, parse them
    if (numeric_params[cmd]) {
      params = params.map(parseFloat);
    }

    // If params count is not correct - ignore command
    switch (cmd) {
      case 'matrix':
        if (params.length === 6 || params.length === 4) {
          theTransform.compose(params);
        }
        break;

      case 'scale':
        if (params.length === 1) {
          theTransform.scale(params[0], params[0]);
        } else if (params.length === 2) {
          theTransform.scale(params[0], params[1]);
        }
        break;

      case 'rotate':
        if (params.length === 1) {
          theTransform.rotate(params[0], 0, 0);
        } else if (params.length === 3) {
          theTransform.rotate(params[0], params[1], params[2]);
        }
        break;

      case 'translate':
        if (params.length === 1) {
          theTransform.translate(params[0], 0);
        } else if (params.length === 2) {
          theTransform.translate(params[0], params[1]);
        }
        break;

      case 'skewX':
        if (params.length === 1) {
          theTransform.skewX(params[0]);
        }
        break;

      case 'skewY':
        if (params.length === 1) {
          theTransform.skewY(params[0]);
        }
        break;
    } // end switch
  } // end for

  return theTransform;
};

},{"./affine_transform":2}]},{},[4]);
