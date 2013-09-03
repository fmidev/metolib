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
            if (!matchFound && taskDef.sites && name && region) {
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
                // TaskDef sites and lcoations have been created before for cache by combining
                // name and region that have been given through the API. TaskDef locations are
                // compared to the name and region values that are given as parameters for this
                // function.
                var combinedLocationName = name + PARAMETER_SEPARATOR + region;
                // Sites are given as string array in taskDef.
                for ( i = 0; i < taskDef.sites.length; ++i) {
                    var loc = taskDef.sites[i];
                    if (-1 !== loc.indexOf(PARAMETER_SEPARATOR) && loc === combinedLocationName) {
                        // Matching location for cache was found from taskDef locations.
                        // Notice, prefix is used with cache.
                        locationName = LOCATION_SITES_PREFIX + loc;
                        matchFound = true;
                        break;
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
     * @param {Object} data Data from the parser.
     * @param {Object} errors Errors that have occurred during loading and parsing data.
     * @return {Object} Object that contains converted errors and converted data.
     *                  {@link fi.fmi.metoclient.metolib.SplitterCache#fillWith} function describes
     *                  the object structure of the converted data.
     */
    function convertSitesDataFromParserForCache(taskDef, data, errors) {
        var converted = {
            // Data is converted below into the data object if data is available.
            data : data ? {} : undefined,
            // No need to convert errors for cache.
            errors : errors
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
     * @para taskDef {Object} Definition object to describe cache blocks of the operation.
     * @para data
     * @param errors Errors that have occurred during loading, parsing and caching data.
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
     * @param container Object that provides connection instance specific private member variables.
     * @param taskDef
     * @param taskCallback
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
            // Because locations can be given in multiple ways, location relate properties are
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
                maxCacheDataSize : 4000,
                strictErrorHandling: false
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
         *         progressCallback : {Function(err, partStart, partEnd)}
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
