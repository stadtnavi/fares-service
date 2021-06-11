'use strict'

const {strictEqual: eql, ok} = require('assert')
const {DateTime} = require('luxon')

const TIMEZONE = process.env.TIMEZONE
if (!TIMEZONE) {
	console.error('Missing/empty TIMEZONE environment variable.')
	process.exit(1)
}

// todo: are the NVBW TRIAS API & VVS EFA API fully compatible?
const baseUrl = 'https://www3.vvs.de/mng/'

// Ideally, we would like to generate a URL to the booking page of a specific
// fare (which we call "deep link"), but the systems we have access to don't
// allow that, so we generate a link to VVS's fares *overview* page for the
// given itinerary.
const generateFareUrl = (fare, triasJourneysReq, logger) => {
	eql(typeof triasJourneysReq.origin, 'string', 'missing/invalid triasJourneysReq.origin')
	eql(typeof triasJourneysReq.destination, 'string', 'missing/invalid triasJourneysReq.destination')
	ok(Number.isInteger(triasJourneysReq.departureTime), 'missing/invalid triasJourneysReq.departureTime')

	const dep = DateTime.fromMillis(triasJourneysReq.departureTime, {zone: TIMEZONE})
	const deeplinkParam = {
		dateTime: {
			date: dep.toFormat('dd.LL.yyyy'),
			time: dep.toFormat('HH:mm'),
			useRealTime: true,
			isDeparture: true,
		},
		via: {
			optionsList: [],
			optionsListItem: {
				type: 'any',
				dwellTime: '0',
				enabled: true,
			},
		},
		odvs: {
			orig: triasJourneysReq.origin,
			dest: triasJourneysReq.destination,
		},
	}

	let fragment = new URL('/XSLT_TRIP_REQUEST2@init?language=de', 'http://example.org')
	fragment.searchParams.set('deeplink', JSON.stringify(deeplinkParam))
	fragment = fragment.pathname + fragment.search

	let url = new URL(baseUrl)
	url.hash = '!' + fragment
	url = url.href

	logger.debug({deeplinkParam, url}, 'generated EFA fares URL')
	return url
}

module.exports = generateFareUrl
