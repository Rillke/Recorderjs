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

/*global self: false, Id3v2: false, Encoding: false, unescape: false, recorderWorkerConfig: false, TextEncoder: false, metaTags: false */
/*jslint vars: false,  white: false */
/*jshint onevar: false, white: false, laxbreak: true */
( function( global ) {
	'use strict';
	/////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////Wave/////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////
	/**
	 * An in-memory wave file (RIFF format), 16 bit PCM encoding
	 *
	 *  @class Wave
	 *  @constructor
	 */
	global.Wave = function Wave() {
		this.chunks = [];
		this.metadata = {};
		this.samples = null;
		this.sampleRate = -1;
	};

	global.Wave.prototype = {
		constructor: global.Wave,

		/**
		 * Calculate and return sum of all chunks sizes, RIFF file headers
		 * not included
		 * 
		 *  @return {number}  Sum of all chunks sizes, not including the
		 *                    RIFF headers
		 */
		getSize: function getSize() {
			var size = 0,
				chunks = this.chunks,
				i, l;

			for ( i = 0, l = chunks.length; i < l; ++i ) {
				size += chunks[i];
			}
			return size;
		},

		/**
		 * Add a chunk. Either add an ArrayBuffer or string containing the
		 * chunk in whole, or, when called with two arguments, assuming that
		 * the first one is the ckID (chunk identifier) and the second one
		 * is the data. In this case, the correct size for the chunk is cal-
		 * culated and inserted into the correct position.
		 *
		 *  @param {ArrayBuffer|string}  [chunk]  Complete chunk
		 *  @param {ArrayBuffer|string}   [ckID]  Chunk identifier
		 *  @param {ArrayBuffer|string} [ckData]  Chunk data
		 *  @chainable
		 */
		addChunk: function addChunk( /* arguments */ ) {
			if ( arguments.length === 1 ) {
				// Assume it's a single block of data
				this.chunks.push( arguments[0] );
			} else if ( arguments.length === 2 ) {
				// Assume ckID and data
				var buffHeaderSize = new ArrayBuffer( 4 ),
					viewHeaderSize = new DataView( buffHeaderSize ),
					ckSize = arguments[1].length || arguments[1].byteLength;

				viewHeaderSize.setUint32( 0, ckSize, true );
				this.chunks.push( arguments[0] );
				this.chunks.push( buffHeaderSize );
				this.chunks.push( arguments[1] );
			}
			return this;
		},

		/**
		 * Set raw audio data, PCM (samples) and a sample rate
		 *
		 *  @param {Float32Array} samples  PCM audio data
		 *  @param {number}    sampleRate  Sample rate of the raw audio data
		 *  @chainable
		 */
		addWaveData: function addWaveData( samples, sampleRate ) {
			this.samples = samples;
			this.sampleRate = sampleRate;
			return this;
		},

		/**
		 * Set metadata
		 *
		 *  @param {Object}     metadata   Metadata: Key-value map
		 *                                 C.f. metaTags.js for possible keys
		 *  @chainable
		 */
		setMetaData: function addMetaData( metadata ) {
			if ( !metadata ) {
				metadata = {
					album: {
						id3Data: {
							value: 'Pronunciation Album'
						}
					},
					userDefinedTextInformationFrame: {
						id3Data: {
							description: 'Description',
							value: 'value'
						}
					}
				};
			}
			if ( !metadata.software ) {
				metadata.software = {
					id3Data: {
						value: recorderWorkerConfig.recorderSoftware
					},
					riffData: recorderWorkerConfig.recorderSoftware
				};
			}
			// TODO: Remove -  does not belong here
			if ( !metadata.title ) {
				metadata.title = {
					id3Data: {
						value: 'Pronunciation Recording'
					}
				};
			}
			if ( !metadata.name ) {
				metadata.name = {
					riffData: 'Pronunciation Recording'
				};
			}
			this.metadata = metadata;
			return this;
		},

		/**
		 * Format metadata previously set with `.setMetaData()` as RIFF INFO chunks
		 * and ID3v2 frames and call the supplied callback when completed
		 *
		 *  @param {Function}          cb  Called as soon as all metadata are
		 *                                 fully encoded
		 *  @param {ArrayBuffer}  cb.data  ArrayBuffer containing formatted
		 *                                 metadata
		 *  @chainable
		 */
		formatMetadata: function formatMetadata( cb ) {
			var k, riffInfoChunks = [],
				metadata = this.metadata,
				metadataChunks;

			for ( k in metaTags ) {
				if ( metaTags.hasOwnProperty( k ) && k in metadata ) {
					if ( !metaTags[ k ].riff ) {
						if ( global.console ) {
							global.console.warn( 'riff: Unknown tag "' + k + '".' +
								'Note that RIFF only supports a very narrow set of info tags.' );
						}
						continue;
					}
					riffInfoChunks.push(
						infoChunkItem( metaTags[ k ], metadata[ k ].riffData || '<no_value>' )
					);
				}
			}
			// Push info chunk header
			riffInfoChunks.unshift( infoChunkHeader( riffInfoChunks ) );

			id3RiffChunk( metadata, function( id3v2Chunk ) {
				// Just to make clear we've now a a non-riff chunk inside
				metadataChunks = riffInfoChunks;
				metadataChunks.push( id3v2Chunk );
				metadataChunks = new Blob( metadataChunks );

				Encoding.readBlobAsArrayBuffer( metadataChunks, cb );
			} );
			return this;
		},

		/**
		 * Given raw audio data, PCM (samples), a sample rate, metadata,
		 * and optionally extra chunks, set through this object's methods
		 * create a Wave file (RIFF) in memory call the supplied callback
		 * with a DataView on the the encoded data.
		 *
		 *  @param {Function}          cb  Callback that is called as soon as
		 *                                 the Wave file is fully encoded
		 *  @param {DataView}     cb.data  DataView showing encoded wave data
		 *  @chainable
		 */
		readAsArrayBuffer: function readAsArrayBuffer( cb ) {
			var wave = this,
				samples = wave.samples,
				sampleRate = wave.sampleRate,
				extraChunkSize = wave.getSize();

			wave.formatMetadata( function( metaBuff ) {
				var buffLen = 44 + samples.length * 2;
				var buffer = new ArrayBuffer( buffLen + metaBuff.byteLength + extraChunkSize );
				var view = new DataView( buffer );
				var extraChunksBlob = new Blob( wave.chunks );

				/* RIFF identifier */
				Encoding.writeString( view, 0, 'RIFF' );
				/* RIFF chunk length */
				view.setUint32( 4, 36 + samples.length * 2 + metaBuff.byteLength + extraChunkSize, true );
				/* RIFF type */
				Encoding.writeString( view, 8, 'WAVE' );
				/* format chunk identifier */
				Encoding.writeString( view, 12, 'fmt ' );
				/* format chunk length */
				view.setUint32( 16, 16, true );
				/* sample format (raw) */
				view.setUint16( 20, 1, true );
				/* channel count */
				view.setUint16( 22, 2, true );
				/* sample rate */
				view.setUint32( 24, sampleRate, true );
				/* byte rate (sample rate * block align) */
				view.setUint32( 28, sampleRate * 4, true );
				/* block align (channel count * bytes per sample) */
				view.setUint16( 32, 4, true );
				/* bits per sample */
				view.setUint16( 34, 16, true );
				/* data chunk identifier */
				Encoding.writeString( view, 36, 'data' );
				/* data chunk length */
				view.setUint32( 40, samples.length * 2, true );

				Encoding.floatTo16BitPCM( view, 44, samples );

				Encoding.readBlobAsArrayBuffer( extraChunksBlob, function( extraChunkBuff ) {
					Encoding.copyBufferToBuffer( metaBuff, buffer, buffLen );
					Encoding.copyBufferToBuffer( extraChunkBuff, buffer, buffLen + metaBuff.byteLength );
					cb( view );
				} );
			} );

			return wave;
		}
	};

	/**
	 * For the provided metadata, create a complete id3v2.3 tag enclosed in
	 * a RIFF chunk and invoke the supplied callback when completed
	 *
	 *  @param {Object}     metadata   Metadata: Key-value map
	 *                                 C.f. metaTags.js for possible keys
	 *  @param {Function}         cb   Callback invoked upon completion
	 *                                 of the operation
	 *  @param {ArrayBuffer} cb.data   ArrayBuffer containing formatted
	 *                                 metadata
	 *  @private
	 */
	function id3RiffChunk( metadata, cb ) {
		// Chunk types that are used only in a certain form type use
		// a lowercase chunk ID.
		var ckId = 'id3 ',
			// A 32-bit unsigned value identifying the size of ckData.
			// This size value does not include the size of the ckID or
			// ckSize fields or the pad byte at the end of ckData
			ckSize = 0,
			ckData = null;

		new Id3v2( metadata ).readAsArrayBuffer( function( data ) {
			ckSize = data.byteLength,
				ckData = data;

			var buffHeader = new ArrayBuffer( 8 ),
				viewHeader = new DataView( buffHeader ),
				id3Chunk;

			Encoding.writeString( viewHeader, 0, ckId );
			viewHeader.setUint32( 4, ckSize, true );
			id3Chunk = new Blob( [ buffHeader, ckData ] );
			Encoding.readBlobAsArrayBuffer( id3Chunk, cb );
		} );
	}

	/**
	 * Creates and returns the RIFF LIST INFO header
	 *
	 *  @param {ArrayBuffer[]} infoChunkItems  Array containing the full LIST INFO
	 *                                         contents stored in ArrayBuffers
	 *  @return {ArrayBuffer}                  ArrayBuffer containing the RIFF LIST
	 *                                         INFO header
	 *  @private
	 */
	function infoChunkHeader( infoChunkItems ) {
		var size = 0,
			buff = new ArrayBuffer( 12 ),
			view = new DataView( buff ),
			i;

		for ( i = 0; i < infoChunkItems.length; ++i ) {
			size += infoChunkItems[ i ].byteLength;
		}

		Encoding.writeString( view, 0, 'LIST' );
		view.setUint32( 4, size + 4, true );
		Encoding.writeString( view, 8, 'INFO' );

		return buff;
	}

	/**
	 * Create and return a RIFF LIST INFO chunk item (which is itself a chunk)
	 *
	 *  @param {Object}      metaTag   Object containing the meta tags's name
	 *                                 in RIFF notation (aka ckID)
	 *  @param {string} metaTag.riff   CkID of the tag to encode
	 *  @param {string}   chunkValue   String holding the tag's (chunk's)
	 *                                 value
	 *  @return {ArrayBuffer}          ArrayBuffer containing the RIFF LIST
	 *                                 INFO chunk item
	 *  @private
	 */
	function infoChunkItem( metaTag, chunkValue ) {
		var buff = encodeRiffZstrChunk( chunkValue ),
			view = new DataView( buff );

		Encoding.writeString( view, 0, metaTag.riff );
		return buff;
	}

	/**
	 * Create a chunk with correct size set, its value encoded as zString
	 * (string with no size but terminating null character) and padding but
	 * without ckID, however with 4 bytes space for it reserved in the
	 * beginning of the buffer returned
	 *
	 *  To quote from taglib:
	 *  "RIFF Info tag has no clear definitions about character encodings.
	 *   In practice, local encoding of each system is largely used and UTF-8 is
	 *   popular too."
	 *  There is a CSET (Character Set) chunk but it's probably not broadly
	 *  understood by software and is a little complex.
	 *  So the decision is up to the user of this wonderful library.
	 *
	 *  @param {String}    domString   Chunk data (value)
	 *  @return {ArrayBuffer}          Chunk with size set, data encoded as
	 *                                 zString and padding and 4 null bytes
	 *                                 reserved for the ckID at the start
	 *  @private
	 */
	function encodeRiffZstrChunk( domString ) {
		var len = 0,
			view, buffer, cc, i, l;

		// 4 bytes ckID, 4 reserved for size, value, terminating null char, [padding]
		domString = '\0\0\0\0\0\0\0\0' + domString + '\0\0';

		// There is a polyfill TextEncoder library included
		// but for licensing issues, one might not have it included
		if ( global.TextEncoder && recorderWorkerConfig.riffInfoEncoding !== 'ascii' ) {
			var uint8array = new TextEncoder( recorderWorkerConfig.riffInfoEncoding || 'utf-8' )
				.encode( domString );
			buffer = uint8array.buffer;
		} else {
			if ( recorderWorkerConfig.riffInfoEncoding === 'ascii' ) {
				buffer = new ArrayBuffer( domString.length );
				view = new DataView( buffer );

				for ( i = 0, l = domString.length; i < l; ++i ) {
					cc = domString.charCodeAt( i );

					if ( cc <= 0x7F ) {
						view.setUint8( i, cc );
					} else {
						// There is nothing we can do for ASCII chars without
						// a transcription library mapping those characters
						// to similar latin characters.
						// So add a question mark for now.
						view.setUint8( i, 63 );
					}
				}
			} else {
				// ASCII with no choice
				try {
					domString = unescape( encodeURIComponent( domString ) );
				} catch ( unescapeNotSupported ) {}
				buffer = new ArrayBuffer( domString.length );
				view = new DataView( buffer );

				for ( i = 0, l = domString.length; i < l; ++i ) {
					cc = domString.charCodeAt( i );
					view.setUint8( i, cc );
				}
			}
		}

		// Padding to even-sized buffer
		len = buffer.byteLength;
		if ( len % 2 ) buffer = buffer.slice( 0, --len );

		// Finally pre-fix the size in Little Endian ("Intel Integer Format")
		// There is no single "endian" in the whole RIFF spec :)
		view = new DataView( buffer );
		// "This size value does not include the size of the ckID or ckSize
		// fields or the pad byte at the end of ckData
		// Audacity includes the padding byte when calculating the size so
		// we'll do the same here
		view.setUint32( 4, len - 8, true );

		return buffer;
	}
}( self ) );