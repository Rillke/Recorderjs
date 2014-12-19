/*!
 * Copyright © 2014 Rainer Rillke <lastname>@wikipedia.de
 *
 * Derivate work of:
 * Copyright © 2013 Matt Diamond
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/*global self: false, importScripts: false */
/*jslint vars: false,  white: false */
/*jshint onevar: false, white: false, laxbreak: true */
( function( global ) {
	'use strict';
	var recLength = 0,
		recBuffersL = [],
		recBuffersR = [],
		sampleRate;

	global.onmessage = function( e ) {
		switch ( e.data.command ) {
			case 'init':
				init( e.data.config );
				break;
			case 'record':
				record( e.data.buffer );
				break;
			case 'exportWAV':
				exportWAV( e.data.type );
				break;
			case 'getBuffer':
				getBuffer();
				break;
			case 'clear':
				clear();
				break;
		}
	};

	function init( config ) {
		global.recorderWorkerConfig = config;
		sampleRate = config.sampleRate;
		importScripts.apply( global, config.imports );
	}

	function record( inputBuffer ) {
		recBuffersL.push( inputBuffer[ 0 ] );
		recBuffersR.push( inputBuffer[ 1 ] );
		recLength += inputBuffer[ 0 ].length;
	}

	function exportWAV( type, metadata ) {
		var bufferL = mergeBuffers( recBuffersL, recLength );
		var bufferR = mergeBuffers( recBuffersR, recLength );
		var interleaved = interleave( bufferL, bufferR );
		new Wave()
			.addWaveData( interleaved, sampleRate )
			.setMetaData( metadata )
			.readAsArrayBuffer( function( dataview ) {
				var audioBlob = new Blob( [ dataview ], {
					type: type
				} );

				global.postMessage( audioBlob );
			} );
	}

	function getBuffer() {
		var buffers = [];
		buffers.push( mergeBuffers( recBuffersL, recLength ) );
		buffers.push( mergeBuffers( recBuffersR, recLength ) );
		global.postMessage( buffers );
	}

	function clear() {
		recLength = 0;
		recBuffersL = [];
		recBuffersR = [];
	}

	function mergeBuffers( recBuffers, recLength ) {
		var result = new Float32Array( recLength );
		var offset = 0;
		for ( var i = 0; i < recBuffers.length; i++ ) {
			result.set( recBuffers[ i ], offset );
			offset += recBuffers[ i ].length;
		}
		return result;
	}

	function interleave( inputL, inputR ) {
		var length = inputL.length + inputR.length;
		var result = new Float32Array( length );

		var index = 0,
			inputIndex = 0;

		while ( index < length ) {
			result[ index++ ] = inputL[ inputIndex ];
			result[ index++ ] = inputR[ inputIndex ];
			inputIndex++;
		}
		return result;
	}
}( self ) );
