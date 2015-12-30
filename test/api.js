/* eslint-disable max-len */

'use strict';

var assert  = require('assert');
var svgpath = require('../');


describe('API', function () {

  describe('toString', function () {
    it('without zip', function () {
      assert.equal(
        svgpath('M1e3-1e-3.1.2-.3-.4 100 10Z').toString(false),
        'M 1000 -.001 L .1 .2 L -.3 -.4 L 100 10 Z'
      );
    });

    it('without zip, with format', function () {
      assert.equal(
        svgpath('M1e3-1e-3.1.2-.3-.4 100 10Z').toString('-00.0X,'),
        'M 1000.0,00.0 L 00.1,00.2 L -00.3,-00.4 L 100.0,10.0 Z'
      );
    });

    it('zip', function () {
      assert.equal(
        svgpath('M1e3-1e-3.1.2-.3-.4 100 10Z').toString(),
        'M1000-.001L.1 .2-.3-.4 100 10Z'
      );
    });

    it('zip + EDL', function () {
      assert.equal(
        svgpath('M1e3-1e-3.1.2-.3-.4 100 10Z').toString('EDL'),
        'M1e3-.001.1.2-.3-.4 100 10Z'
      );
    });

    it('zip - bar', function () {
      assert.equal(
        svgpath('M1 2 3 4 H1 V2ZH2').toString('bar'),
        'M 1 2 L 3 4 H 1 V 2 Z H 2'
      );
    });
  });

  describe('unshort - cubic', function () {
    it('shouldn\'t change full arc', function () {
      assert.deepEqual(
        svgpath('M10 10 C 20 20, 40 20, 50 10').unshort().toArray(),
        ['M', 10, 10, 'C', 20, 20, 40, 20, 50, 10]
      );
    });

    it('should reflect control point after full path', function () {
      assert.deepEqual(
        svgpath('M10 10 C 20 20, 40 20, 50 10 S 80 0, 90 10').unshort().toArray(),
        ['M', 10, 10, 'C', 20, 20, 40, 20, 50, 10, 'C', 60, 0, 80, 0, 90, 10]
      );
    });

    it('should copy starting point if not C before', function () {
      assert.deepEqual(
        svgpath('M10 10 S 50 50, 90 10').unshort().toArray(),
        ['M', 10, 10, 'C', 10, 10, 50, 50, 90, 10]
      );
    });

    it('should handle relative paths', function () {
      assert.deepEqual(
        svgpath('M30 50 c 10 30, 30 30, 40 0 s 30 -30, 40 0').unshort().toArray(),
        ['M', 30, 50, 'c', 10, 30, 30, 30, 40, 0, 'c', 10, -30, 30, -30, 40, 0]
      );
    });
  });


  describe('unshort - quadratic', function () {
    it('shouldn\'t change full arc', function () {
      assert.deepEqual(
        svgpath('M10 10 Q 50 50, 90 10').unshort().toArray(),
        ['M', 10, 10, 'Q', 50, 50, 90, 10]
      );
    });

    it('should reflect control point after full path', function () {
      assert.deepEqual(
        svgpath('M30 50 Q 50 90, 90 50 T 150 50').unshort().toArray(),
        ['M', 30, 50, 'Q', 50, 90, 90, 50, 'Q', 130, 10, 150, 50]
      );
    });

    it('should copy starting point if not followed by a path', function () {
      assert.deepEqual(
        svgpath('M10 30 T150 50').unshort().toArray(),
        ['M', 10, 30, 'Q', 10, 30, 150, 50]
      );
    });

    it('should handle relative paths', function () {
      assert.deepEqual(
        svgpath('M30 50 q 20 20, 40 0 t 40 0').unshort().toArray(),
        ['M', 30, 50, 'q', 20, 20, 40, 0, 'q', 20, -20, 40, 0]
      );
    });
  });


  describe('abs', function () {
    it('should convert line', function () {
      assert.deepEqual(
        svgpath('M10 10 l 30 30').abs().toArray(),
        ['M', 10, 10, 'L', 40, 40]
      );
    });

    it('shouldn\'t process existing line', function () {
      assert.deepEqual(
        svgpath('M10 10 L30 30').abs().toArray(),
        ['M', 10, 10, 'L', 30, 30]
      );
    });

    it('should convert multi-segment curve', function () {
      assert.deepEqual(
        svgpath('M10 10 c 10 30 30 30 40, 0 10 -30 20 -30 40 0').abs().toArray(),
        ['M', 10, 10, 'C', 20, 40, 40, 40, 50, 10, 'C', 60, -20, 70, -20, 90, 10]
      );
    });

    it('should handle horizontal lines', function () {
      assert.deepEqual(
        svgpath('M10 10H40h50').abs().toArray(),
        ['M', 10, 10, 'H', 40, 'H', 90]
      );
    });

    it('should handle vertical lines', function () {
      assert.deepEqual(
        svgpath('M10 10V40v50').abs().toArray(),
        ['M', 10, 10, 'V', 40, 'V', 90]
      );
    });

    it('should handle arcs', function () {
      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 20 50').abs().toArray(),
        ['M', 40, 30, 'A', 20, 40, -45, 0, 1, 60, 80]
      );
    });

    it('should track position after z', function () {
      assert.deepEqual(
        svgpath('M10 10 l10 0 l0 10 Z l 0 10 l 10 0 z l-1-1').abs().toArray(),
        ['M', 10, 10, 'L', 20, 10, 'L', 20, 20, 'Z', 'L', 10, 20, 'L', 20, 20, 'Z', 'L', 9, 9]
      );
    });
  });


  describe('rel', function () {
    it('should convert line', function () {
      assert.deepEqual(
        svgpath('M10 10 L30 30').rel().toArray(),
        ['M', 10, 10, 'l', 20, 20]
      );
    });

    it('shouldn\'t process existing line', function () {
      assert.deepEqual(
        svgpath('m10 10 l30 30').rel().toArray(),
        ['m', 10, 10, 'l', 30, 30]
      );
    });

    it('should convert multi-segment curve', function () {
      assert.deepEqual(
        svgpath('M10 10 C 20 40 40 40 50 10 60 -20 70 -20 90 10').rel().toArray(),
        ['M', 10, 10, 'c', 10, 30, 30, 30, 40, 0, 'c', 10, -30, 20, -30, 40, 0]
      );
    });

    it('should handle horizontal lines', function () {
      assert.deepEqual(
        svgpath('M10 10H40h50').rel().toArray(),
        ['M', 10, 10, 'h', 30, 'h', 50]
      );
    });

    it('should handle vertical lines', function () {
      assert.deepEqual(
        svgpath('M10 10V40v50').rel().toArray(),
        ['M', 10, 10, 'v', 30, 'v', 50]
      );
    });

    it('should handle arcs', function () {
      assert.deepEqual(
        svgpath('M40 30A20 40 -45 0 1 60 80').rel().toArray(),
        ['M', 40, 30, 'a', 20, 40, -45, 0, 1, 20, 50]
      );
    });

    it('should track position after z', function () {
      assert.deepEqual(
        svgpath('M10 10 L20 10 L20 20 Z L10 20 L20 20 z L9 9').rel().toArray(),
        ['M', 10, 10, 'l', 10, 0, 'l', 0, 10, 'z', 'l', 0, 10, 'l', 10, 0, 'z', 'l', -1, -1]
      );
    });
  });


  describe('scale', function () {
    it('should scale abs curve', function () {
      assert.deepEqual(
        svgpath('M10 10 C 20 40 40 40 50 10').scale(2, 1.5).toArray(),
        ['M', 20, 15, 'C', 40, 60, 80, 60, 100, 15]
      );
    });

    it('should scale rel curve', function () {
      assert.deepEqual(
        svgpath('M10 10 c 10 30 30 30 40 0').scale(2, 1.5).toArray(),
        ['M', 20, 15, 'c', 20, 45, 60, 45, 80, 0]
      );
    });

    it('second argument defaults to the first', function () {
      assert.deepEqual(
        svgpath('M10 10l20 30').scale(2).toArray(),
        ['M', 20, 20, 'l', 40, 60]
      );
    });

    it('should handle horizontal lines', function () {
      assert.deepEqual(
        svgpath('M10 10H40h50').scale(2, 1.5).toArray(),
        ['M', 20, 15, 'H', 80, 'h', 100]
      );
    });

    it('should handle vertical lines', function () {
      assert.deepEqual(
        svgpath('M10 10V40v50').scale(2, 1.5).toArray(),
        ['M', 20, 15, 'V', 60, 'v', 75]
      );
    });

    it('should handle arcs', function () {
      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 20 50').scale(2, 1.5).round(0).toArray(),
        ['M', 80, 45, 'a', 72, 34, 32.04, 0, 1, 40, 75]
      );

      assert.deepEqual(
        svgpath('M40 30A20 40 -45 0 1 20 50').scale(2, 1.5).round(0).toArray(),
        ['M', 80, 45, 'A', 72, 34, 32.04, 0, 1, 40, 75]
      );
    });
  });


  describe('rotate', function () {
    it('rotate by 90 degrees about point(10, 10)', function () {
      assert.deepEqual(
        svgpath('M10 10L15 10').rotate(90, 10, 10).round(0).toArray(),
        ['M', 10, 10, 'L', 10, 15]
      );
    });

    it('rotate by -90 degrees about point (0,0)', function () {
      assert.deepEqual(
        svgpath('M0 10L0 20').rotate(-90).round(0).toArray(),
        ['M', 10, 0, 'L', 20, 0]
      );
    });

    it('rotate abs arc', function () {
      assert.deepEqual(
        svgpath('M 100 100 A 90 30 0 1 1 200 200').rotate(45).round(0).toArray(),
        ['M', 0, 141, 'A', 90, 30, 45, 1, 1, 0, 283]
      );
    });

    it('rotate rel arc', function () {
      assert.deepEqual(
        svgpath('M 100 100 a 90 30 15 1 1 200 200').rotate(20).round(0).toArray(),
        ['M', 60, 128, 'a', 90, 30, 35, 1, 1, 119, 257]
      );
    });
  });


  describe('matrix', function () {
    // x = x*1.5 + y/2 + ( absolute ? 10 : 0)
    // y = x/2 + y*1.5 + ( absolute ? 15 : 0)
    it('path with absolute segments', function () {
      assert.deepEqual(
        svgpath('M5 5 C20 30 10 15 30 15').matrix([ 1.5, 0.5, 0.5, 1.5, 10, 15 ]).toArray(),
        ['M', 20, 25, 'C', 55, 70, 32.5, 42.5, 62.5, 52.5]
      );
    });

    it('path with relative segments', function () {
      assert.deepEqual(
        svgpath('M5 5 c10 12 10 15 20 30').matrix([ 1.5, 0.5, 0.5, 1.5, 10, 15 ]).toArray(),
        ['M', 20, 25, 'c', 21, 23, 22.5, 27.5, 45, 55]
      );
    });

    it('no change', function () {
      assert.deepEqual(
        svgpath('M5 5 C20 30 10 15 30 15').matrix([ 1, 0, 0, 1, 0, 0 ]).toArray(),
        ['M', 5, 5, 'C', 20, 30, 10, 15, 30, 15]
      );
    });

    it('should handle arcs', function () {
      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 20 50').matrix([ 1.5, 0.5, 0.5, 1.5, 10, 15 ]).round(0).toArray(),
        ['M', 85, 80, 'a', 80, 20, 45, 0, 1, 55, 85]
      );

      assert.deepEqual(
        svgpath('M40 30A20 40 -45 0 1 20 50').matrix([ 1.5, 0.5, 0.5, 1.5, 10, 15 ]).round(0).toArray(),
        ['M', 85, 80, 'A', 80, 20, 45, 0, 1, 65, 100]
      );
    });
  });


  describe('combinations', function () {
    it('scale + translate', function () {
      assert.deepEqual(
        svgpath('M0 0 L 10 10 20 10').scale(2, 3).translate(100, 100).toArray(),
        ['M', 100, 100, 'L', 120, 130, 'L', 140, 130]
      );
    });

    it('scale + rotate', function () {
      assert.deepEqual(
        svgpath('M0 0 L 10 10 20 10').scale(2, 3).rotate(90).round(0).toArray(),
        ['M', 0, 0, 'L', -30, 20, 'L', -30, 40]
      );
    });

    it('empty', function () {
      assert.deepEqual(
        svgpath('M0 0 L 10 10 20 10').translate(0).scale(1).rotate(0, 10, 10).round(0).toArray(),
        ['M', 0, 0, 'L', 10, 10, 'L', 20, 10]
      );
    });
  });


  describe('translate', function () {
    it('should translate abs curve', function () {
      assert.deepEqual(
        svgpath('M10 10 C 20 40 40 40 50 10').translate(5, 15).toArray(),
        ['M', 15, 25, 'C', 25, 55, 45, 55, 55, 25]
      );
    });

    it('should translate rel curve', function () {
      assert.deepEqual(
        svgpath('M10 10 c 10 30 30 30 40 0').translate(5, 15).toArray(),
        ['M', 15, 25, 'c', 10, 30, 30, 30, 40, 0]
      );
    });

    it('second argument defaults to zero', function () {
      assert.deepEqual(
        svgpath('M10 10L20 30').translate(10).toArray(),
        ['M', 20, 10, 'L', 30, 30]
      );
    });

    it('should handle horizontal lines', function () {
      assert.deepEqual(
        svgpath('M10 10H40h50').translate(10, 15).toArray(),
        ['M', 20, 25, 'H', 50, 'h', 50]
      );
    });

    it('should handle vertical lines', function () {
      assert.deepEqual(
        svgpath('M10 10V40v50').translate(10, 15).toArray(),
        ['M', 20, 25, 'V', 55, 'v', 50]
      );
    });

    it('should handle arcs', function () {
      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 20 50').translate(10, 15).round(0).toArray(),
        ['M', 50, 45, 'a', 40, 20, 45, 0, 1, 20, 50]
      );

      assert.deepEqual(
        svgpath('M40 30A20 40 -45 0 1 20 50').translate(10, 15).round(0).toArray(),
        ['M', 50, 45, 'A', 40, 20, 45, 0, 1, 30, 65]
      );
    });
  });


  describe('round', function () {
    it('should round arcs', function () {
      assert.deepEqual(
        svgpath('M10 10 A12.5 17.5 45.5 0 0 15.5 19.5').round(0).toArray(),
        ['M', 10, 10, 'A', 13, 18, 45.5, 0, 0, 16, 20]
      );
    });

    it('should round curves', function () {
      assert.deepEqual(
        svgpath('M10 10 c 10.12 30.34 30.56 30 40.00 0.12').round(0).toArray(),
        ['M', 10, 10, 'c', 10, 30, 31, 30, 40, 0]
      );
    });

    it('set precision', function () {
      assert.deepEqual(
        svgpath('M10.123 10.456L20.4351 30.0000').round(2).toArray(),
        ['M', 10.12, 10.46, 'L', 20.44, 30]
      );
    });

    it('should track errors', function () {
      assert.deepEqual(
        svgpath('M1.2 1.4l1.2 1.4 l1.2 1.4').round(0).toArray(),
        ['M', 1, 1, 'l', 1, 2, 'l', 2, 1]
      );
    });

    it('should track errors #2', function () {
      assert.deepEqual(
        svgpath('M1.2 1.4 H2.4 h1.2 v2.4 h-2.4 V2.4 v-1.2').round(0).toArray(),
        ['M', 1, 1, 'H', 2, 'h', 2, 'v', 3, 'h', -3, 'V', 2, 'v', -1]
      );
    });

    it('should track errors for contour start', function () {
      assert.deepEqual(
        svgpath('m0.4 0.2zm0.4 0.2m0.4 0.2m0.4 0.2zm0.4 0.2').round(0).abs().toArray(),
        ['M', 0, 0, 'Z', 'M', 1, 0, 'M', 1, 1, 'M', 2, 1, 'Z', 'M', 2, 1]
      );
    });
  });


  describe('unarc', function () {
    it('almost complete arc gets expanded to 4 curves', function () {
      assert.deepEqual(
        svgpath('M100 100 A30 50 0 1 1 110 110').unarc().round(0).toArray(),
        ['M', 100, 100, 'C', 89, 83, 87, 54, 96, 33, 'C', 105, 12, 122, 7, 136, 20, 'C', 149, 33, 154, 61, 147, 84, 'C', 141, 108, 125, 119, 110, 110]
      );
    });

    it('small arc gets expanded to one curve', function () {
      assert.deepEqual(
        svgpath('M100 100 a30 50 0 0 1 30 30').unarc().round(0).toArray(),
        ['M', 100, 100, 'C', 113, 98, 125, 110, 130, 130]
      );
    });

    it('unarc a circle', function () {
      assert.deepEqual(
        svgpath('M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0').unarc().round(0).toArray(),
        ['M', 100, 100, 'm', -75, 0, 'C', 25, 141, 59, 175, 100, 175, 'C', 141, 175, 175, 141, 175, 100, 'C', 175, 59, 141, 25, 100, 25, 'C', 59, 25, 25, 59, 25, 100]
      );
    });

    it('rounding errors', function () {
      // Coverage
      //
      // Due to rounding errors, with these exact arguments radicant
      // will be -9.974659986866641e-17, causing Math.sqrt() of that to be NaN
      //
      assert.deepEqual(
        svgpath('M-0.5 0 A 0.09188163040671497 0.011583783896639943 0 0 1 0 0.5').unarc().round(5).toArray(),
        ['M', -0.5, 0, 'C', 0.59517, -0.01741, 1.59491, 0.08041, 1.73298, 0.21848, 'C', 1.87105, 0.35655, 1.09517, 0.48259, 0, 0.5]
      );
    });

    it('rounding errors #2', function () {
      // Coverage
      //
      // Due to rounding errors this will compute Math.acos(-1.0000000000000002)
      // and fail when calculating vector between angles
      //
      assert.deepEqual(
        svgpath('M-0.07467194809578359 -0.3862391309812665' + 'A1.2618792965076864 0.2013618852943182 90 0 1 -0.7558937461581081 -0.8010219619609416').unarc().round(5).toArray(),
        ['M', -0.07467, -0.38624, 'C', -0.09295, 0.79262, -0.26026, 1.65542, -0.44838, 1.54088, 'C', -0.63649, 1.42634, -0.77417, 0.37784, -0.75589, -0.80102]
      );
    });

    it('we\'re already there', function () {
      // Asked to draw a curve between a point and itself. According to spec,
      // nothing shall be drawn in this case.
      //
      assert.deepEqual(
        svgpath('M100 100A123 456 90 0 1 100 100').unarc().round(0).toArray(),
        ['M', 100, 100]
      );
    });

    it('radii are zero', function () {
      // both rx and ry are zero
      assert.deepEqual(
        svgpath('M100 100A0 0 0 0 1 110 110').unarc().round(0).toArray(),
        ['M', 100, 100]
      );

      // rx is zero
      assert.deepEqual(
        svgpath('M100 100A0 100 0 0 1 110 110').unarc().round(0).toArray(),
        ['M', 100, 100]
      );
    });
  });

  describe('normalise', function () {
    it('general example', function () {
      assert.deepEqual(
        svgpath('m 1 2 M 3 4 m 1 0 z Z z M 0 0 l 0 0 a 10 20 135 10 -0 40 40').normalize().round().toArray(),
        ['M', 4, 4, 'z', 'M', 0, 0, 'a', 28, 14, 45, 1, 0, 40, 40]
      );
    });

    it('drop arcs with end point === start point', function () {
      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 0 0').scale(2, 2).normalize().toArray(),
        ['M', 80, 60]
      );

      assert.deepEqual(
        svgpath('M40 30A20 40 -45 0 1 40 30').scale(2, 2).normalize().toArray(),
        ['M', 80, 60]
      );
    });
  });

  describe('arc transform edge cases', function () {
    it('replace arcs rx/ry = 0 with lines', function () {
      assert.deepEqual(
        svgpath('M40 30a0 40 -45 0 1 20 50Z M40 30A20 0 -45 0 1 20 50Z').scale(2, 2).toArray(),
        ['M', 80, 60, 'l', 40, 100, 'Z', 'M', 80, 60, 'L', 40, 100, 'Z']
      );
    });

    it('to line at scale x|y = 0 ', function () {
      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 20 50').scale(0, 1).toArray(),
        ['M', 0, 30, 'l', 0, 50]
      );

      assert.deepEqual(
        svgpath('M40 30A20 40 -45 0 1 20 50').scale(1, 0).toArray(),
        ['M', 40, 0, 'L', 20, 0]
      );
    });

    it('rotate to +/- 90 degree', function () {
      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 20 50').rotate(90).round(0).toArray(),
        ['M', -30, 40, 'a', 20, 40, 45, 0, 1, -50, 20]
      );

      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 20 50').matrix([ 0, 1, -1, 0, 0, 0 ]).round(0).toArray(),
        ['M', -30, 40, 'a', 20, 40, 45, 0, 1, -50, 20]
      );

      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 20 50').rotate(-90).round(0).toArray(),
        ['M', 30, -40, 'a', 20, 40, 45, 0, 1, 50, -20]
      );

      assert.deepEqual(
        svgpath('M40 30a20 40 -45 0 1 20 50').matrix([ 0, -1, 1, 0, 0, 0 ]).round(0).toArray(),
        ['M', 30, -40, 'a', 20, 40, 45, 0, 1, 50, -20]
      );
    });

    it('process circle-like segments', function () {
      assert.deepEqual(
        svgpath('M50 50A30 30 -45 0 1 100 100').scale(0.5).round(0).toArray(),
        ['M', 25, 25, 'A', 15, 15, 0, 0, 1, 50, 50]
      );
    });
  });

  describe('bounding box', function () {
    it('get the bounding box', function () {
      assert.equal(
        svgpath('M10,10 c 10,0 10,10 0,10 s -10,0 0,10 q 10,10 15 20 t 10,0 a25,25 -30 0,1 50,-25z').round(3).toBox().toArray().join(' '),
        '2.5 9.543 85 55'
      );

      assert.equal(
        svgpath('M10,10 c 10,0 10,10 0,10 s -10,0 0,10 q 10,10 15 20 t 10,0 a25,25 -30 0,1 50,-25z').round(2).toBoxString(),
        '2.5 9.54 82.5 45.46'
      );

      assert.equal(
        svgpath('M10,10 c 10,0 10,10 0,10 s -10,0 0,10 q 10,10 15 20 t 10,0 a25,25 -30 0,1 50,-25z').toBoxString('00.00'),
        '02.50 09.54 82.50 45.46'
      );
    });

    it('matrix to fit in a box', function () {
      assert.equal(
        svgpath('M10,10 h10 v20').inbox('0 0 100 100').toBoxString(),
        '25 0 50 100'
      );

      assert.equal(
        svgpath('M10,10 h10 v20').inbox('0 0 100 100 slice xMinYMax').toBoxString(),
        '0 -100 100 200'
      );

      assert.equal(
        svgpath('M10,10 h10 v20').inbox('0 0 100 100 fit').toBoxString(),
        '0 0 100 100'
      );

      assert.equal(
        svgpath('M10,10 h10 v20').inbox('0 0 100 100 move xMaxYMid').toBoxString(),
        '90 40 10 20'
      );
    });
  });
});
