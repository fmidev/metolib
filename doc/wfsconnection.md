MetOLib: WfsConnection and use of cache
=======================================

Connection API wraps cache and parser implementation.
Connection API class may be used if cache functionality is desired for requested and parsed data.
If cache is not required, then parser class may be used directly instead. Notice, at the moment
cache does not support spatial (BBOX) requests. When spatial data is requested through Connection API,
it always uses request parser directly instead of checking cache.

*Metolib.WfsConnection* depends on

* Other MetOLib classes
    * *Metolib.Utils*
    * *Metolib.WfsRequest*
    * *Metolib.SplitterCache*
* Thirdparty libraries
    * *jQuery* (<https://github.com/jquery/jquery>)
    * *lodash* (<https://github.com/lodash/lodash>)
    * *async* (<https://github.com/caolan/async>)

Notice, these examples are also included in the MetOLib source example folder: example/connection.html

Single station and single observation
-------------------------------------

Code example to start server request and to get the parsed response from the parser. The data is also stored into the cache.
The parsed response is given into the callback function that is provided in the options parameter when *getData*-function is called.
In this example, requestParameter defines one observation (td) that is requested for one site (Helsinki). Also, begin and
end times and timestep are defined in options object for the observation data time period. Notice, server URL and stored query ID
are mandatory for the request and they are set when *connect*-function is called for the connection. Also notice, stored query defines
what kind of content data is requested. For example, if data should be observation or forecast data.

            // See API documentation and comments from connection source code of
            // Metolib.WfsConnection.getData function for the description
            // of function options parameter object and for the callback parameters objects structures.
            var connection = new Metolib.WfsConnection();
            if (connection.connect(SERVER_URL, STORED_QUERY_OBSERVATION)) {
                // Connection was properly initialized. So, get the data.
                connection.getData({
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
                        // Disconnect because the flow has finished.
                        connection.disconnect();
                    }
                });
            }

Multiple stations and multiple observations
-------------------------------------------

Code example to start server request and to get the parsed response from the parser. The data is also stored into the cache.
The parsed response is given into the callback function that is provided in the options parameter when *getData*-function is called.
In this example, requestParameter defines two observations (td,ws_10min) that are requested for two sites (Helsinki,Turku).
Also, begin and end times and timestep are defined in options object for the observation data time period. Notice, server URL
and stored query ID are mandatory for the request and they are set when *connect*-function is called for the connection.
Also notice, stored query defines what kind of content data is requested. For example, if data should be observation
or forecast data.

            // See API documentation and comments from connection source code of
            // Metolib.WfsConnection.getData function for the description
            // of function options parameter object and for the callback parameters objects structures.
            var connection = new Metolib.WfsConnection();
            if (connection.connect(SERVER_URL, STORED_QUERY_OBSERVATION)) {
                // Connection was properly initialized. So, get the data.
                connection.getData({
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
                        // Disconnect because the flow has finished.
                        connection.disconnect();
                    }
                });
            }

Spatial observation data
------------------------

Code example to start server request and to get the parsed response from the parser.
Notice, cache does not support spatial data at the moment. Therefore, the data is not stored into the cache in this example.
The parsed response is given into the callback function that is provided in the options parameter when *getData*-function is called.
In this example, requestParameter defines two observations (td,ws_10min) that are requested for spatial BBOX area.
Also, begin and end times and timestep are defined in options object for the observation data time period. Notice, server URL
and stored query ID are mandatory for the request and they are set when *connect*-function is called for the connection.
Also notice, stored query defines what kind of content data is requested. For example, if data should be observation
or forecast data.

            // See API documentation and comments from connection source code of
            // Metolib.WfsConnection.getData function for the description
            // of function options parameter object and for the callback parameters objects structures.
            // Notice, when spatial data is requested through Connection API,
            // it always uses directly request parser instead of cache.
            var connection = new Metolib.WfsConnection();
            if (connection.connect(SERVER_URL, STORED_QUERY_OBSERVATION)) {
                // Connection was properly initialized. So, get the data.
                connection.getData({
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
                        // Disconnect because the flow has finished.
                        connection.disconnect();
                    }
                });
            }

Forecast data
-------------

Code example to start server request and to get the parsed response from the parser. The data is also stored into the cache.
The parsed response is given into the callback function that is provided in the options parameter when *getData*-function is called.
In this example, requestParameter defines two forecasts (td,windspeedms) that are requested for two sites (Helsinki,Turku).
Also, begin and end times and timestep are defined in options object for the observation data time period. Notice, server URL
and stored query ID are mandatory for the request and they are set when *connect*-function is called for the connection.
Also notice, stored query ID is used to define if forecast or observation data is requested. In other words, stored query ID
defines what kind of content data is requested.

            // See API documentation and comments from connection source code of
            // Metolib.WfsConnection.getData function for the description
            // of function options parameter object and for the callback parameters objects structures.
            var connection = new Metolib.WfsConnection();
            if (connection.connect(SERVER_URL, STORED_QUERY_FORECAST)) {
                // Connection was properly initialized. So, get the data.
                connection.getData({
                    requestParameter : "temperature,windspeedms",
                    begin : new Date(),
                    end : new Date((new Date()).getTime() + 26 * 60 * 60 * 1000),
                    timestep : 60 * 60 * 1000,
                    sites : ["Helsinki", "Turku"],
                    callback : function(data, errors) {
                        // Handle the data and errors object in a way you choose.
                        // Here, we delegate the content for a separate handler function.
                        handleCallback(data, errors);
                        // Disconnect because the flow has finished.
                        connection.disconnect();
                    }
                });
            }
