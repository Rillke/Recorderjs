QUnit.module( 'General' );

QUnit.test( 'Basic health tests', 1, function ( assert ) {
	var metadata = {
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

	assert.strictEqual( formatMetadata( metadata, function(){} ), undefined, 'formatMetadata should not return anything' );
} );