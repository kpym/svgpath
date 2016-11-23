// use : browserify browserify_svgpath.js -o svgpathy.js
SVGPath = require('./svgpath');

console.log('svgpathy library loaded. Use it like this "SVGPath(\'M10,10h10v10\').abs().toString()" to obtain:');
console.log(SVGPath('M10,10h10v10').abs().toString());
