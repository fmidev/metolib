# MetOLib

MetOLib provides implementation of API classes that may be used to request weather data from the Web Feature Service (WFS) server of the Finnish Meteorological Institute INSPIRE Atmospheric Features and Geographical Meteorological Features guidelines compatible WFS Download Service server at http://data.fmi.fi.

Documentation is maintained at https://github.com/fmidev/metolib.

### Quickstart

Installation: `npm install @fmidev/metolib`

Import:

```var Metolib = require('@fmidev/metolib');``` (RequireJS)

```import Metolib from '@fmidev/metolib';``` (ES6)

MetOLib is browser code and this package is Webpack/Browserify compliant. The current version does not run server-side. Use the library through the WfsRequestParser or the WfsConnection class.

For class methods and configuration, see docs at https://github.com/fmidev/metolib

```
var parser = new Metolib.WfsRequestParser();
var parserWithCache = new Metolib.WfsConnection();
```
