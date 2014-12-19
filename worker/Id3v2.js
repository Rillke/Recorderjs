/*!
 * Copyright © 2014 Rainer Rillke <lastname>@wikipedia.de
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

/*global self: false, Encoding: false, metaTags: false */
/*jslint vars: false,  white: false */
/*jshint onevar: false, white: false, laxbreak: true */
( function( global ) {
	'use strict';
	/////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////Id3v2////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////
	/**
	 * An Id3v2 tag
	 *
	 *  @class Id3v2
	 *  @param {Object}     metadata   Metadata: Key-value map
	 *                                 C.f. metaTags.js for possible tags
	 *  @constructor
	 */
	global.Id3v2 = function Id3v2( metadata ) {
		this.metadata = metadata;
	};
	global.Id3v2.prototype = {
		constructor: global.Id3v2,

		/**
		 * For the provided total tag size, create the id3v2.3 header
		 *
		 *  @param {number}         size   Size of the full id3v2.3 tag without
		 *                                 its header (= sum of the size of all frames)
		 *  @return {ArrayBuffer}          ArrayBuffer containing the encoded
		 *                                 id3v2.3 header
		 *  @static
		 */
		id3v2Header: function id3v2Header( size ) {
			// "ID3" + version + flags + size
			var buff = new ArrayBuffer( 3 + 2 + 1 + 4 ),
				view = new DataView( buff );

			size = Encoding.id3Size( size );

			// ID3v2/file identifier
			Encoding.writeString( view, 0, 'ID3' );
			// Version (major)
			view.setUint8( 3, 0x03 );
			// Revision number
			view.setUint8( 4, 0x00 );
			// Flags
			view.setUint8( 5, 0x00 );
			// Size
			Encoding.writeString( view, 6, size );
			return buff;
		},

		/**
		 * For the metadata provided to the constructor, create a complete
		 * id3v2.3 tag and invoke the supplied callback when completed
		 *
		 *  @param {Function}         cb   Callback invoked upon completion
		 *                                 of the operation
		 *  @param {ArrayBuffer} cb.data   ArrayBuffer containing formatted
		 *                                 metadata
		 */
		readAsArrayBuffer: function readAsArrayBuffer( cb ) {
			/*jshint forin:false */
			// https://github.com/jshint/jshint/commit/090ec1c69cbf9968fd8fe3b42552d43eb70f2e4d
			var id3v2 = this,
				pending = 0,
				looping = true,
				id3Tag = [],
				tags = id3v2.metadata,
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
				id3Tag.unshift( id3v2.id3v2Header( id3Size ) );
				id3Tag = new Blob( id3Tag );
				Encoding.readBlobAsArrayBuffer( id3Tag, cb );
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
				new global.Id3v2Frame( tagLookup.id3, tagValue.id3Data ).readAsArrayBuffer( done );
			}
			// Support synchroneous callback as well as asynchroneous
			looping = false;
			checkDone();
		}
	};

	/////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////Id3v2Frame/////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////
	/**
	 * An Id3v2 frame
	 *  @class Id3v2Frame
	 *  @param {string}             frameID  Id3v2 frame ID (four characters)
	 *  @param {Object}                data  Valid data for the provided frameID
	 *  @param {string}          data.value  Data
	 *  @param {string}  [data.description]  Short description of the data or in case
	 *                                       of a custom frame, the "key"; note that
	 *                                       whether it's optional or not depends on
	 *                                       the provided frameID
	 *  @param {string}     [data.language]  ISO-639-2 language identifier
	 *  @constructor
	 */
	global.Id3v2Frame = function Id3v2Frame( frameID, data ) {
		/**
		 *  Buffer holding encoded Id3v2 frame
		 *  @private
		 */
		var buff;
		var id3Frame = this;

		/**
		 * Encode a Id3v2 frame from the frameID and frame data provided upon
		 * class construction and invoke the callback when completed
		 *
		 *  @param {Function} cb  Callback invoked upon completion of the
		 *                        operation
		 */
		id3Frame.readAsArrayBuffer = function readAsArrayBuffer( cb ) {
			var reportResult = function() {
				cb( buff );
			};

			if ( buff ) {
				reportResult();
			} else {
				encode( reportResult );
			}
		};

		/**
		 * Calculate the size of the Id3v2 frame and invoke the callback
		 * when completed
		 *
		 *  @param {Function} cb  Callback invoked upon completion of the
		 *                        operation
		 */
		id3Frame.size = function getSize( cb ) {
			var reportSize = function() {
				cb( buff.byteLength );
			};

			if ( buff ) {
				reportSize();
			} else {
				encode( reportResult );
			}
		};

		/**
		 * Return the frameId provided to the constructor
		 *  @return {string}
		 */
		id3Frame.getFrameID = function getFrameID() {
			return frameID;
		};

		/**
		 *  The actual encoding function
		 *  @private
		 */
		var encode = function( cb ) {
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
						frame.push( Encoding.ucs2Encode( data.description || '<unkown_key>' ) );
						frame.push( zeroChar, zeroChar );
					}
					frame.push( Encoding.ucs2Encode( data.value || '<no_value>' ) );
					break;
				case 'W':
					if ( 'WXXX' === frameID ) {
						frame.push( Encoding.ucs2Encode( data.description || '<unkown_key>' ) );
						frame.push( zeroChar, zeroChar );
					}
					frame.push( Encoding.iso8859Encode( data.value || '<no_value>' ) );
					break;
				default:
					/*jshint onecase:false*/
					switch ( frameID ) {
						case 'COMM':
							frame.push( String.fromCharCode( 0x01 ) );
							frame.push( Encoding.iso8859Encode( data.language || 'eng' ) );
							frame.push( Encoding.ucs2Encode( data.description || '<unkown_key>' ) );
							frame.push( zeroChar, zeroChar );
							frame.push( Encoding.ucs2Encode( data.value || '<no_value>' ) );
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
			Encoding.readBlobAsArrayBuffer( frameBlob, function( frameBuff ) {
				view = new DataView( frameBuff );
				// Size = size of frame - header size
				// header size is always 10, according to the spec
				sizeEnc = frameBuff.byteLength - 10;
				// Interestingly, a single frame could be bigger than the
				// whole id3 tag (8 bits per byte used to encode size)
				view.setUint32( 4, sizeEnc, false );
				buff = frameBuff;
				cb( frameBuff );
			} );
		};
	};
}( self ) );