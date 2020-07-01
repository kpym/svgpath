(() => {
  let __defineProperty = Object.defineProperty;
  let __hasOwnProperty = Object.hasOwnProperty;
  let __modules = {};
  let __require = (id) => {
    let module = __modules[id];
    if (!module) {
      module = __modules[id] = {
        exports: {}
      };
      __commonjs[id](module.exports, module);
    }
    return module.exports;
  };
  let __toModule = (module) => {
    if (module && module.__esModule) {
      return module;
    }
    let result = {};
    for (let key in module) {
      if (__hasOwnProperty.call(module, key)) {
        result[key] = module[key];
      }
    }
    result.default = module;
    return result;
  };
  let __import = (id) => {
    return __toModule(__require(id));
  };
  let __commonjs;
  __commonjs = {
    6(exports, module) {
      // path_parse.js
      "use strict";
      var cmdParams = [];
      cmdParams[97] = 7;
      cmdParams[99] = 6;
      cmdParams[104] = 1;
      cmdParams[108] = 2;
      cmdParams[109] = 2;
      cmdParams[113] = 4;
      cmdParams[115] = 4;
      cmdParams[116] = 2;
      cmdParams[118] = 1;
      cmdParams[122] = 0;
      module.exports = function pathParse(s) {
        var l = s.length, i, c, cc, numParams, numNum = 0, parseNum = false, numBuf = "", addnum, hasDot = false, hasE = false, segments = [], curseg = [], errs = [];
        function addError(msg) {
          errs.push({
            position: i,
            segment: segments.length + 1,
            message: msg
          });
        }
        for (i = 0; i <= l; i++) {
          c = s[i] || "z";
          cc = c.toLowerCase().charCodeAt(0);
          if (48 <= cc && cc <= 57) {
            numBuf += c;
            parseNum = true;
            if (curseg[0] !== "A" && curseg[0] !== "a" || cc > 49 || numNum < 3 || numNum > 4) {
              continue;
            }
          }
          if ((cc === 45 || cc === 43) && (!parseNum || hasE && numBuf[numBuf.length - 1] === "e")) {
            numBuf += c;
            parseNum = true;
            continue;
          }
          if (cc === 46 && !hasDot && !hasE) {
            numBuf += c;
            parseNum = true;
            hasDot = true;
            continue;
          }
          if (cc === 101 && parseNum && !isNaN(numBuf)) {
            numBuf += "e";
            parseNum = true;
            hasE = true;
            continue;
          }
          if (parseNum) {
            if (numParams) {
              addnum = +numBuf;
              if (isNaN(numBuf)) {
                addError("Bad formated number [" + numBuf + "]. I'll ignore it.");
              } else {
                curseg.push(addnum);
                numNum++;
              }
            } else {
              addError("Non expected number [" + numBuf + "] at this place. I'll ignore it.");
            }
            numBuf = "";
            parseNum = hasE = hasDot = false;
          }
          if (numNum === numParams && curseg.length) {
            if (curseg[0] === "A" || curseg[0] === "a") {
              curseg[4] = curseg[4] ? 1 : 0;
              curseg[5] = curseg[5] ? 1 : 0;
            }
            if (segments.length === 0 && curseg[0] !== "m" && curseg[0] !== "M") {
              addError("The path must start with M or m. I add 'M 0 0' for you.");
              segments.push(["M", 0, 0]);
            }
            segments.push(curseg);
            numNum = 0;
            switch (curseg[0]) {
              case "M":
                curseg = ["L"];
                break;
              case "m":
                curseg = ["l"];
                break;
              case "Z":
              case "z":
                curseg = [];
                break;
              default:
                curseg = [curseg[0]];
            }
          }
          if (cc === 32 || cc === 9 || cc === 10 || cc === 13 || cc === 44) {
            continue;
          }
          if (cc === 43 || cc === 45 || cc === 46) {
            numBuf = c;
            hasDot = cc === 46;
            parseNum = true;
            continue;
          }
          if (!cmdParams.hasOwnProperty(cc)) {
            addError("Non expected character [" + c + "]. I'll ignore it.");
            continue;
          }
          numParams = cmdParams[cc];
          if (curseg.length > 1) {
            addError("Non complete segment [" + curseg.join(" ") + "]. I'll ignore it.");
          }
          curseg = [c];
          numNum = 0;
        }
        if (curseg.length > 1) {
          addError("Non complete segment [" + curseg.join(" ") + "] (at the end of the path). I'll ignore it.");
        }
        return {
          errs,
          segments
        };
      };
    },

    2(exports, module) {
      // affine_transform.js
      "use strict";
      function compose(m1, m2) {
        return [m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1], m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3], m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5]];
      }
      function AffineTransform(m) {
        if (!(this instanceof AffineTransform)) {
          return new AffineTransform(m);
        }
        if (!m) {
          m = [];
        } else {
          switch (m.constructor) {
            case String:
              m = m.trim().split(/\s+/).map(parseFloat);
              break;
            case AffineTransform:
              m = m.toArray();
              break;
            case Array:
              break;
            default:
              m = [];
          }
        }
        this.matrix = m.slice().concat([1, 0, 0, 1, 0, 0].slice(m.length));
      }
      AffineTransform.prototype.copy = function(epsilon) {
        return new AffineTransform(this.matrix);
      };
      AffineTransform.prototype.isIdentity = function(epsilon) {
        if (epsilon) {
          return (this.matrix[0] - 1) * (this.matrix[0] - 1) + this.matrix[1] * this.matrix[1] + this.matrix[2] * this.matrix[2] + (this.matrix[3] - 1) * (this.matrix[3] - 1) + this.matrix[4] * this.matrix[4] + this.matrix[5] * this.matrix[5] < epsilon;
        }
        return this.matrix[0] === 1 && this.matrix[1] === 0 && this.matrix[2] === 0 && this.matrix[3] === 1 && (this.matrix[4] === 0 && this.matrix[5] === 0);
      };
      AffineTransform.prototype.preserveH = function() {
        return !this.matrix[1];
      };
      AffineTransform.prototype.preserveV = function() {
        return !this.matrix[2];
      };
      AffineTransform.prototype.det = function() {
        return this.matrix[0] * this.matrix[3] - this.matrix[1] * this.matrix[2];
      };
      AffineTransform.prototype.reset = function() {
        this.matrix = [1, 0, 0, 1, 0, 0];
        return this;
      };
      AffineTransform.prototype.compose = function(at) {
        if (!at || at.constructor !== AffineTransform) {
          at = new AffineTransform(at);
        }
        if (at.isIdentity()) {
          return this;
        }
        this.matrix = compose(at.matrix, this.matrix);
        return this;
      };
      AffineTransform.prototype.translate = function(tx, ty) {
        this.matrix[4] += tx;
        this.matrix[5] += ty;
        return this;
      };
      AffineTransform.prototype.scale = function(sx, sy) {
        if (sx !== 1 || sy !== 1) {
          this.matrix[0] *= sx;
          this.matrix[2] *= sx;
          this.matrix[4] *= sx;
          this.matrix[1] *= sy;
          this.matrix[3] *= sy;
          this.matrix[5] *= sy;
        }
        return this;
      };
      AffineTransform.prototype.rotate = function(angle, rx, ry) {
        var rad, cos, sin;
        if (angle !== 0) {
          rad = angle * Math.PI / 180;
          cos = Math.cos(rad);
          sin = Math.sin(rad);
          this.translate(-rx, -ry).compose([cos, sin, -sin, cos, 0, 0]).translate(rx, ry);
        }
        return this;
      };
      AffineTransform.prototype.skewX = function(angle) {
        if (angle !== 0) {
          this.compose([1, 0, Math.tan(angle * Math.PI / 180), 1, 0, 0]);
        }
        return this;
      };
      AffineTransform.prototype.skewY = function(angle) {
        if (angle !== 0) {
          this.compose([1, Math.tan(angle * Math.PI / 180), 0, 1, 0, 0]);
        }
        return this;
      };
      AffineTransform.prototype.toArray = function() {
        return this.matrix;
      };
      AffineTransform.prototype.calc = function(x, y, isRelative) {
        return [this.matrix[0] * x + this.matrix[2] * y + (isRelative ? 0 : this.matrix[4]), this.matrix[1] * x + this.matrix[3] * y + (isRelative ? 0 : this.matrix[5])];
      };
      module.exports = AffineTransform;
    },

    8(exports, module) {
      // transform_parse.js
      "use strict";
      var affineTransform = __require(2 /* ./affine_transform */);
      var numeric_params = {
        matrix: true,
        scale: true,
        rotate: true,
        translate: true,
        skewX: true,
        skewY: true
      };
      var CMD_SPLIT_RE = /\s*((?:matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(?:.+?)\s*\))[\s,]*/;
      var PARAMS_SPLIT_RE = /[\s(),]+/;
      module.exports = function transformParse(transformString) {
        var theTransform = affineTransform();
        var transforms, cmd, params;
        transforms = transformString.split(CMD_SPLIT_RE).filter(Boolean);
        for (var i = transforms.length - 1; i >= 0; i--) {
          params = transforms[i].split(PARAMS_SPLIT_RE).filter(Boolean);
          if (params.length < 2) {
            continue;
          }
          cmd = params.shift();
          if (numeric_params[cmd]) {
            params = params.map(parseFloat);
          }
          switch (cmd) {
            case "matrix":
              if (params.length === 6 || params.length === 4) {
                theTransform.compose(params);
              }
              break;
            case "scale":
              if (params.length === 1) {
                theTransform.scale(params[0], params[0]);
              } else if (params.length === 2) {
                theTransform.scale(params[0], params[1]);
              }
              break;
            case "rotate":
              if (params.length === 1) {
                theTransform.rotate(params[0], 0, 0);
              } else if (params.length === 3) {
                theTransform.rotate(params[0], params[1], params[2]);
              }
              break;
            case "translate":
              if (params.length === 1) {
                theTransform.translate(params[0], 0);
              } else if (params.length === 2) {
                theTransform.translate(params[0], params[1]);
              }
              break;
            case "skewX":
              if (params.length === 1) {
                theTransform.skewX(params[0]);
              }
              break;
            case "skewY":
              if (params.length === 1) {
                theTransform.skewY(params[0]);
              }
              break;
          }
        }
        return theTransform;
      };
    },

    1(exports, module) {
      // a2c.js
      "use strict";
      var TAU = Math.PI * 2;
      function unit_vector_angle(ux, uy, vx, vy) {
        var sign = ux * vy - uy * vx < 0 ? -1 : 1;
        var dot = ux * vx + uy * vy;
        if (dot > 1) {
          dot = 1;
        }
        if (dot < -1) {
          dot = -1;
        }
        return sign * Math.acos(dot);
      }
      function get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi) {
        var x1p = cos_phi * (x1 - x2) / 2 + sin_phi * (y1 - y2) / 2;
        var y1p = -sin_phi * (x1 - x2) / 2 + cos_phi * (y1 - y2) / 2;
        var rx_sq = rx * rx;
        var ry_sq = ry * ry;
        var x1p_sq = x1p * x1p;
        var y1p_sq = y1p * y1p;
        var radicant = rx_sq * ry_sq - rx_sq * y1p_sq - ry_sq * x1p_sq;
        if (radicant < 0) {
          radicant = 0;
        }
        radicant /= rx_sq * y1p_sq + ry_sq * x1p_sq;
        radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);
        var cxp = radicant * rx / ry * y1p;
        var cyp = radicant * -ry / rx * x1p;
        var cx = cos_phi * cxp - sin_phi * cyp + (x1 + x2) / 2;
        var cy = sin_phi * cxp + cos_phi * cyp + (y1 + y2) / 2;
        var v1x = (x1p - cxp) / rx;
        var v1y = (y1p - cyp) / ry;
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
        return [cx, cy, theta1, delta_theta];
      }
      function approximate_unit_arc(theta1, delta_theta) {
        var alpha = 4 / 3 * Math.tan(delta_theta / 4);
        var x1 = Math.cos(theta1);
        var y1 = Math.sin(theta1);
        var x2 = Math.cos(theta1 + delta_theta);
        var y2 = Math.sin(theta1 + delta_theta);
        return [x1, y1, x1 - y1 * alpha, y1 + x1 * alpha, x2 + y2 * alpha, y2 - x2 * alpha, x2, y2];
      }
      module.exports = function a2c(x1, y1, x2, y2, fa, fs, rx, ry, phi) {
        var sin_phi = Math.sin(phi * TAU / 360);
        var cos_phi = Math.cos(phi * TAU / 360);
        var x1p = cos_phi * (x1 - x2) / 2 + sin_phi * (y1 - y2) / 2;
        var y1p = -sin_phi * (x1 - x2) / 2 + cos_phi * (y1 - y2) / 2;
        if (x1p === 0 && y1p === 0) {
          return [];
        }
        if (rx === 0 || ry === 0) {
          return [];
        }
        rx = Math.abs(rx);
        ry = Math.abs(ry);
        var lambda = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
        if (lambda > 1) {
          rx *= Math.sqrt(lambda);
          ry *= Math.sqrt(lambda);
        }
        var cc = get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi);
        var result = [];
        var theta1 = cc[2];
        var delta_theta = cc[3];
        var segments = Math.max(Math.ceil(Math.abs(delta_theta) / (TAU / 4)), 1);
        delta_theta /= segments;
        for (var i = 0; i < segments; i++) {
          result.push(approximate_unit_arc(theta1, delta_theta));
          theta1 += delta_theta;
        }
        return result.map(function(curve) {
          for (var i2 = 0; i2 < curve.length; i2 += 2) {
            var x = curve[i2 + 0];
            var y = curve[i2 + 1];
            x *= rx;
            y *= ry;
            var xp = cos_phi * x - sin_phi * y;
            var yp = sin_phi * x + cos_phi * y;
            curve[i2 + 0] = xp + cc[0];
            curve[i2 + 1] = yp + cc[1];
          }
          return curve;
        });
      };
    },

    5(exports, module) {
      // ellipse.js
      "use strict";
      var torad = Math.PI / 180;
      function Ellipse(rx, ry, ax, precision) {
        if (!(this instanceof Ellipse)) {
          return new Ellipse(rx, ry, ax, precision);
        }
        this.rx = rx;
        this.ry = ry;
        this.ax = ax;
        this.epsilon = typeof precision === "undefined" ? 1e-07 : +("1e" + -precision);
      }
      Ellipse.prototype.transform = function(m) {
        var c = Math.cos(this.ax * torad), s = Math.sin(this.ax * torad);
        var ma = [this.rx * (m[0] * c + m[2] * s), this.rx * (m[1] * c + m[3] * s), this.ry * (-m[0] * s + m[2] * c), this.ry * (-m[1] * s + m[3] * c)];
        var J = ma[0] * ma[0] + ma[2] * ma[2], K = ma[1] * ma[1] + ma[3] * ma[3];
        var D = Math.sqrt(((ma[0] - ma[3]) * (ma[0] - ma[3]) + (ma[2] + ma[1]) * (ma[2] + ma[1])) * ((ma[0] + ma[3]) * (ma[0] + ma[3]) + (ma[2] - ma[1]) * (ma[2] - ma[1])));
        var JK = (J + K) / 2;
        if (D <= this.epsilon) {
          this.rx = this.ry = Math.sqrt(JK);
          this.ax = 0;
          return this;
        }
        if (Math.abs(D - Math.abs(J - K)) <= this.epsilon) {
          this.rx = Math.sqrt(J);
          this.ry = Math.sqrt(K);
          this.ax = 0;
          return this;
        }
        var L = ma[0] * ma[1] + ma[2] * ma[3];
        var l1 = JK + D / 2, l2 = JK - D / 2;
        if (Math.abs(L) <= this.epsilon && Math.abs(l1 - K) <= this.epsilon) {
          this.ax = 0;
          this.rx = Math.sqrt(l2);
          this.ry = Math.sqrt(l1);
          return this;
        }
        this.ax = Math.atan(Math.abs(L) > Math.abs(l1 - K) ? (l1 - J) / L : L / (l1 - K)) / torad;
        if (this.ax >= 0) {
          this.rx = Math.sqrt(l1);
          this.ry = Math.sqrt(l2);
        } else {
          this.ax += 90;
          this.rx = Math.sqrt(l2);
          this.ry = Math.sqrt(l1);
        }
        return this;
      };
      Ellipse.prototype.isDegenerate = function() {
        return Math.abs(this.rx) <= this.epsilon || Math.abs(this.ry) <= this.epsilon;
      };
      Ellipse.prototype.normalise = function(dx, dy) {
        this.rx = Math.abs(this.rx);
        this.ry = Math.abs(this.ry);
        if (Math.abs(this.rx - this.ry) <= this.epsilon) {
          this.ax = 0;
          this.rx = this.ry = (this.rx + this.ry) / 2;
        } else {
          this.ax = this.ax % 180;
          if (this.ax < 0) {
            this.ax += 180;
          }
          if (this.ax >= 90) {
            var tempr;
            tempr = this.rx;
            this.rx = this.ry;
            this.ry = tempr;
            this.ax = this.ax - 90;
          }
        }
        if (!dx && !dy) {
          return this;
        }
        var c = Math.cos(this.ax * torad), s = Math.sin(-this.ax * torad), ndx = (dx * c - dy * s) / this.rx, ndy = (dx * s + dy * c) / this.ry, k = Math.sqrt(ndx * ndx + ndy * ndy);
        if (k > 1) {
          this.rx *= k;
          this.ry *= k;
        }
        return this;
      };
      module.exports = Ellipse;
    },

    3(exports, module) {
      // box.js
      "use strict";
      function Box(s) {
        if (!(this instanceof Box)) {
          return new Box(s);
        }
        if (s && s.constructor === String) {
          var a = s.trim().split(/\s+/).map(parseFloat);
          this.addX(a[0]).addX(a[0] + a[2]).addY(a[1]).addY(a[1] + a[3]);
        }
        return this;
      }
      Box.prototype.copy = function() {
        var nb = new Box();
        nb.minX = this.minX;
        nb.minY = this.minY;
        nb.maxX = this.maxX;
        nb.maxY = this.maxY;
        return nb;
      };
      Box.prototype.width = function() {
        return typeof this.minX === "undefined" ? 0 : this.maxX - this.minX;
      };
      Box.prototype.height = function() {
        return typeof this.minY === "undefined" ? 0 : this.maxY - this.minY;
      };
      Box.prototype.isUndefined = function() {
        return typeof this.minX === "undefined" || typeof this.minY === "undefined";
      };
      Box.prototype.addX = function(x) {
        if (typeof this.minX === "undefined") {
          this.minX = this.maxX = x;
        } else {
          this.minX = Math.min(this.minX, x);
          this.maxX = Math.max(this.maxX, x);
        }
        return this;
      };
      Box.prototype.addY = function(y) {
        if (typeof this.minY === "undefined") {
          this.minY = this.maxY = y;
        } else {
          this.minY = Math.min(this.minY, y);
          this.maxY = Math.max(this.maxY, y);
        }
        return this;
      };
      Box.prototype.addPoint = function(x, y) {
        return this.addX(x).addY(y);
      };
      function minmaxQ(A) {
        var min = Math.min(A[0], A[2]), max = Math.max(A[0], A[2]);
        if (A[1] > A[0] ? A[2] >= A[1] : A[2] <= A[1]) {
          return [min, max];
        }
        var E = (A[0] * A[2] - A[1] * A[1]) / (A[0] - 2 * A[1] + A[2]);
        return E < min ? [E, max] : [min, E];
      }
      Box.prototype.addXQ = function(A) {
        var minmax = minmaxQ(A);
        return this.addX(minmax[0]).addX(minmax[1]);
      };
      Box.prototype.addYQ = function(A) {
        var minmax = minmaxQ(A);
        return this.addY(minmax[0]).addY(minmax[1]);
      };
      var epsilon = 1e-08;
      function minmaxC(A) {
        var K = A[0] - 3 * A[1] + 3 * A[2] - A[3];
        if (Math.abs(K) < epsilon) {
          return minmaxQ([A[0], -0.5 * A[0] + 1.5 * A[1], A[0] - 3 * A[1] + 3 * A[2]]);
        }
        var T = -A[0] * A[2] + A[0] * A[3] - A[1] * A[2] - A[1] * A[3] + A[1] * A[1] + A[2] * A[2];
        if (T <= 0) {
          return [Math.min(A[0], A[3]), Math.max(A[0], A[3])];
        }
        var S = Math.sqrt(T);
        var max = Math.max(A[0], A[3]), min = Math.min(A[0], A[3]);
        var L = A[0] - 2 * A[1] + A[2];
        for (var R = (L + S) / K, i = 1; i <= 2; R = (L - S) / K, i++) {
          if (R > 0 && R < 1) {
            var Q = A[0] * (1 - R) * (1 - R) * (1 - R) + A[1] * 3 * (1 - R) * (1 - R) * R + A[2] * 3 * (1 - R) * R * R + A[3] * R * R * R;
            if (Q < min) {
              min = Q;
            }
            if (Q > max) {
              max = Q;
            }
          }
        }
        return [min, max];
      }
      Box.prototype.addXC = function(A) {
        var minmax = minmaxC(A);
        return this.addX(minmax[0]).addX(minmax[1]);
      };
      Box.prototype.addYC = function(A) {
        var minmax = minmaxC(A);
        return this.addY(minmax[0]).addY(minmax[1]);
      };
      Box.prototype.toArray = function() {
        if (this.isUndefined()) {
          return [0, 0, 0, 0];
        }
        return [this.minX, this.minY, this.maxX, this.maxY];
      };
      Box.prototype.toString = function(pr) {
        if (this.isUndefined()) {
          return "0 0 0 0";
        }
        return (typeof pr === "undefined" ? [this.minX, this.minY, this.width(), this.height()] : [this.minX.toFixed(pr), this.minY.toFixed(pr), this.width().toFixed(pr), this.height().toFixed(pr)]).join(" ");
      };
      Box.prototype.inboxMatrix = function(parameters) {
        var dst = new Box(parameters.match(/(-|\d|\.|\s)+/)[0]);
        var action = (parameters + "meet").match(/(fit|none|meet|slice|move)/)[0];
        if (action === "none") {
          action = "fit";
        }
        var rx, ry;
        switch (action) {
          case "fit":
            rx = this.width() ? dst.width() / this.width() : 1;
            ry = this.height() ? dst.height() / this.height() : 1;
            break;
          case "slice":
            if (this.width() !== 0 && this.height() !== 0) {
              rx = ry = Math.max(dst.width() / this.width(), dst.height() / this.height());
              break;
            }
          case "meet":
            rx = ry = this.width() === 0 && this.height() === 0 ? 1 : Math.min(dst.width() / this.width(), dst.height() / this.height());
            break;
          case "move":
            rx = ry = 1;
            break;
        }
        var position = {};
        position.X = (parameters + "xMid").match(/x(Min|Mid|Max)/i)[1].toLowerCase();
        position.Y = (parameters + "YMid").match(/Y(Min|Mid|Max)/i)[1].toLowerCase();
        var origin = {}, box = {};
        box.src = this;
        box.dst = dst;
        for (var c = "X", i = 1; i <= 2; c = "Y", i++) {
          for (var b = "src", j = 1; j <= 2; b = "dst", j++) {
            switch (position[c]) {
              case "min":
                origin[b + c] = box[b]["min" + c];
                break;
              case "mid":
                origin[b + c] = (box[b]["min" + c] + box[b]["max" + c]) / 2;
                break;
              case "max":
                origin[b + c] = box[b]["max" + c];
                break;
            }
          }
        }
        return [rx, 0, 0, ry, origin.dstX - rx * origin.srcX, origin.dstY - ry * origin.srcY];
      };
      module.exports = Box;
    },

    7(exports, module) {
      // svgpath.js
      "use strict";
      var pathParse = __require(6 /* ./path_parse */);
      var transformParse = __require(8 /* ./transform_parse */);
      var affineTransform = __require(2 /* ./affine_transform */);
      var a2c = __require(1 /* ./a2c */);
      var ellipse = __require(5 /* ./ellipse */);
      var box = __require(3 /* ./box */);
      function SVGPath(path) {
        if (!(this instanceof SVGPath)) {
          return new SVGPath(path);
        }
        var pstate = pathParse(path);
        this.segments = pstate.segments;
        this.errs = pstate.errs;
        this.affineTransform = affineTransform();
      }
      SVGPath.prototype.precision = 7;
      SVGPath.prototype.copy = function() {
        var newP = new SVGPath("");
        for (var i = 0, n = this.segments.length; i < n; i++) {
          newP.segments[i] = this.segments[i].slice(0);
        }
        newP.errs = this.errs;
        newP.affineTransform = this.affineTransform.copy();
        return newP;
      };
      SVGPath.prototype.hasErrors = function() {
        return this.errs.length > 0;
      };
      SVGPath.prototype.errors = function() {
        var errStrings = [], n = this.errs.length, i;
        for (i = 0; i < n; i++) {
          errStrings.push("[pos:" + this.errs[i].position + ", seg:" + this.errs[i].segment + "] " + this.errs[i].message);
        }
        return errStrings.join("\n");
      };
      SVGPath.prototype.toArray = function(errstop) {
        errstop = !!errstop;
        this.doTransform().round(this.precision);
        return errstop && this.hasErrors() ? this.segments.concat.apply([], this.segments.slice(0, this.errs[0].segment - 1)) : this.segments.concat.apply([], this.segments);
      };
      function newPosition(s, oldP) {
        if (s.length <= 1) {
          return null;
        }
        var newP = [0, 0], n;
        switch (s[0]) {
          case "h":
          case "H":
            newP[0] = s[1];
            newP[1] = s[0] === "h" ? 0 : oldP[1];
            break;
          case "v":
          case "V":
            newP[0] = s[0] === "v" ? 0 : oldP[0];
            newP[1] = s[1];
            break;
          default:
            n = s.length - 2;
            newP[0] = s[n];
            newP[1] = s[n + 1];
        }
        if (s[0] === s[0].toLowerCase()) {
          newP[0] += oldP[0];
          newP[1] += oldP[1];
        }
        return newP;
      }
      SVGPath.prototype.iterate = function(iterator) {
        var self = this, segments = this.segments, replacements = [], newSegments = [], lastP = [0, 0], countourStartP = [0, 0];
        segments.forEach(function(s, index) {
          var lastX = lastP[0], lastY = lastP[1];
          var res;
          if (s[0] === "z" || s[0] === "Z") {
            lastP = countourStartP.slice();
          } else {
            lastP = newPosition(s, lastP);
            if (s[0] === "m" || s[0] === "M") {
              countourStartP = lastP.slice();
            }
          }
          res = iterator.call(self, s, index, lastX, lastY);
          if (Array.isArray(res)) {
            replacements[index] = res;
          }
        });
        if (replacements.length === 0) {
          return this;
        }
        for (var i = 0, n = segments.length; i < n; i++) {
          if (typeof replacements[i] !== "undefined") {
            newSegments.push.apply(newSegments, replacements[i]);
          } else {
            newSegments.push(segments[i]);
          }
        }
        this.segments = newSegments;
        return this;
      };
      function __transform(path, at) {
        path.iterate(function(s, index, x, y) {
          var p, result, name, isRelative;
          switch (s[0]) {
            case "v":
              p = at.calc(0, s[1], true);
              result = at.preserveV() ? ["v", p[1]] : ["l", p[0], p[1]];
              break;
            case "V":
              p = at.calc(x, s[1], false);
              result = at.preserveV() ? ["V", p[1]] : ["L", p[0], p[1]];
              break;
            case "h":
              p = at.calc(s[1], 0, true);
              result = at.preserveH() ? ["h", p[0]] : ["l", p[0], p[1]];
              break;
            case "H":
              p = at.calc(s[1], y, false);
              result = at.preserveH() ? ["H", p[0]] : ["L", p[0], p[1]];
              break;
            case "a":
            case "A":
              var e = ellipse(s[1], s[2], s[3], this.precision).transform(at.toArray());
              p = at.calc(s[6], s[7], s[0] === "a");
              if (e.isDegenerate()) {
                result = [s[0] === "a" ? "l" : "L", p[0], p[1]];
              } else {
                if (at.det() < 0) {
                  s[5] = s[5] ? 0 : 1;
                }
                result = [s[0], e.rx, e.ry, e.ax, s[4], s[5], p[0], p[1]];
              }
              break;
            default:
              name = s[0];
              result = [name];
              isRelative = name.toLowerCase() === name && index;
              for (var i = 1, n = s.length; i < n; i += 2) {
                p = at.calc(s[i], s[i + 1], isRelative);
                result.push(p[0], p[1]);
              }
          }
          return [result];
        });
      }
      SVGPath.prototype.doTransform = function() {
        if (this.affineTransform.isIdentity()) {
          return this;
        }
        __transform(this, this.affineTransform);
        this.affineTransform.reset();
        return this;
      };
      SVGPath.prototype.translate = function(x, y) {
        this.affineTransform.translate(x, y || 0);
        return this;
      };
      SVGPath.prototype.scale = function(sx, sy) {
        this.affineTransform.scale(sx, isNaN(sy) ? sx : sy);
        return this;
      };
      SVGPath.prototype.rotate = function(angle, rx, ry) {
        this.affineTransform.rotate(angle, rx || 0, ry || 0);
        return this;
      };
      SVGPath.prototype.skewX = function(angle) {
        this.affineTransform.skewX(angle);
        return this;
      };
      SVGPath.prototype.skewY = function(angle) {
        this.affineTransform.skewY(angle);
        return this;
      };
      SVGPath.prototype.matrix = function(m) {
        this.affineTransform.compose(m);
        return this;
      };
      SVGPath.prototype.transform = function(transformString) {
        if (!transformString.trim()) {
          return this;
        }
        this.affineTransform.compose(transformParse(transformString));
        return this;
      };
      function round(value, exp) {
        exp = ~~exp;
        if (exp === 0) {
          return Math.round(value);
        }
        value = +value;
        if (isNaN(value)) {
          return NaN;
        }
        value = value.toString().split("e");
        value = Math.round(+value[0] + "e" + (~~value[1] + exp));
        value = value.toString().split("e");
        return +(value[0] + "e" + (~~value[1] - exp));
      }
      SVGPath.prototype.round = function(d) {
        this.precision = d = ~~d;
        var contourStartDeltaX = 0, contourStartDeltaY = 0, deltaX = 0, deltaY = 0;
        this.doTransform();
        this.segments.forEach(function(s) {
          var isRelative = s[0].toLowerCase() === s[0], oldX, oldY, l;
          switch (s[0]) {
            case "H":
            case "h":
              if (isRelative) {
                s[1] += deltaX;
              }
              oldX = s[1];
              s[1] = round(oldX, d);
              deltaX = oldX - s[1];
              return;
            case "V":
            case "v":
              if (isRelative) {
                s[1] += deltaY;
              }
              oldY = s[1];
              s[1] = round(oldY, d);
              deltaY = oldY - s[1];
              return;
            case "Z":
            case "z":
              deltaX = contourStartDeltaX;
              deltaY = contourStartDeltaY;
              return;
            case "A":
            case "a":
              s[1] = round(s[1], d);
              s[2] = round(s[2], d);
              s[3] = round(s[3], d + 2);
              if (isRelative) {
                s[6] += deltaX;
                s[7] += deltaY;
              }
              oldX = s[6];
              oldY = s[7];
              s[6] = round(oldX, d);
              s[7] = round(oldY, d);
              deltaX = oldX - s[6];
              deltaY = oldY - s[7];
              return;
            default:
              l = s.length - 3;
              if (isRelative) {
                s[l + 1] += deltaX;
                s[l + 2] += deltaY;
              }
              oldX = s[l + 1];
              oldY = s[l + 2];
              s[l + 1] = round(oldX, d);
              s[l + 2] = round(oldY, d);
              deltaX = oldX - s[l + 1];
              deltaY = oldY - s[l + 2];
              for (; l > 0; l--) {
                s[l] = round(s[l], d);
              }
              if (s[0].toLowerCase() === "m") {
                contourStartDeltaX = deltaX;
                contourStartDeltaY = deltaY;
              }
              return;
          }
        });
        return this;
      };
      SVGPath.prototype.abs = function() {
        this.iterate(function(s, index, x, y) {
          var name = s[0], nameUC = name.toUpperCase();
          if (name === nameUC) {
            return;
          }
          s[0] = nameUC;
          switch (name) {
            case "v":
              s[1] += y;
              return;
            case "a":
              s[6] += x;
              s[7] += y;
              return;
            default:
              for (var i = 1, n = s.length; i < n; i++) {
                s[i] += i % 2 ? x : y;
              }
          }
        });
        return this;
      };
      SVGPath.prototype.rel = function() {
        this.iterate(function(s, index, x, y) {
          var name = s[0], nameLC = name.toLowerCase();
          if (name === nameLC) {
            return;
          }
          if (index === 0 && name === "M") {
            return;
          }
          s[0] = nameLC;
          switch (name) {
            case "V":
              s[1] -= y;
              return;
            case "A":
              s[6] -= x;
              s[7] -= y;
              return;
            default:
              for (var i = 1, n = s.length; i < n; i++) {
                s[i] -= i % 2 ? x : y;
              }
          }
        });
        return this;
      };
      SVGPath.prototype.unarc = function() {
        this.iterate(function(s, index, x, y) {
          var i, new_segments, nextX, nextY, result = [], name = s[0];
          if (name !== "A" && name !== "a") {
            return null;
          }
          if (name === "a") {
            nextX = x + s[6];
            nextY = y + s[7];
          } else {
            nextX = s[6];
            nextY = s[7];
          }
          new_segments = a2c(x, y, nextX, nextY, s[4], s[5], s[1], s[2], s[3]);
          new_segments.forEach(function(s2) {
            result.push(["C", s2[2], s2[3], s2[4], s2[5], s2[6], s2[7]]);
          });
          return result;
        });
        return this;
      };
      SVGPath.prototype.unshort = function() {
        var segments = this.segments;
        var prevControlX, prevControlY, prevSegment;
        var curControlX, curControlY;
        this.iterate(function(s, idx, x, y) {
          var name = s[0], nameUC = name.toUpperCase(), isRelative;
          if (!idx) {
            return;
          }
          if (nameUC === "T") {
            isRelative = name === "t";
            prevSegment = segments[idx - 1];
            if (prevSegment[0] === "Q") {
              prevControlX = prevSegment[1] - x;
              prevControlY = prevSegment[2] - y;
            } else if (prevSegment[0] === "q") {
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
            segments[idx] = [isRelative ? "q" : "Q", curControlX, curControlY, s[1], s[2]];
          } else if (nameUC === "S") {
            isRelative = name === "s";
            prevSegment = segments[idx - 1];
            if (prevSegment[0] === "C") {
              prevControlX = prevSegment[3] - x;
              prevControlY = prevSegment[4] - y;
            } else if (prevSegment[0] === "c") {
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
            segments[idx] = [isRelative ? "c" : "C", curControlX, curControlY, s[1], s[2], s[3], s[4]];
          }
        });
        return this;
      };
      SVGPath.prototype.reverse = function() {
        var lastMX = 0, lastMY = 0;
        var tempX, tempY;
        this.unshort();
        this.segments.push(["M", 0, 0]);
        this.iterate(function(s, idx, x, y) {
          var name = s[0];
          if (!idx && name.toUpperCase() === "M") {
            lastMX = s[1];
            lastMY = s[2];
            return [];
          }
          switch (name) {
            case "M":
              lastMX = s[1];
              lastMY = s[2];
              s[1] = x;
              s[2] = y;
              break;
            case "L":
              s[1] = x;
              s[2] = y;
              break;
            case "m":
              lastMX = x + s[1];
              lastMY = y + s[2];
              s[1] = -s[1];
              s[2] = -s[2];
              break;
            case "l":
              s[1] = -s[1];
              s[2] = -s[2];
              break;
            case "H":
              s[1] = x;
              break;
            case "h":
              s[1] = -s[1];
              break;
            case "V":
              s[1] = y;
              break;
            case "v":
              s[1] = -s[1];
              break;
            case "Z":
              s[1] = x;
              s[2] = y;
              break;
            case "z":
              s[1] = x - lastMX;
              s[2] = y - lastMY;
              break;
            case "Q":
              s[3] = x;
              s[4] = y;
              break;
            case "q":
              s[1] -= s[3];
              s[2] -= s[4];
              s[3] = -s[3];
              s[4] = -s[4];
              break;
            case "C":
              s[5] = x;
              s[6] = y;
              tempX = s[3];
              tempY = s[4];
              s[3] = s[1];
              s[4] = s[2];
              s[1] = tempX;
              s[2] = tempY;
              break;
            case "c":
              tempX = s[1];
              tempY = s[2];
              s[1] = s[3] - s[5];
              s[2] = s[4] - s[6];
              s[3] = tempX - s[5];
              s[4] = tempY - s[6];
              s[5] = -s[5];
              s[6] = -s[6];
              break;
            case "A":
              s[6] = x;
              s[7] = y;
              s[5] = s[5] ? 0 : 1;
              break;
            case "a":
              s[6] = -s[6];
              s[7] = -s[7];
              s[5] = s[5] ? 0 : 1;
              break;
          }
        });
        this.segments.reverse();
        var zbefor = false;
        var mjustbefore = false;
        this.iterate(function(s, idx, x, y) {
          var result = null;
          switch (s[0]) {
            case "z":
              s[0] = "l";
              result = zbefor ? [["z"], ["l", s[1], s[2]]] : mjustbefore ? null : [["m", 0, 0], ["l", s[1], s[2]]];
              zbefor = true;
              break;
            case "Z":
              s[0] = "L";
              result = zbefor ? [["Z"], ["L", s[1], s[2]]] : mjustbefore ? null : [["m", 0, 0], ["L", s[1], s[2]]];
              zbefor = true;
              break;
            case "m":
              result = zbefor ? [["z"], ["m", s[1], s[2]]] : null;
              zbefor = false;
              mjustbefore = true;
              break;
            case "M":
              result = zbefor ? [["Z"], ["M", s[1], s[2]]] : null;
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
        if (zbefor) {
          this.segments.push(["Z"]);
        }
        return this;
      };
      function emptySegment(s, oldP) {
        var newP = newPosition(s, oldP);
        if (s[0] === "z" || s[0] === "Z" || newP[0] !== oldP[0] || newP[1] !== oldP[1]) {
          return false;
        }
        switch (s[0]) {
          case "c":
            return s[1] === 0 && s[2] === 0 && s[3] === 0 && s[4] === 0;
          case "C":
            return s[1] === oldP[0] && s[2] === oldP[1] && s[3] === oldP[0] && s[4] === oldP[1];
          case "s":
          case "q":
            return s[1] === 0 && s[2] === 0;
          case "S":
          case "Q":
            return s[1] === oldP[0] && s[2] === oldP[1];
        }
        return true;
      }
      function shortSegment(s, oldP) {
        return s && (s[0] === "S" || s[0] === "s" || s[0] === "T" || s[0] === "t");
      }
      SVGPath.prototype.normalize_first_m = true;
      SVGPath.prototype.normalize_remove_empty = true;
      SVGPath.prototype.normalize_smash_m = true;
      SVGPath.prototype.normalize_smash_z = true;
      SVGPath.prototype.normalize_a2l = true;
      SVGPath.prototype.normalize_arc_ellipse = true;
      SVGPath.prototype.normalize_arc_flags = false;
      SVGPath.prototype.parseNormalizeFlags = function(flags) {
        if (typeof flags !== "string") {
          return;
        }
        var f;
        f = flags.match(/[Ff]/);
        if (f) {
          this.normalize_first_m = f[0] === "F";
        }
        f = flags.match(/[Ee]/);
        if (f) {
          this.normalize_remove_empty = f[0] === "E";
        }
        f = flags.match(/[Mm]/);
        if (f) {
          this.normalize_smash_m = f[0] === "M";
        }
        f = flags.match(/[Zz]/);
        if (f) {
          this.normalize_smash_z = f[0] === "Z";
        }
        f = flags.match(/[Ll]/);
        if (f) {
          this.normalize_a2l = f[0] === "L";
        }
        f = flags.match(/[Ee]/);
        if (f) {
          this.normalize_arc_ellipse = f[0] === "E";
        }
        f = flags.match(/[Gg]/);
        if (f) {
          this.normalize_arc_flags = f[0] === "G";
        }
      };
      SVGPath.prototype.normalize = function(flags) {
        this.parseNormalizeFlags(flags);
        var prevSegment = null, newP, type, prevtype, e, segments = this.segments;
        this.iterate(function(s, idx, x, y) {
          if (idx === 0) {
            if (this.normalize_first_m && s[0] === "m") {
              s[0] = "M";
            }
            prevSegment = s;
            return null;
          }
          type = s[0].toLowerCase();
          prevtype = prevSegment && prevSegment[0].toLowerCase();
          newP = newPosition(s, [x, y]);
          if (this.normalize_remove_empty && type !== "m" && emptySegment(s, [x, y])) {
            if (!shortSegment(segments[idx + 1])) {
              return [];
            }
            if (type === "c" || type === "s" || type === "q" || type === "t" || type === "a") {
              if (type === s[0]) {
                s[0] = "l";
                s[1] = s[2] = 0;
              } else {
                s[0] = "L";
                s[1] = newP[0];
                s[2] = newP[1];
              }
              s.splice(3);
              return null;
            }
          }
          if (this.normalize_smash_m && prevSegment && prevtype === "m" && type === "m") {
            prevSegment[0] = "M";
            prevSegment[1] = newP[0];
            prevSegment[2] = newP[1];
            return [];
          }
          if (this.normalize_smash_z && prevSegment && prevtype === "z" && type === "z") {
            return [];
          }
          if (type === "a") {
            e = ellipse(s[1], s[2], s[3], this.precision);
            if (this.normalize_a2l && e.isDegenerate()) {
              s[0] = s[0] === type ? "l" : "L";
              s[1] = s[6];
              s[2] = s[7];
              s.splice(3);
              prevSegment = s;
              return null;
            }
            if (this.normalize_arc_ellipse) {
              e.normalise((newP[0] - x) / 2, (newP[1] - y) / 2);
              s[1] = e.rx;
              s[2] = e.ry;
              s[3] = e.ax;
            }
            if (this.normalize_arc_flags) {
              s[4] = s[4] ? 1 : 0;
              s[5] = s[5] ? 1 : 0;
            }
          }
          prevSegment = s;
          return null;
        });
        return this;
      };
      SVGPath.prototype.normalize_before_tostring = true;
      SVGPath.prototype.leading_zeros = 0;
      SVGPath.prototype.trailing_zeros = 0;
      SVGPath.prototype.coordinate_separator = "";
      SVGPath.prototype.zip_space_before_command = true;
      SVGPath.prototype.zip_space_after_command = true;
      SVGPath.prototype.zip_space_after_z = true;
      SVGPath.prototype.zip_space_before_minus = true;
      SVGPath.prototype.zip_space_before_dot = false;
      SVGPath.prototype.zip_space_use_e = false;
      SVGPath.prototype.zip_remove_repeats = true;
      SVGPath.prototype.zip_remove_l_after_m = false;
      SVGPath.prototype.parseOutputFormat = function(format) {
        if (typeof format !== "string") {
          return;
        }
        var f;
        f = format.match(/[+-]/);
        if (f) {
          format += f[0] === "+" ? "BAZMDERL" : "bazmderl";
        }
        f = format.match(/[Bb]/);
        if (f) {
          this.zip_space_before_command = f[0] === "B";
        }
        f = format.match(/[Aa]/);
        if (f) {
          this.zip_space_after_command = f[0] === "A";
        }
        f = format.match(/[Zz]/);
        if (f) {
          this.zip_space_after_z = f[0] === "Z";
        }
        f = format.match(/[Mm]/);
        if (f) {
          this.zip_space_before_minus = f[0] === "M";
        }
        f = format.match(/[Dd]/);
        if (f) {
          this.zip_space_before_dot = f[0] === "D";
        }
        f = format.match(/[Ee]/);
        if (f) {
          this.zip_space_use_e = f[0] === "E";
        }
        f = format.match(/[Rr]/);
        if (f) {
          this.zip_remove_repeats = f[0] === "R";
        }
        f = format.match(/[Ll]/);
        if (f) {
          this.zip_remove_l_after_m = f[0] === "L";
        }
        f = format.match(/\s?,\s?/);
        if (f) {
          this.coordinate_separator = f[0];
        }
        f = format.match(/(?:0*\.[0X]*|0+)/);
        if (f) {
          f = f[0].split(".");
          this.leading_zeros = f[0].length;
          if (f.length > 1) {
            this.precision = Math.min(f[1].length, 20);
            this.trailing_zeros = f[1].split("X")[0].length;
          }
        }
      };
      function padLeft(s, n) {
        while (s.length < n) {
          s = "0" + s;
        }
        return s;
      }
      function padRight(s, n) {
        while (s.length < n) {
          s += "0";
        }
        return s;
      }
      SVGPath.prototype.numToString = function(n, safe) {
        n = round(n, this.precision);
        var safespace = safe || this.zip_space_before_minus && n < 0 ? "" : " ";
        var signstr = "";
        if (n < 0) {
          signstr = "-";
          n = -n;
        }
        var s = n.toFixed(this.precision).split(".");
        if (typeof s[1] !== "string") {
          s[1] = "";
        }
        s[1] = s[1].replace(/0*$/, "");
        if (s[0] === "0" && s[1]) {
          s[0] = "";
        }
        if (this.zip_space_use_e) {
          var shift, temp;
          if (!s[1]) {
            temp = s[0];
            shift = temp.match(/0*$/)[0].length;
            if (shift > 2) {
              s[0] = temp.slice(0, -shift) + "e" + shift;
            }
          } else if (!s[0]) {
            temp = +s[1] + "e" + -s[1].length;
            if (temp.length < s[1].length + 1) {
              s[0] = temp;
              s[1] = "";
            }
          }
        } else {
          s[0] = padLeft(s[0], this.leading_zeros);
          s[1] = padRight(s[1], this.trailing_zeros);
        }
        return safespace + signstr + s[0] + (s[1] ? "." + s[1] : "");
      };
      SVGPath.prototype.coordsToString = function(x, y, safe) {
        return this.numToString(x, safe) + this.coordinate_separator + this.numToString(y, this.coordinate_separator);
      };
      SVGPath.prototype.toString = function(format, normalize, errstop) {
        if (typeof format === "boolean") {
          format = format ? "+" : "-";
        }
        if (typeof format === "string") {
          this.parseOutputFormat(format);
        }
        errstop = !!errstop;
        if (typeof normalize === "undefined") {
          normalize = this.normalize_before_tostring;
        }
        if (normalize) {
          this.normalize();
        }
        this.doTransform().round(this.precision);
        var result = "", printcmd = false, type;
        for (var i = 0, n = errstop && this.hasErrors() ? this.errs[0].segment - 1 : this.segments.length, s = this.segments[0], prevcmd = null; i < n; prevcmd = !this.zip_remove_l_after_m || type !== "m" ? s[0] : s[0] === "M" ? "L" : "l", s = this.segments[++i]) {
          type = s[0].toLowerCase();
          printcmd = !this.zip_remove_repeats || s[0] !== prevcmd;
          if (printcmd) {
            if (!this.zip_space_before_command) {
              result += " ";
            }
            result += s[0];
            if (!this.zip_space_after_command && type !== "z" || type === "z" && !this.zip_space_after_z && this.zip_space_before_command) {
              result += " ";
            }
          }
          switch (type) {
            case "h":
            case "v":
              result += this.numToString(s[1], printcmd);
              break;
            case "a":
              result += this.coordsToString(s[1], s[2], printcmd) + this.numToString(s[3]) + this.coordsToString(s[4], s[5]) + this.coordsToString(s[6], s[7]);
              break;
            case "z":
              break;
            default:
              for (var j = 1, m = s.length, safe = printcmd; j < m; j += 2, safe = false) {
                result += this.coordsToString(s[j], s[j + 1], safe);
              }
              break;
          }
        }
        if (this.zip_space_before_dot && this.leading_zeros === 0) {
          return result.trim().replace(/(\.\d+) 0?(?=\.)/g, "$1");
        }
        return result.trim();
      };
      SVGPath.prototype.toBox = function() {
        var bb = box();
        if (this.segments.length === 0) {
          return bb;
        }
        var P = this.copy().abs().unarc().unshort().doTransform();
        P.iterate(function(s, i, x, y) {
          switch (s[0]) {
            case "H":
              bb.addX(s[1]);
              break;
            case "V":
              bb.addY(s[1]);
              break;
            case "M":
            case "L":
              bb.addX(s[1]);
              bb.addY(s[2]);
              break;
            case "Q":
              bb.addXQ([x, s[1], s[3]]);
              bb.addYQ([y, s[2], s[4]]);
              break;
            case "C":
              bb.addXC([x, s[1], s[3], s[5]]);
              bb.addYC([y, s[2], s[4], s[6]]);
              break;
          }
        });
        bb.minX = round(bb.minX, this.precision);
        bb.minY = round(bb.minY, this.precision);
        bb.maxX = round(bb.maxX, this.precision);
        bb.maxY = round(bb.maxY, this.precision);
        return bb;
      };
      SVGPath.prototype.toBoxString = function(format) {
        this.parseOutputFormat(format);
        var b = this.toBox();
        return [this.numToString(b.minX, true), this.numToString(b.minY, true), this.numToString(b.width(), true), this.numToString(b.height(), true)].join(" ");
      };
      SVGPath.prototype.inbox = function(parameters) {
        if (typeof parameters !== "string") {
          parameters = Array.prototype.join.call(arguments, " ");
        }
        this.matrix(this.toBox().inboxMatrix(parameters));
        return this;
      };
      module.exports = SVGPath;
    },

    4() {
      // browserify_svgpath.js
      SVGPath = __require(7 /* ./svgpath */);
      console.log(`svgpathy library loaded. Use it like this "SVGPath('M10,10h10v10').abs().toString()" to obtain:`);
      console.log(SVGPath("M10,10h10v10").abs().toString());
    }
  };
  return __require(4);
})();
