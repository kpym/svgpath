'use strict';


var assert = require('assert');
var ellipse = require('../lib/ellipse');

var e, m;

describe('ellipse', function () {

  it('is degenerate', function () {
    e = ellipse(ellipse.prototype.epsilon, 1, 35);
    assert(e.isDegenerate());

    e = ellipse(1, ellipse.prototype.epsilon, -49);
    assert(e.isDegenerate());

    e = ellipse(1, 2, 128);
    assert(!e.isDegenerate());
  });

  it('transform', function () {
    e = ellipse(10, 20, 21).transform([2, 0, 0, -3]);
    assert.equal(Math.round(e.rx),58);
    assert.equal(Math.round(e.ry),21);
    assert.equal(Math.round(e.ax),78);

    e = ellipse(10, 20, 35).transform([1, 0, 0, 0]);
    assert.equal(Math.round(e.rx),14);
    assert.equal(Math.round(e.ry),0);
    assert.equal(Math.round(e.ax),0);
    assert(e.isDegenerate());
  });

  it('normalise', function () {
    e = ellipse(10, -20, -135).normalise();
    assert.equal(e.rx,10);
    assert.equal(e.ry,20);
    assert.equal(e.ax,45);

    e = ellipse(-10, 20, 135).normalise(10,0);
    assert.equal(e.rx,20);
    assert.equal(e.ry,10);
    assert.equal(e.ax,45);

    e = ellipse(10, 20, 135).normalise(21,0);
    assert.equal(Math.round(e.rx),33);
    assert.equal(Math.round(e.ry),17);
    assert.equal(e.ax,45);
  });

});
