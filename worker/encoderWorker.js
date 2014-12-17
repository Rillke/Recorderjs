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

/*global self: false, TextEncoder: false, unescape: false */
/*jslint vars: false,  white: false */
/*jshint onevar: false, white: false */
( function( global, metaTags, recorderWorkerConfig ) {
	'use strict';

	function readBlobAsArrayBuffer( blob, cb ) {
		var frs, fr;

		if ( global.FileReaderSync ) {
			frs = new FileReaderSync();
			cb( frs.readAsArrayBuffer( blob ) );
			return;
		}

		fr = new FileReader();
		fr.addEventListener( 'loadend', function() {
			cb( fr.result );
		} );
		fr.readAsArrayBuffer( blob );
	}

	function floatTo16BitPCM( output, offset, input ) {
		for ( var i = 0; i < input.length; i++, offset += 2 ) {
			var s = Math.max( -1, Math.min( 1, input[ i ] ) );
			output.setInt16( offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true );
		}
	}

	function copyBufferToBuffer( bufferSrc, bufferDest, offset ) {
		offset = offset || 0;
		var ui8aSrc = new Uint8Array( bufferSrc ),
			ui8aDst = new Uint8Array( bufferDest ),
			lenSrc = bufferSrc.byteLength,
			lenDst = bufferDest.byteLength;

		if ( lenSrc + offset > lenDst ) {
			throw new Error( 'Cannot copy source buffer to destination '
				+ 'because destination buffer is too small.' );
		}
		for ( var iSrc = 0, iDest = offset; iSrc < lenSrc; ++iSrc, ++iDest ) {
			ui8aDst[ iDest ] = ui8aSrc[ iSrc ];
		}
	}

	function writeString( view, offset, string ) {
		for ( var i = 0; i < string.length; i++ ) {
			view.setUint8( offset + i, string.charCodeAt( i ) );
		}
	}

	/**
	 *  From the [ID3 spec](http://id3.org/id3v2.3.0)
	 *  "where the most significant bit (bit 7) is set to zero in every byte,
	 *  making a total of 28 bits"
	 */
	function encodeID3Size( size ) {
		var sizeEnc = '';
		if ( size >= 0x10000000 ) {
			throw new Error( 'ID3 header size overflow' );
		}
		while ( size ) {
			sizeEnc = String.fromCharCode( size % 0x80 ) + sizeEnc;
			size = Math.floor( size / 0x80 );
		}
		while ( sizeEnc.length < 4 ) {
			sizeEnc = String.fromCharCode( 0x00 ) + sizeEnc;
		}
		return sizeEnc;
	}

	/**
	 *  "All Unicode strings use 16-bit unicode 2.0
	 *  (ISO/IEC 10646-1:1993, UCS-2).
	 *  Unicode strings must begin with the Unicode BOM ($FF FE or $FE FF)
	 *  to identify the byte order."
	 */
	function ucs2Encode( domString ) {
		var len = domString.length,
			buffer = new ArrayBuffer( len * 2 + 2 ),
			buffUint16 = new Uint16Array( buffer ),
			i;

		// BOM (Byte order marker)
		buffUint16[ 0 ] = 0xFEFF;
		for ( i = 0; i < len; i++ ) {
			buffUint16[ i + 1 ] = domString.charCodeAt( i );
		}
		return buffer;
	}

	/**
	 *  This is not a proper encoder, yet. There are glyphs consisting of
	 *  multiple bytes that should be properly encoded as a single question mark
	 */
	function iso8859Encode( domString ) {
		var len = domString.length,
			buffer = new ArrayBuffer( len ),
			buffUint8 = new Uint8Array( buffer ),
			i, cc;

		for ( i = 0; i < len; ++i ) {
			cc = domString.charCodeAt( i );

			if ( cc <= 0xFF ) {
				buffUint8[ i ] = cc;
			} else {
				// Question mark
				buffUint8[ i ] = 63;
			}
		}

		return buffer;
	}

	/**
	 *  Asynchroneously encodes a ID3 frame
	 */
	function encodeID3Frame( frameID, data, cb ) {
		var size = new ArrayBuffer( 4 ),
			flags = new ArrayBuffer( 2 ),
			frame = [ frameID, size, flags ],
			firstLetter = frameID.charAt( 0 ),
			zeroChar = String.fromCharCode( 0x00 );

		switch ( firstLetter ) {
			case 'T':
				// Indicate UCS-2 (0x00 hints ISO-8859-1)
				// Since size of this little tags does not matter,
				// always use UCS-2
				// "Frames that allow different types of text encoding
				// have a text encoding description byte directly after
				// the frame size." - http://id3.org/id3v2.3.0#Declared_ID3v2_frames
				// Well, either all programs do it wrongly or the spec
				// is confusing here.
				frame.push( String.fromCharCode( 0x01 ) );
				// Exception for User defined text information frame
				if ( 'TXXX' === frameID ) {
					frame.push( ucs2Encode( data.description || '<unkown_key>' ) );
					frame.push( zeroChar, zeroChar );
				}
				frame.push( ucs2Encode( data.value || '<no_value>' ) );
				break;
			case 'W':
				if ( 'WXXX' === frameID ) {
					frame.push( ucs2Encode( data.description || '<unkown_key>' ) );
					frame.push( zeroChar, zeroChar );
				}
				frame.push( iso8859Encode( data.value || '<no_value>' ) );
				break;
			default:
				/*jshint onecase:false*/
				switch ( frameID ) {
					case 'COMM':
						frame.push( String.fromCharCode( 0x01 ) );
						frame.push( iso8859Encode( data.language || 'eng' ) );
						frame.push( ucs2Encode( data.description || '<unkown_key>' ) );
						frame.push( zeroChar, zeroChar );
						frame.push( ucs2Encode( data.value || '<no_value>' ) );
						break;
					default:
						throw new Error( 'id3v2: The frameID ' + frameID
							+ ' has not been implemented, yet.' );
				}
				/*jshint onecase:true*/
				break;
		}
		// Finally, calculate and set the size of that construct
		// First, create a blob
		var frameBlob = new Blob( frame ),
			view, sizeEnc;

		// Then read out the blob into an ArrayBuffer
		readBlobAsArrayBuffer( frameBlob, function( frameBuff ) {
			view = new DataView( frameBuff );
			// Size = size of frame - header size
			// header size is always 10, according to the spec
			sizeEnc = frameBuff.byteLength - 10;
			// Funnily, a single frame could be bigger than the
			// whole id3 tag (8 bits per byte used to encode size)
			view.setUint32( 4, sizeEnc, false );
			cb( frameBuff );
		} );
	}

	function id3v2Header( size ) {
		// "ID3" + version + flags + size
		var buff = new ArrayBuffer( 3 + 2 + 1 + 4 ),
			view = new DataView( buff );

		size = encodeID3Size( size );

		// ID3v2/file identifier
		writeString( view, 0, 'ID3' );
		// Version (major)
		view.setUint8( 3, 0x03 );
		// Revision number
		view.setUint8( 4, 0x00 );
		// Flags
		view.setUint8( 5, 0x00 );
		// Size
		writeString( view, 6, size );
		return buff;
	}

	function id3v2Tag( tags, cb ) {
		/*jshint forin:false */
		// https://github.com/jshint/jshint/commit/090ec1c69cbf9968fd8fe3b42552d43eb70f2e4d
		var pending = 0,
			looping = true,
			id3Tag = [],
			done, checkDone, tagName, tagValue, tagLookup;

		done = function( buffer ) {
			pending--;
			id3Tag.push( buffer );
			checkDone();
		};

		checkDone = function() {
			var id3Size = 0,
				idx;

			if ( pending !== 0 || looping ) return;

			for ( idx = 0; idx < id3Tag.length; ++idx ) {
				id3Size += id3Tag[ idx ].byteLength;
			}

			// Prepend the header
			id3Tag.unshift( id3v2Header( id3Size ) );
			id3Tag = new Blob( id3Tag );
			readBlobAsArrayBuffer( id3Tag, cb );
		};

		for ( tagName in tags ) {
			if ( !tags.hasOwnProperty( tagName ) ) {
				continue;
			}
			tagLookup = metaTags[ tagName ];
			tagValue = tags[ tagName ];
			// If there is no such tag, simply skip
			if ( !tagLookup || !tagLookup.id3 ) {
				if ( global.console ) {
					global.console.warn( 'id3v2: Unknown tag "' + tagName + '".' +
						'Note that X, Y, and Z tags haven\'t been implemented, yet.' );
				}
				continue;
			}
			pending++;
			encodeID3Frame( tagLookup.id3, tagValue.id3Data, done );
		}
		// Support synchroneous callback as well as asynchroneous
		looping = false;
		checkDone();
	}

	function id3RiffChunk( tags, cb ) {
		// Chunk types that are used only in a certain form type use
		// a lowercase chunk ID.
		var ckId = 'id3 ',
			// A 32-bit unsigned value identifying the size of ckData.
			// This size value does not include the size of the ckID or
			// ckSize fields or the pad byte at the end of ckData
			ckSize = 0,
			ckData = null;

		id3v2Tag( tags, function( data ) {
			ckSize = data.byteLength,
				ckData = data;

			var buffHeader = new ArrayBuffer( 8 ),
				viewHeader = new DataView( buffHeader ),
				id3Chunk;

			writeString( viewHeader, 0, ckId );
			viewHeader.setUint32( 4, ckSize, true );
			id3Chunk = new Blob( [ buffHeader, ckData ] );
			readBlobAsArrayBuffer( id3Chunk, cb );
		} );
	}

	/**
	 *  To quote from taglib:
	 *   RIFF Info tag has no clear definitions about character encodings.
	 *   In practice, local encoding of each system is largely used and UTF-8 is
	 *   popular too.
	 *  Well, there is a CSET (Character Set) Chunk but I doubt this is widely
	 *  understood by software and is a little complex.
	 *  So we let the decision up to the user.
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

	/**
	 *  A single chunk within the info list chunk
	 */
	function infoChunkItem( metaTag, metadataValue ) {
		var buff = encodeRiffZstrChunk( metadataValue ),
			view = new DataView( buff );

		writeString( view, 0, metaTag.riff );
		return buff;
	}

	function infoChunkHeader( infoChunkItems ) {
		var size = 0,
			buff = new ArrayBuffer( 12 ),
			view = new DataView( buff ),
			i;

		for ( i = 0; i < infoChunkItems.length; ++i ) {
			size += infoChunkItems[ i ].byteLength;
		}

		writeString( view, 0, 'LIST' );
		view.setUint32( 4, size + 4, true );
		writeString( view, 8, 'INFO' );

		return buff;
	}

	/**
	 * Given a Key-value map (aka hash), format metadata as
	 * RIFF INFO chunks and ID3v2 tags
	 *
	 *  @param {Object}      metadata  Metadata: Key-value map
	 *                                 C.f. metaTags.js for possible tags
	 *  @param {Function}          cb  Called as soon as all metadata are
	 *                                 fully encoded
	 *  @param {ArrayBuffer}  cb.data  ArrayBuffer containing formatted
	 *                                 metadata
	 *  @private
	 */
	function formatMetadata( metadata, cb ) {
		var k, riffInfoChunks = [],
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

			readBlobAsArrayBuffer( metadataChunks, cb );
		} );
	}

	/**
	 * Given raw audio data, PCM (samples), a sample rate and metadata,
	 * create a Wave file (RIFF) and call the supplied callback with
	 * a DataView on the the encoded data.
	 *
	 *  @param {Float32Array} samples  Raw audio data
	 *  @param {number}    sampleRate  Sample rate of the raw audio data
	 *  @param {Object}      metadata  Metadata: Key-value map
	 *                                 C.f. metaTags.js for possible tags
	 *  @param {Function}          cb  Callback that is called as soon as
	 *                                 the Wave file is fully encoded
	 *  @param {DataView}     cb.data  DataView showing encoded wave data
	 */
	global.encodeWAV = function( samples, sampleRate, metadata, cb ) {
		var recorderSoftware = 'Wikimedia Pronunciation Recording Gadget '
			//+ 'https://github.com/Rillke/Recorderjs https://rillke.com/';

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
					value: recorderSoftware
				},
				riffData: recorderSoftware
			};
		}
		// TODO: Remove -  does not belong here
		if ( !metadata.title ) {
			metadata.title = {
				id3Data: {
					value: 'Pronunciation Recording'
				}
			}
		}
		if ( !metadata.name ) {
			metadata.name = {
				riffData: 'Pronunciation Recording'
			}
		}

		formatMetadata( metadata, function( metaBuff ) {
			var buffLen = 44 + samples.length * 2;
			var buffer = new ArrayBuffer( buffLen + metaBuff.byteLength );
			var view = new DataView( buffer );

			/* RIFF identifier */
			writeString( view, 0, 'RIFF' );
			/* RIFF chunk length */
			view.setUint32( 4, 36 + samples.length * 2 + metaBuff.byteLength, true );
			/* RIFF type */
			writeString( view, 8, 'WAVE' );
			/* format chunk identifier */
			writeString( view, 12, 'fmt ' );
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
			writeString( view, 36, 'data' );
			/* data chunk length */
			view.setUint32( 40, samples.length * 2, true );

			floatTo16BitPCM( view, 44, samples );

			copyBufferToBuffer( metaBuff, buffer, buffLen );

			cb( view );
		} );
	};
}( self, self.metaTags, self.recorderWorkerConfig ) );
