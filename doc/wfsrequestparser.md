MetOLib: WfsRequestParser
=========================

Parser may be used directly to request WFS data with given options.
Parser parses the data received from the server in XML format and provides parsed data through the API.

*Metolib.WfsRequestParser* depends on

* Other MetOLib classes
    * *Metolib.Utils*
* Thirdparty libraries
    * *jQuery* (<https://github.com/jquery/jquery>)
    * *lodash* (<https://github.com/lodash/lodash>)

Notice, examples shown in this document are also included in the MetOLib source example folder: example/parser.html

Limitations
-----------

Because of the way jQuery XML parser works, the current WfsRequestParser is very picky about
the element namespace prefixes used in the response. It relies on the XML elements using the
namespace prefixes used at opendata.fmi.fi WFS service:

* `wfs` for `http://www.opengis.net/wfs/2.0`
* `xlink` for "http://www.w3.org/1999/xlink'
* `om` for `http://www.opengis.net/om/2.0`
* `ompr` for `http://inspire.ec.europa.eu/schemas/ompr/2.0rc3`
* `omso` for `http://inspire.ec.europa.eu/schemas/omso/2.0rc3`
* `gml` for `http://www.opengis.net/gml/3.2`
* `gmd` for `http://www.isotc211.org/2005/gmd`
* `gco`for `http://www.isotc211.org/2005/gco`
* `swe` for `http://www.opengis.net/swe/2.0`
* `gmlcov` for `http://www.opengis.net/gmlcov/1.0`
* `sam` for `http://www.opengis.net/sampling/2.0`
* `sams` for `http://www.opengis.net/samplingSpatial/2.0` and
* `target` for `http://xml.fmi.fi/namespace/om/atmosphericfeatures/0.95`

If the WFS response does not use exactly these prefixes for these namespaces the parser
will fail.

This library currently only supports WFS getFeature operation for
stored queries. The id of the stored query can be given by the user, but library
currently always assumes that all stored queries accept the following
query parameters:

* 'PARAMETERS'
* 'STARTTIME'
* 'ENDTIME'
* 'TIMESTEP'
* 'PLACE' and
* 'BBOX'

Single station and single observation
-------------------------------------

Code example to start server request and to get the parsed response from the parser.
The parsed response is given into the callback function that is provided in the options parameter when function is called.
In this example, requestParameter defines one observation (td) that is requested for one site (Helsinki). Also, begin and
end times and timestep are defined in options object for the observation data time period. Notice, server URL and storedQueryId
are mandatory for the request. Also notice, storedQueryId defines what kind of content data is requested. For example, if data
should be observation or forecast data.

            // See, API documentation and comments from parser source code of
            // Metolib.WfsRequestParser.getData function for the description
            // of function options parameter object and for the callback parameters objects structures.
            var parser = new Metolib.WfsRequestParser();
            parser.getData({
                url : SERVER_URL,
                storedQueryId : STORED_QUERY_OBSERVATION,
                requestParameter : "td",
                // Integer values are used to init dates for older browsers.
                // (new Date("2013-05-10T08:00:00Z")).getTime()
                // (new Date("2013-05-12T10:00:00Z")).getTime()
                begin : new Date(1368172800000),
                end : new Date(1368352800000),
                timestep : 60 * 60 * 1000,
                sites : "Helsinki",
                callback : function(data, errors) {
                    // Handle the data and errors object in a way you choose.
                    // Here, we delegate the content for a separate handler function.
                    handleCallback(data, errors);
                }
            });

Multiple stations and multiple observations
-------------------------------------------

Code example to start server request and to get the parsed response from the parser.
The parsed response is given into the callback function that is provided in the options parameter when function is called.
In this example, requestParameter defines two observations (td,ws_10min) that are requested for two sites (Helsinki,Turku).
Also, begin and end times and timestep are defined in options object for the observation data time period. Notice, server URL
and storedQueryId are mandatory for the request.

            // See API documentation and comments from parser source code of
            // Metolib.WfsRequestParser.getData function for the description
            // of function options parameter object and for the callback parameters objects structures.
            var parser = new Metolib.WfsRequestParser();
            parser.getData({
                url : SERVER_URL,
                storedQueryId : STORED_QUERY_OBSERVATION,
                requestParameter : "td,ws_10min",
                // Integer values are used to init dates for older browsers.
                // (new Date("2013-05-10T08:00:00Z")).getTime()
                // (new Date("2013-05-12T10:00:00Z")).getTime()
                begin : new Date(1368172800000),
                end : new Date(1368352800000),
                timestep : 60 * 60 * 1000,
                sites : ["Kaisaniemi,Helsinki", "Turku"],
                callback : function(data, errors) {
                    // Handle the data and errors object in a way you choose.
                    // Here, we delegate the content for a separate handler function.
                    handleCallback(data, errors);
                }
            });

Spatial observation data
------------------------

Code example to start server request and to get the parsed response from the parser.
The parsed response is given into the callback function that is provided in the options parameter when function is called.
In this example, requestParameter defines two observations (td,ws_10min) that are requested for spatial BBOX area.
Also, begin and end times and timestep are defined in options object for the observation data time period. Notice, server URL
and storedQueryId are mandatory for the request.

            // See API documentation and comments from parser source code of
            // Metolib.WfsRequestParser.getData function for the description
            // of function options parameter object and for the callback parameters objects structures.
            var parser = new Metolib.WfsRequestParser();
            parser.getData({
                url : SERVER_URL,
                storedQueryId : STORED_QUERY_OBSERVATION,
                requestParameter : "td,ws_10min",
                // Integer values are used to init dates for older browsers.
                // (new Date("2013-05-10T08:00:00Z")).getTime()
                // (new Date("2013-05-12T10:00:00Z")).getTime()
                begin : new Date(1368172800000),
                end : new Date(1368352800000),
                timestep : 60 * 60 * 1000,
                bbox : "21,60,24,65",
                callback : function(data, errors) {
                    // Handle the data and errors object in a way you choose.
                    // Here, we delegate the content for a separate handler function.
                    handleCallback(data, errors);
                }
            });

Forecast data
-------------

Code example to start server request and to get the parsed response from the parser.
The parsed response is given into the callback function that is provided in the options parameter when function is called.
In this example, requestParameter defines two forecasts (td,windspeedms) that are requested for two sites (Helsinki,Turku).
Also, begin and end times and timestep are defined in options object for the forecast data time period. Notice, server URL
and storedQueryId are mandatory for the request. Also notice, storedQueryId is used to define if forecast or observation data
is requested. In other words, storedQueryId defines what kind of content data is requested.

            // See API documentation and comments from parser source code of
            // Metolib.WfsRequestParser.getData function for the description
            // of function options parameter object and for the callback parameters objects structures.
            var parser = new Metolib.WfsRequestParser();
            parser.getData({
                url : SERVER_URL,
                storedQueryId : STORED_QUERY_FORECAST,
                requestParameter : "temperature,windspeedms",
                begin : new Date(),
                end : new Date((new Date()).getTime() + 26 * 60 * 60 * 1000),
                timestep : 60 * 60 * 1000,
                sites : ["Helsinki", "Turku"],
                callback : function(data, errors) {
                    // Handle the data and errors object in a way you choose.
                    // Here, we delegate the content for a separate handler function.
                    handleCallback(data, errors);
                }
            });
