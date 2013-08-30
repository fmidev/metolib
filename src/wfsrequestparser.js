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
"use strict";

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
        KEY_ERROR_TEXT : "errorText",

        // Empty property object if data has not been gotten from server.
        PROPERTY_OBJECT_EMPTY : {
            label : "",
            unit : "",
            phenomenon : "",
            statisticalFunction : "",
            statisticalPeriod : ""
        }
    };

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
                    contents : [] // Array of all position and time data as strings. This relates to the locations pos data.
                },
                // All properties related data is inserted in turns item by item here.
                data : [],
                // May contain none, one or more parameter strings that identify the request parameter, such as td.
                parameters : [],
                // May contain none, one or more of key-value-pairs. Key identifies the request parameter and
                // is same as parameters array item, such as td. Value gives property object for the requested data.
                // Key-value-pair that describes one property in properties object:
                //   parameterAsKey : { label : "labelString",
                //                      unit : "unitString",
                //                      phenomenon : "phenomenonString",
                //                      statisticalFunction : "statisticalFunctionString",
                //                      statisticalPeriod : "statisticalAggregationTimePeriod" }
                properties : {}
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
            properties : parsedContent.properties,
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
                            if (!result.properties[parameter]) {
                                if ("undefined" !== typeof console && console) {
                                    console.error("ERROR: Server has not provided properties for request parameter!");
                                }
                                result.properties[parameter] = myConstants.PROPERTY_OBJECT_EMPTY;
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
            parseOmObservedProperty(this, container.properties, asyncStarted, asyncCallback, errors);
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
            parseOmObservedProperty(this, container.properties, asyncStarted, asyncCallback, errors);
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
            if (url) {
                // Start asynchronous operation to get the properties.
                requestXml(url, errors, function(xml, errorContainer) {
                    // Check if server responded with an error.
                    if (!parseExceptionReport(xml, errors)) {
                        // Properties are inserted into the given container.
                        if (xml) {
                            // Notice, multiple observable property elements are given inside a composite.
                            // If only one observable property is given, composite is not used. Therefore,
                            // check observable properties in both ways here.
                            parseCompositeObservableProperty(xml, container, asyncStarted, asyncCallback, errors);
                            parseObservableProperty(xml, container, asyncStarted, asyncCallback, errors);
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
            if (nameAttr) {
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
                // Create a shallow copy of the empty property object.
                // Then, object contains default values that may be replaced by parsed content.
                // Notice, empty property object contains only strings. So, shallow copy here
                // is actually a deep copy.
                var propertyObject = _.clone(myConstants.PROPERTY_OBJECT_EMPTY);
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
         *                            For example, value for temperature may be "td". If an array is given,
         *                            strings are given as separate array string items.
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
