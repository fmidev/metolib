MetOLib: Build And Test
=======================

Grunt initialization commands
-----------------------------

Notice, *lib* -folder already contains a Webpack bundle of the current version.
Use of Webpack is not necessary for normal use of the library.
But, you may use this development repository to produce alternative builds and to test content if source is edited.

MetOLib project runs [Webpack](https://webpack.github.io/) with [Grunt](http://gruntjs.com) to build and test release versions of the source code.
For more information about the build tools, see [Grunt guide](http://gruntjs.com/getting-started) and [Webpack guide](https://webpack.js.org/guides/getting-started/).
Also, notice that Grunt and gruntplugins are installed and managed via [npm](https://npmjs.org/),
the [Node.js](http://nodejs.org/) package manager.

If you have installed Grunt globally in the past, you will need to remove it first:
* npm uninstall -g grunt

Put the grunt command in your system path, allowing it to be run from any directory (may require sudo or admin):
* npm install -g grunt-cli

Browse into *metolib* -folder. Then, required Grunt modules can be installed in there by using:
* npm install

Notice, above commands copy necessary module files into *node_modules* -folder. These are .gitignored when git is used.

After modules are installed, default task of Grunt may be run by using *grunt* -command.

Notice, remember to update MetOLib version string in *package.json* -file if MetOLib version should be updated.
Then, *grunt* -command will automatically update version information in MetOLib filenames and into test HTML files.

### Running tests with Grunt and Jasmine

When *grunt* -command is used to run default tasks, Grunt builds files and runs also *Jasmine* tests for them.
These tasks may also be run separately by calling *grunt build* and *grunt test*. Notice, as a default, tests
are run only agains the data that is provided in the repository. But, *test/jasmine/js/specconfig.js* can be
modified to run tests for both local data and for data requested and received from server.

Notice, proper API-key is required to get data from server. Therefore, set your own API-key in test configuration
file, *test/jasmine/js/specconfig.js*, if tests should be run with server data. API-key is not required if only
local tests are run and only local data files are used for tests. Default grunt tasks do not require server data.

Also notice, separate test HTML files are provided in *test/jasmine* -folder. A browser may be used to show
those HTML files which can be used to run same tests separately without using Grunt. Notice, most of the tests of
the HTML-files require simple web server and the tests do not pass if they are run directly from filesystem.
For example, [Aptana](http://www.aptana.com/) may be used to provide simple server for the web project.

### Running unit tests with Karma

[Karma test runner](http://karma-runner.github.io) can be used to easily run all the Jasmine unit tests of MetOLib project.
Install Karma following the instructions in [Karma Github readme](https://github.com/karma-runner/karma)

A default karma.conf.js is provided with the project, it currently tries to run the tests using Chrome.
Modify the 'browsers' configuration property to use a different set of browsers.

When Karma is set up, start background testing with the selected set of browsers by typing

`karma start`

or in Windows you may need to use 'node node_modules/karma/bin/karma start'

at command line.

Notice, you may also connect a browser to Karma test runner by starting the browser and by using the Karma test runner URL,
such as, http://localhost:9876/ that will automatically connect the browser to tests. Then, that browser may be used for tests
without the need to define the browser in Karma config file.
