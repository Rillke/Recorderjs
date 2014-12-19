module.exports = function( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-qunit' );
	grunt.loadNpmTasks( 'grunt-jsduck' );

	grunt.initConfig( {
		jshint: {
			all: [ '*.js', 'worker/*.js', 'test/*.js' ]
		},
		qunit: {
			all: [ 'test/index.html' ]
		},
		jsduck: {
			main: {
				// source paths with your code
				src: [
					'recorder.js',
					'worker/*.js'
				],

				// docs output dir
				dest: 'docs',

				// extra options
				options: {
					'builtin-classes': true,
					'title': 'Recorder.js API documentation',
					'message': 'Currently unstable and in development. Don\'t trust this docs, yet!',
					'warnings': [],
					'external': [ 'ArrayBuffer', 'Blob', 'DataView', 'Float32Array' ]
				}
			}
		}
	} );

	grunt.registerTask( 'test', [ 'jshint', 'qunit' ] );
	grunt.registerTask( 'default', [ 'test' ] );
};
