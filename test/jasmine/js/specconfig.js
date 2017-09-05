/**
 * Configuration file for spec runner tests.
 */

/**
 * Spec runner test configuration.
 */
Metolib.test = Metolib.test || {};
Metolib.test.SpecConfig = {

    /**
     * Flag to inform if only local tests should be run.
     */
    SPEC_RUNNER_ONLY_LOCAL_TESTS : true,

    /**
     * Notice, FMI server requires a proper API-key as part of the URL.
     *
     * API-key is not required in tests if only local tests should be run
     * and only local data files are used for tests.
     * See SPEC_RUNNER_ONLY_LOCAL_TESTS flag above.
     */
    SPEC_RUNNER_TEST_SERVER_URL : "http://data.fmi.fi/fmi-apikey/insert-your-apikey-here/wfs"

};
