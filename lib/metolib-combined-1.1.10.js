// Strict mode for whole file.
"use strict";

/**
 * This software may be freely distributed and used under the following MIT license:
 *
 * Copyright (c) 2013 Finnish Meteorological Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Strict mode for whole file.
// "use strict";

// Requires lodash
if ("undefined" === typeof _ || !_) {
    throw "ERROR: Lodash is required for fi.fmi.metoclient.metolib.Utils!";
}

// "Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.metolib = fi.fmi.metoclient.metolib || {};

/**
 * Utils object provides API for general utility functions.
 *
 * There is no need to use {new} to create an instance of Utils.
 * Instead, use directly API functions provided by the object.
 */
fi.fmi.metoclient.metolib.Utils = (function() {

    /**
     * Avoid console errors in browsers that lack a console.
     *
     * See: https://github.com/h5bp/html5-boilerplate/blob/master/js/plugins.js
     */
    (function() {
        var method;
        var noop = function() {
        };
        var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
        var length = methods.length;
        var console = (window.console = window.console || {});

        while (length--) {
            method = methods[length];

            // Only stub undefined methods.
            if (!console[method]) {
                console[method] = noop;
            }
        }
    })();

    /**
     * Function to set jQuery.browser information.
     * See, http://stackoverflow.com/questions/14545023/jquery-1-9-browser-detection
     *
     * This function is called during the construction of this sigleton instance to make sure
     * browser information is available.
     */
    (function() {
        if (!jQuery.browser) {
            var matched, browser;

            // Use of jQuery.browser is frowned upon.
            // More details: http://api.jquery.com/jQuery.browser
            // jQuery.uaMatch maintained for back-compat
            jQuery.uaMatch = function(ua) {
                ua = ua.toLowerCase();

                var match = /(chrome)[ \/]([\w.]+)/.exec(ua) || /(webkit)[ \/]([\w.]+)/.exec(ua) || /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) || /(msie) ([\w.]+)/.exec(ua) || ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) || [];

                return {
                    browser : match[1] || "",
                    version : match[2] || "0"
                };
            };

            matched = jQuery.uaMatch(navigator.userAgent);
            browser = {};

            if (matched.browser) {
                browser[matched.browser] = true;
                browser.version = matched.version;
            }

            // Chrome is Webkit, but Webkit is also Safari.
            if (browser.chrome) {
                browser.webkit = true;

            } else if (browser.webkit) {
                browser.safari = true;
            }

            jQuery.browser = browser;
        }
    })();

    /**
     * This function is called during the construction of this sigleton
     * instance to provide at least a limited support for cross-domain request (XDR)
     * when jQuery.ajax is used for IE 8 and 9.
     *
     * IE 6, 7, 8, and 9 do not support XHR2 CORS.
     * It is not possible to make generalized cross-domain requests in these browsers.
     * IE 8, 9 support an ActiveX control called XDomainRequest that only allows limited
     * cross-domain requests compared to XHR2 CORS. IE 10 supports XHR2 CORS.
     *
     * For more information about this, see following links:
     *    https://github.com/jaubourg/ajaxHooks/blob/master/src/xdr.js
     *    http://stackoverflow.com/questions/14309037/ajax-no-transport-error-in-ie-8-9
     *    http://bugs.jquery.com/ticket/8283#comment:43
     *    http://bugs.jquery.com/ticket/8283#comment:44
     *    http://bugs.jquery.com/ticket/8283#comment:45
     *
     * jQuery does not include XDomainRequest support because there are numerous
     * and serious limitations to XDR. Many reasonable $.ajax requests would fail,
     * including any cross-domain request made on IE6 and IE7 which are otherwise
     * supported by jQuery. Developers would be confused that their content types
     * and headers were ignored, or that IE8 users could not use XDR if the user was
     * using InPrivate browsing for example.
     *
     * Even the crippled XDR can be useful if it is used by a knowledgeable developer.
     * A jQuery team member has made an XDR ajax transport available. You must be aware
     * of XDR limitations by reading this blog post or ask someone who has dealt with
     * XDR problems and can mentor you through its successful use.
     *
     * For further help and other solutions, ask on the jQuery Forum, StackOverflow,
     * or search "jQuery xdr transport".
     */
    (function() {
        if (window.XDomainRequest) {
            jQuery.ajaxTransport(function(s) {
                if (s.crossDomain && s.async) {
                    if (s.timeout) {
                        s.xdrTimeout = s.timeout;
                        delete s.timeout;
                    }
                    var xdr;
                    return {
                        send : function(_, complete) {
                            function callback(status, statusText, responses, responseHeaders) {
                                xdr.onload = xdr.onerror = xdr.ontimeout = jQuery.noop;
                                xdr = undefined;
                                complete(status, statusText, responses, responseHeaders);
                            }

                            xdr = new XDomainRequest();
                            xdr.onload = function() {
                                callback(200, "OK", {
                                    text : xdr.responseText
                                }, "Content-Type: " + xdr.contentType);
                            };
                            xdr.onerror = function() {
                                callback(404, "Not Found");
                            };
                            xdr.onprogress = function() {
                                // For some reason, XDomainRequest send does not seem to work properly with IE9
                                // when jQuery.noop is used for onprogress function and jQuery ajax requests are
                                // called inside an iframe. Therefore, separately defined empty function is set
                                // here to be sure that send works properly in all cases and callback is called.
                            };
                            xdr.ontimeout = function() {
                                callback(0, "timeout");
                            };
                            // When using timeout value of 0, IE will not abort the request prematurely.
                            xdr.timeout = s.xdrTimeout || 0;
                            xdr.open(s.type, s.url);
                            xdr.send((s.hasContent && s.data ) || null);
                        },
                        abort : function() {
                            if (xdr) {
                                xdr.onerror = jQuery.noop;
                                xdr.abort();
                            }
                        }
                    };
                }
            });
        }
    })();

    /**
     * Function to set {toISOString} for {Date} objects if an older browser does not support it natively.
     *
     * See, http://stackoverflow.com/questions/11440569/converting-a-normal-date-to-iso-8601-format
     *
     * This function is called during the construction of this sigleton instance to make sure
     * function is available.
     */
    (function() {
        // Override only if native toISOString is not defined.
        if (!Date.prototype.toISOString) {
            // Rely on JSON serialization for dates because it matches
            // the ISO standard. However, check if JSON serializer is present
            // on a page and define own .toJSON method only if necessary.
            if (!Date.prototype.toJSON) {
                Date.prototype.toJSON = function(key) {
                    var pad = function(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    };

                    return this.getUTCFullYear() + '-' + pad(this.getUTCMonth() + 1) + '-' + pad(this.getUTCDate()) + 'T' + pad(this.getUTCHours()) + ':' + pad(this.getUTCMinutes()) + ':' + pad(this.getUTCSeconds()) + 'Z';
                };
            }

            Date.prototype.toISOString = Date.prototype.toJSON;
        }
    })();

    /**
     * See {@link #objectLength(object)} API function for description.
     */
    function objectLength(object) {
        var length = 0;
        if (object) {
            if (_.isFunction(Object.keys)) {
                // Notice, this only works in a new browsers such as IE9+.
                // If support for older browsers is required, then implement
                // counter by looping the keys of the object.
                length = Object.keys(object).length;

            } else {
                for (var key in object) {
                    if (object.hasOwnProperty(key)) {
                        // Increase counter because property was found.
                        ++length;
                    }
                }
            }
        }
        return length;
    }

    /**
     * Return Utils API as an object.
     */
    return {

        /**
         * Utils function to get the property count of the object.
         *
         * @param {Object} object Object whose properties are counted.
         *                        May be {undefined} or {null}.
         *                        Then, zero is returned for length.
         * @return {int} Property count.
         */
        objectLength : function(object) {
            return objectLength(object);
        },

        /**
         * Encodes the given string if necessary.
         *
         * Like JavaScript encodeURIComponent(uri) but returns {undefined} or
         * {null} if parameter was one of them.
         *
         * @param {String} str String to be encoded.
         *                     May be {undefined} or {null}.
         * @return {String} Encoded string if encoding was needed or original string.
         *                  May return {undefined} or {null} if parameter
         *                  was one of them.
         */
        encodeUriComponent : function(str) {
            return str ? encodeURIComponent(str) : str;
        },

        /**
         * Encodes the given string if necessary.
         *
         * Like JavaScript encodeURI(uri) but returns {undefined} or
         * {null} if parameter was one of them.
         *
         * @param {String} str String to be encoded.
         *                     May be {undefined} or {null}.
         * @return {String} Encoded string if encoding was needed or original string.
         *                  May return {undefined} or {null} if parameter
         *                  was one of them.
         */
        encodeUri : function(str) {
            return str ? encodeURI(str) : str;
        },

        /**
         * Sort given string array in ascending way.
         *
         * @param {[]} strings Array whose string content will be sorted.
         *                     May be {undefined} or {null}.
         * @param {boolean} createCopy If {true}, content will be copied into a new array
         *                             and the copy will be sorted. Else, given {strings} array
         *                             is sorted directly.
         * @return {[]} Sorted array. Notice, this is a shallow copy of the original if {createCopy} is {true}.
         *              May be {undefined} or {null}.
         */
        sortStringArray : function(strings, createCopy) {
            // Sorted array.
            var sorted;
            if (strings && _.isArray(strings)) {
                if (createCopy) {
                    // Create shallow copy of the array.
                    sorted = [];
                    _.each(strings, function(element) {
                        sorted.push(element);
                    });

                } else {
                    // Use given array for sort.
                    sorted = strings;
                }

                sorted.sort(function(a, b) {
                    // Default return value (no sorting).
                    var ret = 0;
                    var strA = a.toLowerCase();
                    var strB = b.toLowerCase();
                    // Ascending sort.
                    if (strA < strB) {
                        ret = -1;

                    } else if (strA > strB) {
                        ret = 1;
                    }
                    return ret;
                });
            }
            return sorted;
        }
    };

})();

/**
 * This software may be freely distributed and used under the following MIT license:
 *
 * Copyright (c) 2013 Finnish Meteorological Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Strict mode for whole file.
// "use strict";

// Requires jQuery
if ("undefined" === typeof jQuery || !jQuery) {
    throw "ERROR: jQuery is required for fi.fmi.metoclient.metolib.WfsRequestParser!";
}

// Requires lodash
if ("undefined" === typeof _ || !_) {
    throw "ERROR: Lodash is required for fi.fmi.metoclient.metolib.WfsRequestParser!";
}

// "Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.metolib = fi.fmi.metoclient.metolib || {};

// Requires fi.fmi.metoclient.metolib.Utils.
// "Package" exists because it is created above if it did not exist.
if ("undefined" === typeof fi.fmi.metoclient.metolib.Utils || !fi.fmi.metoclient.metolib.Utils) {
    throw "ERROR: fi.fmi.metoclient.metolib.Utils is required for fi.fmi.metoclient.metolib.WfsRequestParser!";
}

/**
 * RequestParser object acts as an interface that provides functions
 * to asynchronously request XML data from the server and to get
 * the requested data in a parsed structure.
 *
 * RequestParser itself is stateless. It only provides API functions
 * to start asynchronous flows that can be followed by callback functions.
 *
 * Example:
 *      fi.fmi.metoclient.metolib.WfsRequestParser.getData({
 *          url : url,
 *          storedQueryId : storedQueryId,
 *          requestParameter : "td,ws_10min",
 *          // Integer values are used to init dates for older browsers.
 *          // (new Date("2013-05-10T08:00:00Z")).getTime()
 *          // (new Date("2013-05-12T10:00:00Z")).getTime()
 *          begin : new Date(1368172800000),
 *          end : new Date(1368352800000),
 *          timestep : 60 * 60 * 1000,
 *          sites : ["Kaisaniemi,Helsinki", "Turku"],
 *          callback : function(data, errors) {
 *              // Handle callback data here...
 *          }
 *      });
 *
 * See API description in the end of the function.
 */
fi.fmi.metoclient.metolib.WfsRequestParser = (function() {

    /**
     * Constants that are used for requests and for parsing the requested data.
     */
    var myConstants = {
        // Regular expression for any white space.
        REGEX_WHITE_SPACE : /\s+/,

        // EPOCH is in seconds.
        // Covert ratio between milliseconds and EPOCH seconds.
        EPOCH_TO_MS : 1000,

        // Milliseconds in a minute.
        MIN_TO_MS : 60 * 1000,

        // HTTP method that is used for requests.
        HTTP_METHOD : "GET",

        // Type of data that is expected from the server.
        DATA_TYPE : "xml",

        // URL query delimiters.
        URL_QUERY_PREFIX_BEGIN : "?",
        URL_QUERY_PREFIX_AND : "&",
        URL_QUERY_FIELD_VALUE_DELIMITER : "=",

        // REQUEST_GET_FEATURE is used as a first query that is added by this library to
        // the base URL. Delimiter & or ? is inserted in front of it depending on the given
        // base URL.
        REQUEST_GET_FEATURE : "request=getFeature",
        REQUEST_STORED_QUERY_ID : "&storedquery_id=",
        REQUEST_PARAMETERS : "&parameters=",
        REQUEST_BEGIN : "&starttime=",
        REQUEST_END : "&endtime=",
        REQUEST_TIMESTEP : "&timestep=",
        REQUEST_GEOID : "&geoid=",
        REQUEST_WMO : "&wmo=",
        REQUEST_FMISID : "&fmisid=",
        REQUEST_PLACE : "&place=",
        REQUEST_BBOX : "&bbox=",
        REQUEST_CRS : "&crs=",

        // XML elements that are parsed.
        // There seems to be a bug related to the element namespaces:
        // http://bugs.jquery.com/ticket/10377
        XML_WFS_FEATURE_COLLECTION : "wfs\\:FeatureCollection, FeatureCollection",
        XML_WFS_MEMBER : "wfs\\:member, member",
        XML_OMSO_POINT_TIME_SERIES_OBSERVATION : "omso\\:PointTimeSeriesObservation, PointTimeSeriesObservation",
        XML_OMSO_GRID_SERIES_OBSERVATION : "omso\\:GridSeriesObservation, GridSeriesObservation",
        XML_OM_PHENOMENON_TIME : "om\\:phenomenonTime, phenomenonTime",
        XML_GML_TIME_PERIOD : "gml\\:TimePeriod, TimePeriod",
        XML_GML_BEGIN_POSITION : "gml\\:beginPosition, beginPosition",
        XML_GML_END_POSITION : "gml\\:endPosition, endPosition",
        XML_OM_OBSERVED_PROPERTY : "om\\:observedProperty, observedProperty",
        XML_OM_FEATURE_OF_INTEREST : "om\\:featureOfInterest, featureOfInterest",
        XML_SAMS_SF_SPATIAL_SAMPLING_FEATURE : "sams\\:SF_SpatialSamplingFeature, SF_SpatialSamplingFeature",
        XML_SAM_SAMPLED_FEATURE : "sam\\:sampledFeature, sampledFeature",
        XML_TARGET_LOCATION_COLLECTION : "target\\:LocationCollection, LocationCollection",
        XML_TARGET_MEMBER : "target\\:member, member",
        XML_TARGET_LOCATION : "target\\:Location, Location",
        XML_GML_IDENTIFIER : "gml\\:identifier, identifier",
        XML_TARGET_REGION : "target\\:region, region",
        XML_TARGET_COUNTRY : "target\\:country, country",
        XML_TARGET_TIMEZONE : "target\\:timezone, timezone",
        XML_TARGET_REPRESENTATIVE_POINT : "target\\:representativePoint, representativePoint",
        XML_SAMS_SHAPE : "sams\\:shape, shape",
        XML_GML_MULTI_POINT : "gml\\:MultiPoint, MultiPoint",
        XML_GML_POINT_MEMBER : "gml\\:pointMember, pointMember",
        XML_GML_POINT_MEMBERS : "gml\\:pointMembers, pointMembers",
        XML_GML_POINT : "gml\\:Point, Point",
        XML_GML_NAME : "gml\\:name, name",
        XML_GML_POS : "gml\\:pos, pos",
        XML_OM_RESULT : "om\\:result, result",
        XML_GMLCOV_MULTI_POINT_COVERAGE : "gmlcov\\:MultiPointCoverage, MultiPointCoverage",
        XML_GML_DOMAIN_SET : "gml\\:domainSet, domainSet",
        XML_GMLCOV_SIMPLE_MULTI_POINT : "gmlcov\\:SimpleMultiPoint, SimpleMultiPoint",
        XML_GMLCOV_POSITIONS : "gmlcov\\:positions, positions",
        XML_GML_RANGE_SET : "gml\\:rangeSet, rangeSet",
        XML_GML_DATA_BLOCK : "gml\\:DataBlock, DataBlock",
        XML_GML_DOUBLE_OR_NIL_REASON_TUPLE_LIST : "gml\\:doubleOrNilReasonTupleList, doubleOrNilReasonTupleList",
        XML_GMLCOV_RANGE_TYPE : "gmlcov\\:rangeType, rangeType",
        XML_SWE_DATA_RECORD : "swe\\:DataRecord, DataRecord",
        XML_SWE_FIELD : "swe\\:field, field",
        XML_COMPOSITE_OBSERVABLE_PROPERTY : "CompositeObservableProperty",
        XML_COMPONENT : "component",
        XML_OBSERVABLE_PROPERTY : "ObservableProperty",
        XML_LABEL : "label",
        XML_BASE_PHENOMENON : "basePhenomenon",
        XML_UOM : "uom",
        XML_STATISTICAL_MEASURE : "statisticalMeasure",
        XML_STATISTICAL_MEASURE_INNER : "StatisticalMeasure",
        XML_STATISTICAL_FUNCTION : "statisticalFunction",
        XML_AGGREGATION_TIME_PERIOD : "aggregationTimePeriod",
        XML_ATTR_NAME : "name",
        XML_ATTR_SRS_DIMENSION : "srsDimension",
        XML_ATTR_XLINK_HREF : "xlink:href",
        XML_ATTR_GML_ID : "gml:id",
        XML_ATTR_CODE_SPACE : "codeSpace",
        XML_ATTR_CODE_SPACE_NAME : "http://xml.fmi.fi/namespace/locationcode/name",
        XML_ATTR_CODE_SPACE_WMO : "http://xml.fmi.fi/namespace/locationcode/wmo",
        XML_ATTR_CODE_SPACE_GEOID : "http://xml.fmi.fi/namespace/locationcode/geoid",
        XML_ATTR_CODE_SPACE_FMISID : "http://xml.fmi.fi/namespace/stationcode/fmisid",
        XML_ATTR_UOM : "uom",

        // Prefix that may be used in XML references.
        XML_REF_PREFIX : "#",

        // Error XML elements.
        XML_EXCEPTION_REPORT : "ExceptionReport",
        XML_EXCEPTION : "Exception",
        XML_ATTR_EXCEPTION_CODE : "exceptionCode",
        XML_EXCEPTION_TEXT : "ExceptionText",

        // Error object keys.
        KEY_ERROR_CODE : "errorCode",
        KEY_ERROR_TEXT : "errorText"
    };

    /**
     * Create empty property object that may be used if property data has not been gotten from the server.
     *
     * @return {Object} New property object that contains properties with default empty values.
     *                  May not be {undefined} or {null}.
     */
    function createEmptyPropertyObject() {
        return {
            label : "",
            unit : "",
            phenomenon : "",
            statisticalFunction : "",
            statisticalPeriod : ""
        };
    }

    /**
     * Check if the object contains the given key.
     *
     * If an object property key is a case-insensitive but not case-sensitive match
     * to the given {key} string, the property key is changed to be a case-sensitive match.
     *
     * The case-sensitivity check is made because some of the XML elements may contain
     * values as lower-case strings instead of using the originally given case-sensitive value.
     *
     * @param {Object} obj Object whose keys are checked against {key}.
     *                     May be {undefined} or {null}.
     * @param {String} key Key for the {obj}.
     *                     May be {undefined}, {null} or empty.
     * @return {Boolean} {true} if {obj} contains {key} match. Else {false}.
     */
    function checkKey(obj, key) {
        // Check if key is case-sensitive match.
        var keyExists = obj && key && obj.hasOwnProperty(key);
        if (!keyExists && obj && key) {
            // Object does not contain case-sensitive key match.
            // Check if any object key is case-insensitive key match.
            var lowerCaseKey = key.toLowerCase();
            for (var objKey in obj) {
                if (obj.hasOwnProperty(objKey)) {
                    if (objKey.toLowerCase() === lowerCaseKey) {
                        // Key is case-insensitive match.
                        // Change the key to be case-sensitive match.
                        obj[key + ""] = obj[objKey];
                        delete obj[objKey];
                        keyExists = true;
                        break;
                    }
                }
            }
        }
        return keyExists;
    }

    /**
     * Parses the given XML DOM document.
     *
     * Notice, this may be an asynchronous operation because parsing of sub-elements
     * may require asynchronous server requests for further data.
     *
     * See the finalized data structure in {finalizeContent()} function description.
     *
     * The data structure that is used for XML parsing differs from the finalized structure.
     * First, data is inserted into a structure that is easy to manage with asynchronous operations.
     * The structure is finalized into a more usable structure for API when asynchronous operations have finished.
     * See {parsedContent} variable inside this function for the data structure that is used for XML parsing.
     *
     * @param {Object} xml DOM document that is parsed for the data.
     * @param [] errors Array that contains possible errors that occurred during the asynchronous flow.
     * @param {function(data, errors)} callback Callback function is called and provided with the parsed data structure
     *                                 and errors array when all parse operations, including asynchronous operations,
     *                                 are finished. If an error occurs during operations, callback data is set to
     *                                 {undefined}.
     */
    function parseXml(xml, errors, callback) {
        try {
            // This data structure will hold the parsed data.
            // Notice, this is not the finalized data structure.
            var parsedContent = {
                // General information from server XML response.
                info : {
                    // Begin {Date} object for request.
                    begin : undefined,
                    // End {Date} object for request.
                    end : undefined
                },
                // For location data. Content objects exists if set by the parser.
                // Content object : { id : "idString", geoid : "geoidString", wmo : "wmoString", fmisid : "fmisidString",
                //                    name : "nameString", region : "regionNameString",
                //                    country : "countryNameString", timezone : "timezoneStrinng",
                //                    pointRef : "pointRefString" }
                locations : [],
                // For location positions data. Content objects exist if set by the parser.
                // Structure : { idString : { name : "nameString", position : ["positionStringPart1", "positionStringPart2", ... ] }, ... }
                positions : {},
                // gmlcovPositions contains location position information that also contains the time of the observation.
                gmlcovPositions : {
                    srsDimension : undefined,
                    timeIndex : undefined,
                    // Array of all position and time data as strings. This relates to the locations pos data.
                    contents : []
                },
                // All properties related data is inserted in turns item by item here.
                data : [],
                // May contain none, one or more parameter strings that identify the request parameter, such as td.
                parameters : [],
                propertiesContainer : {
                    // Array to hold URLs that have been used to query properties data.
                    // Then, URLs can be checked to avoid duplicate downloads for same property data.
                    // Duplicate downloads could occur, for example, if multiple wfs:member -elments are provided in XML
                    // and elements use same parameters.
                    urls : [],
                    // May contain none, one or more of key-value-pairs. Key identifies the request parameter and
                    // is same as parameters array item, such as td. Value gives property object for the requested data.
                    // Key-value-pair that describes one property in properties object:
                    //   parameterAsKey : { label : "labelString",
                    //                      unit : "unitString",
                    //                      phenomenon : "phenomenonString",
                    //                      statisticalFunction : "statisticalFunctionString",
                    //                      statisticalPeriod : "statisticalAggregationTimePeriod" }
                    properties : {}
                }
            };

            // This counter is used in the flow to keep count
            // of asynchronous operations that are going on.
            var asyncCounter = 0;

            /**
             * When an asynchronous operation is started for the sub-element parsing,
             * this function is called to increase the counter.
             */
            var incAsyncCounter = function() {
                // Simply increase the counter.
                ++asyncCounter;
            };

            /**
             * When asynchronous operations of the parse flow finish, they call this function
             * to check if the whole asynchronous flow has finished and if the original callback
             * function should be called.
             */
            var parseXmlCallback = function() {
                if (asyncCounter > 0) {
                    // Decrease the counter because an asynchronous operation has finished.
                    --asyncCounter;
                }

                if (0 === asyncCounter) {
                    // Just to be sure that if for some reason we come here twice,
                    // callback is only called the first time.
                    asyncCounter = -1;

                    // No asynchronous operations are going on anymore.
                    // Give the parsed content for the callback function
                    // in a correct data structure.
                    handleCallback(callback, finalizeContent(parsedContent, errors), errors);
                }
            };

            // Parse the XML element that wraps all the results.
            parseFeatureCollection(xml, parsedContent, incAsyncCounter, parseXmlCallback, errors);
            if (0 === asyncCounter) {
                // The flow was synchronous after all and callback should already be called.
                parseXmlCallback();
            }

        } catch(e) {
            // An error occurred in a synchronous part of the data parsing flow.
            if ("undefined" !== typeof console && console) {
                console.error("ERROR: Error during synchronous data parsing flow!");
            }
            // Make sure the asynchronous operations do not recall the callback.
            asyncCounter = -1;
            var error = {};
            error[myConstants.KEY_ERROR_TEXT] = e.toString();
            errors.push(error);
            handleCallback(callback, undefined, errors);
        }
    }

    /**
     * Finalize data of the given data structure.
     *
     * Notice, objects are used to wrap data. For example, location objects use info objects.
     * Then, reference to the information may be used instead of copying primitive type variables many times.
     * This may provide some optimization for the memory consumption if data is used in many places
     * and later additional information, such as data, should be included into the objects.
     *
     * Finalized data structure defines data parameters and locations that have information such as name and position.
     * Also, data in time-value-pairs that are related to the common parameters is provided. Time-values contain data for the certain
     * moment with parameter value pairs. Then, value for certain parameter and position may also be searched.
     * {
     *     // General information received in the server response for the request.
     *     // May not be {undefined} or {null}.
     *     // Content properties are set if given in the server response.
     *     info : {
     *         begin : {Date|undefined},
     *         end : {Date|undefined}
     *     },
     *     // May not be {undefined} or {null}.
     *     // May contain none, one or more parameter strings that identify the request parameter, such as td.
     *     parameters : [
     *         "td", // Exists if set by the parser.
     *         "windpeedms", // Exists if set by the parser.
     *         ...
     *     ],
     *     // May contain none, one or more of key-value-pairs. Key identifies the request parameter and
     *     // is same as parameters array item, such as td. Value gives property object for the requested data.
     *     properties : {
     *         // Key-value-pair describes one property. Exists if set by the parser.
     *         parameterAsKey : { label : "labelString",
     *                            unit : "unitString",
     *                            phenomenon : "phenomenonString",
     *                            statisticalFunction : "statisticalFunctionString",
     *                            statisticalPeriod : "statisticalAggregationTimePeriod" },
     *         ...
     *     },
     *     // For location data. May not be {undefined} or {null}.
     *     locations : [
     *         {
     *             info : {
     *                 id : "locationIdString",
     *                 geoid : "geoidString",
     *                 wmo : "wmoString",
     *                 fmisid: "geoidString",
     *                 name : "locationNameString",
     *                 region : "regionNameString",
     *                 country : "countryNameString",
     *                 timezone : "timezoneNameString",
     *                 position : [ "positionStringPart1", "positionStringPart2", ... ]
     *             },
     *             // Time-value-pairs are provided for location observations.
     *             timeValuePairs : [
     *                 {
     *                     // Time of the location data value measurement.
     *                     time: intTimeInMsSince01011970,
     *                     // Values provide the measurement values for the corresponding time pair.
     *                     values : {
     *                         // These property values have same name keys as parameters.
     *                         td: floatFeatureValue || undefined, // Name of this property corresponds the name of the parameter property.
     *                         ws_10min: floatFeatureValue || undefined, // Name of this property corresponds the name of the parameter property.
     *                         ...
     *                     }
     *                 },
     *                 ...
     *             ]
     *         }
     *     ]
     * }
     *
     * @param {Object} parsedContent Object that contains the data structure.
     *                               This object has the exactly defined structure that
     *                               is browsed through and parsed in this function.
     *                               May not be {undefined} or {null}.
     * @param [] errors Array that contains possible errors that occurred during the asynchronous flow.
     * @return {Object} Finalized data and data structure.
     */
    function finalizeContent(parsedContent, errors) {
        // This object will contain the finalized data structure.
        var result = {
            // Info is used directly from the parsed content object.
            info : parsedContent.info,
            // Parameters are used directly from the parsed content object.
            parameters : parsedContent.parameters,
            // Properties are used directly from the parsed content object.
            properties : parsedContent.propertiesContainer.properties,
            // Locations will contain time-value-pairs that belong to that location.
            locations : []
        };

        try {
            // Get the values or initialize them if they are undefined.
            var srsDimension = parsedContent.gmlcovPositions.srsDimension || 0;
            var gmlcovPositionsContents = parsedContent.gmlcovPositions.contents || [];
            var parametersLength = parsedContent.parameters.length;

            // Data value count is multiplication of parameter and timeposition counts.
            // Timeposition count is already a multiplication of location count.
            // Every object has a position and time and corresponding measurement values for all the parameters.
            // gmlcovPositionsContents contains position values and times values in a row as array elements.
            // One timeposition contains srsDimension count of array items that describe that position and time.
            if (srsDimension > 0 && parsedContent.data.length === parametersLength * (gmlcovPositionsContents.length / srsDimension) && parsedContent.locations.length === fi.fmi.metoclient.metolib.Utils.objectLength(parsedContent.positions)) {
                // Create locations objects for results.
                for (var ind = 0; ind < parsedContent.locations.length; ++ind) {
                    var contentLocation = parsedContent.locations[ind];
                    var refId = contentLocation.pointRef;
                    var errorStr = "ERROR: Location and position data do not match!";
                    if (refId) {
                        var position = parsedContent.positions[refId];
                        if (position) {
                            result.locations.push({
                                info : {
                                    // At least an empty string is set as property value.
                                    // Notice, values are strings, not integers.
                                    id : contentLocation.id || "",
                                    geoid : contentLocation.geoid || "",
                                    wmo : contentLocation.wmo || "",
                                    fmisid : contentLocation.fmisid || "",
                                    name : contentLocation.name || position.name || "",
                                    region : contentLocation.region || "",
                                    country : contentLocation.country || "",
                                    timezone : contentLocation.timezone || "",
                                    position : position.position || ""
                                }
                            });

                        } else {
                            throw errorStr;
                        }

                    } else {
                        throw errorStr;
                    }
                }

                // Browse through positions (and times that are included in them).
                for (var i = 0; i < gmlcovPositionsContents.length; i += srsDimension) {
                    // Result object has time property and values for that specific time.
                    var resultObject = {
                        // Server should return the time in EPOCH-format.
                        // Convert it into milliseconds because EPOCH is in seconds.
                        // If the first character cannot be converted to a number, parseInt() returns NaN.
                        // Suppose that time is the last value in the single position information.
                        time : parseInt(gmlcovPositionsContents[i + srsDimension - 1], 10) * myConstants.EPOCH_TO_MS,
                        // Values are parameter-value pairs.
                        values : {}
                    };
                    // Result object has values corresponding to the parameters.
                    for (var j = 0; j < result.parameters.length; ++j) {
                        var parameter = result.parameters[j];
                        if (parameter) {
                            // Data item count is a multiple of the parameter count and position count.
                            // Therefore, data indexing is based on the position and parameter indexing.
                            resultObject.values[parameter] = parseFloat(parsedContent.data[(i / srsDimension ) * parametersLength + j]);
                            // Make sure properties have at least empty default property object corresponding every parameter.
                            // Notice, checkKey function also makes sure parameter is case-sensitive key match in properties object
                            // if corresponding property exists.
                            if (!checkKey(result.properties, parameter) || !result.properties[parameter]) {
                                if ("undefined" !== typeof console && console) {
                                    console.error("ERROR: Server has not provided properties for request parameter!");
                                }
                                result.properties[parameter] = createEmptyPropertyObject();
                            }
                        }
                    }

                    // Result may contain a list of locations.
                    // Find the locations that should contain the result object in its time-value-pairs.
                    for (var k = 0; k < result.locations.length; ++k) {
                        var matchCount = 0;
                        var location = result.locations[k];
                        // Location contains position information that should match the measurement position information.
                        for (var m = 0; m < location.info.position.length; ++m) {
                            // Notice, i is index for the first gmlcovPositionContents position part of the current
                            // measurement data position and time information. That value is compared to the location
                            // position information.
                            if (location.info.position[m] === gmlcovPositionsContents[i + m]) {
                                // Position part is match;
                                ++matchCount;

                            } else {
                                // Did not match. So, skip rest of checking.
                                break;
                            }
                        }
                        // Location positions should match the position array length.
                        if (location.info.position && matchCount === location.info.position.length) {
                            // All the position parts matched. So, result object belongs to the current location.
                            if (!location.timeValuePairs) {
                                // Make sure that the location has timeValuePairs array for data.
                                location.timeValuePairs = [];
                            }
                            location.timeValuePairs.push(resultObject);
                            // No need to check other locations for this object.
                            // Notice, if locations have duplicates related to position information,
                            // the same location will contain all the data. Duplicates are
                            // handled separately in the end of the flow.
                            break;
                        }
                    }
                }

                // Make sure that locations contain correct data also if duplicates are given by the server.
                handleLocationDuplicates(result.locations);

            } else if (0 !== parsedContent.data.length || 0 !== gmlcovPositionsContents.length) {
                // Error because data is not in the expected format.
                // Notice, parameters may still be given even if actual content has not been found for it.
                // Notice, if server has given an exception response, an error object has alread been set for that.
                // Then, no need to throw another error here. Therefore, content lengths are checked above.
                throw "ERROR: Parsed lists do not match!";
            }

        } catch(e) {
            // An error occurred.
            if ("undefined" !== typeof console && console) {
                console.error("ERROR: Could not finalize data!");
            }
            // Set result to undefined.
            result = undefined;
            // Add an error to the errors array.
            var error = {};
            error[myConstants.KEY_ERROR_TEXT] = e.toString();
            errors.push(error);
        }

        return result;
    }

    /**
     * Locations with same position information may be provided from the server.
     * This function handles those special cases and makes sure that data is
     * assigned correctly to location duplicates.
     *
     * This function supposes that duplicates do not have time value pairs data set
     * and data needs to be moved from one location, that holds all the data, to duplicate locations.
     * Also, this function supposes that all the duplicates should have same number of data values
     * in the end of the operation.
     *
     * Notice, even if position is same for duplicates, they should differ at least by the id.
     *
     * @param {[]} locations Array that contains locations.
     *                      Operation is ignored if {undefined}, {null} or empty.
     */
    function handleLocationDuplicates(locations) {
        if (locations && locations.length) {
            // Notice, inner loop handles locations that are provided after the current locations.
            // Therefore, last location can be skipped by this outer loop for minor optimization.
            // Also, no need to do comparison if only one location is available.
            for (var i = 0; i < locations.length - 1; ++i) {
                var currentLocation = locations[i];
                // This array will contain references to the duplicate locations of currentLocation.
                var duplicates = [];
                // Notice, start index is one greater than outer loop
                // because no need to compare item to itself.
                for (var j = i + 1; j < locations.length; ++j) {
                    var compLocation = locations[j];
                    if (currentLocation.info.position.length === compLocation.info.position.length) {
                        var count = currentLocation.info.position.length;
                        var match = true;
                        for (var k = 0; k < count; ++k) {
                            if (currentLocation.info.position[k] !== compLocation.info.position[k]) {
                                match = false;
                                break;
                            }
                        }
                        if (match) {
                            // Duplicate found.
                            duplicates.push(compLocation);
                        }
                    }
                }
                if (duplicates.length) {
                    // Divide data correctly between duplicates and the current location.
                    var currentTimeValuePairs = currentLocation.timeValuePairs;
                    var correctTimeValuePairsLength = currentTimeValuePairs.length / (duplicates.length + 1);
                    // Notice, the current location contains its own data in the beginning of its data array.
                    // Data for a duplicate location is somewhere in the middle or in the end of the array.
                    // Move duplicate data from the current location time value pairs into the correct duplicate location.
                    // In the end, duplicates will contain their data and current location contains only its data.
                    for (var ind = 0; ind < duplicates.length; ++ind) {
                        duplicates[ind].timeValuePairs = currentTimeValuePairs.splice(correctTimeValuePairsLength, correctTimeValuePairsLength);
                    }
                }
            }
        }
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, this may be an asynchronous operation because parsing
     * may require asynchronous server requests for further data.
     *
     * @param {Object} xmlElement DOM element that is parsed for data.
     * @param {Object} container The object that holds the structure for the parsed data.
     *                           The structure may contain arrays and objects for the parsed data.
     *                           Parsed element data will be inserted into this data structure.
     *                           May not be {undefined} or {null}.
     * @param {function()} asyncStarted Function that is called when asynchronous operation is started.
     *                                  This is required to keep count of the on-going asynchronous operations.
     * @param {function()} asyncCallback Callback function is called when an asynchronous flow finishes.
     * @param [] errors Array that contains possible errors that occurred during the asynchronous flow.
     * @throws {String} Exception is thrown if an error occurs during the synchronous part of the flow.
     */
    function parseFeatureCollection(xmlElement, container, asyncStarted, asyncCallback, errors) {
        if (xmlElement) {
            // Check if server responded with an error.
            if (!parseExceptionReport(xmlElement, errors)) {
                jQuery(xmlElement).children(myConstants.XML_WFS_FEATURE_COLLECTION).each(function() {
                    // This element does not change the container for the child. Instead, let child
                    // elements use the same container. This way, unnecessary wrapper is skipped.
                    // Notice, asyncCallback function is also forwarded. Then, the callback that
                    // handles asynchronous flow counters will be in sync when subcomponents finish
                    // an asynchronous flow and callback is called.
                    parseWfsMember(this, container, asyncStarted, asyncCallback, errors);
                });
            }
        }
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseWfsMember(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_WFS_MEMBER).each(function() {
            parseOmsoPointTimeSeriesObservation(this, container, asyncStarted, asyncCallback, errors);
            parseOmsoGridSeriesObservation(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseOmsoPointTimeSeriesObservation(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_OMSO_POINT_TIME_SERIES_OBSERVATION).each(function() {
            parseOmPhenomenonTime(this, container.info, asyncStarted, asyncCallback, errors);
            parseOmObservedProperty(this, container.propertiesContainer, asyncStarted, asyncCallback, errors);
            parseOmFeatureOfInterest(this, container, asyncStarted, asyncCallback, errors);
            parseOmResult(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseOmsoGridSeriesObservation(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_OMSO_GRID_SERIES_OBSERVATION).each(function() {
            parseOmPhenomenonTime(this, container.info, asyncStarted, asyncCallback, errors);
            parseOmObservedProperty(this, container.propertiesContainer, asyncStarted, asyncCallback, errors);
            parseOmFeatureOfInterest(this, container, asyncStarted, asyncCallback, errors);
            parseOmResult(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseOmPhenomenonTime(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_OM_PHENOMENON_TIME).each(function() {
            parseGmlTimePeriod(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlTimePeriod(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_TIME_PERIOD).each(function() {
            parseGmlBeginPosition(this, container, asyncStarted, asyncCallback, errors);
            parseGmlEndPosition(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlBeginPosition(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_BEGIN_POSITION).each(function() {
            var begin = jQuery.trim(jQuery(this).text());
            if (begin) {
                container.begin = new Date(begin);
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlEndPosition(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_END_POSITION).each(function() {
            var end = jQuery.trim(jQuery(this).text());
            if (end) {
                container.end = new Date(end);
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseOmObservedProperty(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_OM_OBSERVED_PROPERTY).each(function() {
            // URL for the property information that is provided as an attribute.
            var url = jQuery.trim(jQuery(this).attr(myConstants.XML_ATTR_XLINK_HREF));
            if (url && !_.contains(container.urls, url)) {
                // URL content has not been downloaded before.
                container.urls.push(url);
                // Start asynchronous operation to get the properties.
                requestXml(url, errors, function(xml, errorContainer) {
                    // Check if server responded with an error.
                    if (!parseExceptionReport(xml, errors)) {
                        // Properties are inserted into the given container.
                        if (xml) {
                            // Notice, multiple observable property elements are given inside a composite.
                            // If only one observable property is given, composite is not used. Therefore,
                            // check observable properties in both ways here.
                            parseCompositeObservableProperty(xml, container.properties, asyncStarted, asyncCallback, errors);
                            parseObservableProperty(xml, container.properties, asyncStarted, asyncCallback, errors);
                        }
                    }
                    // Callback because asynchronous operation has finished.
                    asyncCallback();
                });
                // Because an asynchronous operation was started above.
                asyncStarted();
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseOmFeatureOfInterest(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_OM_FEATURE_OF_INTEREST).each(function() {
            parseSamsSfSpatialSamplingFeature(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseSamsSfSpatialSamplingFeature(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_SAMS_SF_SPATIAL_SAMPLING_FEATURE).each(function() {
            parseSamSampledFeature(this, container.locations, asyncStarted, asyncCallback, errors);
            parseSamsShape(this, container.positions, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseSamSampledFeature(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_SAM_SAMPLED_FEATURE).each(function() {
            parseTargetLocationCollection(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseTargetLocationCollection(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_TARGET_LOCATION_COLLECTION).each(function() {
            parseTargetMember(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseTargetMember(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_TARGET_MEMBER).each(function() {
            parseTargetLocation(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseTargetLocation(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_TARGET_LOCATION).each(function() {
            // Location object will contain the parsed content.
            var location = {};
            // Parse content into the location object.
            parseGmlIdentifier(this, location, asyncStarted, asyncCallback, errors);
            parseGmlNameCodeSpace(this, location, asyncStarted, asyncCallback, errors);
            parseTargetRegion(this, location, asyncStarted, asyncCallback, errors);
            parseTargetCountry(this, location, asyncStarted, asyncCallback, errors);
            parseTargetTimezone(this, location, asyncStarted, asyncCallback, errors);
            parseTargetRepresentativePoint(this, location, asyncStarted, asyncCallback, errors);
            // Append location object with parsed content into the container.
            container.push(location);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlIdentifier(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_IDENTIFIER).each(function() {
            // Set id for the common id property.
            container.id = jQuery.trim(jQuery(this).text());
            var codeSpaceValue = jQuery.trim(jQuery(this).attr(myConstants.XML_ATTR_CODE_SPACE));
            if (myConstants.XML_ATTR_CODE_SPACE_FMISID === codeSpaceValue) {
                // Set value for more accurately describing property.
                container.fmisid = jQuery.trim(jQuery(this).text());
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlNameCodeSpace(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_NAME).each(function() {
            var codeSpaceValue = jQuery.trim(jQuery(this).attr(myConstants.XML_ATTR_CODE_SPACE));
            if (myConstants.XML_ATTR_CODE_SPACE_NAME === codeSpaceValue) {
                container.name = jQuery.trim(jQuery(this).text());

            } else if (myConstants.XML_ATTR_CODE_SPACE_WMO === codeSpaceValue) {
                container.wmo = jQuery.trim(jQuery(this).text());

            } else if (myConstants.XML_ATTR_CODE_SPACE_GEOID === codeSpaceValue) {
                container.geoid = jQuery.trim(jQuery(this).text());
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseTargetRegion(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_TARGET_REGION).each(function() {
            container.region = jQuery.trim(jQuery(this).text());
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseTargetCountry(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_TARGET_COUNTRY).each(function() {
            container.country = jQuery.trim(jQuery(this).text());
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseTargetTimezone(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_TARGET_TIMEZONE).each(function() {
            container.timezone = jQuery.trim(jQuery(this).text());
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseTargetRepresentativePoint(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_TARGET_REPRESENTATIVE_POINT).each(function() {
            container.pointRef = jQuery.trim(jQuery(this).attr(myConstants.XML_ATTR_XLINK_HREF));
            if (container.pointRef && container.pointRef.charAt(0) === myConstants.XML_REF_PREFIX) {
                // Remove reference prefix from the string.
                container.pointRef = container.pointRef.slice(1);
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseSamsShape(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_SAMS_SHAPE).each(function() {
            parseGmlMultiPoint(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlPoint(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_POINT).each(function() {
            var that = this;
            // Get the position id from the attribute.
            // Every location has its own id even if they may have
            // same name and position in some special cases.
            var id = jQuery.trim(jQuery(that).attr(myConstants.XML_ATTR_GML_ID));
            if (id) {
                // Because id was given, check if the container already has the object related to id.
                if (!container[id]) {
                    // Initialize the object because it was not in container yet.
                    container[id] = {
                        name : "",
                        position : []
                    };
                }
                var position = container[id];
                // The container that child elements are using is set here in the parent.
                // The element only needs to have visibility for its own level in the container hierarchy.
                parseGmlName(this, position, asyncStarted, asyncCallback, errors);
                parseGmlPos(this, position.position, asyncStarted, asyncCallback, errors);
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlMultiPoint(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_MULTI_POINT).each(function() {
            parseGmlPointMember(this, container, asyncStarted, asyncCallback, errors);
            parseGmlPointMembers(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlPointMember(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_POINT_MEMBER).each(function() {
            parseGmlPoint(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlPointMembers(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_POINT_MEMBERS).each(function() {
            parseGmlPoint(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlName(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_NAME).each(function() {
            container.name = jQuery.trim(jQuery(this).text());
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlPos(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_POS).each(function() {
            var content = jQuery.trim(jQuery(this).text());
            if (content) {
                // Check if there is any content to split. Do not create array from an empty string.
                // Use apply to concatenate array to the end of the container array.
                container.push.apply(container, content.split(myConstants.REGEX_WHITE_SPACE));
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseOmResult(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_OM_RESULT).each(function() {
            parseGmlcovMultiPointCoverage(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlcovMultiPointCoverage(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GMLCOV_MULTI_POINT_COVERAGE).each(function() {
            parseGmlDomainSet(this, container, asyncStarted, asyncCallback, errors);
            parseGmlRangeSet(this, container, asyncStarted, asyncCallback, errors);
            parseGmlcovRangeType(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlcovRangeType(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GMLCOV_RANGE_TYPE).each(function() {
            parseSweDataRecord(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseSweDataRecord(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_SWE_DATA_RECORD).each(function() {
            // The container that child elements are using is set here in the parent.
            // The element only needs to have visibility for its own level in the container hierarchy.
            parseSweField(this, container.parameters, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseSweField(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_SWE_FIELD).each(function() {
            // Parameter identifier is provided as an attribute.
            var nameAttr = jQuery.trim(jQuery(this).attr(myConstants.XML_ATTR_NAME));
            if (nameAttr && !_.contains(container, nameAttr)) {
                container.push(nameAttr);
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlDomainSet(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_DOMAIN_SET).each(function() {
            parseGmlcovSimpleMultiPoint(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlcovSimpleMultiPoint(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GMLCOV_SIMPLE_MULTI_POINT).each(function() {
            // Handle element attributes.
            var srsDimension = jQuery.trim(jQuery(this).attr(myConstants.XML_ATTR_SRS_DIMENSION));
            if (srsDimension) {
                // Make sure dimension is handled as an integer.
                srsDimension = parseInt(srsDimension, 10);
                if (srsDimension > 0) {
                    // Set the dimension value into the container.
                    container.gmlcovPositions.srsDimension = srsDimension;
                    // Set the index that informs the position of the time value.
                    // The time value is the last value in the position data.
                    container.gmlcovPositions.timeIndex = srsDimension - 1;
                }
            }
            // Handle child elements.
            // The container that child elements are using is set here in the parent.
            // The element only needs to have visibility for its own level in the container hierarchy.
            parseGmlcovPositions(this, container.gmlcovPositions.contents, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlcovPositions(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GMLCOV_POSITIONS).each(function() {
            // Get the context as string and split content into an array.
            var content = jQuery.trim(jQuery(this).text());
            if (content) {
                // Check if there is any content to split. Do not create array from an empty string.
                // Use apply to concatenate array to the end of the container array.
                container.push.apply(container, content.split(myConstants.REGEX_WHITE_SPACE));
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlRangeSet(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_RANGE_SET).each(function() {
            parseGmlDataBlock(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlDataBlock(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_DATA_BLOCK).each(function() {
            // The container that child elements are using is set here in the parent.
            // The element only needs to have visibility for its own level in the container hierarchy.
            parseGmlDoubleOrNilReasonTupleList(this, container.data, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseGmlDoubleOrNilReasonTupleList(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_GML_DOUBLE_OR_NIL_REASON_TUPLE_LIST).each(function() {
            // Get the context as string and split content into an array.
            var content = jQuery.trim(jQuery(this).text());
            if (content) {
                // Check if there is any content to split. Do not create array from an empty string.
                // Use apply to concatenate array to the end of the container array.
                container.push.apply(container, content.split(myConstants.REGEX_WHITE_SPACE));
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, normal parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy. But,
     * parameters are simplified a little bit for exceptions.
     *
     * @param {Object} xmlElement DOM element that is parsed for data.
     * @param [] errors Array that contains possible errors that occurred during the asynchronous flow.
     * @return {boolean} {true} if Exception report element was found.
     */
    function parseExceptionReport(xmlElement, errors) {
        var exceptionFound = false;
        try {
            if (xmlElement) {
                jQuery(xmlElement).children(myConstants.XML_EXCEPTION_REPORT).each(function() {
                    exceptionFound = true;
                    // New error should be part of the errors array.
                    var error = {};
                    errors.push(error);
                    // Error will contain the parsed data.
                    parseException(this, error);
                });
            }

        } catch(e) {
            // An error occurred.
            if ("undefined" !== typeof console && console) {
                console.error("ERROR: Error while parsing exception data!");
            }
            // If subparsing has thrown an exception, it is catched here.
            // Then, other error handling does not need to worry about catching
            // these errors in asynchronous flows.
            var error = {};
            error[myConstants.KEY_ERROR_TEXT] = e.toString();
            errors.push(error);
        }
        return exceptionFound;
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * @param {Object} xmlElement DOM element that is parsed for data.
     * @param {Object} error Object that will contain error values that are parsed from the server response.
     * @return {boolean} {true} if Exception report element was found.
     * @throws {String} Exception is thrown if an error occurs during the synchronous part of the flow.
     */
    function parseException(xmlElement, error) {
        // Notice, even if XML_EXCEPTION child elements are looped through,
        // only the last element is included into the error object. But, there should
        // be only one anyway.
        jQuery(xmlElement).children(myConstants.XML_EXCEPTION).each(function() {
            error[myConstants.KEY_ERROR_CODE] = jQuery.trim(jQuery(this).attr(myConstants.XML_ATTR_EXCEPTION_CODE));
            parseExceptionText(this, error);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * See exception parse-function, {@link #parseException()},
     * for function parameter descriptions.
     *
     * @param {Object} error Object that will contain the error text that is parsed here.
     */
    function parseExceptionText(xmlElement, error) {
        // Notice, even if XML_EXCEPTION_TEXT child elements are looped through,
        // only the last element is included into the error object. But, there should
        // be only one anyway.
        jQuery(xmlElement).children(myConstants.XML_EXCEPTION_TEXT).each(function() {
            error[myConstants.KEY_ERROR_TEXT] = jQuery.trim(jQuery(this).text());
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseCompositeObservableProperty(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_COMPOSITE_OBSERVABLE_PROPERTY).each(function() {
            parseComponent(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseComponent(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_COMPONENT).each(function() {
            parseObservableProperty(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseObservableProperty(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_OBSERVABLE_PROPERTY).each(function() {
            var property = jQuery.trim(jQuery(this).attr(myConstants.XML_ATTR_GML_ID));
            if (property) {
                var propertyObject = createEmptyPropertyObject();
                parseLabel(this, propertyObject, asyncStarted, asyncCallback, errors);
                parseBasePhenomenon(this, propertyObject, asyncStarted, asyncCallback, errors);
                parseUom(this, propertyObject, asyncStarted, asyncCallback, errors);
                parseStatisticalMeasure(this, propertyObject, asyncStarted, asyncCallback, errors);
                container[property] = propertyObject;
            }
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseLabel(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_LABEL).each(function() {
            container.label = jQuery.trim(jQuery(this).text());
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseBasePhenomenon(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_BASE_PHENOMENON).each(function() {
            container.phenomenon = jQuery.trim(jQuery(this).text());
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseUom(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_UOM).each(function() {
            container.unit = jQuery.trim(jQuery(this).attr(myConstants.XML_ATTR_UOM));
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseStatisticalMeasure(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_STATISTICAL_MEASURE).each(function() {
            parseStatisticalMeasureInner(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseStatisticalMeasureInner(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_STATISTICAL_MEASURE_INNER).each(function() {
            parseStatisticalFunction(this, container, asyncStarted, asyncCallback, errors);
            parseAggregationTimePeriod(this, container, asyncStarted, asyncCallback, errors);
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseStatisticalFunction(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_STATISTICAL_FUNCTION).each(function() {
            container.statisticalFunction = jQuery.trim(jQuery(this).text());
        });
    }

    /**
     * Parse the given XML DOM element for the element data.
     *
     * Notice, parse-functions always provide same parameters and a common way
     * to parse XML is provided throughout the whole parse hierarchy.
     *
     * See root element parse-function, {@link #parseFeatureCollection()},
     * for function parameter descriptions.
     */
    function parseAggregationTimePeriod(xmlElement, container, asyncStarted, asyncCallback, errors) {
        jQuery(xmlElement).children(myConstants.XML_AGGREGATION_TIME_PERIOD).each(function() {
            container.statisticalPeriod = jQuery.trim(jQuery(this).text());
        });
    }

    /**
     * Handles the callback and possible error situations there.
     *
     * @param {function(data)} callback Callback function that is called.
     * @param {Object} data Data that is provided for callback.
     *                      May be {undefined}, for example, if an error occurred.
     * @param [] errors Array that contains possible errors that occurred during the asynchronous flow.
     */
    function handleCallback(callback, data, errors) {
        try {
            if (callback) {
                callback(data, errors);
            }

        } catch(e) {
            // Ignore errors that may occur in the callback.
            // Callback may be provided from outside of this library.
            if ("undefined" !== typeof console && console) {
                console.error("ERROR: Callback function error!");
            }
        }
    }

    /**
     * Request XML data asynchronously from the given URL and give it for the callback function.
     *
     * @param {String} url URL for the request. May not be {undefined}, {null} or empty.
     * @param [] errors Array that contains possible errors that occurred during the asynchronous flow.
     *                  May not be {undefined} or {null}.
     * @param {function(data, errors)} callback Callback function is called with response data.
     *                                          If an error occurs during request, callback is called without parameters.
     *                                          May be {undefined} or {null}.
     */
    function requestXml(url, errors, callback) {
        // Make sure that this function is asynchronous in all cases,
        // also in possible error cases that could otherwise use callback synchronously.
        setTimeout(function() {
            // URL may be logged here for debugging purposes.
            // Then, you may also use the URL directly with a web browser to check the XML.
            // if ("undefined" !== typeof console && console) { console.debug("URL: " + url); }
            jQuery.ajax({
                type : myConstants.HTTP_METHOD,
                url : url,
                dataType : myConstants.DATA_TYPE,
                success : function(data) {
                    // Request was success.
                    // Notice, if server gives an exception information
                    // in XML format for some error case, the flow should
                    // come here. But, if testing is done for this javascript
                    // in different domain or sub-domain than URL used for ajax,
                    // the callback may call error-function instead. Then,
                    // the XML body may not be available for parsing.
                    handleCallback(callback, data, errors);
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    // An error occurred.
                    var error = {};
                    error[myConstants.KEY_ERROR_CODE] = jqXHR.status;
                    // Use errorThrown if it is available and not empty string.
                    // Otherwise, use textStatus for error value. Notice, empty
                    // string is also interpreted as false with logical or operator.
                    error[myConstants.KEY_ERROR_TEXT] = errorThrown || textStatus;
                    errors.push(error);
                    handleCallback(callback, undefined, errors);
                }
            });
        }, 0);
    }

    /**
     * Get the result data for the callback function as a data structure
     * that contains results inside objects or inside arrays.
     *
     * Operation is asynchronous.
     *
     * This function uses its own callback function to parse data received by the request operation.
     * The callback function handles the parsing of the server response data and calls the original
     * callback providing the parsed data for the function.
     *
     * See {@link #parseXml()} for the parsed data structure.
     *
     * @param {String} url URL for the request.
     * @param {function(data, errors)} callback Callback is called with the parsed data structure when operation finishes.
     *                                  If an error occurs, callback is called without parameters.
     */
    function requestAndParseXml(url, callback) {
        // Error container for asynchronous flow. The common container is provided here
        // because this function wraps all request and parse operations. Then, this container
        // will contain all the errors that may also occur in any asynchronous operation.
        var errorContainer = [];

        // Get XML data for the given callback function,
        // parse data and give necessary data as callback
        // to the original caller.
        requestXml(url, errorContainer, function(xml, errors) {
            parseXml(xml, errors, callback);
        });
    }

    /**
     * Handle finalization of similar parts of locations data.
     *
     * Pushes the finalized data into the given target array.
     *
     * @param {Object} data The original data content.
     *                      May be {undefined} or {null} but then operation is ignored.
     * @param {Array} pairs The original time-value-pairs.
     *                       May be {undefined} or {null} but then operation is ignored.
     * @param {Object} target Object that will contain finalized property information and time-value-pairs.
     *                        May be {undefined} or {null} but then operation is ignored.
     */
    function finalizeDataValues(data, pairs, target) {
        if (data && data.parameters && pairs && target) {
            // Parameters array contain request parameter identifiers as strings.
            for (var i = 0; i < data.parameters.length; ++i) {
                var key = data.parameters[i];
                if (key) {
                    var finalizedValues = {
                        // Data property is identified by request parameter strings.
                        property : data.properties[key],
                        timeValuePairs : []
                    };
                    for (var j = 0; j < pairs.length; ++j) {
                        var pair = pairs[j];
                        // Time value pair contains the time value and the measurement value.
                        finalizedValues.timeValuePairs.push({
                            time : pair.time,
                            value : pair.values[key]
                        });
                    }
                    // Target data is identified by request parameter strings.
                    target[key] = finalizedValues;
                }
            }
        }
    }

    /**
     * Convert the given data structure and forward the callback for the original data callback.
     *
     * See {@link #finalizeContent()} for the original data structure and {@link #getData()} API function
     * for data structure that is provided through API.
     *
     * @param {function(data, errors)} callback Callback function that is called.
     *                                          May not be {undefined} or {null}.
     * @param {Object} data Data that is provided for callback.
     *                      May be {undefined}, for example, if an error occurred.
     * @param [] errors Array that contains possible errors that occurred during the asynchronous flow.
     */
    function dataCallback(callback, data, errors) {
        // Convert the data for the original callback function.
        // Default value for finalized data is undefined.
        // Then, undefined value is given to callback if values can not be converted.
        var finalizedData;
        try {
            if (data && data.parameters && data.properties) {
                finalizedData = {
                    info : data.info,
                    properties : data.properties,
                    locations : []
                };
                // Check if locations data is available for finalization.
                if (data.locations && data.locations.length > 0) {
                    // Location data is available.
                    // Convert the data and structure into required form.
                    var locations = data.locations;
                    for (var i = 0; i < locations.length; ++i) {
                        var location = locations[i];
                        // Location object will be inserted into the finalizedData.locations array.
                        var locationObject = {
                            info : location.info,
                            data : {}
                        };
                        // Finalize data for location.
                        finalizeDataValues(data, location.timeValuePairs, locationObject.data);
                        // Insert finalized data into array.
                        finalizedData.locations.push(locationObject);
                    }
                }
            }

        } catch(e) {
            // An error occurred.
            var errorString = "ERROR: Could not finalize data!";
            if ("undefined" !== typeof console && console) {
                console.error(errorString);
            }
            // Set data undefined.
            finalizedData = undefined;
            // Append the error to the errors array.
            var error = {};
            error[myConstants.KEY_ERROR_TEXT] = e.toString();
            errors.push(error);
        }

        callback(finalizedData, errors);
    }

    /**
     * Creates URL query field-value-pairs string from the key-value-pairs of the object.
     *
     * @param {Object} queryExtension May be {undefined} or {null}.
     *                                Property values may be {undefined}, {null} or {string}.
     * @return {String} URL query field-value-pairs string.
     *                  May not be {undefined} or {null}. May be an empty {string}.
     *                  If content is provided, "&" is automatically included as a prefix.
     */
    function handleQueryExtension(queryExtension) {
        var extension = "";
        if (queryExtension) {
            for (var key in queryExtension) {
                if (queryExtension.hasOwnProperty(key)) {
                    // Always include delimiter character even if value would not be given.
                    extension += fi.fmi.metoclient.metolib.Utils.encodeUriComponent(key);
                    extension += myConstants.URL_QUERY_FIELD_VALUE_DELIMITER;
                    extension += fi.fmi.metoclient.metolib.Utils.encodeUriComponent(queryExtension[key] || "");
                }
            }
            if (extension) {
                // Include prefix into string.
                extension = myConstants.URL_QUERY_PREFIX_AND + extension;
            }
        }
        return extension;
    }

    /**
     * This function provides the actual implementation for the API functions
     * that request parsed data.
     *
     * Operation is asynchronous.
     *
     * See API function {@link #getData()} for function and parameter descriptions.
     * @throws {String} Exception if parameters are not correct.
     */
    function getParsedData(url, storedQueryId, requestParameter, begin, end, timestep, numOfTimesteps, denyTimeAdjusting, geoid, wmo, fmisid, sites, bbox, crs, queryExtension, callback) {
        // Convert possible integer millisecond values of times into Date objects.
        if (!( begin instanceof Date) && !isNaN(begin)) {
            begin = new Date(begin);
        }
        if (!( end instanceof Date) && !isNaN(end)) {
            end = new Date(end);
        }

        // Make sure parameters are available as a single string.
        if (requestParameter && _.isArray(requestParameter)) {
            requestParameter = requestParameter.join();
        }

        // Timestep and numOfTimesteps are alternative to each others. Timestep is the first choice of the two.
        // If numOfTimesteps is used, begin and end are also required and should be Date objects.
        if ((undefined === timestep || null === timestep) && numOfTimesteps && numOfTimesteps > 0 && begin instanceof Date && end instanceof Date) {
            timestep = Math.round((end.getTime() - begin.getTime()) / numOfTimesteps);
        }

        // Check that required data is available and parameters are of the correct type.
        var urlCheck = url && _.isString(url);
        var storedQueryCheck = storedQueryId && _.isString(storedQueryId);
        var parameterCheck = requestParameter && _.isString(requestParameter);
        var periodCheck = begin instanceof Date && end instanceof Date && begin.getTime() <= end.getTime() && (!timestep || _.isNumber(timestep) );
        var geoidCheck = _.isNumber(geoid) || geoid && _.isString(geoid) || _.isArray(geoid) && geoid.length;
        var wmoCheck = _.isNumber(wmo) || wmo && _.isString(wmo) || _.isArray(wmo) && wmo.length;
        var fmisidCheck = _.isNumber(fmisid) || fmisid && _.isString(fmisid) || _.isArray(fmisid) && fmisid.length;
        var sitesCheck = sites && _.isString(sites) || _.isArray(sites) && sites.length;
        var bboxCheck = bbox && _.isString(bbox);
        var locationGivenCheck = geoidCheck || wmoCheck || fmisidCheck || sitesCheck || bboxCheck;
        var crsCheck = !crs || _.isString(crs);
        if (urlCheck && storedQueryCheck && parameterCheck && periodCheck && locationGivenCheck && crsCheck) {
            // Check if begin and end times should be adjusted for server. They need to be exact for minutes.
            if (!denyTimeAdjusting) {
                begin.setTime(adjustBeginTime(timestep, begin).getTime());
                end.setTime(adjustEndTime(timestep, end, begin).getTime());
            }

            // Server uses ISO-timestamp for pre 1970 times.
            // Remove millisecond part from the timestamp because server does not support it.
            // Millisecond is separated by . character. So, use regex to remove . delimiter and ms integer.
            var MS_REG = /\.\d+/;
            begin = fi.fmi.metoclient.metolib.Utils.encodeUriComponent(begin.toISOString()).split(MS_REG).join("");
            end = fi.fmi.metoclient.metolib.Utils.encodeUriComponent(end.toISOString()).split(MS_REG).join("");

            // The server uses the default timestep when the URL parameter string is empty.
            var timeStepParameter = "";
            // Timestep should be in minutes for the server.
            var timestepMinutes = Math.floor(timestep / myConstants.MIN_TO_MS);
            if (timestepMinutes && timestepMinutes > 0) {
                timeStepParameter = myConstants.REQUEST_TIMESTEP + timestepMinutes;
            }

            // Parameters are given through the API. Therefore, make sure parameters do not
            // contain illegal characters when inserted into the URL. Parameters that should
            // be numbers are checked above and numbers are always accepted.
            requestParameter = fi.fmi.metoclient.metolib.Utils.encodeUriComponent(requestParameter);

            var ind;
            var geoidParameter = "";
            if (_.isNumber(geoid) || geoid && _.isString(geoid)) {
                // Insert geoid into an array if integer or string was given.
                geoid = [geoid];

            }
            // Content should always be in an array.
            if (_.isArray(geoid)) {
                // There may be multiple geoids. Server accepts multiple geoid parameters.
                for ( ind = 0; ind < geoid.length; ++ind) {
                    var tmpGeoid = geoid[ind];
                    if (_.isNumber(tmpGeoid) || tmpGeoid && _.isString(tmpGeoid)) {
                        tmpGeoid = fi.fmi.metoclient.metolib.Utils.encodeUriComponent(tmpGeoid);
                        geoidParameter += myConstants.REQUEST_GEOID + tmpGeoid;
                    }
                }
            }

            var wmoParameter = "";
            if (_.isNumber(wmo) || wmo && _.isString(wmo)) {
                // Insert string into an array if integer or string was given.
                wmo = [wmo];

            }
            // Content should always be in an array.
            if (_.isArray(wmo)) {
                // There may be multiple wmos. Server accepts multiple wmo parameters.
                for ( ind = 0; ind < wmo.length; ++ind) {
                    var tmpWmo = wmo[ind];
                    if (_.isNumber(tmpWmo) || tmpWmo && _.isString(tmpWmo)) {
                        tmpWmo = fi.fmi.metoclient.metolib.Utils.encodeUriComponent(tmpWmo);
                        wmoParameter += myConstants.REQUEST_WMO + tmpWmo;
                    }
                }
            }

            var fmisidParameter = "";
            if (_.isNumber(fmisid) || fmisid && _.isString(fmisid)) {
                // Insert string into an array if integer or string was given.
                fmisid = [fmisid];

            }
            // Content should always be in an array.
            if (_.isArray(fmisid)) {
                // There may be multiple fmisids. Server accepts multiple fmisid parameters.
                for ( ind = 0; ind < fmisid.length; ++ind) {
                    var tmpFmisid = fmisid[ind];
                    if (_.isNumber(tmpFmisid) || tmpFmisid && _.isString(tmpFmisid)) {
                        tmpFmisid = fi.fmi.metoclient.metolib.Utils.encodeUriComponent(tmpFmisid);
                        fmisidParameter += myConstants.REQUEST_FMISID + tmpFmisid;
                    }
                }
            }

            var sitesParameter = "";
            if (sites) {
                if (_.isString(sites)) {
                    // Insert sites string into an array if only integer or string was given.
                    sites = [sites];
                }
                // There may be multiple places. Server accepts multiple place parameters.
                for ( ind = 0; ind < sites.length; ++ind) {
                    var place = sites[ind];
                    if (place && _.isString(place)) {
                        place = fi.fmi.metoclient.metolib.Utils.encodeUriComponent(place);
                        sitesParameter += myConstants.REQUEST_PLACE + place;
                    }
                }
            }

            var bboxParameter = "";
            if (bbox) {
                bboxParameter = myConstants.REQUEST_BBOX + fi.fmi.metoclient.metolib.Utils.encodeUriComponent(bbox);
            }

            var crsParameter = "";
            if (crs) {
                crsParameter = myConstants.REQUEST_CRS + fi.fmi.metoclient.metolib.Utils.encodeUriComponent(crs);
            }

            var storedQueryIdParameter = myConstants.REQUEST_STORED_QUERY_ID + fi.fmi.metoclient.metolib.Utils.encodeUriComponent(storedQueryId);

            // Check which delimiter is used with the first query that is appended to the base URL.
            var urlQueryDelimiter = url.indexOf(myConstants.URL_QUERY_PREFIX_BEGIN) === -1 ? myConstants.URL_QUERY_PREFIX_BEGIN : myConstants.URL_QUERY_PREFIX_AND;
            if (url.length > 0 && (url.indexOf(myConstants.URL_QUERY_PREFIX_BEGIN) === url.length - 1 || url.indexOf(myConstants.URL_QUERY_PREFIX_AND) === url.length - 1 )) {
                // Do not use delimiter if URL ends with one.
                urlQueryDelimiter = "";
            }

            var urlQueryExtension = handleQueryExtension(queryExtension);

            var requestUrl = url + urlQueryDelimiter + myConstants.REQUEST_GET_FEATURE + storedQueryIdParameter + myConstants.REQUEST_PARAMETERS + requestParameter + myConstants.REQUEST_BEGIN + begin + myConstants.REQUEST_END + end + timeStepParameter + geoidParameter + wmoParameter + fmisidParameter + sitesParameter + bboxParameter + crsParameter + urlQueryExtension;
            requestAndParseXml(requestUrl, callback);

        } else {
            var errorStr = "ERROR: Wrong or missing information for the request!";
            if ("undefined" !== typeof console && console) {
                console.error(errorStr);
            }
            // Notice, this error is part of the synchronous flow.
            throw errorStr;
        }
    }

    /**
     * See API for function description.
     */
    function adjustBeginTime(timestep, time) {
        var date;
        if (undefined !== time && null !== time) {
            // New date object is always created to make sure that the original object is not modified unwanted.
            date = time instanceof Date ? new Date(time.getTime()) : new Date(time);
            // Begin time is always rounded towards smaller number.
            date.setMilliseconds(0);
            date.setSeconds(0);
            var timestepMinutes = !timestep ? undefined : Math.floor(timestep / myConstants.MIN_TO_MS);
            if (timestepMinutes) {
                // Also, server gives values starting from the minutes that are divisible by the timestep
                // and are equal to or greater than the given value. For client purposes, the begin time is
                // rounded down to the value that matches the given timestep. Notice, still the given timestep
                // may not match the timestep that is used to measure statistics. Then, this may not help.
                var beginMinutes = date.getMinutes();
                // Notice, begin minutes can always be an exact hour. Because server starts from that.
                // Therefore, this works even if beginMinutes was less than timestepMinutes.
                beginMinutes -= (beginMinutes % timestepMinutes);
                date.setMinutes(beginMinutes);
            }
        }
        return date;
    }

    /**
     * See API for function description.
     */
    function adjustEndTime(timestep, end, begin) {
        var date;
        if (undefined !== begin && null !== begin && undefined !== end && null !== end) {
            date = end instanceof Date ? new Date(end.getTime()) : new Date(end);
            var beginDate = adjustBeginTime(timestep, begin);
            if (timestep) {
                // Make sure that the end value is evenly on the timestep.
                // Unlike with begin time, exact hour does not limit time step here.
                var reminder = (date.getTime() - beginDate.getTime()) % timestep;
                if (reminder > 0) {
                    date.setTime(date.getTime() + (timestep - reminder));
                }
            }
        }
        return date;
    }

    /**
     * See API for function description.
     */
    function getData(options) {
        if (options && options.callback) {
            try {
                // Object properties are given as function parameters here instead of options object.
                // Then, later if string or integer values are changed in the function, they are changed
                // to function variables instead of changing property values of the original object. Notice,
                // arrays and objects as function parameters still refere to the original arrays and objects.
                getParsedData(options.url, options.storedQueryId, options.requestParameter, options.begin, options.end, options.timestep, options.numOfTimesteps, options.denyTimeAdjusting, options.geoid, options.wmo, options.fmisid, options.sites, options.bbox, options.crs, options.queryExtension, function(data, errors) {
                    // Notice, errors parameter is for the errors that occurred during the asynchronous flow.
                    dataCallback(options.callback, data, errors);
                });

            } catch(e) {
                // An error occurred in synchronous flow.
                // But, inform observer about the error asynchronously.
                // Then, flow progresses similarly through API in both
                // error and success cases.
                setTimeout(function() {
                    if ("undefined" !== typeof console && console) {
                        console.error("ERROR: Get data error!");
                    }
                    var error = {};
                    error[myConstants.KEY_ERROR_TEXT] = e.toString();
                    handleCallback(options.callback, undefined, [error]);
                }, 0);
            }

        } else {
            // Callback is required. There is no reason to request data if it is not used somewhere.
            var errorStr = "ERROR: Options object and callback function in it are mandatory!";
            if ("undefined" !== typeof console && console) {
                console.error(errorStr);
            }
            throw errorStr;
        }
    }

    /**
     * =========================================
     * Public RequestParser API is returned here.
     * =========================================
     */
    return {

        /**
         * Request data.
         *
         * Operation is asynchronous.
         *
         * Notice, callback is {function(data, errors){}}.
         *      - data: Data object provides locations data.
         *              May be {undefined} if an error has occurred.
         *              The object is of this structure:
         *          {
         *              // General information received in the server response for the request.
         *              // May not be {undefined} or {null}.
         *              // Content properties are set if given in the server response.
         *              info : {
         *                  begin : {Date|undefined},
         *                  end : {Date|undefined}
         *              },
         *              // Properties provide descriptive property objects that correspond to
         *              // the parameter keys that have been given for the request. Notice,
         *              // property data is also available inside locations data objects.
         *              // This object is provided as a complementary object, if reference to a single
         *              // wrapper object is later needed for general information about properties.
         *              properties : {
         *                  parameterAsKey : { label : "labelString",
         *                                     unit : "measurementUnitString",
         *                                     phenomenon : "phenomenonString",
         *                                     statisticalFunction : "statisticalFunctionString",
         *                                     statisticalPeriod : "statisticalAggregationTimePeriod" },
         *                  ...
         *              },
         *              // Data of locations. May be empty if sites data is not provided.
         *              // May not be {undefined} or {null}.
         *              locations : [
         *                  {
         *                      info : {
         *                          id : "location id string",
         *                          geoid : "geoid string",
         *                          wmo : "wmo string",
         *                          fmisid : "fmisid string",
         *                          name : "location name string",
         *                          region : "region name string",
         *                          country : "country name string",
         *                          timezone : "timezone name string",
         *                          position : [ "positionStringPart1", "positionStringPart2", ... ]
         *                      },
         *                      data : {
         *                          // Data property keys correspond to the parameter keys
         *                          // that have been given for the request.
         *                          parameterAsKey : {
         *                            property : { label : "labelString",
         *                                         unit : "measurementUnitString",
         *                                         phenomenon : "phenomenonString",
         *                                         statisticalFunction : "statisticalFunctionString",
         *                                         statisticalPeriod : "statisticalAggregationTimePeriod" },
         *                            timeValuePairs : [ { time : intTimeInMsSince01011970,
         *                                                 value : floatMeasurementValue }, ... ]
         *                          },
         *                          ...
         *                      }
         *                  },
         *                  ...
         *              ]
         *          }
         *      - errors: Array that contains possible errors that occurred during the flow. Array is
         *                always provided even if it may be empty. If an error occurs in this parser,
         *                an error string is pushed here. Also, when an HTTP error occurs, error contains
         *                the textual portion of the HTTP status, such as "Not Found" or "Internal Server Error."
         *                Errors parameter is of this structure:
         *          [
         *              {
         *                  // None, one, or more of the following error values may exist.
         *                  // Values may also be {undefined} or {null}.
         *                  errorCode : "errorCodeString",
         *                  errorText : "errorTextString",
         *                  extension : {Object}
         *              },
         *              ...
         *          ]
         *
         * Notice, object properties of the function {options} parameter are URL encoded by this library
         * before they are inserted into the request URL.
         *
         * @param {Object} options Mandatory. May not be {undefined} or {null}. Object structure:
         *     {
         *         url : {String}
         *               Mandatory property. May not be {undefined}, {null} or empty.
         *               URL that is used for the given parameters.
         *         storedQueryId : {String}
         *                         Mandatory property. May not be {undefined}, {null} or empty.
         *                         Stored query ID to identify the data that is requested. For example,
         *                         stored query ID may be used to request observed data or forecast data.
         *         requestParameter : {String|Array(String)}
         *                            Mandatory property. May not be {undefined} or {null}. Array may not be empty.
         *                            This is one of the parameter strings that is part of
         *                            URL parameters to define which data is requested from the server.
         *                            Parameter string may contain request for multiple parameters.
         *                            For example, value for dew point temperature may be "td".
         *                            If an array is given, strings are given as separate array string items.
         *         begin : {int|Date}
         *                 Mandatory property. May not be {undefined} or {null}.
         *                 The begin time for the data.
         *                 Integer value is number of milliseconds since 01.01.1970 that can be gotten,
         *                 for example, with {Date::getTime()}. Alternatively, {Date} object may be given.
         *         end : {int|Date}
         *               Mandatory property. May not be {undefined} or {null}.
         *               The end time for the data.
         *               Value is number of milliseconds since 01.01.1970 that can be gotten,
         *               for example, with {Date::getTime()}. Alternatively, {Date} object may be given.
         *         timestep : {int}
         *                    May be {undefined} or {null}.
         *                    Timestep in milliseconds.
         *                    Notice, if this is {undefined} or {null} and {numOfTimsteps} is given,
         *                    {numOfTimsteps}, {begin} and {end} values are used to calculate the value
         *                    for timestep. If timestep is given, it is used instead of {numOfTimsteps}.
         *                    If {undefined}, {null} or zero, server returns all data for
         *                    the given time interval. If timestep is 1, server uses the default
         *                    timestep. Notice, even if time is in milliseconds here, it is converted
         *                    and floored to minutes before sending for the server.
         *         numOfTimesteps : {int}
         *                          May be {undefined} or {null}.
         *                          Number of time steps.
         *                          This value is ignored if {undefined}, {null} or zero or if {timestep} is given.
         *         denyTimeAdjusting : {boolean}
         *                             May be {undefined} or {null}.
         *                             If {true}, {begin} and {end} times are not adjusted for server but given values
         *                             are used exactly for requests. Otherwise, times are adjusted.
         *         geoid : {Array(String|int)|String|int}
         *                 May be {undefined} or {null} or empty if {wmo}, {fmisid}, {sites} or {bbox} is given.
         *                 Array of Geographical name ID (geonames.org) strings or integers.
         *                 One geoid can be given as a single string or integer.
         *                 Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *         wmo : {Array(String|int)|String|int}
         *               May be {undefined} or {null} or empty if {geoid}, {fmisid}, {sites} or {bbox} is given.
         *               Array of World Meteorological Organization (WMO) identifier strings or integers.
         *               One wmo can be given as a single string or integer.
         *               Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *         fmisid : {Array(String|int)|String|int}
         *                  May be {undefined} or {null} or empty if {geoid}, {wmo}, {sites} or {bbox} is given.
         *                  Array of FMI observation station identifiers (fmisid) strings or integers.
         *                  One fmisid can be given as a single string or integer.
         *                  Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *         sites : {Array(String)|String}
         *                 May be {undefined} or {null} or empty if {geoid}, {wmo}, {fmisid} or {bbox} is given.
         *                 Array of site name strings. One site can be given as a single string.
         *                 Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *         bbox : {String}
         *                May be {undefined}, {null} or empty if {geoid}, {wmo}, {fmisid} or {sites} is given.
         *                BBOX string. Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *         crs : {String}
         *               May be {undefined}, {null} or empty.
         *               Coordinate Reference System (CRS) string.
         *         queryExtension : {Object}
         *                          Optional. May be {undefined} or {null}.
         *                          Property values may be {undefined}, {null} or {string}.
         *                          This property is not needed in normal use cases of the API.
         *                          But, this property may be used if API does not support field-value-pairs
         *                          that need to be included into request URL query. The key-value-pairs of
         *                          the property are URL encoded and included as URL query field-value-pairs
         *                          in the request. If property value is {undefined} or {null}, it is interpreted
         *                          as an empty string. Notice, other API properties should be used instead of this
         *                          extension if possible.
         *         callback : {function(data, errors)}
         *                    Mandatory property. May not be {undefined} or {null}.
         *                    Callback is called with the parsed data and errors array when operation finishes.
         *                    If an error occurs, data is set {undefined} for the callback. Possible errors are
         *                    given inside the array that is always provided.
         *     }
         */
        getData : getData,

        /**
         * Complementary function to adjust a supposed begin time for server requests.
         *
         * Notice, {getData} function does this automatically for server requests unless
         * {denyTimeAdjusting} property is set {true}. This function is provided as a complementary
         * method for special cases that should adjust times for other purposes outside the parser.
         *
         * @param {int} timestep Timestep in milliseconds. May be {undefined} or {null}.
         * @param {int|Date} time Integer value is number of milliseconds since 01.01.1970 that can be gotten,
         *                        for example, with {Date::getTime()}. Alternatively, {Date} object may be given.
         *                        May be {undefined} or {null} but then operation is ignored and {undefined} is
         *                        returned.
         * @return {Date} Adjusted begin time as {Date} object. Is {undefined} if given {time} is {undefined} or {null}.
         */
        adjustBeginTime : adjustBeginTime,

        /**
         * Complementary function to adjust a supposed end time for server requests.
         *
         * Notice, {getData} function does this automatically for server requests unless
         * {denyTimeAdjusting} property is set {true}. This function is provided as a complementary
         * method for special cases that should adjust times for other purposes outside the parser.
         *
         * @param {int} timestep Timestep in milliseconds. May be {undefined} or {null}.
         * @param {int|Date} end End time that is adjusted by this function.
         *                       Integer value is number of milliseconds since 01.01.1970 that can be gotten,
         *                       for example, with {Date::getTime()}. Alternatively, {Date} object may be given.
         *                       May be {undefined} or {null} but then operation is ignored and {undefined} is
         *                       returned.
         * @param {int|Date} begin Begin time that is used for the time period that is requested. This is needed
         *                         in order to calculate the proper end time. Notice, {begin} does not necessarily
         *                         need to be adjusted before calling this function because value is adjusted
         *                         internally in this function if needed for calculations.
         *                         Integer value is number of milliseconds since 01.01.1970 that can be gotten,
         *                         for example, with {Date::getTime()}. Alternatively, {Date} object may be given.
         *                         May be {undefined} or {null} but then operation is ignored and {undefined} is
         *                         returned.
         * @return {Date} Adjusted end time as {Date} object. Is {undefined} if given {begin} or {end} is {undefined} or {null}.
         */
        adjustEndTime : adjustEndTime
    };

})();

/**
 * fi.fmi.metoclient.metolib.SplitterCache
 * =======================================
 *
 * See https://github.com/fmidev/metolib/wiki/SplitterCache for documentation.
 *
 * Requires:
 * - async.js (https://github.com/caolan/async)
 * - lodash.underscore.js (http://lodash.com/) or underscore.js (http://underscorejs.org/)
 *
 * Original author: Ilkka Rinne / Spatineo Inc. for the Finnish Meteorological Institute
 *
 *
 * This software may be freely distributed and used under the following MIT license:
 *
 * Copyright (c) 2013 Finnish Meteorological Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

// Strict mode for whole file.
// "use strict";

// Requires lodash
if ("undefined" === typeof _ || !_) {
    throw "ERROR: Lo-dash-underscore is required for fi.fmi.metoclient.metolib.SplitterCache!";
}

// Requires async
if ("undefined" === typeof async || !async) {
    throw "ERROR: Async is required for fi.fmi.metoclient.metolib.SplitterCache!";
}

//"Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.metolib = fi.fmi.metoclient.metolib || {};

fi.fmi.metoclient.metolib.SplitterCache = (function() {

    //Functions and variables shared with all instances:
    var checkTaskDef = function(taskDef) {
        var placeholder;
        var startNudge = 0;
        var endNudge = 0;
        if (!_.isObject(taskDef)) {
            throw 'taskdef must be an object';
        }

        if (!_.isString(taskDef.service)) {
            throw 'taskDef must contain a \'service\' property of string type';
        }

        if (!_.isArray(taskDef.location)) {
            if (!_.isString(taskDef.location)) {
                throw 'taskDef must contain a \'location\' property of either an array or a string type';
            } else {
                placeholder = taskDef.location;
                taskDef.location = [];
                taskDef.location.push(placeholder);
            }
        }

        if (!_.isArray(taskDef.parameter)) {
            if (!_.isString(taskDef.parameter)) {
                throw 'taskDef must contain a \'parameter\' property of either an array or a string type';
            } else {
                placeholder = taskDef.parameter;
                taskDef.parameter = [];
                taskDef.parameter.push(placeholder);
            }
        }

        if (!_.isNumber(taskDef.resolution)) {
            throw 'taskDef must contain a \'resolution\' property of numeric type';
        } else if (taskDef.resolution > 0.5) {
            taskDef.resolution = Math.round(taskDef.resolution);
        } else {
            throw 'taskDef.resolution must be a positive integer';
        }

        if (!_.isNumber(taskDef.start)) {
            throw 'taskDef must contain a \'start\' property of numeric type';
        }

        if (_.isNumber(taskDef.pointCount)) {
            if (taskDef.pointCount > 0) {
                taskDef.end = taskDef.start + (taskDef.pointCount - 1) * taskDef.resolution;
            } else {
                throw 'taskDef.pointCount must be greater than zero';
            }
        } else if (_.isNumber(taskDef.end)) {
            if (taskDef.end < taskDef.start) {
                throw '\'end\' must be greater than or equal to \'start\'';
            }
            endNudge = (taskDef.end - taskDef.start) % taskDef.resolution;
            if (endNudge !== 0) {
                taskDef.end = taskDef.end + (taskDef.resolution - endNudge);
            }
            taskDef.pointCount = (taskDef.end - taskDef.start) / taskDef.resolution + 1;
        } else {
            throw 'taskDef must contain either \'end\' or \'pointCount\' property of numeric type';
        }
    };

    var arrayEqualsAnyOrder = function(arr1, arr2) {
        var i = 0;
        if (_.isArray(arr1) && _.isArray(arr2)) {
            if (arr1.length === arr2.length) {
                for ( i = 0; i < arr1.length; i++) {
                    if (_.indexOf(arr2, arr1[i]) === -1) {
                        return false;
                    }
                }
                return true;
            } else {
                return false;
            }
        } else if ((arr1 === undefined) || (arr1 === null) || (arr2 === undefined) || (arr2 === null)) {
            return false;
        } else {
            return (arr1 === arr2);
        }
    };

    /**
     * DataBlock constructor
     *
     * DataBlock is provided as an internal class.
     * DataBlock instances are created internally by the cache object.
     */
    var DataBlock = (function() {
        var blockCounter = 0;

        var _constructor = function DataBlock(evtDispatcher) {
            var id = null;
            var fetchError = null;
            var fetcher = null;
            var data = null;
            var taskDef = null;
            var age = 0;
            var fetching = false;
            var fetched = false;
            var pinCount = 0;
            var waitingRecycling = false;
            var waitingMerging = false;
            var ready = false;
            var callbacks = [];
            var requestId = 0;
            var dispatcher = evtDispatcher;
            var thisBlock = this;

            //Private functions:

            function reset() {
                fetchError = null;
                fetcher = null;
                data = null;
                taskDef = null;
                age = 0;
                fetching = false;
                fetched = false;
                pinCount = 0;
                waitingRecycling = false;
                waitingMerging = false;
                ready = false;
                callbacks = [];

            }

            //Privileged functions:
            this.getId = function() {
                return id;
            };

            this.getTaskDef = function() {
                return taskDef;
            };

            this.getStart = function() {
                return (taskDef !== null) ? taskDef.start : undefined;
            };

            this.getEnd = function() {
                return (taskDef !== null) ? taskDef.end : undefined;
            };

            this.getPointCount = function() {
                return (taskDef !== null) ? taskDef.pointCount : undefined;
            };

            this.getResolution = function() {
                return (taskDef !== null) ? taskDef.resolution : undefined;
            };

            this.getService = function() {
                return (taskDef !== null) ? taskDef.service : undefined;
            };

            this.getLocation = function() {
                return (taskDef !== null) ? taskDef.location : undefined;
            };

            this.getParameter = function() {
                return (taskDef !== null) ? taskDef.parameter : undefined;
            };

            this.getDataSize = function() {
                return (taskDef !== null) ? (taskDef.pointCount * taskDef.parameter.length * taskDef.location.length) : 0;
            };

            this.pin = function() {
                if (!waitingRecycling) {
                    pinCount++;
                    if (dispatcher) {
                        dispatcher('blockPinned', thisBlock);
                    }
                    return pinCount;
                } else {
                    return null;
                }
            };

            this.unpin = function() {
                if (pinCount > 0) {
                    pinCount--;
                    if (dispatcher) {
                        dispatcher('blockUnpinned', thisBlock);
                    }
                }
                return pinCount;
            };

            this.isPinned = function() {
                return (pinCount > 0);
            };

            this.getPinCount = function() {
                return pinCount;
            };

            this.getRequestId = function() {
                return requestId;
            };

            this.isWaitingRecycling = function() {
                return waitingRecycling;
            };

            this.isWaitingMerging = function() {
                return waitingMerging;
            };

            this.isFetched = function() {
                return fetched;
            };

            this.setFetched = function(f) {
                if (f === true) {
                    fetched = true;
                } else {
                    fetched = false;
                }
            };

            this.isFetching = function() {
                return fetching;
            };

            this.setFetching = function(f) {
                if (f === true) {
                    fetching = true;
                } else {
                    fetching = false;
                }
            };

            this.increaseNotUsed = function() {
                age++;
                if (dispatcher) {
                    dispatcher('blockAged', thisBlock);
                }
            };

            this.getNotUsedSince = function() {
                return age;
            };
            
            this.fetchFailed = function() {
              return fetchError !== null;  
            };

            this.markForRecycling = function() {
                waitingRecycling = true;
                if (dispatcher) {
                    dispatcher('blockEvicted', thisBlock);
                }
            };

            this.markForMerging = function(merge) {
                if (merge === true){
                    waitingMerging = true;                    
                    if (dispatcher) {
                        dispatcher('blockMarkedForMerge', thisBlock);
                    }
                }
                else {
                    waitingMerging = false;
                    if (dispatcher) {
                        dispatcher('blockMergeCancelled', thisBlock);
                    }
                }
            };

            this.setData = function(d) {
                data = d;
            };

            this.getFetcher = function() {
                return fetcher;
            };

            this.recycle = function() {
                reset();
                if (dispatcher) {
                    dispatcher('blockRecycled', thisBlock);
                }
            };

            /**
             * TaskDef: {
             *          service,
             *          parameter,
             *          location,
             *          start,
             *          resolution,
             *          pointCount
             * }
             */
            this.prepare = function(taskDefinition, dataFetcher) {
                if (!_.isFunction(dataFetcher)) {
                    throw 'fetcher must be a function';
                }
                checkTaskDef(taskDefinition);
                reset();
                taskDef = taskDefinition;
                fetcher = dataFetcher;
                ready = true;
                requestId++;
                if (dispatcher) {
                    dispatcher('blockPrepared', thisBlock);
                }
            };

            /**
             * @param callback {function(err,data)}
             */
            this.getDataAsync = function(callback) {
                var that = this;
                if (!ready) {
                    throw 'Cannot getData in unprepared state, call prepare first';
                }
                age = 0;
                if (!fetched) {
                    if ((callback !== undefined) && _.isFunction(callback)) {
                        callbacks.push(callback);
                    }
                    if (!fetching) {
                        fetching = true;
                        fetcher(taskDef, function(err, result) {
                            var reqId = that.getRequestId();
                            if (err) {
                                fetchError = err;
                            }
                            data = result;                                
                            fetched = true;
                            if (callbacks.length === 0) {
                                fetching = false;
                            } else {
                                async.whilst(function() {
                                    var myReqId = that.getRequestId();
                                    //We may still be looping here when this block has been recycled, re-prepared and fetching for the next request.
                                    //So need to check if the request has not changed and we still have callbacks.
                                    //The callbacks for the next request will still be looped through when the time is right.
                                    return ((reqId === myReqId) && (callbacks.length > 0));
                                }, function(notify) {
                                    try {
                                        var cb = callbacks.pop();
                                        cb.call(that, fetchError, data);
                                    } catch (ex) {
                                        if ("undefined" !== typeof console && console) {
                                            console.error('Error in block finished callback:' + ex.message);
                                        }
                                    } finally {
                                        notify();
                                        fetching = false;
                                    }
                                }, function(err) {
                                    //NOOP
                                });
                            }
                            if (dispatcher) {
                                dispatcher('blockProviderFetchFinished', thisBlock);
                            }
                        });
                        if (dispatcher) {
                            dispatcher('blockProviderFetchStarted', thisBlock);
                        }
                    }

                } else {
                    if (_.isFunction(callback)) {
                        _.defer(function(err, d) {
                            if (dispatcher) {
                                dispatcher('blockCacheFetchFinished', thisBlock);
                            }
                            callback(err, d);
                        }, fetchError, data);
                        if (dispatcher) {
                            dispatcher('blockCacheFetchStarted', thisBlock);
                        }
                    } else {

                    }
                }
            };

            //Instance initialization:
            id = 'id#' + blockCounter++;

            if (dispatcher) {
                dispatcher('blockCreated', thisBlock);
            }
        };

        return _constructor;
    })();

    var eventListenerIdCounter = 0;
    var fetcherIdCounter = 0;

    /**
     * SplitterCache constructor
     *
     * Constructor contains priviledged methods that are provided as API functions
     * for the instantiated cache object.
     */
    var _constructor = function SplitterCache(properties) {
        var emptyBlockPool = [];
        var cachedBlocks = [];
        var mergedBlocks = [];
        var stepResolutions = [];
        var sideFetchBeforeFactor = 0.5;
        var sideFetchAfterFactor = 1;
        var maxBlockDataPoints = 500;
        var minBlockDataPoints = 20;
        var maxCacheDataSize = 50000;
        var strictErrorHandling = true;
        var errorFillValue = NaN;
        
        var fetchers = {};
        var cachedDataSize = 0;
        var cacheHits = 0;
        var cacheMisses = 0;
        var thisCache = this;

        var eventListeners = {
            blockCreated : {},
            blockPrepared : {},
            blockProviderFetchStarted : {},
            blockProviderFetchFinished : {},
            blockCacheFetchStarted : {},
            blockCacheFetchFinished : {},
            blockPinned : {},
            blockUnpinned : {},
            blockEvicted : {},
            blockRecycled : {},
            blockAged : {},
            blockMarkedForMerge : {},
            blockMergeCancelled : {},
            evictStarted : {},
            evictFinished : {},
            fetchStarted : {},
            fetchFinished : {},
            cacheCleared : {},
            dataProviderAdded : {},
            dataProviderRemoved : {}
        };

        //Private functions:
        //Event handling:

        function fireEvent(eventName, eventData) {
            if (eventListeners[eventName] !== undefined) {
                _.each(eventListeners[eventName], function(cb) {
                    try {
                        cb.call(thisCache, eventData);
                    } catch (ex) {
                    }
                });
            }
        }

        function addEventListener(eventName, cb) {
            var listenerId = null;
            if (eventListeners[eventName] !== undefined) {
                if (_.isFunction(cb)) {
                    listenerId = 'id' + (eventListenerIdCounter++);
                    eventListeners[eventName][listenerId] = cb;
                } else {
                    throw 'Event listener callback is not a function';
                }
            } else {
                throw 'Unknown event \'' + eventName + '\', use one of ' + _.reduce(_.keys(eventListeners), function(memo, name, ind) {
                    if (ind > 0) {
                        memo = memo + ', ';
                    }
                    memo = memo + name;
                    return memo;
                });
            }
            return listenerId;
        }

        function removeEventListener(eventName, listenerId) {
            if (eventListeners[eventName] !== undefined) {
                if (eventListeners[eventName][listenerId] !== undefined) {
                    delete eventListeners[eventName][listenerId];
                }
            } else {
                throw 'Unknown event \'' + eventName + '\', use one of ' + _.reduce(_.keys(eventListeners), function(memo, name, ind) {
                    if (ind > 0) {
                        memo = memo + ', ';
                    }
                    memo = memo + name;
                });
            }
        }

        function evict(evictList) {
            async.each(evictList, function(toEvict, notify) {
                toEvict.markForRecycling();
                notify();
            }, function(err) {
                if (err && "undefined" !== typeof console && console) {
                    console.error(err);
                }
            });
        }

        function mergeBlocks(block1, block2, callback) {
            var newBlock = null;
            var taskDef = {};
            var combinedData = [];
            if ((block1.pin() > 0) && (block2.pin() > 0)) {
                block1.markForMerging(true);
                block2.markForMerging(true);
                newBlock = getDataBlock();
                taskDef = _.clone(block1.getTaskDef());
                taskDef.end = block2.getEnd();
                taskDef.pointCount = block1.getPointCount() + block2.getPointCount();
                newBlock.prepare(taskDef, block1.getFetcher());
                newBlock.setFetching(true);
                fireEvent('blockCacheFetchStarted', newBlock);
                async.parallel({
                    data1 : function(cb) {
                        block1.getDataAsync(function(err, data) {
                            if (err) {
                                if ("undefined" !== typeof console && console) {
                                    console.log('Warning: getDataAsync from merged block1 returned error:\'' + err + '\'');
                                }
                                cb(err);
                            }
                            else {
                                fillWith(combinedData, data, taskDef.location, taskDef.parameter, 0, 0, block1.getPointCount(), cb);                                
                            }
                        });
                    },
                    data2 : function(cb) {
                        block2.getDataAsync(function(err, data) {
                            if (err) {
                                if ("undefined" !== typeof console && console) {
                                    console.log('Warning: getDataAsync from merged block2 returned error:\'' + err + '\'');
                                }
                                cb(err);
                            }
                            else {
                                fillWith(combinedData, data, taskDef.location, taskDef.parameter, block1.getPointCount(), 0, block2.getPointCount(), cb);                                
                            }
                        });
                    }
                }, function(err, results) {
                    block1.unpin();
                    block2.unpin();
                    if (!err){
                        block1.markForRecycling();
                        block2.markForRecycling();
                        newBlock.setData(combinedData);
                        newBlock.setFetching(false);
                        newBlock.setFetched(true);
                        callback(null, newBlock);
                        fireEvent('blockCacheFetchFinished', newBlock);
                    } else {
                        newBlock.reset();
                        block1.markForMerging(false);
                        block2.markForMerging(false);
                        callback(err);
                        fireEvent('blockCacheFetchFinished', null);
                    }
                });
            } else {
                _.defer(function() {
                    callback(new Error('One or both blocks already marked for recycling'));
                });
            }
        }

        function blocksAreContinuous(block1, block2) {
            if (block1.getResolution() === block2.getResolution() && (block2.getStart() === block1.getEnd() + block1.getResolution())) {
                return true;
            } else {
                return false;
            }
        }

        function shouldBlocksBeMerged(block1, block2) {
            //It's assumed that service, location and parameter equality has already been checked:
            if (!block1.fetchFailed() && !block2.fetchFailed() && !block1.isWaitingMerging() && !block2.isWaitingMerging() && ((block1.getPointCount() < minBlockDataPoints) || (block2.getPointCount() < minBlockDataPoints)) && blocksAreContinuous(block1, block2) && (block1.getPointCount() + block2.getPointCount() < maxBlockDataPoints)) {
                return true;
            } else {
                return false;
            }
        }

        function getDataBlock() {
            var dataBlock;
            if (emptyBlockPool.length > 0) {
                dataBlock = emptyBlockPool.pop();
            } else {
                dataBlock = new DataBlock(fireEvent);
            }
            return dataBlock;
        }

        function blockOverlaps(blockStart, blockEnd, start, end) {
            var retval = false;
            //exactly matching steps:
            if ((blockStart === start) && (blockEnd === end)) {
                retval = true;
            }
            //overlapping steps:
            else if ((blockStart <= end) && (blockEnd > start)) {
                retval = true;
            }
            return retval;
        }

        function createMissingBlocksBefore(prevBlockEnd, blockStart, fetchStart, fetchEnd, taskDef) {
            var retval = null;
            //if at first block or we've just crossed a gap in steps between cached data blocks:
            if ((prevBlockEnd === null) || (prevBlockEnd < (blockStart - taskDef.resolution))) {
                //The current block starts after our interesting step sequence starts:
                if (blockStart > fetchStart) {
                    //the current block starts after or at the same step as our interesting step sequence ends:
                    if (blockStart >= fetchEnd) {
                        //create new blocks until the end of our interesting step sequence:
                        if (prevBlockEnd === null) {
                            retval = allocateAndPrepareContinuousBlocks(taskDef, fetchStart, fetchEnd);
                        } else {
                            retval = allocateAndPrepareContinuousBlocks(taskDef, Math.max(prevBlockEnd, fetchStart), fetchEnd);
                        }
                    }
                    //current block starts before our interesting step sequence ends:
                    else {
                        //create new blocks until one step before the start of the current block:
                        if (prevBlockEnd === null) {
                            retval = allocateAndPrepareContinuousBlocks(taskDef, fetchStart, (blockStart - taskDef.resolution));
                        } else {
                            retval = allocateAndPrepareContinuousBlocks(taskDef, Math.max((prevBlockEnd + taskDef.resolution), fetchStart), (blockStart - taskDef.resolution));
                        }
                    }
                }
            }
            return retval;
        }

        function recycleBlock(block) {
            if (block.isPinned()) {
                async.whilst(function() {
                    return block.isPinned();
                }, function(notify) {
                    setTimeout(notify, 500);
                }, function(err) {
                    block.recycle();
                    emptyBlockPool.push(block);
                });
            } else {
                block.recycle();
                emptyBlockPool.push(block);
            }
        }

        //A single-line queue for running iterateCache: if more than one
        //iteration is requested simultaneously, others have to queue for
        //execution, because iterateCache changes the internal cache state asynchronously.
        var iterateCacheQueue = async.queue(function(taskDef, callback) {
            callback(null, iterateCache(taskDef));
        }, 1);

        function iterateCache(taskDef) {
            var retval = [];
            var requestedStart = taskDef.start;
            var requestedEnd = taskDef.end;
            var sideFetchBeforeItemCount = Math.ceil(sideFetchBeforeFactor * taskDef.pointCount);
            var sideFetchAfterItemCount = Math.ceil(sideFetchAfterFactor * taskDef.pointCount);
            var fetchStart = requestedStart - sideFetchBeforeItemCount * taskDef.resolution;
            var fetchEnd = requestedEnd + sideFetchAfterItemCount * taskDef.resolution;
            var blockAgeOrder = [];
            var newCachedBlocks = [];
            var mergeInd = -1;
            var blockToMerge = null;
            var prevMatchingBlock = null;

            var sortIterator = function(bl) {
                return bl.getStart();
            };

            cachedDataSize = 0;
            //add all merged blocks that are ready:
            while (mergedBlocks.length > 0) {
                blockToMerge = mergedBlocks.shift();
                mergeInd = _.sortedIndex(cachedBlocks, blockToMerge, sortIterator);
                cachedBlocks.splice(mergeInd, 0, blockToMerge);
            }

            if (cachedBlocks.length > 0) {
                _.each(cachedBlocks, function(block, index) {
                    var selectThisBlock = false;
                    var newBlocksBefore = null;
                    var newBlocksAfter = null;
                    var prevBlockEnd = null;
                    var blStart = block.getStart();
                    var blEnd = block.getEnd();

                    if (block.isWaitingRecycling()) {
                        recycleBlock(block);
                        return;
                        //=continue each loop;
                    }

                    //This block contains data for the relevant service, with the same locations and parameters:
                    if ((taskDef.service === block.getService()) && arrayEqualsAnyOrder(taskDef.location, block.getLocation()) && arrayEqualsAnyOrder(taskDef.parameter, block.getParameter())) {
                        if (prevMatchingBlock !== null) {
                            prevBlockEnd = prevMatchingBlock.getEnd();
                        }

                        //check if we should create new data blocks before the current block:
                        newBlocksBefore = createMissingBlocksBefore(prevBlockEnd, blStart, fetchStart, fetchEnd, taskDef);
                        if ((newBlocksBefore !== null) && (newBlocksBefore.length > 0)) {
                            Array.prototype.push.apply(newCachedBlocks, newBlocksBefore);
                            async.reduce(newBlocksBefore, cacheMisses, function(memo, block, callback) {
                                callback(null, memo + block.getDataSize());
                            }, function(err, result) {
                                cacheMisses = result;
                            });
                            Array.prototype.push.apply(retval, newBlocksBefore);
                        }

                        selectThisBlock = blockOverlaps(blStart, blEnd, fetchStart, fetchEnd);
                        if (selectThisBlock) {
                            if (block.pin() > 0) {
                                retval.push(block);
                                cacheHits += block.getDataSize();
                            } else {
                                if ("undefined" !== typeof console && console) {
                                    console.log('Unable to pin a block, it\'s already marked for recycling (this should not happen)');
                                }
                            }
                        } else {
                            block.increaseNotUsed();
                        }
                        newCachedBlocks.push(block);

                        //check if we should merge this block with the previous one:
                        if ((prevMatchingBlock !== null) && shouldBlocksBeMerged(prevMatchingBlock, block)) {
                            mergeBlocks(prevMatchingBlock, block, function(err, merged) {
                                if (err) {
                                    //Merge failed. This should only happen if the data for either block
                                    //could not be fetched.
                                    if ("undefined" !== typeof console && console) {
                                        console.error(err);
                                    }
                                } else {
                                    //Both merged old blocks have already been marked for recycling at this point.
                                    //Postpone adding the new block until the beginning of the next fetch cycle:
                                    mergedBlocks.push(merged);
                                }
                            });
                        }
                        prevMatchingBlock = block;
                    } else {
                        block.increaseNotUsed();
                        //not matched in this cycle, keep in cache still:
                        newCachedBlocks.push(block);
                    }

                    //If we are at the last cached block, check if we should additionally
                    //create new data blocks after the last matching found block.
                    if (index === (cachedBlocks.length - 1)) {
                        //we've found at least one matching block in cache:
                        if (prevMatchingBlock !== null) {
                            //If our interesting step sequence ends after the last matching found block ends:
                            if ((prevMatchingBlock.getEnd() + taskDef.resolution) < fetchEnd) {
                                newBlocksAfter = allocateAndPrepareContinuousBlocks(taskDef, Math.max(blEnd + taskDef.resolution, fetchStart), fetchEnd);
                                Array.prototype.push.apply(newCachedBlocks, newBlocksAfter);
                                async.reduce(newBlocksAfter, cacheMisses, function(memo, block, callback) {
                                    callback(null, memo + block.getDataSize());
                                }, function(err, result) {
                                    cacheMisses = result;
                                });
                                Array.prototype.push.apply(retval, newBlocksAfter);
                            }
                        }
                    }

                    //Place the current block at the evictOrder list at the current place based on it's age:
                    var ageInd = _.sortedIndex(blockAgeOrder, block, function(bl) {
                        return bl.getNotUsedSince();
                    });
                    blockAgeOrder.splice(ageInd, 0, block);
                    cachedDataSize += block.getDataSize();
                });
            }

            //no blocks in cache or none available for use right now, allocate new ones for the whole step sequence:
            if (retval.length === 0) {
                retval = allocateAndPrepareContinuousBlocks(taskDef, fetchStart, fetchEnd);
                Array.prototype.push.apply(newCachedBlocks, retval);
                async.reduce(retval, cacheMisses, function(memo, block, callback) {
                    callback(null, memo + block.getDataSize());
                }, function(err, result) {
                    cacheMisses = result;
                });
            }
            cachedBlocks = [];
            cachedBlocks = newCachedBlocks;
            newCachedBlocks = [];

            async.whilst(function() {
                return cachedDataSize * 1.01 > maxCacheDataSize;
            }, function() {
                var dataToEvict = cachedDataSize * 1.01 - maxCacheDataSize;
                fireEvent('evictStarted', {
                    'inCache' : cachedDataSize,
                    'toEvict' : dataToEvict
                });
                var evictList = [];
                var toEvict = null;
                var evictListDataSize = 0;
                while ((evictListDataSize < dataToEvict) && (blockAgeOrder.length > 0)) {
                    toEvict = blockAgeOrder.pop();
                    if (toEvict !== undefined) {
                        evictListDataSize += toEvict.getDataSize();
                        evictList.push(toEvict);
                    }
                }
                if (evictList.length > 0) {
                    evict(evictList);
                    cachedDataSize = cachedDataSize - evictListDataSize;
                    fireEvent('evictFinished', {
                        'inCache' : cachedDataSize,
                        'evicted' : evictListDataSize
                    });
                }
            }, function() {
                //NOOP
            });
            return retval;
        }

        function allocateAndPrepareContinuousBlocks(parentTaskDef, start, end) {
            var blocks = [];
            var totalPointCount = Math.round((end - start) / parentTaskDef.resolution) + 1;
            var blocksNeeded = Math.ceil(totalPointCount / maxBlockDataPoints);
            var i = 0;
            var taskDef;
            var block = null;
            for ( i = 0; i < blocksNeeded; i++) {
                block = getDataBlock();
                taskDef = _.clone(parentTaskDef);
                taskDef.start = start + i * (parentTaskDef.resolution * maxBlockDataPoints);
                taskDef.pointCount = Math.min(maxBlockDataPoints, totalPointCount - (i * maxBlockDataPoints));
                taskDef.end = taskDef.start + (taskDef.pointCount - 1) * parentTaskDef.resolution;
                block.prepare(taskDef, getFetcher(parentTaskDef.service));
                if (block.pin() > 0) {
                    blocks.push(block);
                } else {
                    if ("undefined" !== typeof console && console) {
                        console.error('Strange, unable to pin block!');
                    }
                }
            }
            return blocks;
        }

        /**
         * @param source If source is an object, it should provide source[loc][param][index] structure that is used
         *                           to get the data value for the target[loc][param][index] object. If source is not an object,
         *                           the source itself is set directly into the target[loc][param][index].
         */

        function fillWith(target, source, locations, parameters, targetIndex, sourceIndex, count, callback) {
            var copyFromArray = _.isObject(source);
            var ti = 0;
            var si = 0;
            var end = 0;
            async.each(locations, function(loc, locNotify) {
                if (target[loc] === undefined) {
                    target[loc] = {};
                }
                async.each(parameters, function(param, paramNotify) {
                    var useErrorValues = false;
                    if (target[loc][param] === undefined) {
                        target[loc][param] = [];
                    }
                    if (copyFromArray) {
                        if (!_.isObject(source[loc]) || !_.isArray(source[loc][param])) {
                            useErrorValues = true;

                        } else if (source[loc][param].length < (sourceIndex + count)) {
                            useErrorValues = true;
                            if ("undefined" !== typeof console && console) {
                                console.error('Trying to fill segment with only ' + source[loc][param].length + ' values for location ' + loc + ' and parameter ' + param + ' when ' + (sourceIndex + count) + ' would be needed. Filling the whole segment with \''+errorFillValue+'\'');
                            }
                        }
                    }
                    if (useErrorValues) {
                        ti = targetIndex;
                        end = targetIndex + count;
                        while (ti < end) {
                            target[loc][param][ti++] = errorFillValue;
                        }
                    } else if (copyFromArray) {
                        ti = targetIndex;
                        si = sourceIndex;
                        end = targetIndex + count;
                        while (ti < end) {
                            target[loc][param][ti++] = source[loc][param][si++];
                        }
                    } else {
                        ti = targetIndex;
                        end = targetIndex + count;
                        while (ti < end) {
                            target[loc][param][ti++] = source;
                        }
                    }
                    paramNotify();
                }, function(err) {
                    //one location completed
                    locNotify();
                });
            }, function(err) {
                //all done:
                callback(err, target);
            });
        }

        function retrieveDataAsync(origTaskDef, finishCallback, progressCallback) {
            var taskDef = _.clone(origTaskDef);

            if (!_.isFunction(finishCallback)) {
                throw 'finishCallback must be a function';
            }

            if (getFetcher(taskDef.service) === null) {
                throw 'No data fetcher set for service \'' + taskDef.service + '\', unable to provide data';
            }

            //If the new request does not have the same resolution or the start difference is not a multiple of resolution
            //then clear all cached results for this service:
            if (stepResolutions[taskDef.service] !== undefined) {
                if ((stepResolutions[taskDef.service].resolution !== taskDef.resolution) || (Math.abs(stepResolutions[taskDef.service].start - taskDef.start) % taskDef.resolution !== 0)) {
                    clear(taskDef.service);
                }
            }
            stepResolutions[taskDef.service] = {
                start : taskDef.start,
                resolution : taskDef.resolution
            };

            iterateCacheQueue.push(taskDef, function(err, dataBlocks) {
                fetchDataForBlocks(dataBlocks, taskDef, finishCallback, progressCallback);
            });

        }

        function fetchDataForBlocks(dataBlocks, taskDef, finishCallback, progressCallback) {
            var errors = null;
            var notifyProgress = false;
            var result = {};

            if (_.isFunction(progressCallback)) {
                notifyProgress = true;
            }
            fireEvent('fetchStarted', taskDef);
            result.steps = _.range(taskDef.start, taskDef.end + taskDef.resolution, taskDef.resolution);
            result.data = {};

            async.each(dataBlocks, function(dataBlock, notify) {
                var td = dataBlock.getTaskDef();

                var includeStart = NaN;
                var includeEnd = NaN;
                var targetStartIndex = NaN;
                var targetEndIndex = NaN;
                var sourceStartIndex = NaN;
                var valueCount = NaN;

                if (!blockOverlaps(td.start, td.end, taskDef.start, taskDef.end)) {
                    //For completely out-of-range blocks:
                    //we fetch them just to cache them, but otherwise
                    //ignore the results completely:
                    dataBlock.getDataAsync(function(){
                        dataBlock.unpin();                        
                    });

                    //and continue the loop:
                    notify();
                    return;
                }

                if (td.start < taskDef.start) {
                    includeStart = taskDef.start;
                    sourceStartIndex = Math.round((taskDef.start - td.start) / taskDef.resolution);
                } else {
                    includeStart = td.start;
                    sourceStartIndex = 0;
                }
                targetStartIndex = _.indexOf(result.steps, includeStart, true);

                if (targetStartIndex === -1) {
                    throw dataBlock.getId() + ':something wrong with indexing, start index for cache block not found in the combined results!';
                }

                if (td.end > taskDef.end) {
                    includeEnd = taskDef.end;
                    targetEndIndex = result.steps.length - 1;
                } else {
                    includeEnd = td.end;
                    targetEndIndex = _.indexOf(result.steps, td.end, true);
                }
                valueCount = targetEndIndex - targetStartIndex + 1;

                // See fillWith function description about the structure that data object should have.
                dataBlock.getDataAsync(function(err, data) {
                    var fillValue = data;

                    if (err) {
                        if (errors === null) {
                            errors = [];
                        }
                        errors.push({
                            start : td.start,
                            end : td.end,
                            error : err
                        });

                        // error in fetching data, fill result with 'errorFillValue' for this step sequence if data is undefined itself.
                        // Notice, errors may have occurred but data is still given because it should be good enough.
                        // Therefore, do not ignore given data if it is available. It is up to the data provider to make
                        // sure that data is undefined if it should not be handled in cache.
                        
                        //Ilkka Rinne/2013-09-02: This is inconsistent with the node.js callback error conventions:
                        //You should always get either an error or result, never both.
                        //http://nodemanual.org/latest/nodejs_dev_guide/working_with_callbacks.html
                        //When would you want to return errors but also useable data?
                        
                        if (strictErrorHandling || !data) {
                            fillValue = errorFillValue;
                        }
                        //do not keep this block in cache:
                        dataBlock.markForRecycling();
                    }
                    fillWith(result.data, fillValue, td.location, td.parameter, targetStartIndex, sourceStartIndex, valueCount, function() {
                        if (notifyProgress) {
                            progressCallback(err, includeStart, includeEnd);
                        }
                        dataBlock.unpin();
                        
                        //always succeed, even with fetch error: we want to return the rest of the data anyway
                        notify();
                    });
                });

            }, function(err) {
                finishCallback(errors, result);
                fireEvent('fetchFinished', taskDef);
            });
        }

        function getFetcher(service) {
            if (fetchers[service] !== undefined) {
                fetchers[service].nextIndex = (fetchers[service].nextIndex + 1) % fetchers[service].providers.length;
                return fetchers[service].providers[fetchers[service].nextIndex].cb;
            } else {
                return null;
            }
        }

        function clear(service) {
            _.each(cachedBlocks, function(block) {
                if ((service === undefined) || (block.getService() === service)) {
                    block.markForRecycling();
                }
            });
            _.each(mergedBlocks, function(block) {
                if ((service === undefined) || (block.getService() === service)) {
                    block.markForRecycling();
                }
            });
            fireEvent('cacheCleared', service);
        }

        //Privileged functions:
        /**
         * @param {String} service Describes the service name that identifies the data.
         *                                               May not be {undefined}, {null} or empty. More than one fetcher
         *                                               may be added for the same service to enable a round-robin task
         *                                               distribution between them.
         * @param {function(taskDef, callback)} fetcher The callback parameter of fetcher callback function is of
         *                                              the type {function(err, data)}. See {fillWith()} function
         *                                              for the description for the source data object structure
         *                                              that should be provided by the fetcher callback function for
         *                                              its parameter callback function.
         */
        this.addDataProvider = function(service, fetcher) {
            var provider = {};
            if (_.isFunction(fetcher)) {
                if (fetchers[service] === undefined) {
                    fetchers[service] = {
                        nextIndex : 0,
                        providers : []
                    };
                }
                provider.id = 'id#' + fetcherIdCounter++;
                provider.cb = fetcher;
                fetchers[service].providers.push(provider);
                fireEvent('dataProviderAdded', {
                    'service' : service,
                    'providerId' : provider.id
                });
            } else {
                throw 'Fetcher must be a function';
            }
            return provider.id;
        };

        this.removeDataProvider = function(service, providerId) {
            var oldLength = 0;
            var actuallyRemoved = false;
            if (fetchers[service] !== undefined) {
                oldLength = fetchers[service].providers.length;
                fetchers[service].providers = _.reject(fetchers[service].providers, function(provider) {
                    return provider.id === providerId;
                });
                if (fetchers[service].providers.length === 0) {
                    delete fetchers.service;
                    actuallyRemoved = true;
                } else if (oldLength !== fetchers[service].providers.length) {
                    actuallyRemoved = true;
                }
                if (actuallyRemoved) {
                    fireEvent('dataProviderRemoved', {
                        'service' : service,
                        'providerId' : providerId
                    });
                }
            }
        };

        /**
         * Removes all content from the cache and resets the hits & misses counters.
         *
         */
        this.clearCache = function() {
            clear();
            stepResolutions = [];
            cacheHits = 0;
            cacheMisses = 0;
        };

        this.fetch = function(taskDef, finalCallback, progressCallback) {
            checkTaskDef(taskDef);
            retrieveDataAsync(taskDef, finalCallback, progressCallback);
        };

        this.getCachedItemCount = function() {
            return cachedDataSize;
        };

        this.getFillingDegree = function() {
            return cachedDataSize / maxCacheDataSize;
        };

        this.getHitRatio = function() {
            return (cacheHits / (cacheHits + cacheMisses));
        };

        this.addListener = function(eventName, callback) {
            return addEventListener(eventName, callback);
        };

        this.removeListener = function(eventName, providerId) {
            return removeEventListener(eventName, providerId);
        };

        //Instance initialization:
        if (properties.sideFetchBeforeFactor !== undefined) {
            if (_.isNumber(properties.sideFetchBeforeFactor)) {
                if (properties.sideFetchBeforeFactor >= 0) {
                    sideFetchBeforeFactor = properties.sideFetchBeforeFactor;
                }
            }
        }
        if (properties.sideFetchAfterFactor !== undefined) {
            if (_.isNumber(properties.sideFetchAfterFactor)) {
                if (properties.sideFetchAfterFactor >= 0) {
                    sideFetchAfterFactor = properties.sideFetchAfterFactor;
                }
            }
        }
        if (properties.maxBlockDataPoints !== undefined) {
            if (_.isNumber(properties.maxBlockDataPoints)) {
                if (properties.maxBlockDataPoints > 0) {
                    maxBlockDataPoints = properties.maxBlockDataPoints;
                }
            }
        }
        if (properties.minBlockDataPoints !== undefined) {
            if (_.isNumber(properties.minBlockDataPoints)) {
                if ((properties.minBlockDataPoints > 0) && (properties.minBlockDataPoints < maxBlockDataPoints)) {
                    minBlockDataPoints = properties.minBlockDataPoints;
                } else {
                    minBlockDataPoints = 0;
                }
            }
        }
        if (minBlockDataPoints > maxBlockDataPoints) {
            minBlockDataPoints = maxBlockDataPoints;
        }
        if (properties.maxCacheDataSize !== undefined) {
            if (_.isNumber(properties.maxCacheDataSize)) {
                if (properties.maxCacheDataSize > 0) {
                    maxCacheDataSize = properties.maxCacheDataSize;
                }
            }
        }
        if (properties.strictErrorHandling !== undefined) {
            if (properties.strictErrorHandling === false) {
                strictErrorHandling = false;
            }
        }
        
        if (properties.errorFillValue !== undefined) {
            errorFillValue = properties.errorFillValue;
        }
    };

    /**
     * SplitterCache constructor is returned for later instantiation.
     */
    return _constructor;
})();

/**
 * This software may be freely distributed and used under the following MIT license:
 *
 * Copyright (c) 2013 Finnish Meteorological Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Strict mode for whole file.
// "use strict";

// Requires jQuery
if ("undefined" === typeof jQuery || !jQuery) {
    throw "ERROR: jQuery is required for fi.fmi.metoclient.metolib.WfsConnection!";
}

// Requires lodash
if ("undefined" === typeof _ || !_) {
    throw "ERROR: Lodash is required for fi.fmi.metoclient.metolib.WfsConnection!";
}

// Requires async
if ("undefined" === typeof async || !async) {
    throw "ERROR: Async is required for fi.fmi.metoclient.metolib.WfsConnection!";
}

// "Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.metolib = fi.fmi.metoclient.metolib || {};

// Requires fi.fmi.metoclient.metolib.Utils.
// "Package" exists because it is created above if it did not exist.
if (!fi.fmi.metoclient.metolib.Utils) {
    throw "ERROR: fi.fmi.metoclient.metolib.Utils is required for fi.fmi.metoclient.metolib.WfsConnection!";
}

// Requires cache.
if (!fi.fmi.metoclient.metolib.SplitterCache) {
    throw "ERROR: fi.fmi.metoclient.metolib.SplitterCache is required for fi.fmi.metoclient.metolib.WfsConnection!";
}

// Requires parser.
if (!fi.fmi.metoclient.metolib.WfsRequestParser) {
    throw "ERROR: fi.fmi.metoclient.metolib.WfsRequestParser is required for fi.fmi.metoclient.metolib.WfsConnection!";
}

/**
 * WfsConnection object acts as an interface that provides functions
 * to asynchronously request XML data from the server and to get
 * the requested data in a parsed structure.
 *
 * WfsConnection wraps cache, request and parser functionality.
 * Notice, if you do not require cache functionality, you may
 * want to use parser, {@link fi.fmi.metoclient.metolib.WfsRequestParser},
 * directly without using this class as an intermediate object.
 *
 * API functions are defined in the end of the constructor,
 * {connectionConstructor}, as priviledged functions.
 * See API description there.
 *
 * Example:
 *      var connection = new fi.fmi.metoclient.metolib.WfsConnection();
 *      if (connection.connect(SERVER_URL, STORED_QUERY_OBSERVATION)) {
 *          // Connection was properly initialized. So, get the data.
 *          connection.getData({
 *              requestParameter : "td,ws_10min",
 *              // Integer values are used to init dates for older browsers.
 *              // (new Date("2013-05-10T08:00:00Z")).getTime()
 *              // (new Date("2013-05-12T10:00:00Z")).getTime()
 *              begin : new Date(1368172800000),
 *              end : new Date(1368352800000),
 *              timestep : 60 * 60 * 1000,
 *              sites : ["Kaisaniemi,Helsinki", "Turku"],
 *              callback : function(data, errors) {
 *                  // Handle the data and errors object in a way you choose.
 *                  handleCallback(data, errors);
 *                  // If the connection will not be used anymore later,
 *                  // the connection may be disconnected because the flow has finished.
 *                  connection.disconnect();
 *              }
 *          });
 *      }
 */
fi.fmi.metoclient.metolib.WfsConnection = (function() {

    /**
     * @private
     *
     * Data fetcher name for cache when sites are used for fetching.
     */
    var DATA_FETCHER_NAME_SITES = "parserSites";

    /**
     * @private
     *
     * Parameter values are separated by this string.
     */
    var PARAMETER_SEPARATOR = ",";

    /**
     * @private
     *
     * Location name and region strings may be separated by this string
     * in server responses.
     */
    var LOCATION_NAME_REGION_SEPARATOR = " ";

    /**
     * @private
     *
     * Geoid location name prefix for cache.
     */
    var LOCATION_GEOID_PREFIX = "g_";

    /**
     * @private
     *
     * WMO location name prefix for cache.
     */
    var LOCATION_WMO_PREFIX = "w_";

    /**
     * @private
     *
     * FMISID location name prefix for cache.
     */
    var LOCATION_FMISID_PREFIX = "f_";

    /**
     * @private
     *
     * Sites location name prefix for cache.
     */
    var LOCATION_SITES_PREFIX = "s_";

    /**
     * @private
     *
     * General text that describes an error that has been found in cache.
     */
    var CACHE_ERROR_TEXT = "ERROR: Cache found error(s)!";

    /**
     * @private
     *
     * Trim single site string for cache flow.
     *
     * @param {String} May not be {undefined} or {null}.
     */
    function trimSingleSite(site) {
        return jQuery.trim(site).replace(/,\s+/, PARAMETER_SEPARATOR);
    }

    /**
     * @private
     *
     * Trim unnecessary white spaces from sites string(s).
     *
     * Notice, new content is returned. Then, original values are not changed if an array is given.
     *
     * @param {Array(String)|String} Site strings in an array or one site may be given as a single string.
     *                               May be {udefined} or {null} but then operation is ignored.
     * @param {String} prefix Prefix string that is used with the value(s).
     *                        This is meant for cache but should not be used for parser.
     *                        May be {udefined} or {null}. Then, empty string is used.
     * @return {Array(String)} Trimmed site(s) in an array. May not be {undefined} or {null}.
     */
    function trimSites(sites, prefix) {
        var trimmed = [];
        if (!_.isString(prefix)) {
            // Make sure prefix is at least an empty string.
            prefix = "";
        }
        // Handle sites as string(s).
        if (sites && _.isString(sites)) {
            // Trim possible white spaces.
            // Location and its region may be separated by using comma but there should not be whitespaces after comma.
            // Then, later it is easier to compare server responses with given sites when data is handled for cache.
            trimmed.push(prefix + trimSingleSite(sites));

        } else if (_.isArray(sites)) {
            for (var i = 0; i < sites.length; ++i) {
                var site = sites[i];
                if (site && _.isString(site)) {
                    trimmed.push(prefix + trimSingleSite(site));
                }
            }
        }
        return trimmed;
    }

    /**
     * @private
     *
     * Trim unnecessary white spaces from string(s).
     *
     * Notice, new content is returned. Then, original values are not changed if an array is given.
     *
     * @param {Array(String|int)|String|int} property Strings or integers in an array
     *                                                or one item as a single string or integer.
     *                                                May be {udefined} or {null}.
     * @param {String} prefix Prefix string that is used with the value(s).
     *                        This is meant for cache but should not be used for parser.
     *                        May be {udefined} or {null}. Then, empty string is used.
     * @return {Array(String)} Trimmed value(s) in an array. May not be {undefined} or {null}.
     */
    function trimProperty(property, prefix) {
        var trimmed = [];
        if (!_.isString(prefix)) {
            // Make sure prefix is at least an empty string.
            prefix = "";
        }
        if (_.isNumber(property) || property && _.isString(property)) {
            trimmed.push(jQuery.trim(prefix + property));

        } else if (_.isArray(property)) {
            for (var i = 0; i < property.length; ++i) {
                var tmp = property[i];
                // Handle property as string.
                if (_.isNumber(tmp) || tmp && _.isString(tmp)) {
                    trimmed.push(jQuery.trim(prefix + tmp));
                }
            }
        }
        return trimmed;
    }

    /**
     * @private
     *
     * Cache {taskDef} location should contain all the locations (not just sites names).
     * This function combines all the location information into one array that is
     * set as {location} -property for the cache {taskDef}. Also, other properties that
     * are used for {taskDef} location property are set.
     *
     * @param {Object} taskDef Target for location settings.
     *                         Operation is ignored if {undefined} or {null}.
     * @param {Object} options Options object given through the API.
     *                         Provides location data for {taskDef}.
     *                         Operation is ignored if {undefined} or {null}.
     */
    function setTaskDefLocations(taskDef, options) {
        if (taskDef && options) {
            var location = [];
            taskDef.location = location;
            // Notice, these properties are used to provide additional information
            // that can be given for the parser. The cache uses location property
            // to create the cache hierarchy.
            taskDef.geoid = trimProperty(options.geoid);
            taskDef.wmo = trimProperty(options.wmo);
            taskDef.fmisid = trimProperty(options.fmisid);
            taskDef.sites = trimSites(options.sites);
            // Combine locations information for taskDef location.
            // Notice, prefix is used for cache. Then, it is sure that different location
            // requests do not have same string for key (really rare case).
            location.push.apply(location, trimProperty(options.geoid, LOCATION_GEOID_PREFIX));
            location.push.apply(location, trimProperty(options.wmo, LOCATION_WMO_PREFIX));
            location.push.apply(location, trimProperty(options.fmisid, LOCATION_FMISID_PREFIX));
            location.push.apply(location, trimSites(options.sites, LOCATION_SITES_PREFIX));
        }
    }

    /**
     * @private
     *
     * Creates the proper location name for cache by checking taskDef properties
     * for location information that match the given values.
     *
     * Location name is checked in the following order and first match is used:
     *   - GEOID
     *   - WMO
     *   - FMISID
     *   - taskDef location contains both name and region.
     *     - If taskDef contains location that matches the given name and region,
     *       then corresponding name is returned.
     *   - If taskDef location does not match the combined name and region,
     *     then region is returned.
     *
     * @param {Object} taskDef Contains location information. May be {undefined} or {null}.
     * @param {String} name Location name string. May be {undefined} or {null}.
     * @param {String} region Location region string. May be {undefined} or {null}.
     * @return {String} Proper location name for cache. May be {undefined} or {null} if region is.
     */
    function locationNameForCache(taskDef, name, region, wmo, geoid, fmisid) {
        // Default value is just region with site prefix.
        var locationName = LOCATION_SITES_PREFIX + region;
        if (taskDef) {
            var matchFound = false;
            var loc;
            var i;
            // Check geoid.
            if (taskDef.geoid && geoid) {
                for ( i = 0; i < taskDef.geoid.length; ++i) {
                    if (taskDef.geoid[i] === geoid) {
                        // Notice, prefix is used with cache.
                        locationName = LOCATION_GEOID_PREFIX + geoid;
                        matchFound = true;
                        break;
                    }
                }
            }
            // Check WMO.
            if (!matchFound && taskDef.wmo && wmo) {
                for ( i = 0; i < taskDef.wmo.length; ++i) {
                    if (taskDef.wmo[i] === wmo) {
                        // Notice, prefix is used with cache.
                        locationName = LOCATION_WMO_PREFIX + wmo;
                        matchFound = true;
                        break;
                    }
                }
            }
            // Check FMISID.
            if (!matchFound && taskDef.fmisid && fmisid) {
                for ( i = 0; i < taskDef.fmisid.length; ++i) {
                    if (taskDef.fmisid[i] === fmisid) {
                        // Notice, prefix is used with cache.
                        locationName = LOCATION_FMISID_PREFIX + fmisid;
                        matchFound = true;
                        break;
                    }
                }
            }
            // Check name and region.
            // Notice, taskDef contains location property that contains all the location data.
            // But, part of locations were already handled separately above. Therefore, also handle
            // sites by using sites-property instead of location-property.
            if (!matchFound && taskDef.sites && region) {
                if (name) {
                    // Server may also include region as prefix into site name.
                    // Therefore, take this into account when comparing server response
                    // to taskDef sites that contain name and region combination string
                    // as recognized by the cache.
                    var regionPrefix = region + LOCATION_NAME_REGION_SEPARATOR;
                    var regionIndex = name.indexOf(regionPrefix);
                    if (0 === regionIndex) {
                        // Remove region substring from name and trim possible whitespaces.
                        // Then, values can be compared to taskDef locations.
                        name = jQuery.trim(name.slice(regionPrefix.length));
                    }
                    // TaskDef sites and locations have been created before for cache by combining
                    // name and region that have been given through the API. TaskDef locations are
                    // compared to the name and region values that are given as parameters for this
                    // function.
                    var combinedLocationNameLowerCase = (name + PARAMETER_SEPARATOR + region).toLowerCase();
                    // Sites are given as string array in taskDef.
                    for ( i = 0; i < taskDef.sites.length; ++i) {
                        loc = taskDef.sites[i];
                        // Location names are compared as case-insensitive here.
                        // Notice, server also handles places as case-insensitive. Therefore,
                        // cache is used with case-insensitive comparison here if API user has not
                        // given case-sensitive sites information for some reason.
                        if (loc && combinedLocationNameLowerCase && loc.toLowerCase() === combinedLocationNameLowerCase) {
                            // Matching location for cache was found from taskDef locations.
                            // Notice, prefix is used with cache.
                            locationName = LOCATION_SITES_PREFIX + loc;
                            matchFound = true;
                            break;
                        }
                    }
                }
                if (!matchFound) {
                    // Match was not found with name and region above.
                    // Check if case-insensitive region is a match.
                    var regionLowerCase = region.toLowerCase();
                    for ( i = 0; i < taskDef.sites.length; ++i) {
                        loc = taskDef.sites[i];
                        // Location names are compared as case-insensitive here.
                        // Notice, server also handles places as case-insensitive. Therefore,
                        // cache is used with case-insensitive comparison here if API user has not
                        // given case-sensitive sites information for some reason.
                        if (loc && loc.toLowerCase() === regionLowerCase) {
                            // Matching location for cache was found from taskDef locations.
                            // Notice, prefix is used with cache.
                            locationName = LOCATION_SITES_PREFIX + loc;
                            matchFound = true;
                            break;
                        }
                    }
                }
            }
        }
        return locationName;
    }

    /**
     * @private
     *
     * Check that time-value-pair objects are not missing from the given array.
     * If an object is missing, time-value-pair of the correct time and NaN value
     * is inserted into the array according to the resolution step.
     *
     * @param {[]} array Array that contains time-value-pair objects.
     *                   Operation is ignored if {undefined} or {null}.
     * @param {Integer} resolution Time in milliseconds to describe timesteps between values.
     *                             Operation is ignored if {undefined}, {null}, zero or negative.
     */
    function checkResolutionSteps(array, resolution) {
        if (_.isArray(array) && resolution && resolution > 0) {
            for (var i = 1; i < array.length; ++i) {
                var previousTimeValuePair = array[i - 1];
                var timeValuePair = array[i];
                if (_.isObject(timeValuePair)) {
                    var previousTime = _.isObject(previousTimeValuePair) ? previousTimeValuePair.time : undefined;
                    var time = timeValuePair.time;
                    if (undefined !== previousTime && null !== previousTime && undefined !== time && null !== time && resolution < time - previousTime) {
                        // Time-value-pair object is missing between two array objects.
                        // Insert a new NaN value pair into array.
                        // Notice, time of this new object is compared in next round to the
                        // same object that is checked already in this round.
                        // Then, missing resolution objects are added properly into too large gaps.
                        time = previousTime + resolution;
                        array.splice(i, 0, {
                            time : time,
                            value : NaN
                        });
                    }
                    previousTime = time;
                }
            }
        }
    }

    /**
     * @private
     *
     * Check if given {list} contains an equal to the given {item}.
     *
     * Performs an optimized deep comparison between the objects of the {list} and given {item},
     * to determine if they should be considered equal.
     *
     * @param {Array} list List whose items are compared to {item}. May be {undefined} or {null}.
     * @param {Object} item Item that is compared to the list items. May be {undefined} or {null}.
     * @return {Boolean} {true} if {item} equals at least one item in {list}.
     */
    function contains(list, item) {
        return _.find(list, function(currentItem) {
            return _.isEqual(currentItem, item);
        });
    }

    /**
     * @private
     *
     * Converts errors given by cache to the error objects given through API.
     * Possible duplicates are not included into the returned array.
     *
     * @param {Array} errors Errors array from the cache that is converted to API errors array.
     *                       May be {undefined} or {null}.
     * @return {Array} Converted errors in an array. May not be {undefined} or {null}.
     */
    function convertCacheErrorsForApi(errors) {
        var apiErrors = [];
        if (_.isArray(errors)) {
            for (var i = 0; i < errors.length; ++i) {
                var error = errors[i];
                // Flag to inform if error item should just be wrapped as a general cache error
                // or if error content has been handled separately. Always include wrapped error
                // into array if cache error root level already contains errorCode or errorText information.
                var useWrapError = _.isObject(error) && (error.errorCode || error.errorText);
                // Cache error structure may wrap errors gotten from parser.
                // Check if parser has provided errors. Then, that error information can be included
                // in the root level of the API error.
                if (_.isObject(error) && _.isArray(error.error) && error.error.length > 0) {
                    var errorArray = error.error;
                    for (var j = 0; j < errorArray.length; ++j) {
                        // Error array may contain the actual parse error.
                        // Check if the error code and text are available for API error object.
                        // If multiple error items are in the array. Handle them all as a separate error.
                        var errorItem = errorArray[j];
                        if (_.isObject(errorItem) && (errorItem.errorCode || errorItem.errorText)) {
                            var newError = {
                                errorCode : errorItem.errorCode,
                                errorText : errorItem.errorText,
                                // Reference to the original error structure.
                                // Then, additional information is available also through API if needed.
                                extension : error
                            };
                            // Perform an optimized deep comparison between already included errors and new error,
                            // to determine if the new error should be included or if it is a duplicate.
                            if (!contains(apiErrors, newError)) {
                                apiErrors.push(newError);
                            }

                        } else {
                            // Wrap the whole error as a cache error
                            // because unknown structure has been given.
                            useWrapError = true;
                        }
                    }

                } else {
                    // Wrap the whole error as a cache error
                    // because unknown structure has been given.
                    useWrapError = true;
                }
                // Check if the original error should be wrapped as an extension for API error object.
                if (useWrapError) {
                    // Create api error from the cache error.
                    var newWrapError = {
                        errorCode : _.isObject(error) ? error.errorCode : undefined,
                        errorText : _.isObject(error) && _.isString(error.errorText) ? error.errorText : CACHE_ERROR_TEXT,
                        extension : error
                    };
                    // Perform an optimized deep comparison between already included errors and new error,
                    // to determine if the new error should be included or if it is a duplicate.
                    if (!contains(apiErrors, newWrapError)) {
                        apiErrors.push(newWrapError);
                    }
                }
            }
        }
        return apiErrors;
    }

    /**
     * @private
     *
     * Convert sites data received from the parser to the structure that cache can handle.
     *
     * Notice, this function is called only if parser was used for the server requests.
     * If data was already in cache, the flow does not come here.
     *
     * Notice, data is provided as structure of the objects.
     * {@link fi.fmi.metoclient.metolib.SplitterCache#fillWith} function describes
     * the object structure of the converted data. Cache data blocks are provided
     * as the structure leaf objects. Notice, even if structure is created by using
     * objects, it is better to include all the persisting data in the leaf cache block
     * objects instead in the common parts in the middle of the structure. Then, data will
     * always be available when data is requested from the cache.
     *
     * @param {Object} taskDef Definition object to describe cache blocks of the operation.
     *                         May not be {undefined} or {null}.
     * @param {Object} data Data from the parser. May be {undefined} or {null}.
     * @param {Object} errors Errors that have occurred during loading and parsing data.
     *                        May be {undefined} or {null}.
     * @return {Object} Object that contains converted errors and converted data.
     *                  {@link fi.fmi.metoclient.metolib.SplitterCache#fillWith} function describes
     *                  the object structure of the converted data. May not be {undefined} or {null}.
     */
    function convertSitesDataFromParserForCache(taskDef, data, errors) {
        var converted = {
            // Data is converted below into the data object if data is available.
            data : data ? {} : undefined,
            // Cache handles errors according to node.js error convention.
            // Therefore, instead of passing empty array for cache,
            // error object should be set null if there are no errors.
            errors : errors && !errors.length ? null : errors
        };
        if (data) {
            // Convert the given data into the correct structure that is inserted
            // into the convert object. Convert object contains location specific objects,
            // which in turn contain measurement parameter specific objects, which contain arrays for
            // cache data block objects. See fi.fmi.metoclient.metolib.SplitterCache#fillWith
            // function for the corresponding structure that cache requires.
            _.each(data.locations, function(location) {
                // Location name is used as a key for the location object.
                var locationName = locationNameForCache(taskDef, location.info.name, location.info.region, location.info.wmo, location.info.geoid, location.info.fmisid);
                if (!converted.data[locationName]) {
                    // Initialize converted data to contain location object identified by the location name.
                    converted.data[locationName] = {};
                }
                // Location contains data array that contains measurement data objects
                // and measurement related information.
                _.each(location.data, function(dataObject, keyRequestParameter) {
                    if (!converted.data[locationName][keyRequestParameter]) {
                        // Initialize converted location object to contain measurement array
                        // identified by request parameter key. Notice, cache will internally loop
                        // through the cache block array by indexing it.
                        converted.data[locationName][keyRequestParameter] = [];
                    }
                    // Loop through the actual measurement time-value-pair data objects.
                    // Also, check timesteps before giving array to cache.
                    // This may fix some indexing problems in cache if server has skipped some values.
                    checkResolutionSteps(dataObject.timeValuePairs, taskDef.resolution);
                    _.each(dataObject.timeValuePairs, function(timeValuePair) {
                        // This object is inserted into the cache as the actual data cache block.
                        // Notice, cache block have references to the same objects which means some redundancy.
                        // But, this way required data is always available when data is requested from the cache.
                        var cacheBlock = {
                            info : data.info,
                            properties : data.properties,
                            locationInfo : location.info,
                            blockProperty : dataObject.property,
                            timeValuePair : timeValuePair
                        };
                        converted.data[locationName][keyRequestParameter].push(cacheBlock);
                    });
                });
            });
        }
        return converted;
    }

    /**
     * @private
     *
     * Convert sites data received from the cache to the structure that is provided through API.
     *
     * This data has been set in {convertSitesDataFromParserForCache} function for the cache.
     *
     * @param {Object} taskDef Definition object to describe cache blocks of the operation.
     *                         May be {undefined} or {null}.
     * @param {Object} data Parsed data from cache. May be {undefined} or {null}.
     * @param {Array} errors Errors that have occurred during loading, parsing and caching data.
     *                       May be {undefined} or {null}.
     * @return {Object} Object that contains converted errors and converted data.
     */
    function convertSitesDataFromCacheForApi(taskDef, data, errors) {
        var converted = {
            // Data is converted below into the data object if data is available.
            data : data ? {
                info : undefined,
                properties : undefined,
                locations : []
            } : undefined,
            errors : convertCacheErrorsForApi(errors)
        };
        if (data) {
            // Data provided before from parser and set by convertSitesDataFromParserForCache
            // function for the cache is in data.data object. Notice, data is provided as
            // data object hierarchy. Time values that cache has set itself are given as array.
            // Notice, data.data object structure also contains the parsed time values from server.
            // Here, data object contains locations that are identified by the location name key.
            _.each(data.data, function(location) {
                var convertedLocation = {
                    info : undefined,
                    data : {}
                };
                // Location object contains objects that are identified by the request parameters.
                _.each(location, function(container, requestParameterKey) {
                    // Container object for the converted cache block data.
                    var convertedData = {
                        property : undefined,
                        timeValuePairs : []
                    };

                    // Each container identified by request parameter key contains cache data blocks in an array.
                    _.each(container, function(cacheBlock) {
                        // cacheBlock may be undefined if cache has reserved
                        // more timesteps for certain time range than parser has gotten
                        // for server request. Ignore undefined objects. Notice, that the
                        // correct times from server are still available in timeValuePair
                        // objects. Also, it is better to provide the parsed server data
                        // through API instead of extra undefined objects.
                        if (cacheBlock) {
                            if (!converted.data.info) {
                                // All locations have the same info object.
                                // Therefore, set content if data has not been set before.
                                converted.data.info = cacheBlock.info;
                            }

                            if (!converted.data.properties) {
                                // All locations have the same properties object.
                                // Therefore, set content if data has not been set before.
                                converted.data.properties = cacheBlock.properties;
                            }

                            if (!convertedData.property) {
                                // All the blocks of same location refere to the same property info.
                                // Therefore, set the information to the converted data object
                                // if data has not been set before.
                                convertedData.property = cacheBlock.blockProperty;
                            }

                            if (!convertedLocation.info) {
                                // All the block of same location refere to the same location info.
                                // Therefore, set the information to the converted location object
                                // if data has not been set before.
                                convertedLocation.info = cacheBlock.locationInfo;
                            }

                            // Insert datablock time-value-pair into the datablock time-value-pair array.
                            convertedData.timeValuePairs.push(cacheBlock.timeValuePair);
                        }
                    });
                    // Insert converted datablock into the location.
                    convertedLocation.data[requestParameterKey] = convertedData;
                });
                // Insert converted location data into converted data locations array.
                converted.data.locations.push(convertedLocation);
            });
        }
        return converted;
    }

    /**
     * @private
     *
     * This callback is set for sites cache data fetcher.
     *
     * Parser will provide the fetched and parsed data for this callback.
     * This callback will forward the data in a correct format for the cache.
     *
     * @param {Object} container Object that provides connection instance specific private member variables.
     *                           May not be {undefined} or {null}.
     * @param {Object} taskDef Definition object to describe cache blocks of the operation.
     *                         May not be {undefined} or {null}.
     * @param {function(errors, data)} taskCallback Called with the parsed data and errors array when operation finishes.
     *                                              May not be {undefined} or {null}.
     */
    function cacheSitesDataFetcherCallback(container, taskDef, taskCallback) {
        fi.fmi.metoclient.metolib.WfsRequestParser.getData({
            url : container.connectionUrl,
            storedQueryId : container.storedQueryId,
            requestParameter : taskDef.parameter,
            begin : taskDef.start,
            end : taskDef.end,
            timestep : taskDef.resolution,
            // If time adjusting is requested, it has been done before giving times to cache.
            // Therefore, do not let parser do adjusting.
            denyTimeAdjusting : true,
            // Notice, instead of using taskDef.location for properties here,
            // specific location related properties are used.
            geoid : taskDef.geoid,
            wmo : taskDef.wmo,
            fmisid : taskDef.fmisid,
            sites : taskDef.sites,
            crs : taskDef.crs,
            queryExtension : taskDef.queryExtension,
            callback : function(data, errors) {
                // Forward callback to the cache.
                // Cache will forward the callback to callbacks given through the API when the retrieve flow has been started.
                var converted = convertSitesDataFromParserForCache.call(container, taskDef, data, errors);
                taskCallback(converted.errors, converted.data);
            }
        });
    }

    /**
     * @private
     *
     * Request cache to retrive sites data.
     *
     * Notice, this function should be called in the context of the private object of the WfsConnection instance.
     *
     * Notice, this flow will also continue
     * to data fetcher callback if parser should be used to retrieve data
     * from the server. The callback function is set for cache when it is
     * initialized. Callbacks given and set in this function are called when
     * the data is gotten either from the server or directly from the cache.
     *
     * See API for function description.
     */
    var retrieveSitesData = function(options) {
        if (!options.timestep || options.timestep === 1) {
            // Cache requires that timestep is the actual timestep that is used for data.
            // But, in speacial cases server may use magic numbers to handle data differently.
            // Cache can not be used with the given options. Therefore, use parser directly.
            var that = this;
            fi.fmi.metoclient.metolib.WfsRequestParser.getData({
                url : that.connectionUrl,
                storedQueryId : that.storedQueryId,
                requestParameter : options.requestParameter,
                begin : options.begin,
                end : options.end,
                timestep : options.timestep,
                // When parser is used directly, it can handle time adjusting automatically if requested.
                denyTimeAdjusting : options.denyTimeAdjusting,
                geoid : trimProperty(options.geoid),
                wmo : trimProperty(options.wmo),
                fmisid : trimProperty(options.fmisid),
                sites : trimSites(options.sites),
                crs : options.crs,
                queryExtension : options.queryExtension,
                callback : options.callback
            });

        } else {
            // Use cache for sites data.
            // If time adjusting is requested, it is done before values are given for the cache.
            var beginDate = options.begin;
            var endDate = options.end;
            var resolution = options.timestep;
            if (!options.denyTimeAdjusting) {
                beginDate = fi.fmi.metoclient.metolib.WfsRequestParser.adjustBeginTime(resolution, beginDate);
                endDate = fi.fmi.metoclient.metolib.WfsRequestParser.adjustEndTime(resolution, endDate, beginDate);
            }
            var taskDef = {
                service : DATA_FETCHER_NAME_SITES,
                parameter : _.isString(options.requestParameter) ? options.requestParameter.split(PARAMETER_SEPARATOR) : options.requestParameter,
                // Make sure parameter(s) are integers instead of Date objects when they are given to cache.
                start : beginDate instanceof Date ? beginDate.getTime() : beginDate,
                end : endDate instanceof Date ? endDate.getTime() : endDate,
                resolution : resolution,
                crs : options.crs,
                queryExtension : options.queryExtension
            };
            // Because locations can be given in multiple ways, location related properties are
            // set separately for taskDef to combine all location informations for cache.
            setTaskDefLocations(taskDef, options);
            this.cache.fetch(taskDef, function(errors, result) {
                var converted = convertSitesDataFromCacheForApi(taskDef, result, errors);
                options.callback(converted.data, converted.errors);
            }, options.progressCallback);
        }
    };

    /**
     * @private
     *
     * Request parser directly to retrive spatial data.
     *
     * Notice, cache is not used for spatial data.
     *
     * Notice, this function should be called in the context of the private object of the WfsConnection instance.
     *
     * Notice, this flow will also continue
     * to data fetcher callback if parser should be used to retrieve data
     * from the server. The callback function is set for cache when it is
     * initialized. Callbacks given and set in this function are called when
     * the data is gotten either from the server or directly from the cache.
     *
     * See API for function description.
     */
    var retrieveSpatialData = function(options) {
        var that = this;
        fi.fmi.metoclient.metolib.WfsRequestParser.getData({
            url : that.connectionUrl,
            storedQueryId : that.storedQueryId,
            requestParameter : options.requestParameter,
            begin : options.begin,
            end : options.end,
            timestep : options.timestep,
            // When parser is used directly, it can handle time adjusting automatically if requested.
            denyTimeAdjusting : options.denyTimeAdjusting,
            // Include also other sites related options if they are given.
            // But, bbox is the reason that all data is provided directly for the parser.
            geoid : trimProperty(options.geoid),
            wmo : trimProperty(options.wmo),
            fmisid : trimProperty(options.fmisid),
            sites : trimSites(options.sites),
            bbox : options.bbox,
            crs : options.crs,
            queryExtension : options.queryExtension,
            callback : options.callback
        });
    };

    /**
     * @private
     *
     * Wraps the function calls inside try-catch before calling.
     *
     * Instead of using multiple try catches in many functions only one is used here.
     * This style may improve performance.
     *
     * Notice, this function applies this-reference to the function calls.
     *
     * @param {function} func Function that should be called.
     *                        May not be {undefined} or {null}.
     * @param {function} callback Callback function that is called if an exception occurs
     *                            during this synchronous part of the flow. Notice, this
     *                            is a callback that may be provided for asynchronous flow.
     *                            May be {undefined} or {null}.
     * @return {boolean} {true} if operation starts successfully. Else {false}.
     *                          Notice, if {callback} is given, it is also called
     *                          if false is returned for success.
     */
    var makeSafe = function(func, callback) {
        var success = true;
        try {
            // Call the correct function with the original arguments.
            // Function reference itself is removed from the arguments.
            // Also, callback reference provided for synchronous exception
            // handling is removed from the arguments.
            var args = Array.prototype.slice.call(arguments);
            args.shift();
            args.shift();
            func.apply(this, args);

        } catch(e) {
            var errorStr = "ERROR: API level error occurred in a synchronous flow!";
            if ("undefined" !== typeof console && console) {
                console.error(errorStr);
            }
            success = false;
            if (callback) {
                // Inform callback about exception in the flow.
                // Then, caller knows that asynchronous flow has ended.
                var error = {
                    errorText : errorStr
                };
                callback(undefined, error);
            }
        }
        return success;
    };

    /**
     * @private
     *
     * Notice, this function should be called in the context of the private object of the WfsConnection instance.
     *
     * See API for function description.
     */
    var getUrl = function() {
        return this.connectionUrl;
    };

    /**
     * @private
     *
     * Notice, this function should be called in the context of the private object of the WfsConnection instance.
     *
     * See API for function description.
     */
    var getStoredQueryId = function() {
        return this.storedQueryId;
    };

    /**
     * @private
     *
     * Notice, this function should be called in the context of the private object of the WfsConnection instance.
     *
     * See API for function description.
     */
    var connect = function(url, storedQueryId) {
        // Skip if already connected.
        // Notice, if already connected, this function does not reconnect
        // even if a new URL would be different than the old one.
        if (!this.connectionUrl) {
            if (!_.isString(url) || !url) {
                var urlErrorStr = "ERROR: WfsConnection URL must be a string and not empty!";
                if ("undefined" !== typeof console && console) {
                    console.error(urlErrorStr);
                }
                throw urlErrorStr;
            }
            if (!_.isString(storedQueryId) || !storedQueryId) {
                var idErrorStr = "ERROR: WfsConnection stored query ID must be a string and not empty!";
                if ("undefined" !== typeof console && console) {
                    console.error(idErrorStr);
                }
                throw idErrorStr;
            }
            this.connectionUrl = url;
            this.storedQueryId = storedQueryId;
        }
    };

    /**
     * @private
     *
     * Notice, this function should be called in the context of the private object of the WfsConnection instance.
     *
     * See API for function description.
     */
    var disconnect = function() {
        this.connectionUrl = undefined;
        this.storedQueryId = undefined;
        resetCache.call(this);
    };

    /**
     * @private
     *
     * Notice, this function should be called in the context of the private object of the WfsConnection instance.
     *
     * See API for function description.
     */
    var resetCache = function() {
        this.cache.clearCache();
    };

    /**
     * @private
     *
     * See API for function description.
     */
    var getData = function(options) {
        if (options) {
            if (options.bbox) {
                // BBox is not supported by the cache at the moment.
                // Therefore, pass the whole query to the parser.
                retrieveSpatialData.call(this, options);

            } else if (options.geoid || options.wmo || options.fmisid || options.sites) {
                retrieveSitesData.call(this, options);

            } else {
                var errorStr = "ERROR: Either geoid, wmo, fmisid, sites or bbox is mandatory in options!";
                if ("undefined" !== typeof console && console) {
                    console.error(errorStr);
                }
                throw errorStr;
            }

        } else {
            var optionsErrorStr = "ERROR: Options object is mandatory!";
            if ("undefined" !== typeof console && console) {
                console.error(optionsErrorStr);
            }
            throw optionsErrorStr;
        }
    };

    /**
     * Constructor for the connection instance.
     *
     * Notice, this constructor is returned from {fi.fmi.metoclient.metolib.WfsConnection}
     * and can be used for instantiation later.
     */
    var connectionConstructor = function() {
        // Reference to the connection instance object.
        var _me = this;

        // Private object is used for API functions to provide them private member variables.
        // Instance specific data is available for API functions when reference to this private
        // object is applied to the function calls by using this private object. Then, these
        // variables and functions are capsulated and are not available outside of the connection
        // instance.
        var _private = {
            // Reference to the connection instance object.
            connectionInstance : _me,

            // Member variables that are initialized to undefined.
            // When connection function is called these are set.
            connectionUrl : undefined,
            storedQueryId : undefined,

            // Member variables that are initialized to values that are used
            // throughout the lifetime of object instance.

            // Cache for retrieved data.
            cache : new fi.fmi.metoclient.metolib.SplitterCache({
                sideFetchAfterFactor : 1,
                sideFetchBeforeFactor : 0.5,
                maxBlockDataPoints : 200,
                maxCacheDataSize : 4000
            })
        };

        // Set data fetcher that cache uses for the given type of the data.
        _private.cache.addDataProvider(DATA_FETCHER_NAME_SITES, function(taskDef, callback) {
            cacheSitesDataFetcherCallback(_private, taskDef, callback);
        });

        //=================================================================
        // Public WfsConnection API is defined here as priviledged functions.
        //=================================================================

        /**
         * Synchronous.
         *
         * @return {String} URL that is used for the connection and
         *                  has been set when {connect} function is called.
         *                  May be {undefined} if state is not connected.
         */
        this.getUrl = function() {
            return getUrl.call(_private);
        };

        /**
         * Synchronous.
         *
         * @return {String} Stored query ID that is used for the connection
         *                  and has been set when {connect} function is called.
         *                  May be {undefined} if state is not connected.
         */
        this.getStoredQueryId = function() {
            return getStoredQueryId.call(_private);
        };

        /**
         * Synchronous.
         *
         * Notice, if already connected, this function does not reconnect
         * even if a new URL would be different than the old one.
         *
         * @param {String} url URL that is used for the connection.
         *                     May not be {undefined}, {null} or empty.
         * @param {String} storedQueryId Stored query ID to identify the data that is requested.
         *                               For example, stored query ID may be used to request
         *                               observed data or forecast data.
         *                               May not be {undefined}, {null} or empty.
         * @return {boolean} {true} if synchronous operation was successfull. Else {false}.
         */
        this.connect = function(url, storedQueryId) {
            return makeSafe.call(_private, connect, undefined, url, storedQueryId);
        };

        /**
         * Synchronous.
         *
         * Releases resources.
         *
         * @return {boolean} {true} if synchronous operation was successfull. Else {false}.
         */
        this.disconnect = function() {
            return makeSafe.call(_private, disconnect, undefined);
        };

        /**
         * Synchronous.
         *
         * Releases cache resources.
         *
         * @return {boolean} {true} if synchronous operation was successfull. Else {false}.
         */
        this.resetCache = function() {
            return makeSafe.call(_private, resetCache, undefined);
        };

        /**
         * Request data.
         *
         * Operation is asynchronous.
         *
         * Notice, callback is {function(data, errors){}}.
         *      - data: Data object provides locations data.
         *              May be {undefined} if an error has occurred.
         *              The object is of this structure:
         *          {
         *              // General information received in the server response for the request.
         *              // May not be {undefined} or {null}.
         *              // Content properties are set if given in the server response.
         *              info : {
         *                  begin : {Date|undefined},
         *                  end : {Date|undefined}
         *              },
         *              // Properties provide descriptive property objects that correspond to
         *              // the parameter keys that have been given for the request. Notice,
         *              // property data is also available inside locations data objects.
         *              // This object is provided as a complementary object, if reference to a single
         *              // wrapper object is later needed for general information about properties.
         *              properties : {
         *                  parameterAsKey : { label : "labelString",
         *                                     unit : "measurementUnitString",
         *                                     phenomenon : "phenomenonString",
         *                                     statisticalFunction : "statisticalFunctionString",
         *                                     statisticalPeriod : "statisticalAggregationTimePeriod" },
         *                  ...
         *              },
         *              // Data of locations. May be empty if sites data is not provided.
         *              // May not be {undefined} or {null}.
         *              locations : [
         *                  {
         *                      info : {
         *                          id : "location id string",
         *                          geoid : "geoid string",
         *                          wmo : "wmo string",
         *                          fmisid : "fmisid string",
         *                          name : "location name string",
         *                          region : "region name string",
         *                          country : "country name string",
         *                          timezone : "timezone name string",
         *                          position : [ "positionStringPart1", "positionStringPart2", ... ]
         *                      },
         *                      data : {
         *                          // Data property keys correspond to the parameter keys
         *                          // that have been given for the request.
         *                          parameterAsKey : {
         *                            property : { label : "labelString",
         *                                         unit : "measurementUnitString",
         *                                         phenomenon : "phenomenonString",
         *                                         statisticalFunction : "statisticalFunctionString",
         *                                         statisticalPeriod : "statisticalAggregationTimePeriod" },
         *                            timeValuePairs : [ { time : intTimeInMsSince01011970,
         *                                                 value : floatMeasurementValue }, ... ]
         *                          },
         *                          ...
         *                      }
         *                  },
         *                  ...
         *              ]
         *          }
         *      - errors: Array that contains possible errors that occurred during the flow. Array is
         *                always provided even if it may be empty. If an error occurs in this parser,
         *                an error string is pushed here. Also, when an HTTP error occurs, error contains
         *                the textual portion of the HTTP status, such as "Not Found" or "Internal Server Error."
         *                Errors parameter is of this structure:
         *          [
         *              {
         *                  // None, one, or more of the following error values may exist.
         *                  // Values may also be {undefined} or {null}.
         *                  errorCode : "errorCodeString",
         *                  errorText : "errorTextString",
         *                  extension : {Object}
         *              },
         *              ...
         *          ]
         *
         * Notice, object properties of the function {options} parameter are URL encoded by this library
         * before they are inserted into the request URL.
         *
         * @param {Object} options Mandatory. May not be {undefined} or {null}. Object structure:
         *     {
         *         requestParameter : {String|Array(String)}
         *                            Mandatory property. May not be {undefined} or {null}. Array may not be empty.
         *                            This is one of the parameter strings that is part of
         *                            URL parameters to define which data is requested from the server.
         *                            Parameter string may contain request for multiple parameters.
         *                            For example, value for dew point temperature may be "td".
         *                            If an array is given, strings are given as separate array string items.
         *         begin : {int|Date}
         *                 Mandatory property. May not be {undefined} or {null}.
         *                 The begin time for the data.
         *                 Integer value is number of milliseconds since 01.01.1970 that can be gotten,
         *                 for example, with {Date::getTime()}. Alternatively, {Date} object may be given.
         *         end : {int|Date}
         *               Mandatory property. May not be {undefined} or {null}.
         *               The end time for the data.
         *               Value is number of milliseconds since 01.01.1970 that can be gotten,
         *               for example, with {Date::getTime()}. Alternatively, {Date} object may be given.
         *         timestep : {int}
         *                    May be {undefined} or {null}.
         *                    Timestep in milliseconds.
         *                    If {undefined}, {null} or zero, server returns all data for
         *                    the given time interval. If timestep is 1, server uses the default
         *                    timestep. Notice, even if time is in milliseconds here, it is converted
         *                    and floored to minutes before sending for the server.
         *         denyTimeAdjusting : {boolean}
         *                             May be {undefined} or {null}.
         *                             If {true}, {begin} and {end} times are not adjusted for server but given values
         *                             are used exactly for requests. Otherwise, times are adjusted.
         *         geoid : {Array(String|int)|String|int}
         *                 May be {undefined} or {null} or empty if {wmo}, {fmisid}, {sites} or {bbox} is given.
         *                 Array of Geographical name ID (geonames.org) strings or integers.
         *                 One geoid can be given as a single string or integer.
         *                 Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *         wmo : {Array(String|int)|String|int}
         *               May be {undefined} or {null} or empty if {geoid}, {fmisid}, {sites} or {bbox} is given.
         *               Array of World Meteorological Organization (WMO) identifier strings or integers.
         *               One wmo can be given as a single string or integer.
         *               Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *         fmisid : {Array(String|int)|String|int}
         *                  May be {undefined} or {null} or empty if {geoid}, {wmo}, {sites} or {bbox} is given.
         *                  Array of FMI observation station identifiers (fmisid) strings or integers.
         *                  One fmisid can be given as a single string or integer.
         *                  Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *         sites : {Array(String)|String}
         *                 May be {undefined} or {null} or empty if {geoid}, {wmo}, {fmisid} or {bbox} is given.
         *                 Array of site name strings. One site can be given as a single string.
         *                 Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *         bbox : {String}
         *                May be {undefined}, {null} or empty if {geoid}, {wmo}, {fmisid} or {sites} is given.
         *                BBOX string. Notice, either {geoid}, {wmo}, {fmisid}, {sites} or {bbox} is required.
         *                Notice, cache is not used if spatial data (bbox) is queried.
         *         crs : {String}
         *               May be {undefined}, {null} or empty.
         *               Coordinate Reference System (CRS) string.
         *         queryExtension : {Object}
         *                          Optional. May be {undefined} or {null}.
         *                          Property values may be {undefined}, {null} or {string}.
         *                          This property is not needed in normal use cases of the API.
         *                          But, this property may be used if API does not support field-value-pairs
         *                          that need to be included into request URL query. The key-value-pairs of
         *                          the property are URL encoded and included as URL query field-value-pairs
         *                          in the request. If property value is {undefined} or {null}, it is interpreted
         *                          as an empty string. Notice, other API properties should be used instead of this
         *                          extension if possible.
         *         callback : {function(data, errors)}
         *                    Mandatory property. May not be {undefined} or {null}.
         *                    Callback is called with the parsed data and errors array when operation finishes.
         *                    If an error occurs, data is set {undefined} for the callback. Possible errors are
         *                    given inside the array that is always provided.
         *         progressCallback : {function(err, partStart, partEnd)}
         *                            Not mandatory property.
         *                            Called when part of the flow has finished.
         *                            Function is called with {err}, {partStart} and {partEnd} parameters.
         *     }
         * @return {boolean} {true} if asynchronous operation is successfully started. Else {false}.
         */
        this.getData = function(options) {
            return makeSafe.call(_private, getData, options ? options.callback : undefined, options);
        };
    };

    // Constructor function is returned for later instantiation.
    return connectionConstructor;

})();
