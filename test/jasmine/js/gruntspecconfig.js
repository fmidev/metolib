/**
 * Configuration file for Grunt tests.
 *
 * This file should be included when tests are run by Grunt.
 */

// "Package" definitions
var fi = fi || {};
fi.fmi = fi.fmi || {};
fi.fmi.metoclient = fi.fmi.metoclient || {};
fi.fmi.metoclient.test = fi.fmi.metoclient.test || {};

/**
 * Spec runner test configuration for grunt tests.
 */
fi.fmi.metoclient.test.GruntSpecConfig = {

    /**
     * Spec files adjust their data paths according to this path.
     */
    SPEC_RUNNER_BASE_STR : "test/jasmine/"

};
