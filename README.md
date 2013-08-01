MetOLib
=======

MetOLib provides implementation of API classes that may be used to request weather 
data from the Web Feature Service (WFS) server of the Finnish Meteorological Institute
INSPIRE Atmospheric Features and Geographical Meteorological Features
guidelines compatible WFS Download Service server at http://data.fmi.fi.

The response is assumed to the wfs:FeatureCollection with one or more members of 
PointTimeSeriesObservation or GridSeriesObservation features of namespace 
http://inspire.ec.europa.eu/schemas/omso/2.0rc3. The WfsRequestParser creates 
the WFS GetFeature request and parses the XML response into
JS response object.

MetOLib folder structure
------------------------

Root folder contains this README.md and Grunt files that may be used to build different versions of MetOLib.

* *lib* contains minified and combined MetOLib files that are provided as content that could be used for release versions.
  Also, a combined non-minified version is provided here for debugging purposes.
* *doc* contains MetOLib documentation files that describe library components and give simple examples:
    * [WfsRequestParser](doc/wfsrequestparser.md)
    * [WfsConnection](doc/wfsconnection.md)
    * [SplitterCache](doc/splittercache.md)
    * [Build and Test](doc/buildandtest.md)
* *src* contains actual MetOClient source files that may be used as a reference and are used to create *release* content
   into *lib* -folder when Grunt is used.
* *deps* contains thirdparty libraries that are used by MetOLib
* *examples* contains examples of how to use MetOLib
* *test* contains general test files to test *src* and *lib* files
* *testdeps* contains thirdparty libraries that are used by MetOClient tests. *Jasmine* is used for test cases.

Browsers
--------

MetOLib works well with the major browsers.

But notice, Internet Explorer version 8 or greater is required for cross-domain requests to work properly with MetOLib.
