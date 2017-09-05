const webpackConfig = require('./webpack.config');

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg : grunt.file.readJSON('package.json'),

        webpack : {
          dist: webpackConfig
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
            all : ['src/**/*.js', 'test/**/*.js'],
            options : {
                "esversion" : 6,
                "curly" : true,
                "eqeqeq" : true,
                "immed" : true,
                "latedef" : false,
                "newcap" : true,
                "noarg" : true,
                "sub" : true,
                "undef" : true,
                "boss" : true,
                "eqnull" : true,
                "node" : true,
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
                    "XDomainRequest" : true,
                    "Metolib" : true
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
            metolibBundle : {
                src : ['lib/metolib-bundle-<%= pkg.version %>.js'],
                options : {
                    specs : ['test/jasmine/js/*.js', 'test/jasmine/spec/*.js'],
                    vendor : ['testdeps/async/async-0.2.9.js', 'testdeps/jquery/jquery-1.10.2.js', 'testdeps/lodash/lodash.compat-2.1.0.js'],
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
          metolibBundle : {
              files : [{
                  dest : 'test/jasmine/SpecRunnerBundle.html',
                  src : ['test/jasmine/SpecRunnerBundle.html']
              },
              {
                  dest : 'test/cache-testbench/index.html',
                  src : ['test/cache-testbench/index.html']
              },
              {
                  dest : 'examples/connection.html',
                  src : ['examples/connection.html']
              },
              {
                  dest : 'examples/parser.html',
                  src : ['examples/parser.html']
              }],
              options : {
                  replacements : [{
                      pattern : /metolib-bundle-.+\.js/g,
                      replacement : 'metolib-bundle-<%= pkg.version %>.js'
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
    grunt.loadNpmTasks('grunt-webpack');

    // Update version strings inside files.
    grunt.registerTask('string-replace-versions', ['string-replace:metolibBundle']);

    // Build MetOLib.
    grunt.registerTask('build', ['clean:onlyFiles', 'webpack:dist', 'string-replace-versions']);

    // Test against both local and server data task(s).
    grunt.registerTask('test', ['connect', 'jasmine:metolibBundle', 'clean:tmpTestFiles', 'clean:tmpTestFolders']);

    // Default task(s).
    // As a default, only local data is used for tests. Then, tests can be run also without connection for server data.
    // Notice, test can be run separately also for server data.
    grunt.registerTask('default', ['build', 'jshint', 'test']);

};
