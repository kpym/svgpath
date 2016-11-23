SVGPath(y)
=========

This project started as fork of [svgpath](https://github.com/fontello/svgpath).
They are very similar, but I rewrote a big part of the library to fit my needs. Why ? Because I need a less strict parser (if some error is present in the path I don't want the parser to stops.), more options to convert the path back to string and some functionality that the authors of [svgpath](https://github.com/fontello/svgpath) don't want (like `.inbox`). I also want to use this library in a browser (not only in node).

> Low level toolkit for SVG paths transformations. Sometime you can't use
`transform` attributes and have to apply changes to svg paths directly.
Then this package is for you :) !

Note, this package works with `paths`, not with svg xml sources.

Example
-------

## Load in Node

```js
var SVGPath = require('svgpath');
```

## Load in browser

```
<script src="svgpathy.js" type="text/javascript" ></script>
```

## Use it
```
var transformed = SVGPath(__your_path__)
                    .scale(0.5)
                    .translate(100,200)
                    .rel()
                    .round(1)
                    .toString();
```


API
---

Almost all methods are chainable (return self).

## Construction

### new SVGPath(path) -> self

Constructor. Creates new `SVGPath` class instance with chainable methods.
The `new` can be omitted.

### .copy() -> self

Create a copy of the path.


## Affine transforms

### .scale(sx [, sy]) -> self

Rescale path (the same as SVG `scale` transformation). `sy` = `sx` by default.


### .translate(x [, y]) -> self

Translate path (the same as SVG `translate` transformation). `y` = 0 by default.


### .rotate(angle [, rx, ry]) -> self

Rotate path to `angle` degree around (rx, ry) point. If rotation center not set,
(0, 0) used. The same as SVG `rotate` transformation.

### .skewX(a) -> self

Skew the X-coordinate according to a certain angle specified in degrees. The same as SVG `skewX` transformation.

### .skewY(a) -> self

Skew the Y-coordinate according to a certain angle specified in degrees. The same as SVG `skewY` transformation.

### .matrix([ m1, m2, m3, m4, m5, m6 ]) -> self

Apply 2x3 affine transform matrix to path. Params - array. The same as SVG
`matrix` transformation.

### .transform(string) -> self

Any SVG transform or their combination. For example `rotate(90) scale(2,3)`.
The same format, as described in SVG standard for `transform` attribute.

## .inbox(string) -> self
## .inbox(x, y, width, height [,string]) -> self

This command translate and scale the path to put it in a box. The way to put the path in the box is controlled by the same type of parameters as in [PreserveAspectRatio](http://www.w3.org/TR/SVG/coords.html#PreserveAspectRatioAttribute).

**Example** `.inbox('10 -10 200 400 slice xMinYMid')` or `.inbox(10, -10, 200, 400, 'slice xMinYMid')` translate and scale the path by respecting its aspect ratio and by covering the rectangle with size 200x400 starting at (10,-10).

The possible parameters are :

- `meet` (the default) : scale the path (aspect ratio is preserved) as much as possible to fit the entire path in the box.
- `slice` : scale the path (aspect ratio is preserved) as less as possible to cover the box.
- `fit` (= `none`) : scale the path (aspect ratio is not preserved) to fit the box.
- `move` : translate only (no scale) the path according to `xM..YM..` parameter.

## Actions

### .abs() -> self

Converts all path commands to absolute.

### .rel() -> self

Converts all path commands to relative. Useful to reduce output size.

### .unshort() -> self

Converts smooth curves `T`/`t`/`S`/`s` with "missed" control point to
generic curves (`Q`/`q`/`C`/`c`).

### .unarc() -> self

Replaces all arcs with bezier curves.

### .round(precision) -> self

Round all coordinates to given decimal precision. By default round to integer.
Useful to reduce resulting output string size.
When called not only the coordinates are rounded but the path `.precision` is set to the corresponding value.

### .normalise(flags) -> self

This command normalize the path using the following rules:

- The path must starts with `M`. So the first `m` is converted to `M` : yes if `F` _(default)_ is present, no if `f` is present in flags string.
- Repeated `M` and `m` are smashed to one : yes if `M` _(default)_ is present, no if `m` is present in flags string.
- Repeated `Z` and `z` are smashed to one : yes if `Z` _(default)_ is present, no if `z` is present in flags string.
- Empty segments (like `l 0 0`) are removed or converted to line segment if followed by `S`, `s`, `T`, `t`,: yes if `E` _(default)_ is present, no if `e` is present in flags string.
- Arcs:
    + Are converted to line segments if one of the radii is 0 (up to the precision) : yes if `L` _(default)_ is present, no if `l` is present in flags string.
    + The elliptic part (controlled by the flags `E` and `e`)
        * If the radii are too small, they are scaled.
        * The radii are set to positive numbers.
        * The angles is set to be in `[0,90[`.
    + Set the flags to `0` or `1` _(this is normally done already by the parser)_ : yes if `G` is present, no if `g` _(default)_ is present in flags string.

**Example:** `.normalize('leg')` will normalize the path without normalizing the arc segments.

## Output

These methods evaluate the affine transform (if any) at their begining.

### .toString(parameters [=''], normalize [=true], errstop [=false]) -> string

Returns final path string. The output is controlled by multiple parameters.

- `parameters` (string) set the number format and the 'zip' level.
    + number format : for example `00.0XXX` state that the numbers has to have at least to digits before the dot and one after, and that the precision is 4. For example 1.00004 will be printed as 1.0 and 1.00005 will be printed as 1.0001.
    + the coordinate separator : if `,` is present the coordinates will be separated by a comma. The spaces around the `,` (if any) meters.
    + All the following zip parameters are turned on or off by a '+/-' flag : `+` = turn zip on _(default)_, `-` turn the zip off.
    + zip space before commands : yes if `B` _(default)_ is present, no if `b` is present.
    + zip space after commands (Z is particular case) : yes if `A` _(default)_ is present, no if `a` is present.
    + zip space after Z or z command : yes if `Z` _(default)_ is present, no if `z` is present.
    + zip space before `-` sign (negative numbers) : yes if `M` _(default)_ is present, no if `m` is present.
    + zip space before `.` sign (numbers starting with dot) : yes if `D` is present, no if `d` _(default)_ is present.
    + zip the size of the numbers by using scientific notation like `1e4` : yes if `E` is present, no if `e` _(default)_ is present.
    + remove repeated commands : yes if `R` _(default)_ is present, no if `r` is present.
    + remove `L` commands after `M` : yes if `L` is present, no if `l` _(default)_ is present.
- `parameters` (boolean) : `true` is equivalent to `'+'` (turn on all zip parameters), `false` is equivalent to `'-'` (turn off all zip parameters).
- `normalize` (boolean) if _true_ the path is normalised with `.normalize()`.
- `errstop` (boolean) if _true_ only the segments before the first error are returned.

**examples** :

- `.toString('.XXXX DEL')` or `.toString('.XXXX +')`to obtain the shortest output with precision 4.
- `.toString('0.X, -')` to obtain the _nice_ output with coma followed by space as coordinate separator. The precision is set to 1, and there will be at least one digit in the integer part.
- `.toString('0.00XX,-RL')` another _nice_ output with removed repeats. The precision is set to 4, and the numbers will be with at least 3 digits (one before the dot and two after).

### .toArray(errstop [=false]) -> Array

- `errstop` (boolean) if _true_ only the segments before the first error are returned.

Apply the affine transform and concat all segments to one array like `['M', 0, 0, 'L', 1, 1]`. This array can be joined `.toArray().join(' ')` to produce a valid SVG string in faster way than `.toString()`.


### .toBox() -> Box

Returns the minimal rectangle that contains the path as `Box` object.

This `Box` object has the following members / methods:
- `.minX`
- `.maxX`
- `.minY`
- `.maxY`
- `.width()`
- `.height()`
- `.toArray()` -> [minX, minY, maxX, maxY]
- `.inboxMatrix(parameters)` -> `M` affine transform matrix that can be used with `.matrix(M)`. The parameters are the same as `.inbox(parameters)`.

## Low level actions

### .doTransform() -> self

Apply the affine transforms. This method is called by default by the output methods `.toString()` and `.toBox()`

### .iterate(function(segment, index, x, y)) -> self

Apply iterator to all path segments.

- Each iterator receives `segment`, `index`, `x` and `y` params.
  Where (x, y) are the absolute coordinates of segment start point. The `this` inside the iterator is the SVGPath object.
- Iterator can modify current segment directly (return nothing in this case).
- Iterator can return array of new segments to replace current one (`[]` means
  that current segment should be deleted).

## Parse errors

### .hasErrors() -> boolean

Return true if the path has parse errors.

### .errors() -> string

Return a string with one error per line. Every error line contain the position and the segment number where the error has been found. An example of error is :
> `[pos:14, seg:4] Non expected character [R]. I'll ignore it.`

## Members of SVGPath class

### Main

- `.segments` : an array of arrays that contains the path segments. Something like `[['M', 10, 0], ['L', 10, 0]]` for example.
- `.affineTransform` : an object of class AffineTransform that represent the transform to apply to the path. At the beginning this transform is the identity. Every time we use one of the methods `.scale()`, `.translate()`, ... we modify this object. We actually apply this transform to the path with `.doTransform()` (and after that it is reset to identity). We can transform this object to an array with `.toArray()` method.
- `.errs` : is an array of strings containing the parse errors of the initial path string. Every error is an object with three fields:
    + `position` : the position in the path string where the error was found;
    + `segment` : the segment number where the error is;
    + `message` : the message of the error;

### Precision

- `.precision` (integer, default 15)
    This value is set by `.round()`, `.toSting()`, `.toBox()`. It is used not only to round the coordinates but also by `.normalize()`.

### Output parameters

This parameters control the default behaviour of `.toString()`. They are overwritten by the 'parameters' argument of `.toString(parameters)`.

- `.leading_zeros` (integer >=0, default 0)
- `.trailing_zeros` (integer >=0, default 0)
- `.coordinate_separator` (" " | "," | ", " | " , ", default : " ")
- `.zip_space_before_command` (default _true_)
- `.zip_space_after_comand` (default _true_)
- `.zip_space_afterz` (default _true_)
- `.zip_space_before_minus` (default _true_)
- `.zip_space_before_dot` (default _false_)
- `.zip_space_use_e` (default _false_)
- `.zip_remove_repeats` (default _true_)
- `.zip_remove_l_after_m` (default _false_)

### Normalize parameters

This parameters control the default behaviour of `.normalize()`. They are overwritten by the 'flags' argument of `.normalize(flags)`.

- `.normalize_first_m` (default _true_) : Change first m to M ?
- `.normalize_remove_empty` (default _true_) : Remove empty segments ? Never remove Mm and before SsTt.
- `.normalize_smash_m` (default _true_) : Smash multiple Mm to one ?
- `.normalize_smash_z` (default _true_) : Smash multiple Zz to one ?
- `.normalize_a2l` (default _true_) : Arc with zero radii to line ?
- `.normalize_arc_ellipse` (default _true_) : Scale up radii and set the angle in [0,90[
- `.normalize_arc_flags` (default _false_) : Set arc flags to 0 or 1 (normally already done by the parser)

Some notes
---

- The library is located in the `lib` folder.
- The browser version `svgpathy.js` is generated using [browserify](http://browserify.org/) by the command :

    ```
    browserify browserify_svgpath.js -o svgpathy.js
    ```
- In a browser you can use a CDN version :

    ```
    <script src="https://cdn.rawgit.com/kpym/SVGPathy/master/lib/svgpathy.js" type="text/javascript" ></script>
    ```
[MIT](https://github.com/fontello/svgpath/blob/master/LICENSE)
