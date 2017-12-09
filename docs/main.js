var app = new Vue({
  el: '#app',
  data: {
    input: '',
    inputtype: 'single',
    unarc: true,
    absrel: 'abs',
    transformation: '',
    bbx: '',
    precision: '2',
    zipit: false,
  },
  computed: {
    inputArr: function() {
      var ia = [];
      switch(this.inputtype) {
        case "single" :
          return [{data:this.input.trim(), issegment:true}];
        case "multiple" :
          return this.input.split(/[\r\n]+/).map(function(p){return {data:p.trim(), issegment:true}});
        case "svg" :
          return this.input.split(/( d="[^"]*")/gi).map(function(p){
              var seg = (p.search(/\s+d\s*=\s*\"\s*/i) >= 0) ;
              if (seg)
                return {data:p.replace(/^\s+d\s*=\s*\"\s*/i,"").replace(/\s*\"\s*$/i,""), issegment:true};
              else
                return {data:p, issegment:false};
            });
      }
    },
    inputSVG: function () {
      return this.str2svg(this.input);
    },
    bbxTransform: function() {
      var strMatrix;
      if (this.bbx){
        var totalpath = SVGPath(this.inputArr.reduce(function(p,s){return s.issegment ? (p + SVGPath(s.data).abs().toString()) : p},""));
        var matrix = totalpath.toBox().inboxMatrix(this.bbx);
        strMatrix = "matrix(" + matrix.join(" ") + ")";
      }
      else
        strMatrix = "";
      return strMatrix;
    },
    output: function () {
      var app = this;
      return this.inputArr
        .map(function(s){
            var strSegment = s.data;
            if (s.issegment){
              strSegment = app.transformSegment(strSegment, app.transformation + app.bbxTransform);
              if (app.inputtype == "svg") {
                strSegment = " d=\""+strSegment+"\"";
              }
            }
            return strSegment;
          })
        .join(app.inputtype == "multiple" ? "\n" : "");
    },
    outputSVG: function () {
      return this.str2svg(this.output);
    },
  },
  methods: {
    autoSetType: function() {
      if (typeof this.input !== "string") {
        return;
      }
      if (/svg/i.test(this.input)) {
        this.inputtype = "svg";
      } else if (/[\n\r]+/i.test(this.input)) {
        this.inputtype = "multiple";
      } else {
        this.inputtype = "single";
      }
    }, // end autoSetType
    transformSegment: function(seg, trans) {
      var p = SVGPath(seg);

      if (this.unarc) {
        p.unarc();
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

      if (this.absrel == "vbx" ) {
        return p.round(this.precision).toBox().toString();
      }
      else {
        return p.round(this.precision).toString(!!this.zipit);
      }
    }, // end transformSegment
    str2svg: function(s) {
      s = s.trim() || "M0,0";
      switch(this.inputtype){
        case "multiple":
          s = s.split(/[\r\n]+/).map(function(s){s = s.trim(); return s[0].toUpperCase() + s.substr(1);}).join(" ");
        case "single":
          return "data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\""+SVGPath(s).toBox().toString()+"\"><path d=\""+s+"\" fill-opacity=\"0.35\"/></svg>";
        case "svg":
          return "data:image/svg+xml,"+s;
        default:
          return "";
      }
    }, // end str2svg
  }
});
