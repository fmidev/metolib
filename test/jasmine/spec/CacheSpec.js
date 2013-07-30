describe("Cache", function() {
		var cache;
		var fetchers = {};
		var sideAfter = 0.5;
		var sideBefore = 0.25;
		var maxBlockSize = 200;
		var minBlockSize = 20;
		var cacheCapacity = 10000;

		var milkRun = function(taskDef) {
				var that = this;
				this.result = null;
				this.err = null;
				this.exception = null;
				this.finished = false;

				try {
						cache.fetch(taskDef, function(err, result) {
								that.finished = true;
								that.err = err;
								that.result = result;
						});

				} catch (exception) {
						that.exception = exception;
						that.finished = true;
				}
		};

		beforeEach(function() {
				this.addMatchers({
						toStartWith : function(expected) {
								if (( typeof this.actual === 'string') && ( typeof expected === 'string')) {
										return (this.actual.slice(0, expected.length) === expected);
								} else {
										return false;
								}
						}
				});

				cache = new fi.fmi.metoclient.metolib.SplitterCache({
						sideFetchAfterFactor : sideAfter,
						sideFetchBeforeFactor : sideBefore,
						maxBlockDataPoints : maxBlockSize,
						minBlockDataPoints : minBlockSize,
						maxCacheDataSize : cacheCapacity
				});

				fetchers.obs = function(taskDef, callback) {
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
												retval[loc][param].push(taskDef.start + taskDef.resolution * i);
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
								}, Math.random() * 10);
						});
				};

				fetchers.fct = function(taskDef, callback) {
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
												retval[loc][param].push(taskDef.startTime + taskDef.resolution * i);
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
								}, Math.random() * 10);
						});
				};

				cache.addDataProvider('obs', fetchers.obs);
				cache.addDataProvider('fct', fetchers.fct);

		});

		afterEach(function() {

		});

		// The tests:

		it("should return the correct time steps", function() {
				/* =================================== */

				var start = 3478;
				var end = 5975;
				var resolution = 5;

				var expectedValues = [];
				if ((end - start) % resolution !== 0) {
						end = end + ((end - start) % resolution) + 1;
				}

				for (var i = start; i <= end; i += resolution) {
						expectedValues.push(i);
				}

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : start,
						resolution : resolution,
						end : end
				};

				// runs blocks are run linearly:
				// Start the async call in the first one:
				runs(function() {
						var that = this;
						this.myResult = null;
						this.myErr = null;
						this.myException = null;
						this.finished = false;

						try {
								cache.fetch(taskDef, function(err, result) {
										that.myErr = err;
										that.myResult = result;
										that.finished = true;
								});

						} catch (exception) {
								this.myException = exception;
								this.finished = true;
						}
				});

				// Wait max 5 secs for the async call to finish:
				waitsFor(function() {
						return this.finished;
				}, 5000);

				// now check the result after 5 secs:
				runs(function() {
						expect(this.myErr).toBeNull();
						expect(this.myException).toBeNull();
						expect(this.myResult.steps).toBeDefined();
						for (var i = 0; i < this.myResult.steps.length; i++) {
								expect(this.myResult.steps[i]).toEqual(start + i * resolution);
								expect(this.myResult.data['Rautatientori']['temp'][i]).toEqual(expectedValues[i]);
						}
				});

		});
		
		it('should create blocks with continuous time steps', function(){
			var start = 0;
			var end = 599;
			var resolution = 1;

			var taskDef = {
					service : 'obs',
					parameter : 'temp',
					location : 'Rautatientori',
					start : start,
					resolution : resolution,
					end : end
			};
			var expectedBlocks = {
				'-150-49':false,
				'50-249':false,
				'250-449':false,
				'450-649':false,
				'650-849':false,
				'850-899':false 
			}

			cache.addListener('blockPrepared', function(dataBlock){
				console.log('#'+dataBlock.getId()+': '+dataBlock.getStart()+'-'+dataBlock.getEnd());
				var span = dataBlock.getStart()+'-'+dataBlock.getEnd();
				if (expectedBlocks[span] === false){
					expectedBlocks[span] = true;
				}
				else {
					expectedBlocks[span] = false;
				}
			});
			
			runs(function() {
				milkRun.call(this, taskDef);
			});

			waitsFor(function() {
				return this.finished;
			}, 5000);
			
			runs(function(){
				_.each(expectedBlocks, function(span){
					expect(span).toBeTruthy()									
				});
			});
		});

		it("should delegate to two fetchers by round-robin", function() {
				/* ============================================= */
				var start = 0;
				var end = 400;
				var resolution = 1;

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : start,
						resolution : resolution,
						end : end
				};

				cache.addDataProvider('obs', function(taskDef, callback) {
						var retval = {};
						var i = 0;
						// console.log('obs2: Cache miss, fetching obs data block between
						// '+taskDef.startTime+' - '+taskDef.endTime+',
						// '+taskDef.pointCount+' points');
						async.forEach(taskDef.location, function(loc, locNotify) {
								if (retval[loc] === undefined) {
										retval[loc] = {};
								}
								async.forEach(taskDef.parameter, function(param, paramNotify) {
										if (retval[loc][param] === undefined) {
												retval[loc][param] = [];
										}
										for ( i = 0; i < taskDef.pointCount; i++) {
												retval[loc][param].push('obs2 says:' + (taskDef.startTime + taskDef.resolution * i));
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
										// console.log('finished obs with block between
										// '+taskDef.startTime+' - '+taskDef.endTime);
										// console.log(retval);
								}, Math.random() * 1000);
						});
				});

				// Start the async call in the first one:
				runs(function() {
						var that = this;
						this.myResult = null;
						this.myErr = null;
						this.myException = null;
						this.finished = false;

						try {
								cache.fetch(taskDef, function(err, result) {
										that.myResult = result;
										that.myErr = err;
										that.finished = true;
								});

						} catch (exception) {
								this.myException = exception;
								this.finished = true;

						}
				});

				// Wait max 5 secs for the async call to finish:
				waitsFor(function() {
						return this.finished;
				}, 5000);

				// now check the result after 5 secs:
				runs(function() {
						expect(this.myErr).toBeNull();
						expect(this.myException).toBeNull();
						expect(this.myResult).not.toBeNull();

						for (var i = 0; i < this.myResult.data['Rautatientori']['temp'].length; i++) {
								if (((i >= 0) && (i < 99)) || ((i >= 299) && (i < 499))) {
										expect(this.myResult.data['Rautatientori']['temp'][i]).not.toStartWith('obs2 says');
								} else {
										expect(this.myResult.data['Rautatientori']['temp'][i]).toStartWith('obs2 says');
								}
						}
				});
		});

		it("should keep at least max items", function() {
				/* ============================= */

				var start = 0;
				var pointCount = Math.floor(cacheCapacity / (1 + sideAfter + sideBefore));
				var resolution = 1;

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : start,
						resolution : resolution,
						pointCount : pointCount
				};

				// runs blocks are run linearly:
				// Start the async call in the first one:
				runs(function() {
						var that = this;
						this.myErr = null;
						this.myException = null;
						this.finished = false;

						try {
								cache.fetch(taskDef, function(err, result) {
										that.myErr = err;
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFillingDegree());
								}, function(err, start, end) {

								});

						} catch (exception) {
								this.myException = exception;
						}
				});

				runs(function() {
						var that = this;
						this.myErr = null;
						this.myException = null;

						try {
								cache.fetch(taskDef, function(err, result) {
										that.myErr = err;
										that.finished = true;
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFillingDegree());
								}, function(err, start, end) {
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFillingDegree());
								});

						} catch (exception) {
								this.myException = exception;
								console.error(exception.toString());
						}
				});

				// Wait 5 secs for the async call to finish:
				waitsFor(function() {
						return this.finished;
				}, 5000);

				// now check the result after 5 secs:
				runs(function() {
						expect(this.myErr).toBeNull();
						expect(this.myException).toBeNull();
						expect(cache.getFillingDegree()).toBeGreaterThan(0.979);
						expect(cache.getFillingDegree()).toBeLessThan(1.000);
				});
		});

		it("should keep at most max items", function() {
				/* ============================ */

				var start = 0;
				var pointCount = cacheCapacity;
				var resolution = 1;

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : start,
						resolution : resolution,
						pointCount : pointCount
				};

				var taskDef1b = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : start + 3 * resolution,
						resolution : resolution,
						pointCount : pointCount
				};

				var taskDef2 = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : start + resolution,
						resolution : resolution,
						pointCount : pointCount
				};

				var taskDef2b = {
						service : 'fct',
						parameter : 'temp',
						location : 'Rautatientori',
						start : start + resolution,
						resolution : resolution,
						pointCount : pointCount
				};

				//console.log(taskDef);
				// runs blocks are run linearly:
				// Start the async call in the first one:
				runs(function() {
						var that = this;
						this.myErr = null;
						this.myException = null;
						this.finished = false;

						try {
								cache.fetch(taskDef, function(err, result) {
										that.myErr = err;
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFillingDegree());
								}, function(err, start, end) {
										//console.log(cache.getCachedItemCount());
								});

						} catch (exception) {
								this.myException = exception;
						}
				});

				runs(function() {
						var that = this;
						this.myErr = null;
						this.myException = null;
						this.finished = false;

						try {
								cache.fetch(taskDef1b, function(err, result) {
										that.myErr = err;
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFillingDegree());
								}, function(err, start, end) {
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFragmentationRatio());
								});

						} catch (exception) {
								this.myException = exception;
						}
				});

				runs(function() {
						var that = this;
						this.myErr = null;
						this.myException = null;

						try {
								cache.fetch(taskDef2, function(err, result) {
										that.myErr = err;
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFillingDegree());
								}, function(err, start, end) {
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFragmentationRatio());
								});

						} catch (exception) {
								this.myException = exception;
						}
				});

				runs(function() {
						var that = this;
						this.myErr = null;
						this.myException = null;

						try {
								cache.fetch(taskDef2b, function(err, result) {
										that.myErr = err;
										that.finished = true;
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFillingDegree());
								}, function(err, start, end) {
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFragmentationRatio());
								});

						} catch (exception) {
								this.myException = exception;
								this.finished = true;
						}
				});

				// Wait 5 secs for the async call to finish:
				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						var that = this;
						this.myErr = null;
						this.myException = null;
						this.finished = false;

						try {
								cache.fetch(taskDef2, function(err, result) {
										that.myErr = err;
										that.finished = true;
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFillingDegree());
								}, function(err, start, end) {
										//console.log(cache.getCachedItemCount());
										//console.log(cache.getFragmentationRatio());
								});

						} catch (exception) {
								this.myException = exception;
								this.finished = true;
						}
				});
				// Wait 5 secs for the async call to finish:
				waitsFor(function() {
						return this.finished;
				}, 5000);

				// now check the result after 5 secs:
				runs(function() {
						expect(this.myErr).toBeNull();
						expect(this.myException).toBeNull();
						expect(cache.getFillingDegree()).toBeLessThan(1.000);
				});
		});

		it("should add, call and remove all listeners", function() {
				/*========================================= */

				var listenerIds = {};
				var listeners = {
						blockCreated : jasmine.createSpy('blockCreated'),
						blockPrepared : jasmine.createSpy('blockPrepared'),
						blockProviderFetchStarted : jasmine.createSpy('blockProviderFetchStarted'),
						blockProviderFetchFinished : jasmine.createSpy('blockProviderFetchFinished'),
						blockCacheFetchStarted : jasmine.createSpy('blockCacheFetchStarted'),
						blockCacheFetchFinished : jasmine.createSpy('blockCacheFetchFinished'),
						blockPinned : jasmine.createSpy('blockPinned'),
						blockUnpinned : jasmine.createSpy('blockUnpinned'),
						blockEvicted : jasmine.createSpy('blockEvicted'),
						blockRecycled : jasmine.createSpy('blockRecycled'),
						blockAged : jasmine.createSpy('blockAged'),
						fetchStarted : jasmine.createSpy('fetchStarted'),
						fetchFinished : jasmine.createSpy('fetchFinished'),
						evictStarted : jasmine.createSpy('evictStarted'),
						evictFinished : jasmine.createSpy('evictFinished'),
						cacheCleared : jasmine.createSpy('cacheCleared'),
						dataProviderAdded : jasmine.createSpy('dataProviderAdded'),
						dataProviderRemoved : jasmine.createSpy('dataProviderRemoved')
				};

				_.each(_.keys(listeners), function(eventName) {
						listenerIds[eventName] = cache.addListener(eventName, listeners[eventName]);
				});

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : cacheCapacity
				};

				var taskDef2 = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : 1
				};

				var testProvider = jasmine.createSpy('testProvider');

				runs(function() {
						this.testProviderId = cache.addDataProvider('testProvider', testProvider);
				});

				runs(function() {
						milkRun.call(this, taskDef);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				//eviction is done on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				//the evicted are recycled on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				runs(function() {
						cache.clearCache();
						cache.removeDataProvider('testProvider', this.testProviderId);
				});

				waits(200);

				//Check that all the listeners have been called:
				runs(function() {
						_.each(_.keys(listeners), function(l) {
								expect(listeners[l]).toHaveBeenCalled();
						});
				});

				//Remove listeners and reset spies:
				runs(function() {
						_.each(listenerIds, function(id, eventName) {
								cache.removeListener(eventName, id);
								listeners[eventName].reset();
						});
				});

				//Check that the spies have been reset:
				runs(function() {
						_.each(_.keys(listeners), function(l) {
								expect(listeners[l]).not.toHaveBeenCalled();
						});
				});

				//Re-do all the previous tests:
				runs(function() {
						this.testProviderId = cache.addDataProvider('testProvider', testProvider);
				});

				runs(function() {
						milkRun.call(this, taskDef);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				//eviction is done on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				//the evicted are recycled on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				runs(function() {
						cache.clearCache();
						cache.removeDataProvider('testProvider', this.testProviderId);
				});

				waits(200);

				//Check that none of the listeners have been called this time:
				runs(function() {
						_.each(_.keys(listeners), function(l) {
								expect(listeners[l]).not.toHaveBeenCalled();
						});
				});

		});

		it("should create new blocks only when recycled not available", function() {
				/*========================================================= */

				var blockCreated = jasmine.createSpy('blockCreated');
				cache.addListener('blockCreated', blockCreated);

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : cacheCapacity //This will overflow the cache because of the side fetch
				};

				var taskDef2 = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : maxBlockSize //requires one block
				};

				var taskDef3 = {
						service : 'fct',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : maxBlockSize //requires one block
				};

				runs(function() {
						this.expectedCreatedBlockCount = Math.ceil(taskDef.pointCount * (1 + sideAfter + sideBefore) / maxBlockSize);
				});

				runs(function() {
						milkRun.call(this, taskDef);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				//eviction is done on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				//the evicted are recycled on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				runs(function() {
						expect(blockCreated.calls.length).toEqual(this.expectedCreatedBlockCount);
						blockCreated.reset();
				});

				//wait for recycling to happen
				waits(200);

				runs(function() {
						milkRun.call(this, taskDef3);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						expect(blockCreated).not.toHaveBeenCalled();
				});

		});

		it("should return cached blocks from cache", function() {
				/*====================================== */

				var listeners = {
						blockCreated : jasmine.createSpy(),
						blockPrepared : jasmine.createSpy(),
						blockProviderFetchStarted : jasmine.createSpy(),
						blockProviderFetchFinished : jasmine.createSpy(),
						blockCacheFetchStarted : jasmine.createSpy(),
						blockCacheFetchFinished : jasmine.createSpy()
				};

				_.each(_.keys(listeners), function(eventName) {
						cache.addListener(eventName, listeners[eventName]);
				});

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : Math.round(cacheCapacity / 2)
				};

				var taskDef2 = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : 1
				};

				runs(function() {
						this.expectedProviderFetchBlockCount = Math.ceil(taskDef.pointCount * (1 + sideAfter + sideBefore) / maxBlockSize);
						this.expectedCacheFetchBlockCount = Math.ceil(taskDef2.pointCount * (1 + sideAfter + sideBefore) / maxBlockSize) * 2;
				});

				runs(function() {
						milkRun.call(this, taskDef);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				//eviction is done on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				//the evicted are recycled on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				waits(200);

				runs(function() {
						expect(listeners.blockCreated.calls.length).toEqual(this.expectedProviderFetchBlockCount);
						expect(listeners.blockPrepared.calls.length).toEqual(this.expectedProviderFetchBlockCount);
						expect(listeners.blockProviderFetchStarted.calls.length).toEqual(this.expectedProviderFetchBlockCount);
						expect(listeners.blockProviderFetchFinished.calls.length).toEqual(this.expectedProviderFetchBlockCount);
						expect(listeners.blockCacheFetchStarted.calls.length).toEqual(this.expectedCacheFetchBlockCount);
						expect(listeners.blockCacheFetchFinished.calls.length).toEqual(this.expectedCacheFetchBlockCount);
				});
		});

		it("should unpin all blocks it pins", function() {
				/*=============================== */

				var listeners = {
						blockPinned : jasmine.createSpy(),
						blockUnpinned : jasmine.createSpy()
				};

				_.each(_.keys(listeners), function(eventName) {
						cache.addListener(eventName, listeners[eventName]);
				});

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : Math.round(cacheCapacity / 2)
				};

				runs(function() {
						milkRun.call(this, taskDef);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				waits(200);

				runs(function() {
						expect(listeners.blockPinned.calls.length).toEqual(listeners.blockUnpinned.calls.length);
				});
		});

		it("should recycle all the block it evicts", function() {
				/*====================================== */

				var evictedBlockIds = [];
				var recycledBlockIds = [];
				var listeners = {
						blockEvicted : function(dataBlock) {
								evictedBlockIds.push(dataBlock.getId());
						},
						blockRecycled : function(dataBlock) {
								recycledBlockIds.push(dataBlock.getId());
						}
				};

				_.each(_.keys(listeners), function(eventName) {
						cache.addListener(eventName, listeners[eventName]);
				});

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : cacheCapacity
				};

				var taskDef2 = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : 1
				};

				runs(function() {
						milkRun.call(this, taskDef);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				//eviction is done on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				//the evicted are recycled on the next fetch:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				//wait for recycling to finish
				waits(200);

				runs(function() {
						evictedBlockIds.sort();
						recycledBlockIds.sort();
						expect(evictedBlockIds.length).not.toEqual(0);
						expect(evictedBlockIds.length).toEqual(evictedBlockIds.length);
						for (var i = 0; i < evictedBlockIds.length; i++) {
								expect(evictedBlockIds[i]).toEqual(recycledBlockIds[i]);
						}
				});
		});

		it("should clear all service blocks when resolution changes", function() {
				/*===========================================*/

				var evictedBlockIds = [];
				var preparedBlockIds = [];
				var listeners = {
						blockPrepared : function(dataBlock) {
								preparedBlockIds.push(dataBlock.getId());
						},
						blockEvicted : function(dataBlock) {
								evictedBlockIds.push(dataBlock.getId());
						}
				};

				spyOn(listeners, 'blockPrepared').andCallThrough();
				spyOn(listeners, 'blockEvicted').andCallThrough();

				cache.addListener('blockPrepared', listeners.blockPrepared);
				cache.addListener('blockEvicted', listeners.blockEvicted);

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : Math.ceil(cacheCapacity / 10)
				};

				var taskDef2 = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 20,
						pointCount : Math.ceil(cacheCapacity / 10)
				};

				var taskDef3 = {
						service : 'ftc',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : Math.ceil(cacheCapacity / 10)
				};

				//Fetch the first "obs" task
				runs(function() {
						milkRun.call(this, taskDef);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						this.blockIdsForFirstTask = preparedBlockIds.slice().sort();
						expect(listeners.blockEvicted).not.toHaveBeenCalled();
				});

				//Fetch the "fct" tasks
				runs(function() {
						milkRun.call(this, taskDef3);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						expect(listeners.blockEvicted).not.toHaveBeenCalled();
				});

				//Fetch the second "obs" task with different resolution:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						expect(listeners.blockEvicted).toHaveBeenCalled();
						evictedBlockIds.sort();
						expect(evictedBlockIds.length).toEqual(this.blockIdsForFirstTask.length);
						for (var i = 0; i < evictedBlockIds.length; i++) {
								expect(evictedBlockIds[i]).toEqual(this.blockIdsForFirstTask[i]);
						}
				});

		});

		it("should clear all service blocks when resolution stays the same and start time changes by non-resolution steps", function() {
				/*============================================================================================================= */

				var evictedBlockIds = [];
				var preparedBlockIds = [];
				var listeners = {
						blockPrepared : function(dataBlock) {
								preparedBlockIds.push(dataBlock.getId());
						},
						blockEvicted : function(dataBlock) {
								evictedBlockIds.push(dataBlock.getId());
						}
				};

				spyOn(listeners, 'blockPrepared').andCallThrough();
				spyOn(listeners, 'blockEvicted').andCallThrough();

				cache.addListener('blockPrepared', listeners.blockPrepared);
				cache.addListener('blockEvicted', listeners.blockEvicted);

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : Math.ceil(cacheCapacity / 10)
				};

				var taskDef2 = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 5,
						resolution : 10,
						pointCount : Math.ceil(cacheCapacity / 10)
				};

				var taskDef3 = {
						service : 'ftc',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : Math.ceil(cacheCapacity / 10)
				};

				//Fetch the first "obs" task
				runs(function() {
						milkRun.call(this, taskDef);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						this.blockIdsForFirstTask = preparedBlockIds.slice().sort();
						expect(listeners.blockEvicted).not.toHaveBeenCalled();
				});

				//Fetch the "fct" tasks
				runs(function() {
						milkRun.call(this, taskDef3);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						expect(listeners.blockEvicted).not.toHaveBeenCalled();
				});

				//Fetch the second "obs" task with different start time:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						expect(listeners.blockEvicted).toHaveBeenCalled();
						evictedBlockIds.sort();
						expect(evictedBlockIds.length).toEqual(this.blockIdsForFirstTask.length);
						for (var i = 0; i < evictedBlockIds.length; i++) {
								expect(evictedBlockIds[i]).toEqual(this.blockIdsForFirstTask[i]);
						}
				});
		});

		it("should not clear any service blocks when resolution stays the same and start time changes by resolution steps", function() {
				/*============================================================================================================= */

				var blockEvicted = jasmine.createSpy('blockEvicted');

				cache.addListener('blockEvicted', blockEvicted);

				var taskDef = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : Math.ceil(cacheCapacity / 10)
				};

				var taskDef2 = {
						service : 'obs',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 20,
						resolution : 10,
						pointCount : Math.ceil(cacheCapacity / 10)
				};

				var taskDef3 = {
						service : 'ftc',
						parameter : 'temp',
						location : 'Rautatientori',
						start : 0,
						resolution : 10,
						pointCount : Math.ceil(cacheCapacity / 10)
				};

				//Fetch the first "obs" task
				runs(function() {
						milkRun.call(this, taskDef);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						expect(blockEvicted).not.toHaveBeenCalled();
				});

				//Fetch the "fct" tasks
				runs(function() {
						milkRun.call(this, taskDef3);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						expect(blockEvicted).not.toHaveBeenCalled();
				});

				//Fetch the second "obs" task with a different start time:
				runs(function() {
						milkRun.call(this, taskDef2);
				});

				waitsFor(function() {
						return this.finished;
				}, 5000);

				runs(function() {
						expect(blockEvicted).not.toHaveBeenCalled();
				});

		});
		
		it("should merge small blocks", function() {
					/*====================================== */

					var listeners = {
							blockCreated : jasmine.createSpy(),
							blockPrepared : jasmine.createSpy(),
							blockMarkedForMerge : jasmine.createSpy(),
							blockEvicted : jasmine.createSpy(),
							blockRecycled : jasmine.createSpy()
					};

					_.each(_.keys(listeners), function(eventName) {
							cache.addListener(eventName, listeners[eventName]);
					});

					var taskDef = {
							service : 'obs',
							parameter : 'temp',
							location : 'Rautatientori',
							start : 0,
							resolution : 10,
							pointCount : 10
					};

					var taskDef2 = {
							service : 'obs',
							parameter : 'temp',
							location : 'Rautatientori',
							start : 10*10,
							resolution : 10,
							pointCount : 10
					};
					
					//First task
					runs(function() {
							milkRun.call(this, taskDef);
					});

					waitsFor(function() {
							return this.finished;
					}, 5000);
					
					runs(function(){
						expect(listeners.blockCreated.calls.length).toEqual(1);
						expect(listeners.blockMarkedForMerge.calls.length).toEqual(0);
					});
					
					//Second task
					runs(function() {
							milkRun.call(this, taskDef2);
					});

					waitsFor(function() {
							return this.finished;
					}, 5000);
					
					runs(function(){
						expect(listeners.blockCreated.calls.length).toEqual(2);
						expect(listeners.blockMarkedForMerge.calls.length).toEqual(0);
					});

					//First task again, should start merge
					runs(function() {
							milkRun.call(this, taskDef);
					});

					waitsFor(function() {
							return this.finished;
					}, 5000);
					
					
					runs(function(){
						expect(listeners.blockMarkedForMerge.calls.length).toEqual(2);
						expect(listeners.blockEvicted.calls.length).toEqual(2);
						expect(listeners.blockRecycled.calls.length).toEqual(0);
					});
					
					//First task 3rd time, should recycle the merged blocks
					runs(function() {
						milkRun.call(this, taskDef);
					});

					waitsFor(function() {
						return this.finished;
					}, 5000);
					
					runs(function(){
						expect(listeners.blockEvicted.calls.length).toEqual(2);
						expect(listeners.blockRecycled.calls.length).toEqual(2);
					});
			});
		
});
