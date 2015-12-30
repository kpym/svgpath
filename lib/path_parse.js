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
      err = []; // errors array

  function addError(msg) {
    err.push('[pos:' + i + ', seg:' + (segments.length + 1) + '] ' + msg);
  }

  for (i = 0; i <= l; i++) {
    c = s[i] || 'z'; // the last 'z' is ignored
    cc = c.toLowerCase().charCodeAt(0);

    // c = 0,...,9 ?
    if (0x30 <= cc && cc <= 0x39) {
      numBuf += c;
      parseNum = true;
      continue;
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
          addError('Bad formated number ' + numBuf + '. I\'ll ignore it.');
        } else {
          curseg.push(addnum);
          numNum++;
        }
      } else {
        addError('Non expected number ' + numBuf + ' at this place. I\'ll ignore it.');
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
    err: err,
    segments: segments
  };
};
