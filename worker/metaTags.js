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

self.metaTags = {
	album: {
		id3: 'TALB'
	},
	archivalLocation: {
		riff: 'IARL'
	},
	artist: {
		riff: 'IART',
		id3: 'TPE1'
	},
	attachedPicture: {
		id3: 'APIC'
	},
	audioEncryption: {
		id3: 'AENC'
	},
	band: {
		id3: 'TPE2'
	},
	bpm: {
		id3: 'TBPM'
	},
	commissioned: {
		riff: 'ICMS'
	},
	comments: {
		// If the comment is several sentences long,
		// end each sentence with a period.
		riff: 'ICMT',
		riffValidation: /^[^\n]*$/,
		id3: 'COMM'
	},
	commercialFrame: {
		id3: 'COMR'
	},
	commercialInformation: {
		id3: 'WCOM'
	},
	composer: {
		id3: 'TCOM'
	},
	conductor: {
		id3: 'TPE3'
	},
	contentGroupDescription: {
		id3: 'TIT1'
	},
	copyright: {
		// If there are multiple copyrights,
		// separate them by a semicolon followed by a space.
		riff: 'ICOP',
		id3: 'TCOP'
	},
	copyrightInformation: {
		id3: 'WCOP'
	},
	creationDate: {
		// For example, “1553-05-03” for May 3, 1553
		riff: 'ICRD',
		riffValidation: /^\d{4}(?:\-\d{2}(?:\-{2})?)?$/
	},
	cropped: {
		riff: 'ICRP'
	},
	date: {
		id3: 'TDAT'
	},
	dimensions: {
		riff: 'IDIM'
	},
	dotsPerInch: {
		riff: 'IDPI',
		riffValidation: /^\d+$/
	},
	encodedBy: {
		id3: 'TENC'
	},
	encryptionMethodRegistration: {
		id3: 'ENCR'
	},
	engineer: {
		riff: 'IENG'
	},
	equalization: {
		id3: 'EQUA'
	},
	eventTimeCodes: {
		id3: 'ETCO'
	},
	fileType: {
		id3: 'TFLT'
	},
	generalEncapsulatedObject: {
		id3: 'GEOB'
	},
	genre: {
		riff: 'IGNR',
		id3: 'TCON'
	},
	groupIdentificationRegistration: {
		id3: 'GRID'
	},
	initialKey: {
		id3: 'TKEY'
	},
	internationalStandardRecordingCode: {
		id3: 'TSRC'
	},
	internetRadioStationName: {
		id3: 'TRSN'
	},
	internetRadioStationOwner: {
		id3: 'TRSO'
	},
	interpretedRemix: {
		id3: 'TPE4'
	},
	involvedPeopleList: {
		id3: 'IPLS'
	},
	keywords: {
		// Separate multiple keywords with a semicolon and a blank
		riff: 'IKEY'
	},
	languages: {
		id3: 'TLAN'
	},
	length: {
		id3: 'TLEN'
	},
	lightness: {
		riff: 'ILGT'
	},
	linkedInformation: {
		id3: 'LINK'
	},
	lyricist: {
		id3: 'TEXT'
	},
	mediaType: {
		id3: 'TMED'
	},
	medium: {
		riff: 'IMED'
	},
	musicCDIdentifyer: {
		id3: 'MCDI'
	},
	mpegLocationLookupTable: {
		id3: 'MLLT'
	},
	name: {
		riff: 'INAM'
	},
	officialArtistWebpage: {
		id3: 'WOAR'
	},
	officialAudioFileWebpage: {
		id3: 'WOAF'
	},
	officialAudioSourceWebpage: {
		id3: 'WOAS'
	},
	officialInternetRadioStationHomepage: {
		id3: 'WORS'
	},
	originalAlbum: {
		id3: 'TOAL'
	},
	originalArtist: {
		id3: 'TOPE'
	},
	originalFilename: {
		id3: 'TOFN'
	},
	originalLyricist: {
		id3: 'TOLY'
	},
	originalReleaseYear: {
		id3: 'TORY'
	},
	ownershipFrame: {
		id3: 'OWNE'
	},
	paletteSetting: {
		// number of colors requested when digitizing an image
		riff: 'IPLT',
		riffValidation: /^\d+$/
	},
	partOfSet: {
		id3: 'TPOS'
	},
	payment: {
		id3: 'WPAY'
	},
	popularimeter: {
		id3: 'POPM'
	},
	positionSynchronizationFrame: {
		id3: 'POSS'
	},
	publishersOfficialWebpage: {
		id3: 'WPUB'
	},
	playCounter: {
		id3: 'PCNT'
	},
	playlistDelay: {
		id3: 'TDLY'
	},
	privateFrame: {
		id3: 'PRIV'
	},
	product: {
		riff: 'IPRD'
	},
	publisher: {
		id3: 'TPUB'
	},
	recommendedBufferSize: {
		id3: 'RBUF'
	},
	recordingDates: {
		id3: 'TRDA'
	},
	relativeVolumeAdjustment: {
		id3: 'RVAD'
	},
	reverb: {
		id3: 'RVRB'
	},
	subject: {
		riff: 'ISBJ'
	},
	software: {
		riff: 'ISFT',
		// Software Hardware and settings used for encoding
		id3: 'TSSE'
	},
	sharpness: {
		riff: 'ISHP'
	},
	size: {
		id3: 'TSIZ'
	},
	source: {
		riff: 'ISRC'
	},
	sourceForm: {
		riff: 'ISRF'
	},
	subtitle: {
		id3: 'TIT3'
	},
	synchronizedLyricText: {
		id3: 'SYLT'
	},
	synchronizedTempoCode: {
		id3: 'SYTC'
	},
	technician: {
		// Identifies the technician who
		// digitized the subject file
		riff: 'ITCH'
	},
	termsOfUse: {
		id3: 'USER'
	},
	time: {
		id3: 'TIME'
	},
	title: {
		id3: 'TIT2'
	},
	town: {
		id3: 'TOWN'
	},
	trackNumber: {
		// written by Audacity. Official reference?
		riff: 'ITRK',
		id3: 'TRCK'
	},
	uniqueFileIdentifyer: {
		id3: 'UFID'
	},
	unsynchronizeLyricTextTranscription: {
		id3: 'USLT'
	},
	userDefinedTextInformationFrame: {
		id3: 'TXXX'
	},
	userDefinedUrlLinkFrame: {
		id3: 'WXXX'
	},
	year: {
		id3: 'TYER'
	}
};
