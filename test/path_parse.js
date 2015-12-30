'use strict';


var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');

var svgpath = require('../');


describe('Path parse', function () {

  it('big batch', function () {
    var batch = fs.readFileSync(path.join(__dirname, '/fixtures/big.txt'), 'utf8').match(/[^\r\n]+/g);

    for (var i = 0, n = batch.length; i < n; i++) {
      assert(!batch[i] || svgpath(batch[i]).err.length === 0, ""+i+":"+svgpath(batch[i]).err.join('\n'));
    }
  });


  it('empty string', function () {
    assert.equal(svgpath('').toString(), '');
  });


  it('line terminators', function () {
    assert.equal(svgpath('M0\r 0\n\u1680l2-3\nz').toString(), 'M0 0l2-3z');
  });


  it('params formats', function () {
    assert.equal(svgpath('M 0.0 0.0').toArray()[1], 0);
    assert.equal(svgpath('M 1e2 0').toArray()[1], 100);
    assert.equal(svgpath('M 1e+2 0').toArray()[1], 100);
    assert.equal(svgpath('M +1e+2 0').toArray()[1], 100);
    assert.equal(svgpath('M 1e-2 0').toArray()[1], .01);
    assert.equal(svgpath('M 0.1e-2 0').toArray()[1], .001);
    assert.equal(svgpath('M .1e-2 0').toArray()[1], .001);
  });

  it('repeated', function () {
    assert.equal(svgpath('M 0 0 100 100').toString(),  'M0 0L100 100');
    assert.equal(svgpath('m 0 0 100 100').toString(),  'M0 0l100 100');
  });

  it('errors', function () {
    assert(svgpath('0').err.length > 0, 'error case 1');
    assert(svgpath('U').err.length > 0, 'error case 2');
    assert(svgpath('z').err.length > 0, 'error case 3');
    assert(svgpath('M+').err.length > 0, 'error case 4');
    assert(svgpath('M00').err.length > 0, 'error case 5');
    assert(svgpath('M0e').err.length > 0, 'error case 6');
    assert(svgpath('M0-.e3').err.length > 0, 'error case 7');
  });
});
