'use strict'

const Ajv = require('ajv')
const {doesNotThrow, throws} = require('assert')
const rawOtpSchema = require('./otp.schema.json')

const wrapperType = Math.random().toString(16).slice(2)
const wrapperSchema = {
	'$id': '/wrapper.json',
	properties: {
		itinerary: {$ref: 'otp.json#/definitions/Itinerary'},
	},
}
const otpSchema = {
	...rawOtpSchema,
	'$id': '/otp.json',
}

const ajv = new Ajv({
	schemas: [wrapperSchema, otpSchema],
	allErrors: true,
})
const validate = ajv.compile(wrapperSchema)

const validateOtpItinerary = (itinerary) => {
	const valid = validate({itinerary})
	if (!valid) {
		const err = new Error('invalid OTP itinerary')
		err.itinerary = itinerary
		err.validationErrors = validate.errors
		throw err
	}
}

const it1 = {
	startTime: 1619514776000,
	endTime: 1619516891000,
	walkDistance: 2482.2340000000004,
	duration: 2115,
	fares: [],
	legs: [
		{
			mode: 'WALK',
			alerts: null,
			agency: null,
			from: {
				lat: 48.6059715,
				lon: 8.8583072,
				name: 'Affstätt,  Herrenberg',
				vertexType: 'NORMAL',
				bikeRentalStation: null,
				stop: null,
			},
			to: {
				lat: 48.590988,
				lon: 8.8717268,
				name: 'Kleiststraße, 71083 Herrenberg',
				vertexType: 'NORMAL',
				bikeRentalStation: null,
				stop: null,
				bikePark: null,
				carPark: null,
			},
			legGeometry: {
				length: 75,
				points: '}itgH{`au@z@S`BiAq@wGz@Qr@MJA`@KdDk@rC[nCSpCAvBL^FzDh@ZDh@?n@Cd@G\\ILAj@WdAo@v@e@^Ql@Y\\GDARCX?F@@QBk@Dw@DmB?cAjDeB`As@XSFAD?HoBCoCAY?{BNA@cB?_CJ@VNhAhAh@qADOPLLJ\\eAJ[BKVq@Xa@PGp@QnCu@xBw@?ChBi@vAa@OwBEaB?aBByA^OXGpASOuD',
			},
			intermediatePlaces: null,
			realTime: false,
			realtimeState: null,
			transitLeg: false,
			rentedBike: false,
			startTime: 1619514776000,
			endTime: 1619516891000,
			interlineWithPreviousLeg: false,
			distance: 2482.2340000000004,
			duration: 2115,
			intermediatePlace: false,
			route: null,
			trip: null,
		},
	],
}

doesNotThrow(() => {
	validateOtpItinerary({
		itinerary: it1,
	})
})
throws(() => {
	validateOtpItinerary({
		itinerary: {
			...it1,
			duration: 'foo',
		},
	})
})

module.exports = validateOtpItinerary
