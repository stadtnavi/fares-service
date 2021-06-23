'use strict'

const pino = require('pino')
const {deepStrictEqual: eql} = require('assert')
const {triasJourneyMatchesOtpItinerary} = require('../lib/fetch-fares')
const itStuttgartHbfGültstein = require('./otp-itinerary-stuttgart-hbf-gültstein.js')

const triasJourneyWrongTime = {
	"type": "journey",
	"id": "ID-367A8751-CD14-4408-BECC-52BCA5A86082",
	"legs": [
		{
			"mode": "train",
			"direction": "Horb Bahnhof/ZOB",
			"origin": {
				"type": "stop",
				"id": "de:08111:6115",
				"name": "Stuttgart Hauptbahnhof (oben)"
			},
			"destination": {
				"type": "stop",
				"id": "de:08115:4512",
				"name": "Herrenberg"
			},
			"departure": "2021-06-23T17:48:00+02:00",
			"arrival": "2021-06-23T18:18:00+02:00",
			"plannedDeparture": "2021-06-23T17:48:00+02:00",
			"departurePlatform": "2",
			"plannedArrival": "2021-06-23T18:18:00+02:00",
			"arrivalPlatform": "4",
			"line": {
				"type": "line",
				"id": "ddb:90T14:A:H",
				"line": "RB14"
			},
			"tripId": "ddb:90T14:A:H:j21:17659",
			"subMode": "rail"
		},
		{
			"mode": "bus",
			"direction": "Entringen Bahnhof",
			"origin": {
				"type": "stop",
				"id": "de:08115:4512",
				"name": "Herrenberg"
			},
			"destination": {
				"type": "stop",
				"id": "de:08115:4835",
				"name": "Gültstein Kirche"
			},
			"departure": "2021-06-23T18:33:00+02:00",
			"arrival": "2021-06-23T18:41:00+02:00",
			"plannedDeparture": "2021-06-23T18:33:00+02:00",
			"departurePlatform": "Bstg. A",
			"plannedArrival": "2021-06-23T18:41:00+02:00",
			"line": {
				"type": "line",
				"id": "rab:09916::R",
				"line": "RB60E"
			},
			"tripId": "rab:09916::R:21a:234"
		}
	],
	"tickets": [
		{
			"id": "12345",
			"name": "foo",
			"faresAuthorityRef": "bar",
			"faresAuthorityName": "baz",
			"price": 1.23,
			"currency": "EUR",
			"tariffLevel": "4",
			"travelClass": "second",
			"validFor": "Adult",
			"validityDuration": null
		},
	]
}

const triasJourneyRightTime = {
	"type": "journey",
	"id": "ID-A319D602-6EC5-4369-9747-88820987E941",
	"legs": [
		{
			"mode": "train",
			"direction": "Rottweil Bahnhof",
			"origin": {
				"type": "stop",
				"id": "de:08111:6115",
				"name": "Stuttgart Hauptbahnhof (oben)"
			},
			"destination": {
				"type": "stop",
				"id": "de:08115:4512",
				"name": "Herrenberg"
			},
			"departure": "2021-06-23T18:16:00+02:00",
			"arrival": "2021-06-23T18:48:00+02:00",
			"plannedDeparture": "2021-06-23T18:16:00+02:00",
			"departurePlatform": "2",
			"plannedArrival": "2021-06-23T18:48:00+02:00",
			"arrivalPlatform": "4",
			"line": {
				"type": "line",
				"id": "ddb:90T14:A:H",
				"line": "RB14"
			},
			"tripId": "ddb:90T14:A:H:j21:17663",
			"subMode": "rail"
		},
		{
			"mode": "bus",
			"direction": "Entringen Bahnhof",
			"origin": {
				"type": "stop",
				"id": "de:08115:4512",
				"name": "Herrenberg"
			},
			"destination": {
				"type": "stop",
				"id": "de:08115:4835",
				"name": "Gültstein Kirche"
			},
			"departure": "2021-06-23T19:03:00+02:00",
			"arrival": "2021-06-23T19:11:00+02:00",
			"plannedDeparture": "2021-06-23T19:03:00+02:00",
			"departurePlatform": "Bstg. A",
			"plannedArrival": "2021-06-23T19:11:00+02:00",
			"line": {
				"type": "line",
				"id": "rab:09916::R",
				"line": "RB60E"
			},
			"tripId": "rab:09916::R:21a:235"
		}
	],
	"tickets": [
		{
			"id": "12345",
			"name": "foo",
			"faresAuthorityRef": "bar",
			"faresAuthorityName": "baz",
			"price": 1.23,
			"currency": "EUR",
			"tariffLevel": "4",
			"travelClass": "second",
			"validFor": "Adult",
			"validityDuration": null
		},
	]
}

const logger = pino({
	level: 'warn',
})

const matchStuttgartGültstein = triasJourneyMatchesOtpItinerary(logger, itStuttgartHbfGültstein)

eql(matchStuttgartGültstein(triasJourneyWrongTime), false, 'wrong time: should not match')
eql(matchStuttgartGültstein(triasJourneyRightTime), true, 'right time: should match')

console.info('triasJourneyMatchesOtpItinerary seems to work ✔︎')
