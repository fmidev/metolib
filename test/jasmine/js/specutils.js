// Requires jQuery
if ( typeof jQuery === undefined || !jQuery) {
    throw "ERROR: jQuery is required for Metolib.test.SpecUtils!";
}

// Requires Metolib.Utils.
if ( typeof Metolib.Utils === "undefined" || !Metolib.Utils) {
    throw "ERROR: Metolib.Utils is required for Metolib.test.SpecUtils!";
}

/**
 * Test case utility functions.
 */
Metolib.test = Metolib.test || {};
Metolib.test.SpecUtils = {
    /**
     * Check given {data} structure against given {times} and {values} array values.
     *
     * @param {Array} times Time values in seconds.
     * @param {Array} values
     * @return {boolean} true if check passed.
     */
    checkData : function(data, times, values) {
        var success = data && data.locations && data.locations.length > 0;
        if (success) {
            try {
                var locationCount = data.locations.length;
                // Check all the locations.
                for (var locationInd = 0; locationInd < locationCount; ++locationInd) {
                    var locationObject = data.locations[locationInd];
                    var locationData = locationObject.data;
                    var labelCount = Metolib.Utils.objectLength(locationData);
                    // Check all the datas of the current location.
                    // Every label has own time-value-pair-array. So, loop through all the labels.
                    var labelInd = 0;
                    for (var parameterKey in locationData) {
                        if (locationData.hasOwnProperty(parameterKey)) {
                            // Every label should have equal number of time-value-pairs
                            // because same start and end time and timestep is used for all labels.
                            var timeValuePairs = locationData[parameterKey].timeValuePairs;
                            // Because times and values arrays contain all the data in one array, multiply the parsed data lengths accordingly.
                            // Every location has its own times listed for every label's value. Every location's every label has its own values listed corresponding time.
                            if (timeValuePairs && timeValuePairs.length * locationCount === times.length && timeValuePairs.length * locationCount * labelCount === values.length) {
                                // Check all the time-value-pairs of the current label.
                                for (var i = 0; i < timeValuePairs.length; ++i) {
                                    // Because times and values arrays contain all the data in one array, multiply the parsed data lengths accordingly.
                                    // Location times are grouped. First all times of one location, then all times of another.
                                    var timeTmpInd = locationInd * timeValuePairs.length + i;
                                    // Values are grouped by labels. And the order of value groups corresponds the times. So, first values of one location, then values of another.
                                    var valueTmpInd = locationInd * labelCount * timeValuePairs.length + labelInd + labelCount * i;
                                    // Change XML times to milliseconds.
                                    // Vague check for NaN values to accept value if value is NaN.
                                    if (times[timeTmpInd] * 1000 !== timeValuePairs[i].time || values[valueTmpInd] !== timeValuePairs[i].value && !isNaN(values[valueTmpInd]) && !isNaN(timeValuePairs[i].value)) {
                                        success = false;console.log(data);console.log(values);
                                        break;
                                    }
                                }

                            } else {
                                success = false;console.log("this fails");
                            }

                            if (!success) {
                                break;
                            }

                            // Increase the indexing for next loop.
                            ++labelInd;
                        }

                        if (!success) {
                            break;
                        }
                    }
                    if (!success) {
                        break;
                    }
                }

            } catch(e) {
                // An error may occur for example if indexing fails.
                success = false;console.log("this fails");
            }
        }
        return success;
    },

    /**
     *  Check that every error is equal to the corresponding correct error.
     *
     * @param {[]} errors May be {undefined} or {null}.
     * @param {[]} correctErrors May be {undefined} or {null}.
     * @return {boolean} true if check passed.
     */
    checkErrorData : function(errors, correctErrors) {
        var success = errors && correctErrors && errors.length === correctErrors.length;
        if (success) {
            try {
                for (var i = 0; i < correctErrors.length; ++i) {
                    var error = errors[i];
                    var correctError = correctErrors[i];
                    // If correct error text is set to undefined the check is skipped.
                    if (error.errorCode !== correctError.errorCode || correctError.errorText !== undefined && error.errorText !== correctError.errorText) {
                        success = false;
                        break;
                    }
                }

            } catch(e) {
                // An error may occur for example if indexing fails.
                success = false;
            }
        }
        return success;
    }
};
