'use strict'

const Ajv = require('ajv')
const {doesNotThrow, throws} = require('assert')

const schema = {
	'$schema': 'http://json-schema.org/schema#',
	'$ref': '#/$defs/Itinerary',
	'$defs': {
		Itinerary: {
			title: 'OTP2 Itinerary',
			type: 'object',
			required: ['legs'],
			properties: {
				legs: {
					type: 'array',
					minItems: 1,
					items: {'$ref': '#/$defs/Leg'},
				},
			},
		},
		Leg: {
			anyOf: [
				{'$ref': '#/$defs/TransitLeg'},
				{'$ref': '#/$defs/BasicLeg'},
			],
		},
		TransitLeg: {
			allOf: [
				{'$ref': '#/$defs/BasicLeg'},
				{
					required: [
						'transitLeg',
						'route', 'trip',
					],
					properties: {
						transitLeg: {const: true},
						route: {'$ref': '#/$defs/Route'},
						trip: {'$ref': '#/$defs/Trip'},
						from: {'$ref': '#/$defs/TransitLegPlace'},
						to: {'$ref': '#/$defs/TransitLegPlace'},
					},
				},
			],
		},
		BasicLeg: {
			type: 'object',
			required: [
				'mode', 'transitLeg',
				'from', 'startTime',
				'to', 'endTime',
			],
			properties: {
				mode: {type: 'string', minLength: 1},
				transitLeg: {type: 'boolean'},
				from: {'$ref': '#/$defs/Place'},
				startTime: {type: 'integer', exclusiveMinimum: 0},
				to: {'$ref': '#/$defs/Place'},
				endTime: {type: 'integer', exclusiveMinimum: 0},
			},
		},
		Route: {
			type: 'object',
			required: [
				'shortName',
				'longName',
				'gtfsId',
			],
			properties: {
				shortName: {type: 'string', minLength: 1},
				longName: {type: 'string', minLength: 1},
				gtfsId: {type: 'string', minLength: 1},
			},
		},
		Trip: {
			type: 'object',
			required: [
				'gtfsId',
				'tripHeadsign',
				'stoptimes',
			],
			properties: {
				gtfsId: {type: 'string', minLength: 1},
				tripHeadsign: {type: 'string', minLength: 1},
				stoptimes: {
					type: 'array',
					minItems: 2,
					items: {'$ref': '#/$defs/StopTime'},
				},
			},
		},
		StopTime: {
			type: 'object',
			required: [
				'stop',
			],
			properties: {
				stop: {'$ref': '#/$defs/Stop'},
			},
		},
		Stop: {
			type: 'object',
			required: [
				'gtfsId',
			],
			properties: {
				gtfsId: {type: 'string', minLength: 1},
				name: {type: 'string', minLength: 1},
			},
		},
		Place: {
			type: 'object',
			properties: {
				stop: {
					oneOf: [
						{'$ref': '#/$defs/Stop'},
						{type: 'null'},
					],
				},
			},
		},
		TransitLegPlace: {
			oneOf: [
				{'$ref': '#/$defs/Stop'},
				{required: ['stop']},
			],
		},
	},
}

const ajv = new Ajv({
	// allErrors: true,
})
const validate = ajv.compile(schema)

const validateOtpItinerary = (itinerary) => {
	const valid = validate(itinerary)
	if (!valid) {
		const err = new Error('invalid OTP itinerary')
		err.itinerary = itinerary
		err.validationErrors = validate.errors
		throw err
	}
}

const it1 = {
	legs: [{
		mode: 'WALK',
		from: {
			lat: 48.6059715,
			lon: 8.8583072,
			name: 'Affstätt,  Herrenberg',
			vertexType: 'NORMAL',
			stop: null,
		},
		to: {
			lat: 48.604809,
			lon: 8.859924,
			name: 'Affstätt Nelkenstr.',
			vertexType: 'TRANSIT',
			stop: {
				gtfsId: '1:de:08115:4854:0:3',
				platformCode: null,
			},
		},
		intermediatePlaces: null,
		realTime: false,
		realtimeState: null,
		transitLeg: false,
		startTime: 1619515712000,
		endTime: 1619515920000,
		interlineWithPreviousLeg: false,
		route: null,
		trip: null,
	}, {
		mode: 'BUS',
		agency: {
			name: 'VVS',
			url: 'http://www.vvs.de',
			fareUrl: null,
			id: 'QWdlbmN5OjE6MQ',
		},
		from: {
			lat: 48.604809,
			lon: 8.859924,
			name: 'Affstätt Nelkenstr.',
			vertexType: 'TRANSIT',
			stop: {
				gtfsId: '1:de:08115:4854:0:3',
				platformCode: null,
				vehicleMode: 'BUS',
			},
		},
		to: {
			lat: 48.595543,
			lon: 8.86597,
			name: 'Herrenberg Reinhold-Schick-Pl.',
			vertexType: 'TRANSIT',
			stop: {
				gtfsId: '1:de:08115:7013:0:3',
				platformCode: null,
				id: 'U3RvcDoxOmRlOjA4MTE1OjcwMTM6MDoz',
			},
		},
		intermediatePlaces: [
			{
				arrivalTime: 1619516040000,
				stop: {
					gtfsId: '1:de:08115:4848:0:4',
					lat: 48.597443,
					lon: 8.861043,
					name: 'Herrenberg Mühlweg',
					platformCode: null,
				},
			},
			{
				arrivalTime: 1619516160000,
				stop: {
					gtfsId: '1:de:08115:3235:1:2',
					lat: 48.594288,
					lon: 8.861323,
					name: 'Herrenberg Kalkofenstr.',
					platformCode: null,
				},
			},
		],
		realTime: false,
		realtimeState: null,
		transitLeg: true,
		startTime: 1619515920000,
		endTime: 1619516280000,
		interlineWithPreviousLeg: null,
		route: {
			shortName: '773',
			gtfsId: '1:31-773-j21-4',
			longName: 'Herrenberg - Deckenpfronn - Calw',
			agency: {gtfsId: '1:1', name: 'VVS'},
			mode: 'BUS',
		},
		trip: {
			gtfsId: '1:7730158.T0.31-773-j21-4.24.R',
			tripHeadsign: 'Herrenb. ZOB Bahnhofstraße',
			stoptimes: [
				{stop: {gtfsId: '1:de:08115:4838:0:3'}},
				{stop: {gtfsId: '1:de:08115:4839:0:4'}},
				{stop: {gtfsId: '1:de:08115:7048:0:3'}},
				{stop: {gtfsId: '1:de:08115:4840:0:4'}},
				{stop: {gtfsId: '1:de:08115:4842:0:4'}},
				{stop: {gtfsId: '1:de:08115:4844:0:4'}},
				{stop: {gtfsId: '1:de:08115:4845:0:4'}},
				{stop: {gtfsId: '1:de:08115:4846:0:3'}},
				{stop: {gtfsId: '1:de:08115:4854:0:3'}},
				{stop: {gtfsId: '1:de:08115:4848:0:4'}},
				{stop: {gtfsId: '1:de:08115:3235:1:2'}},
				{stop: {gtfsId: '1:de:08115:7013:0:3'}},
				{stop: {gtfsId: '1:de:08115:4512:5:E'}},
			],
			directionId: '1',
		},
	},
	{
		mode: 'WALK',
		from: {
			lat: 48.595543,
			lon: 8.86597,
			name: 'Herrenberg Reinhold-Schick-Pl.',
			vertexType: 'TRANSIT',
			stop: {
				gtfsId: '1:de:08115:7013:0:3',
				platformCode: null,
				vehicleMode: 'BUS',
			},
		},
		to: {
			lat: 48.590988,
			lon: 8.8717268,
			name: 'Kleiststraße, 71083 Herrenberg',
			vertexType: 'NORMAL',
			stop: null,
		},
		intermediatePlaces: null,
		realTime: false,
		realtimeState: null,
		transitLeg: false,
		startTime: 1619516280000,
		endTime: 1619517072000,
		route: null,
		trip: null,
	}]
}

doesNotThrow(() => {
	validateOtpItinerary(it1)
})
throws(() => {
	validateOtpItinerary({
		...it1,
		legs: [
			it1.legs[0],
			{
				...it1.legs[1],
				startTime: 'foo',
			},
			...it1.legs.slice(2),
		],
	})
}, 'should throw on invalid TransitLeg.startTime')
throws(() => {
	validateOtpItinerary({
		...it1,
		legs: [
			{
				...it1.legs[0],
				from: null,
			},
			...it1.legs.slice(1),
		],
	})
}, 'should throw on invalid BasicLeg.from')

module.exports = validateOtpItinerary
