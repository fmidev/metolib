$(function() {
    var cache = null;
    var sideAfter = 0;
    var sideBefore = 0;
    var maxBlockSize = 2000;
    var minBlockSize = 200;
    var cacheCapacity = 1000000;
    var maxVisualizedBlocks = 500;

    var fetching = false;
    var paper = new Raphael(document.getElementById('cachevis'), 1024, 400);
    var minTime = 0;
    var maxTime = 100;
    var existingBlockCount = 0;
    var activeBlocks = {};
    var activeFetches = [];

    // This is set inside init.
    var delayedUpdateView;

    function updateView() {
        var trans = (minTime < 0) ? (-minTime) : 0;
        var timeScale = paper.width / (maxTime - minTime);
        var blockCount = _.keys(activeBlocks).length;
        paper.clear();
        paper.text(30, 10, 'Time:' + minTime);
        paper.text(paper.width - 30, 10, maxTime);
        paper.text(70, 20, 'Total blocks created:' + existingBlockCount);
        paper.text(250, 20, 'Active blocks:' + blockCount);
        var serviceLocParamCombinations = {};
        var yOffset = -100;
        if (blockCount > maxVisualizedBlocks) {
            paper.text(600, 20, 'Too many blocks to visualize').attr({
                stroke : 'red'
            });
        } else {
            _.each(activeBlocks, function(block, index) {
                if (index > maxVisualizedBlocks) {
                    return;
                }
                var label = block.service + block.location + block.parameter;
                if (!serviceLocParamCombinations[label]) {
                    serviceLocParamCombinations[label] = {
                        label : block.service + ', ' + block.location + ', ' + block.parameter,
                        y : yOffset += 150
                    };
                }
                var y = serviceLocParamCombinations[label].y;
                var height = 100;
                var x = (block.start + trans) * timeScale;
                var width = (block.end - block.start) * timeScale;
                var attrs = {};
                if (block.pinned) {
                    attrs.stroke = "red";
                } else {
                    attrs.stroke = "black";
                }
                if (block.fetching) {
                    attrs.fill = '#C8FFAE';
                } else if (block.fetched) {
                    if (block.age === 0) {
                        attrs.fill = '#F9B836';
                    } else {
                        attrs.fill = '#DDF1FF';
                    }
                }
                if (block.waitingRecycling) {
                    attrs.fill = "white";
                    attrs['stroke-dasharray'] = '-';
                } else {
                    attrs['stroke-dasharray'] = '';
                }

                attrs.fillOpacity = 1 / block.age;
                attrs.title = block.start + ' - ' + block.end + ' age:' + block.age + ', size:' + block.dataSize;

                paper.rect(x, y, width, height).attr(attrs);

            });
        }

        _.each(serviceLocParamCombinations, function(obj, index) {
            paper.text(100, obj.y + 50, obj.label);
        });

        paper.setSize(1024, _.keys(serviceLocParamCombinations).length * 150);

        _.each(activeFetches, function(taskDef, index) {
            paper.rect((taskDef.start + trans) * timeScale, 0, (taskDef.end - taskDef.start + trans) * timeScale, 10).attr({
                stroke : 'black'
            });
        });
    }

    function init() {
        delayedUpdateView = _.throttle(updateView, 200);

        cache = new fi.fmi.metoclient.metolib.SplitterCache({
            sideFetchAfterFactor : sideAfter,
            sideFetchBeforeFactor : sideBefore,
            maxBlockDataPoints : maxBlockSize,
            minBlockDataPoints : minBlockSize,
            maxCacheDataSize : cacheCapacity
        });

        var obs = function(taskDef, callback) {
                var retval = {};
                var i, locI, parI, loc, param;
                for (locI = 0;locI < taskDef.location.length; locI++){
                   loc = taskDef.location[locI];
                   if (retval[loc] === undefined) {
                       retval[loc] = {};
                   }
                   for (parI = 0;parI < taskDef.parameter.length; parI++){
                       param = taskDef.parameter[parI];
                       if (retval[loc][param] === undefined) {
                           retval[loc][param] = [];
                       }
                       for (i = 0; i < taskDef.pointCount; i++) {
                           retval[loc][param].push(Math.random());
                       }
                   }
                }
                setTimeout(function(){
                    callback(null,retval);
                },Math.random() * 2000);
        };

        var fct = function(taskDef, callback) {
            var retval = {};
            var i = 0;
            async.forEach(taskDef.location, function(loc, locNotify) {
                if (retval[loc] === undefined) {
                    retval[loc] = {};
                }
                async.forEach(taskDef.parameter, function(param, paramNotify) {
                    if (retval[loc][param] === undefined) {
                        retval[loc][param] = [];
                    }
                    for ( i = 0; i < taskDef.pointCount; i++) {
                        retval[loc][param].push(Math.random());
                    }
                    paramNotify();
                }, function(err) {
                    // one location completed
                    locNotify();
                });
            }, function(err) {
                // all done, simulate network delay:
                setTimeout(function() {
                    callback(err, retval);
                }, Math.random() * 2000);
            });
        };
        cache.addDataProvider('obs', obs);
        cache.addDataProvider('fct', fct);

        cache.addListener('blockCreated', function(block) {
            existingBlockCount++;
            delayedUpdateView();
        });

        cache.addListener('blockPrepared', function(block) {
            var blockData = {
                id : block.getId(),
                start : block.getStart(),
                end : block.getEnd(),
                service : block.getService(),
                location : block.getLocation(),
                parameter : block.getParameter(),
                fetching : false,
                fetched : false,
                pinned : false,
                waitingRecycling : false,
                age : 0,
                dataSize : block.getDataSize()
            };
            if (block.getStart() < minTime) {
                minTime = block.getStart();
            }
            if (block.getEnd() > maxTime) {
                maxTime = block.getEnd();
            }
            activeBlocks[block.getId()] = blockData;
            delayedUpdateView();
        });

        cache.addListener('blockProviderFetchStarted', function(block) {
            activeBlocks[block.getId()].age = 0;
            activeBlocks[block.getId()].fetching = true;
            delayedUpdateView();
        });

        cache.addListener('blockProviderFetchFinished', function(block) {
            activeBlocks[block.getId()].fetched = true;
            activeBlocks[block.getId()].fetching = false;
            delayedUpdateView();
        });

        cache.addListener('blockCacheFetchStarted', function(block) {
            activeBlocks[block.getId()].age = 0;
            activeBlocks[block.getId()].fetching = true;
            delayedUpdateView();
        });

        cache.addListener('blockCacheFetchFinished', function(block) {
            activeBlocks[block.getId()].fetched = true;
            activeBlocks[block.getId()].fetching = false;
            delayedUpdateView();
        });

        cache.addListener('blockPinned', function(block) {
            activeBlocks[block.getId()].pinned = true;
            delayedUpdateView();
        });

        cache.addListener('blockUnpinned', function(block) {
            activeBlocks[block.getId()].pinned = false;
            delayedUpdateView();
        });

        cache.addListener('blockEvicted', function(block) {
            activeBlocks[block.getId()].waitingRecycling = true;
            delayedUpdateView();
        });

        cache.addListener('blockRecycled', function(block) {
            delete activeBlocks[block.getId()];
            delayedUpdateView();
        });

        cache.addListener('blockAged', function(block) {
            activeBlocks[block.getId()].age++;
            delayedUpdateView();
        });

    }

    function doInsideFetch(taskDef, startRand, endRand) {
        var td = _.clone(taskDef);
        if (startRand !== 0) {
            td.start = td.start + Math.round(Math.random() * startRand * 2 - startRand) * td.resolution;
        }
        if (endRand !== 0) {
            td.end = td.end + Math.round(Math.random() * endRand * 2 - endRand) * td.resolution;
            while (td.end <= td.start) {
                td.end = td.end + Math.round(Math.random() * endRand * 2 - endRand) * td.resolution;
            }
        }
        try {
            activeFetches.push(td);
            delayedUpdateView();
            
            cache.fetch(td, function(err, result) {
                if ("undefined" !== typeof console && console) {
                    if (err) {
                        console.log('Fetch complete with errors');
                    } else {
                        console.log('Fetch complete OK, returned data for time period ' + result.steps[0] + ' - ' + result.steps[result.steps.length - 1]);
                    }
                }
                fetching = false;
                activeFetches = _.reject(activeFetches, function(taskDef) {
                    return (taskDef === td);
                });
                updateView();
            });
            console.log('Fetch started');
        } catch(ex) {
            fetching = false;
            activeFetches = _.reject(activeFetches, function(taskDef) {
                return (taskDef === td);
            });
            updateView();
            throw ex;
        }
    }

    function doFetch() {
        if (fetching) {
            return;
        }
        fetching = true;
        var taskDef = {};
        taskDef.service = $('#service').val();
        taskDef.parameter = $('#parameter').val().split(',');
        taskDef.location = $('#location').val().split(',');
        taskDef.resolution = parseInt($('#resolution').val(), 10);
        taskDef.start = parseInt($('#start').val(), 10);
        taskDef.end = parseInt($('#end').val(), 10);

        var repeat = parseInt($('#repeat').val(), 10);
        var startRand = parseFloat($('#start_rand').val());
        var endRand = parseFloat($('#end_rand').val());
        var i = 0;

        for ( i = 0; i < repeat; i++) {
            doInsideFetch(taskDef, startRand, endRand);
        }
    }

    init();
    updateView();

    $('#ctrl').submit(function(e) {
        e.preventDefault();
    });
    $('#fetch').click(function(e) {
        doFetch();
    });

    $('#clear').click(function(e) {
        cache.clearCache();
        minTime = 0;
        maxTime = 100;
        delayedUpdateView();
    });

});
