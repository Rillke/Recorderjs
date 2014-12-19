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

/*global self: false, TextEncoder: false, FileReaderSync: false, unescape: false */
/*jslint vars: false,  white: false */
/*jshint onevar: false, white: false, laxbreak: true */
( function( global ) {
	'use strict';

	/**
	 * Encoding utitlites
	 *  @class Encoding
	 *  @singleton
	 */
	global.Encoding = {

		/**
		 * Read a Blob as ArrayBuffer and invoke the supplied callback when completed
		 *
		 *  @param {Blob}           blob  Blob to be read
		 *  @param {Function}         cb  Callback invoked upon completion of the
		 *                                operation
		 *  @param {ArrayBuffer} cb.data  ArrayBuffer containing a copy of the Blob data
		 */
		readBlobAsArrayBuffer: function readBlobAsArrayBuffer( blob, cb ) {
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
		},

		/**
		 * Copy values from a Float32Array into a buffer presented by a DataView
		 * in 16 bit linear pulse-code modulation (PCM)
		 *
		 *  @param {DataView}        output  DataView on a buffer the values will be
		 *                                   copied to
		 *  @param {number}          offset  Byte position at the target buffer at
		 *                                   which to start copying from input
		 *  @param {Float32Array}     input  Typed array typically containing values
		 *                                   between -1 and 1; everything greater will
		 *                                   be chopped off
		 */
		floatTo16BitPCM: function floatTo16BitPCM( output, offset, input ) {
			for ( var i = 0; i < input.length; i++, offset += 2 ) {
				var s = Math.max( -1, Math.min( 1, input[ i ] ) );
				output.setInt16( offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true );
			}
		},

		/**
		 * Copy a source buffer to a target (destination) buffer
		 *
		 *  @param {ArrayBuffer}  bufferSrc  Source buffer
		 *  @param {ArrayBuffer} bufferDest  Target buffer
		 *  @param {number}          offset  Offset in the target buffer where writing
		 *                                   data from source buffer should start from
		 */
		copyBufferToBuffer: function copyBufferToBuffer( bufferSrc, bufferDest, offset ) {
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
		},

		/**
		 * Write a string into a buffer
		 *
		 *  @param {DataView}     view  Size to be encoded
		 *  @param {number}     offset  Offset in the view where string writing
		 *                              should start
		 *  @param {string}     string  String to be written
		 */
		writeString: function writeString( view, offset, string ) {
			for ( var i = 0; i < string.length; i++ ) {
				view.setUint8( offset + i, string.charCodeAt( i ) );
			}
		},

		/**
		 * Convert a number into its 7 bit representation
		 *
		 * From the [ID3 spec](http://id3.org/id3v2.3.0)
		 * "where the most significant bit (bit 7) is set to zero in every byte,
		 *  making a total of 28 bits"
		 *
		 *  @param {number}       size  Size to be encoded
		 *  @return {string}            Seven bit per byte encoded size
		 */
		id3Size: function id3Size( size ) {
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
		},

		/**
		 * Copy a string into a buffer and prepend a byte-order-marker.
		 * Warning:
		 * May result in wrong results if a code point advances the Basic Multilingual
		 * Plane.
		 *
		 * "All Unicode strings use 16-bit unicode 2.0 (ISO/IEC 10646-1:1993, UCS-2).
		 *  Unicode strings must begin with the Unicode BOM ($FF FE or $FE FF)
		 *  to identify the byte order."
		 *
		 *  @param {string}       domString  String to be encoded
		 *  @return {ArrayBuffer}            Buffer containing the encoded data
		 */
		ucs2Encode: function ucs2Encode( domString ) {
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
		},

		/**
		 * Replace characters whose char code advances the 256 (8 bit) range - 1 with
		 * a question mark.
		 * Merely a sanitizer to avoid "strange looking characters" or misinformation.
		 * Warning:
		 * This is not a proper encoder. There are glyphs consisting of multiple bytes
		 * that should be properly encoded as a single question mark
		 *
		 *  @param {string}       domString  String to be encoded
		 *  @return {ArrayBuffer}            Buffer containing the encoded data
		 */
		iso8859Encode: function iso8859Encode( domString ) {
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
	};
}( self ) );