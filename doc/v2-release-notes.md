MetOLib version 2.0.0 release notes
===================================

General
-------
Version 2.0.0 is built according to the ES6 developer standard of JavaScript. As of 2017, ES6 module imports aren't supported by browsers; Webpack is used to produce an optimized package for browsers to run. /src/index.js functions as a "starting point" file for module loaders. The classes in /src, along with the dependencies in /src/package.json, constitute the consumer developer version of MetOLib 2.0.0.

Major changes in detail
-----------------------

### /webpack.config.js has been added
* This file defines an example configuration used to bundle only MetOLib.
* output{ library: "Metolib" } - When embedded to a browser, this Webpack bundle outputs, to global scope, the public APIs defined in /src/index.js

### Grunt, /lib, /test are structured differently
* Version 2.0.0 is built using ES6 modules; thus the only build version built to /lib is a Webpack bundle for testing/examples
* JSHint now evaluates /src/\*.js according ES6 standard.
* The JSHint configuration checks that development files adhere to good coding conventions. For this reason, the build version is not evaluated; Webpack knows browser support well but doesn't acknowledge conventions.
* Tests are run only the Webpack bundle, instead of 1.x.x's four different available build configs. 2.0.0 doesn't support loading source files separately. Instead, bundle configurations containing only selected classes and their dependencies, can be created by modifying /src/index.js

### /deps has been removed
* async, jquery and lodash are now loaded through NPM. These dependencies are defined in both /package.json (full development version) and /src/package.json (consumer developer version)

### /testdeps has changed
* The MetOLib bundle does not output dependencies to global scope, so /testdeps now contains also the versions of async, jquery and lodash that testbenches load in global scope.

### /src/wfsconnection.js has changed
* \_.contains alias is deprecated -> \_.includes
* Due to the module structure, there is no direct reference to parser. WfsConnection constructor instantiates its own WfsRequestParser

### /src/splittercache.js has changed
* In Lodash 4.x, \_.indexOf(\*, \*) iterates from 0; \_.indexOf(\*, \*, true) would iterate from 1
