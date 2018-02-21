var app = new Vue({
  el: '#app',
  data: {
    input: '',
    unarc: false,
    unshort: false,
    reverse: false,
    absrel: 'abs',
    transformation: '',
    bbx: '',
    outputtype: 'single',
    precision: '2',
    zipit: false,
    style:"stroke:red;fill-opacity:.5",
  },
  computed: {
    // contains the input data like this
    // [ {data:'<svg...>',issegment:false},...,{data:'M 0 1 ...',issegment:true},...]
    inputArr: function() {
      var ia = [];
      if (/svg/i.test(this.input)) {
        return this.input.split(/(\s+d\s*=\s*"[^"]*")/gi).map(function(p){
            var seg = (p.search(/\s+d\s*=\s*"/i) >= 0) ;
            if (seg) {
              return {data:p.replace(/^\s+d\s*=\s*"\s*/i,"").replace(/\s*\"\s*$/i,""), issegment:true};
            }
            else {
              return {data:p, issegment:false};
            }
          });
      }
      else {
        return this.input.split(/[\r\n]+/).map(function(p){return {data:p.trim(), issegment:true}});
      }
    },
    // the input svg as url to display
    inputSVG: function () {
      return "data:image/svg+xml,"+encodeURIComponent(this.arr2svg(this.inputArr));
    },
    // reurn the matrix transform to put all the paths in the bounding box (bbx)
    bbxTransform: function() {
      if (this.bbx){
        var totalpath = this.arr2str(this.inputArr,"","abs");
        var matrix = SVGPath(totalpath).toBox().inboxMatrix(this.bbx);
        return "matrix(" + matrix.join(" ") + ")";
      }
      // else
      return "";
    },
    // same as inputArr but all paths are transformed
    outputArr: function () {
      var app = this;
      return this.inputArr
        .map(function(s){
            return {
              data: s.issegment ? app.transformSegment(s.data, app.transformation + app.bbxTransform) : s.data,
              issegment:s.issegment
            }
          });
    },
    // the result to output in the <textarea>
    output: function () {
      switch (this.outputtype) {
        case "single":
          return this.arr2str(this.outputArr,"");
        case "multiple":
          return this.arr2str(this.outputArr,"\n");
        case "tikz-multiple":
          return this.arr2str(this.outputArr,"\n","fill");
        case "svg":
          return this.arr2svg(this.outputArr);
        case "pbbx":
          return this.arr2str(this.outputArr,"\n","bbx");
        case "gbbx":
          return SVGPath(this.arr2str(this.outputArr,"","abs")).toBox().toString(this.precision);
      }
    },
    // the output svg as url to display
    outputSVG: function () {
      return "data:image/svg+xml,"+encodeURIComponent(this.arr2svg(this.outputArr));
    },
    // the style attrinute for paths computed
    styleAttr : function () {
      return this.style ? "style=\""+this.style+"\"" : "";
    },
  },
  methods: {
    // transform the segment based on the globals (unarc, unshort, absrel) and the trans string parameter
    transformSegment: function(seg,trans) {
      var p = SVGPath(seg);

      if (this.unarc) {
        p.unarc();
      }
      if (this.reverse) {
        p.reverse();
      }
      else if (this.unshort) {
        p.unshort();
      }

      switch (this.absrel) {
        case "abs":
          p.abs();
          break;
        case "rel":
          p.rel();
          break;
      }

      p.transform(trans);

      var ziplevel = !this.zipit ? "-" : (this.outputtype=="tikz-multiple") ? "+d": "+";
      console.log("ziplevel: " + ziplevel);

      return p.round(this.precision).toString(ziplevel);
    }, // end transformSegment
    // arr2str = transform inputArr or outputArr to string
    // a = [inputArr|outputArr]
    // joinstr = the string used to join() maped array
    // hook = [abs|bbx|d=|<path>], says how to transforme all segments befor to join them
    // keppall = [true|false], if false we keep only the real (transformed) segments
    arr2str: function(a,joinstr,hook,keepall) {
      var h; // the hook function
      switch(hook) {
        case "abs":
          h = function(s){return SVGPath(s).abs().toString()};
          break;
        case "bbx":
          h = function(s){return SVGPath(s).toBox().toString(this.precision)};
          break;
        case "d=":
          h = function(s){return " d=\""+s+"\""};
          break;
        case "fill":
          h = function(s){return "\\fill svg{"+s+"};"};
          break;
        case "<path>":
          h = (function(s){return "\t<path d=\""+s+"\" "+this.styleAttr+"/>"}).bind(this);
          break;
        default:
          h = function(s){return s};
      }
      return a.map(function(s){return s.issegment ? h(s.data) : (keepall ? s.data : "")}).filter(Boolean).join(joinstr);
    },
    // transform inputArr or outputArr to svg file by autodetecting the type (lines of segments or full svg),
    // in the case of list of segments the viewBox is auto calculated
    arr2svg: function(a) {
      if (!a || a.length == 0)
        return "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>";

      if (a[0].issegment) {
        var bbx = SVGPath(this.arr2str(a,"","abs")).round(this.precision).toBox().toString();
        var paths = this.arr2str(a,"\n","<path>")
        return "<svg xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\""+bbx+"\">\n"+paths+"\n</svg>";
      } else {
        return this.arr2str(a,"","d=",true);
      }
    },// end arr2svg
  }
});
