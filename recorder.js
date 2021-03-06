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

/*jslint vars: false,  white: false */
/*jshint onevar: false, white: false, laxbreak: true */
( function( window ) {
	'use strict';

	var ROOT_WORKER_PATH = 'worker/';
	var WORKER_SCRIPT_NAME = 'recorderWorker.js';

	var Recorder = function( source, cfg ) {
		var config = cfg || {};
		var bufferLen = config.bufferLen || 4096;
		this.context = source.context;
		this.node = (
			this.context.createScriptProcessor
			|| this.context.createJavaScriptNode
		).call(
			this.context,
			bufferLen,
			2, 2
		);
		var worker = new Worker( ( config.workerRootPath || ROOT_WORKER_PATH ) + WORKER_SCRIPT_NAME );

		worker.postMessage( {
			command: 'init',
			config: {
				sampleRate: this.context.sampleRate,
				rootPath: config.workerRootPath || ROOT_WORKER_PATH,
				recorderSoftware: 'Wikimedia Pronunciation Recording Gadget '
					+ 'https://github.com/Rillke/Recorderjs https://rillke.com/',
				imports: [ 'metaTags.js', 'Id3v2.js', 'Wave.js', 'Encoding.js', 'lib/encoding-indexes.js', 'lib/encoding.js' ]
			}
		} );
		var recording = false,
			currCallback;

		this.node.onaudioprocess = function( e ) {
			if ( !recording ) return;
			worker.postMessage( {
				command: 'record',
				buffer: [
					e.inputBuffer.getChannelData( 0 ),
					e.inputBuffer.getChannelData( 1 )
				]
			} );
		};

		this.configure = function( cfg ) {
			for ( var prop in cfg ) {
				if ( cfg.hasOwnProperty( prop ) ) {
					config[ prop ] = cfg[ prop ];
				}
			}
		};

		this.record = function() {
			recording = true;
		};

		this.stop = function() {
			recording = false;
		};

		this.clear = function() {
			worker.postMessage( {
				command: 'clear'
			} );
		};

		this.getBuffer = function( cb ) {
			currCallback = cb || config.callback;
			worker.postMessage( {
				command: 'getBuffer'
			} );
		};

		this.exportWAV = function( cb, type, metadata ) {
			currCallback = cb || config.callback;
			type = type || config.type || 'audio/wav';
			if ( !currCallback ) throw new Error( 'Callback not set' );
			worker.postMessage( {
				command: 'exportWAV',
				type: type,
				metadata: metadata,
				riffInfoEncoding: 'utf-8'
			} );
		};

		worker.onmessage = function( e ) {
			var blob = e.data;
			currCallback( blob );
		};

		source.connect( this.node );
		this.node.connect( this.context.destination ); //this should not be necessary
	};

	Recorder.forceDownload = function( blob, filename ) {
		var url = ( window.URL || window.webkitURL )
			.createObjectURL( blob );
		var link = window.document.createElement( 'a' );
		link.href = url;
		link.download = filename || 'output.wav';
		var click = document.createEvent( "Event" );
		click.initEvent( 'click', true, true );
		link.dispatchEvent( click );
	};

	window.Recorder = Recorder;

} )( window );
