/**
 * fi.fmi.metoclient.metolib.SplitterCache
 * =======================================
 *
 * See https://github.com/fmidev/metolib/wiki/SplitterCache for documentation.
 *
 * Requires:
 * - async.js (https://github.com/caolan/async)
 * - underscore.js (http://underscorejs.org/)
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
"use strict";

// Requires undersocre
if ("undefined" === typeof _ || !_) {
    throw "ERROR: Underscore is required for fi.fmi.metoclient.metolib.SplitterCache!";
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
            var pinned = false;
            var waitingRecycling = false;
            var waitingMerging = false;
            var ready = false;
            var callbacks = [];
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
                pinned = false;
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
                    if (!pinned) {
                        pinned = true;
                        if (dispatcher) {
                            dispatcher('blockPinned', thisBlock);
                        }
                    }
                    return true;
                } else {
                    return false;
                }
            };

            this.unpin = function() {
                if (pinned) {
                    pinned = false;
                    if (dispatcher) {
                        dispatcher('blockUnpinned', thisBlock);
                    }
                }
            };

            this.isPinned = function() {
                return pinned;
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
                    fetched = f;
                } else {
                    fetched = false;
                }
            };

            this.isFetching = function() {
                return fetching;
            };

            this.setFetching = function(f) {
                if (f === true) {
                    fetching = f;
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

            this.markForRecycling = function() {
                waitingRecycling = true;
                if (dispatcher) {
                    dispatcher('blockEvicted', thisBlock);
                }
            };

            this.markForMerging = function() {
                waitingMerging = true;
                if (dispatcher) {
                    dispatcher('blockMarkedForMerge', thisBlock);
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
                            if (err) {
                                fetchError = err;
                            }
                            data = result;
                            fetched = true;
                            if (dispatcher) {
                                dispatcher('blockProviderFetchFinished', thisBlock);
                            }
                            if (callbacks.length === 0) {
                                fetching = false;
                                that.unpin();
                            } else {
                                async.each(callbacks, function(cb, notify) {
                                    try {
                                        cb.call(that, fetchError, data);
                                    } catch (ex) {
                                    }
                                    notify();
                                }, function(err) {
                                    callbacks = [];
                                    fetching = false;
                                    that.unpin();
                                });
                            }
                        });
                        if (dispatcher) {
                            dispatcher('blockProviderFetchStarted', thisBlock);
                        }
                    }
                } else {
                    if (_.isFunction(callback)) {
                        _.defer(function(err, data) {
                            if (dispatcher) {
                                dispatcher('blockCacheFetchFinished', thisBlock);
                            }
                            callback(err, data);
                            that.unpin();
                        }, fetchError, data);
                        if (dispatcher) {
                            dispatcher('blockCacheFetchStarted', thisBlock);
                        }
                    } else {
                        that.unpin();
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
                if (err && console) {
                    console.error(err);
                }
            });
        }

        function mergeBlocks(block1, block2, callback) {
            var newBlock = null;
            var taskDef = {};
            var combinedData = [];
            if (block1.pin() && block2.pin()) {
                block1.markForMerging();
                block2.markForMerging();
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
                            if (!err) {
                                fillWith(combinedData, data, taskDef.location, taskDef.parameter, 0, 0, block1.getPointCount(), cb);
                            } else {
                                fillWith(combinedData, NaN, taskDef.location, taskDef.parameter, 0, 0, block1.getPointCount(), cb);
                                if (console) {
                                    console.log('Error in merge:' + err);
                                }
                            }
                        });
                    },
                    data2 : function(cb) {
                        block2.getDataAsync(function(err, data) {
                            if (!err) {
                                fillWith(combinedData, data, taskDef.location, taskDef.parameter, block1.getPointCount(), 0, block2.getPointCount(), cb);
                            } else {
                                fillWith(combinedData, NaN, taskDef.location, taskDef.parameter, block1.getPointCount(), 0, block2.getPointCount(), cb);
                                if (console) {
                                    console.log('Error in merge:' + err);
                                }
                            }
                        });
                    }
                }, function(err, results) {
                    block1.markForRecycling();
                    block2.markForRecycling();
                    newBlock.setData(combinedData);
                    newBlock.setFetching(false);
                    newBlock.setFetched(true);
                    fireEvent('blockCacheFetchFinished', newBlock);
                    callback(null, newBlock);
                });
            } else {
                block1.unpin();
                block2.unpin();
                _.defer(function() {
                    callback('One or both blocks already marked for recycling', null);
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
            if (!block1.isWaitingMerging() && !block2.isWaitingMerging() && ((block1.getPointCount() < minBlockDataPoints) || (block2.getPointCount() < minBlockDataPoints)) && blocksAreContinuous(block1, block2) && (block1.getPointCount() + block2.getPointCount() < maxBlockDataPoints)) {
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

        function purge() {
            _.each(cachedBlocks, function(block, index) {
                if (block.isWaitingRecycling()) {
                    recycleBlock(block);
                }
            });
        }

        function sortIterator(bl) {
            return bl.getStart();
        }

        function calculateDataBlocks(taskDef) {
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
                            if (block.pin()) {
                                retval.push(block);
                                cacheHits += block.getDataSize();
                            } else {
                                if (console) {
                                    console.error('Strange, unable to pin block!');
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
                                    if (console) {
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
                if (block.pin()) {
                    blocks.push(block);
                } else {
                    if (console) {
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
                            if (console) {
                                console.error('The service returned ' + source[loc][param].length + ' values for location ' + loc + ' and parameter ' + param + ' when ' + (sourceIndex + count) + ' were requested. Filling the whole segment with NaN');
                            }
                        }
                    }
                    if (useErrorValues) {
                        ti = targetIndex;
                        end = targetIndex + count;
                        while (ti < end) {
                            target[loc][param][ti++] = NaN;
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
                callback();
            });
        }

        function retrieveDataAsync(taskDef, finishCallback, progressCallback) {
            var result = {};
            var dataArr;
            var errors = null;
            var notifyProgress = false;

            if (!_.isFunction(finishCallback)) {
                throw 'finishCallback must be a function';
            }

            if (_.isFunction(progressCallback)) {
                notifyProgress = true;
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

            var dataBlocks = calculateDataBlocks(taskDef);
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
                    dataBlock.getDataAsync();

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

                        // error in fetching data, fill result with NaN for this step sequence if data is undefined itself.
                        // Notice, errors may have occurred but data is still given because it should be good enough.
                        // Therefore, do not ignore given data if it is available. It is up to the data provider to make
                        // sure that data is undefined if it should not be handled in cache.
                        if (!data) {
                            fillValue = NaN;
                        }
                    }
                    fillWith(result.data, fillValue, td.location, td.parameter, targetStartIndex, sourceStartIndex, valueCount, function() {
                        if (notifyProgress) {
                            progressCallback(err, includeStart, includeEnd);
                        }
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
            purge();
            stepResolutions = [];
            cacheHits = 0;
            cacheMisses = 0;
        };

        this.fetch = function(taskDef, finalCallback, progressCallback) {
            checkTaskDef(taskDef);
            fireEvent('fetchStarted', taskDef);
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
    };

    /**
     * SplitterCache constructor is returned for later instantiation.
     */
    return _constructor;
})();
