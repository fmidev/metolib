module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg : grunt.file.readJSON('package.json'),

        // Concatenate files together for release versions.
        //---------------------------------------------------------------
        concat : {
            libMetolib : {
                files : {
                    // Src files are defined here one by one to make sure they are concatenated in correct order.
                    'lib/metolib-combined-<%= pkg.version %>.js' : ['src/utils.js', 'src/wfsrequestparser.js', 'src/splittercache.js', 'src/wfsconnection.js']
                }
            },
            metolibCombinedStrict : {
                files : {
                    // Use strict definition should be included once to the beginning of the file.
                    // Notice, combined files may contain their own strict definitions which should be removed in the grunt flow.
                    'lib/metolib-combined-<%= pkg.version %>.js' : ['src/intro.js', 'lib/metolib-combined-<%= pkg.version %>.js']
                }
            }
        },

        // Minimize and concatenate, if necessary, JavaScript files for release.
        //--------------------------------------------------------------------------------
        uglify : {
            // Uglify libs and copy them into all folders that use them.
            libMetolib : {
                files : [{
                    dest : 'lib/metolib-combined-<%= pkg.version %>-min.js',
                    src : ['lib/metolib-combined-<%= pkg.version %>.js']
                }, {
                    dest : 'lib/utils-<%= pkg.version %>-min.js',
                    src : ['src/utils.js']
                }, {
                    dest : 'lib/wfsrequestparser-<%= pkg.version %>-min.js',
                    src : ['src/wfsrequestparser.js']
                }, {
                    dest : 'lib/splittercache-<%= pkg.version %>-min.js',
                    src : ['src/splittercache.js']
                }, {
                    dest : 'lib/wfsconnection-<%= pkg.version %>-min.js',
                    src : ['src/wfsconnection.js']
                }]
            }
        },

        // Clean build files or folders.
        //------------------------------
        clean : {
            onlyFiles : {
                src : ['lib/**'],
                filter : 'isFile'
            },
            // Notice, removal of directories may corrupt svn structure.
            // Therefore, be carefull if this is set as default command.
            alsoFolders : ['lib/'],
            tmpTestFiles : {
                // If Grunt tests do not pass, temporary test files, such as _SpecRunner.html,
                // may not be removed automatically after test run. Therefore, this is provided
                // to make sure it can be removed also separately.
                src : ['_SpecRunner.html', 'dest'],
                filter : 'isFile'
            },
            // .grunt folder is used for temporary files. Remove folder.
            tmpTestFolders : ['.grunt/']
        },

        // Detect errors and potential problems in JavaScript code and enforce coding conventions.
        //----------------------------------------------------------------------------------------
        jshint : {
            all : ['src/**/*.js', 'lib/metolib-combined-<%= pkg.version %>.js', 'test/**/*.js'],
            options : {
                "curly" : true,
                "eqeqeq" : true,
                "immed" : true,
                "latedef" : true,
                "newcap" : true,
                "noarg" : true,
                "sub" : true,
                "undef" : true,
                "boss" : true,
                "eqnull" : true,
                "node" : true,
                "es5" : true,
                "globals" : {
                    "it" : false,
                    "xit" : false,
                    "describe" : false,
                    "xdescribe" : false,
                    "beforeEach" : false,
                    "afterEach" : false,
                    "expect" : false,
                    "spyOn" : false,
                    "runs" : true,
                    "waitsFor" : true,
                    "waits" : true,
                    "jQuery" : true,
                    "$" : true,
                    "_" : true,
                    "async" : true,
                    "jasmine" : true,
                    "Raphael" : true,
                    "navigator" : true,
                    "window" : true,
                    "document" : true,
                    "fi" : true,
                    "XDomainRequest" : true
                }
            }
        },

        // Server connection for jasmine tests.
        //-------------------------------------
        // Jasmine tests need to be run by using host, such as localhost,
        // because ajax operations may not work if only local filesystem is used.
        connect : {
            server : {
                options : {
                    // Some randomly selected port number.
                    // Notice, this is used in jasmine tasks for host.
                    // Also notice, XML-files for local grunt tests may
                    // contain reference to this port for localhost.
                    // If port is changed, XML-files may need to be updated.
                    port : 8987
                }
            }
        },

        // Jasmine tests.
        //---------------
        jasmine : {
            // Notice, test/jasmine/js/specconfig.js defines if only local or both local and server tests should be run.
            //----------------------------------------------------------------------------------------------------------
            metolibSrc : {
                src : ['src/utils.js', 'src/wfsrequestparser.js', 'src/splittercache.js', 'src/wfsconnection.js'],
                options : {
                    specs : ['test/jasmine/js/*.js', 'test/jasmine/spec/*.js'],
                    vendor : ['deps/async/async-0.2.5.js', 'deps/jquery/jquery-1.10.2.js', 'deps/lodash/lodash.underscore-1.3.1.js'],
                    // See connect task for this.
                    host : 'http://localhost:8987/'
                }
            },
            metolibMinified : {
                src : ['lib/utils-<%= pkg.version %>-min.js', 'lib/wfsrequestparser-<%= pkg.version %>-min.js', 'lib/splittercache-<%= pkg.version %>-min.js', 'lib/wfsconnection-<%= pkg.version %>-min.js'],
                options : {
                    specs : ['test/jasmine/js/*.js', 'test/jasmine/spec/*.js'],
                    vendor : ['deps/async/async-0.2.5-min.js', 'deps/jquery/jquery-1.10.2-min.js', 'deps/lodash/lodash.underscore-1.3.1-min.js'],
                    // See connect task for this.
                    host : 'http://localhost:8987/'
                }
            },
            metolibCombined : {
                src : 'lib/metolib-combined-<%= pkg.version %>.js',
                options : {
                    specs : ['test/jasmine/js/*.js', 'test/jasmine/spec/*.js'],
                    vendor : ['deps/async/async-0.2.5.js', 'deps/jquery/jquery-1.10.2.js', 'deps/underscore/underscore-1.4.4.js'],
                    // See connect task for this.
                    host : 'http://localhost:8987/'
                }
            },
            metolibCombinedMinified : {
                src : 'lib/metolib-combined-<%= pkg.version %>-min.js',
                options : {
                    specs : ['test/jasmine/js/*.js', 'test/jasmine/spec/*.js'],
                    vendor : ['deps/async/async-0.2.5-min.js', 'deps/jquery/jquery-1.10.2-min.js', 'deps/lodash/lodash.underscore-1.3.1-min.js'],
                    // See connect task for this.
                    host : 'http://localhost:8987/'
                }
            }
        },

        // Make sure proper version number is used in source file paths of test HTML files.
        //---------------------------------------------------------------------------------
        // Notice, these test HTML files are meant to be run separately by hand, not automatically by Grunt.
        // Notice, src files do not contain version in filename. They can be ignored here.
        "string-replace" : {
            metolibMinified : {
                files : [{
                    dest : 'test/jasmine/SpecRunnerMinified.html',
                    src : ['test/jasmine/SpecRunnerMinified.html']
                }],
                options : {
                    replacements : [{
                        pattern : /utils-.+-min\.js/g,
                        replacement : 'utils-<%= pkg.version %>-min.js'
                    }, {
                        pattern : /wfsrequestparser-.+-min\.js/g,
                        replacement : 'wfsrequestparser-<%= pkg.version %>-min.js'
                    }, {
                        pattern : /splittercache-.+-min\.js/g,
                        replacement : 'splittercache-<%= pkg.version %>-min.js'
                    }, {
                        pattern : /wfsconnection-.+-min\.js/g,
                        replacement : 'wfsconnection-<%= pkg.version %>-min.js'
                    }]
                }
            },
            metolibCombined : {
                files : [{
                    dest : 'test/jasmine/SpecRunnerCombined.html',
                    src : ['test/jasmine/SpecRunnerCombined.html']
                }],
                options : {
                    replacements : [{
                        pattern : /metolib-combined-.+\.js/g,
                        replacement : 'metolib-combined-<%= pkg.version %>.js'
                    }]
                }
            },
            metolibCombinedMinified : {
                files : [{
                    dest : 'test/jasmine/SpecRunnerCombinedMinified.html',
                    src : ['test/jasmine/SpecRunnerCombinedMinified.html']
                }],
                options : {
                    replacements : [{
                        pattern : /metolib-combined-.+-min\.js/g,
                        replacement : 'metolib-combined-<%= pkg.version %>-min.js'
                    }]
                }
            },
            metolibCombinedStrict : {
                files : [{
                    dest : 'lib/metolib-combined-<%= pkg.version %>.js',
                    src : ['lib/metolib-combined-<%= pkg.version %>.js']
                }],
                options : {
                    replacements : [{
                        pattern : /"use strict";/gi,
                        replacement : '// "use strict";'
                    }]
                }
            }
        }
    });

    // Load the plugins that provide the required tasks.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-string-replace');

    // Update version strings inside files.
    grunt.registerTask('string-replace-versions', ['string-replace:metolibMinified', 'string-replace:metolibCombined', 'string-replace:metolibCombinedMinified']);

    // Build MetOLib.
    // Notice, combined file is purged of strict definition lines and then strict definition is included to the beginning of the file before uglifying.
    grunt.registerTask('build', ['clean:onlyFiles', 'concat:libMetolib', 'string-replace:metolibCombinedStrict', 'concat:metolibCombinedStrict', 'uglify', 'string-replace-versions']);

    // Test against both local and server data task(s).
    grunt.registerTask('test', ['connect', 'jasmine:metolibSrc', 'jasmine:metolibMinified', 'jasmine:metolibCombined', 'jasmine:metolibCombinedMinified', 'clean:tmpTestFiles', 'clean:tmpTestFolders']);

    // Default task(s).
    // As a default, only local data is used for tests. Then, tests can be run also without connection for server data.
    // Notice, test can be run separately also for server data.
    grunt.registerTask('default', ['build', 'jshint', 'test']);

};
