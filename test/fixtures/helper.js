(function () {
  'use strict';

  global.helper = {};

  /**
   * Parsed JSON schemas
   */
  helper.parsed = {};

  /**
   * Dereferenced JSON schemas
   */
  helper.dereferenced = {};

  /**
   * Bundled JSON schemas
   */
  helper.bundled = {};

  /**
   * Throws an error if called.
   */
  helper.shouldNotGetCalled = function shouldNotGetCalled (done) {
    var err = new Error('This function should not have gotten called.');
    if (typeof done === 'function') {
      return function (err2) {
        if (err2 instanceof Error) {
          done(err2);
        }
        else {
          done(err);
        }
      };
    }
    else {
      throw err;
    }
  };

  /**
   * Tests the {@link $RefParser.resolve} method,
   * and asserts that the given file paths resolve to the given values.
   *
   * @param {string} filePath - The file path that should be resolved
   * @param {...*} [params] - The expected resolved file paths and values
   * @returns {Function}
   */
  helper.testResolve = function testResolve (filePath, params) {
    var parsedSchema = arguments[2];
    var expectedFiles = [], expectedValues = [], actualFiles;

    for (var i = 1; i < arguments.length; i += 2) {
      expectedFiles.push(arguments[i]);
      expectedValues.push(arguments[i + 1]);
    }

    return function (done) {
      var parser = new $RefParser();
      parser
        .resolve(filePath)
        .then(function ($refs) {
          expect(parser.schema).to.deep.equal(parsedSchema);
          expect(parser.$refs).to.equal($refs);

          // Resolved file paths
          try {
            expect((actualFiles = $refs.paths())).to.have.same.members(expectedFiles);
            if (userAgent.isNode) {
              expect((actualFiles = $refs.paths(['file']))).to.have.same.members(expectedFiles);
              expect($refs.paths('http')).to.be.an('array').with.lengthOf(0);
            }
            else {
              expect((actualFiles = $refs.paths(['http']))).to.have.same.members(expectedFiles);
              expect($refs.paths('file')).to.be.an('array').with.lengthOf(0);
            }
          }
          catch (e) {
            console.log('Expected Files:', JSON.stringify(expectedFiles, null, 2));
            console.log('Actual Files:', JSON.stringify(actualFiles, null, 2));
            throw e;
          }

          // Resolved values
          var values = $refs.values();
          expect(values).to.have.keys(expectedFiles);
          expectedFiles.forEach(function (file, i) {
            var actual = helper.convertNodeBuffersToPOJOs(values[file]);
            var expected = expectedValues[i];
            expect(actual).to.deep.equal(expected, file);
          });

          done();
        })
        .catch(helper.shouldNotGetCalled(done));
    };
  };

  /**
   * Converts Buffer objects to POJOs, so they can be compared using Chai
   */
  helper.convertNodeBuffersToPOJOs = function convertNodeBuffersToPOJOs (value) {
    if (value && (value._isBuffer || (value.constructor && value.constructor.name === 'Buffer'))) {
      // Convert Buffers to POJOs for comparison
      value = value.toJSON();

      if (userAgent.isNode && /v0\.10/.test(process.version)) {
        // Node v0.10 serializes buffers differently
        value = { type: 'Buffer', data: value };
      }
    }
    return value;
  };

  /**
   * Creates a deep clone of the given value.
   */
  helper.cloneDeep = function cloneDeep (value) {
    var clone = value;
    if (value && typeof (value) === 'object') {
      clone = value instanceof Array ? [] : {};
      var keys = Object.keys(value);
      for (var i = 0; i < keys.length; i++) {
        clone[keys[i]] = helper.cloneDeep(value[keys[i]]);
      }
    }
    return clone;
  };

}());
