'use strict'

const {getClient: createTriasClient} = require('trias-client')
const generateFareUrl = require('./generate-fare-url')

const MOCK_FARE_COMPONENT_URL = 'https://example.org/fares/foo'

const TRIAS_REQUESTOR_REF = process.env.TRIAS_REQUESTOR_REF
if (!TRIAS_REQUESTOR_REF) {
	console.error('Missing/empty TRIAS_REQUESTOR_REF environment variable.')
	process.exit(1)
}

const nvbwProfile = {
	url: 'https://efa-bw.de/trias',
	requestorRef: TRIAS_REQUESTOR_REF,
	headers: {
		'content-type': 'text/xml',
		'accept': 'text/xml',
	},
}
const triasClient = createTriasClient(nvbwProfile)

const isOnDemandLeg = (otpLeg) => {
	return [
		715, // on-demand bus
	].includes(otpLeg.route?.type)
}

const otpIdPrefix = process.env.OTP_ID_PREFIX || '(1|hbg):'
const stripOTPIdPrefix = id => id.replace(new RegExp('^' + otpIdPrefix), '')

// The GTFS datasets used in the Stadtnavi OTP (and thus sent to this service) have
// more detailed stop IDs than what VVS's TRIAS returns, so we have to compare their
// first 3 segments here.
// todo: does this always work with IFOPT IDs?
const triasStopIdMatchesOtpStopId = (triasStopId, otpStopId) => {
	const triasStem = triasStopId.split(':').slice(0, 3).join(':')
	const otpStem = stripOTPIdPrefix(otpStopId).split(':').slice(0, 3).join(':')
	return triasStem === otpStem
}

const otpModes = new Map([
	// taken from the OTP2 GraphQL schema on 2021-06-30
	['AIRPLANE', 'aircraft'],
	['BUS', 'bus'],
	['CABLE_CAR', 'gondola'],
	['COACH', 'bus'],
	['FERRY', 'watercraft'],
	['FUNICULAR', 'gondola'],
	['GONDOLA', 'gondola'],
	['RAIL', 'train'],
	['SUBWAY', 'subway'],
	['TRAM', 'tram'],
])
const triasModes = new Map([
	['aircraft', 'aircraft'],
	['bus', 'bus'],
	['gondola', 'gondola'],
	['train', 'train'],
	['watercraft', 'watercraft'],
])
const triasSubodes = new Map([
    ['metro', 'subway'],
    ['rail', 'train'],
    ['tram', 'tram'],
])
const triasModeMatchesOtpMode = (logger, itLeg) => (jLeg, i) => {
	const it = otpModes.get(itLeg.mode)
	if (!it) {
		logger.debug({itLeg}, 'unknown/invalid OTP mode')
		return false
	}
	const j = triasSubodes.get(jLeg.subMode) || triasModes.get(jLeg.mode)
	if (!j) {
		logger.debug({jLeg}, 'unknown/invalid TRIAS (sub)mode')
		return false
	}
	return it === j
}

// We only take transit legs into account so far, because most other
// legs (e.g. walking or owned car) are irrelevant for fares/tickets.
const triasJourneyMatchesOtpItinerary = (logger, it) => (j) => {
	logger.debug({
		otpItinerary: it,
		triasJourney: j,
	}, 'triasJourneyMatchesOtpItinerary')

	const itTransitLegs = it.legs.filter(l => l.transitLeg === true)
	if (itTransitLegs.length === 0) {
		logger.debug('aborting because OTP itinerary has 0 transit legs')
		return false
	}
	const jTransitLegs = j.legs.filter(l => !!l.line)
	if (jTransitLegs.length === 0) {
		logger.debug('aborting because TRIAS journey has 0 transit legs')
		return false
	}
	if (itTransitLegs.length !== jTransitLegs.length) {
		logger.debug('OTP itinerary & TRIAS journey have different nr of transit legs')
		return false
	}

	const jLeg0 = jTransitLegs[0]
	const itLeg0 = itTransitLegs[0]
	if (!triasStopIdMatchesOtpStopId(jLeg0.origin.id, itLeg0.from.stop.gtfsId)) {
		logger.debug(
			{itLeg0, jLeg0},
			`OTP leg 0 & TRIAS leg 0 have different from/origin stop`,
		)
		return false
	}
	let itDep = +new Date(itLeg0.startTime)
	if (Number.isInteger(itLeg0.departureDelay)) itDep -= itLeg0.departureDelay * 1000
	const jDep = +new Date(jLeg0.plannedDeparture)
	if (itDep !== jDep) {
		logger.debug(
			{itDep, jDep, itLeg0, jLeg0},
			`OTP leg 0 & TRIAS leg 0 have different departure times`,
		)
		return false
	}

	const n = jTransitLegs.length - 1
	const jLegN = jTransitLegs[n]
	const itLegN = itTransitLegs[n]
	if (!triasStopIdMatchesOtpStopId(jLegN.destination.id, itLegN.to.stop.gtfsId)) {
		logger.debug(
			{itLegN, jLegN},
			`OTP leg ${n} & TRIAS leg ${n} have different to/destination stop`,
		)
		return false
	}
	let itArr = +new Date(itLegN.endTime)
	if (Number.isInteger(itLegN.arrivalDelay)) itArr -= itLegN.arrivalDelay * 1000
	const jArr = +new Date(jLegN.plannedArrival)
	if (itArr !== jArr) {
		logger.debug(
			{itArr, jArr, itLegN, jLegN},
			`OTP leg ${n} & TRIAS leg ${n} have different arrival times`,
		)
		return false
	}

	for (let i = 0; i < itTransitLegs.length; i++) {
		const itLeg = itTransitLegs[i]
		const jLeg = jTransitLegs[i]

		if (!triasModeMatchesOtpMode(logger, itLeg)(jLeg, i)) return false
	}

	logger.debug('OTP itinerary & TRIAS journey match!')
	return true
}

const formatTriasTicketAsOtpFare = (journeysReq, logger) => (ticket) => {
	return {
		// VDV 431-2 Teil 2: EKAP-Schnittstellenbeschreibung V1.2.
		// 7.10.1. Einfache Typen
		// PassengerCategoryEnumeration – Adult | Child | Senior | Youth | Disabled
		// https://github.com/opentripplanner/OpenTripPlanner/blob/77d24b64973ff2873f14c0cf374333c23031ac76/src/main/java/org/opentripplanner/routing/core/Fare.java#L16-L18
		// FareType – regular, student, senior, tram, special, youth
		type: {
			'Adult': 'regular',
			'Child': 'youth', // todo: what about student?
			'Senior': 'senior',
			'Youth': 'youth',
			'Disabled': 'special',
		}[ticket.validFor],
		currency: ticket.currency,
		cents: ticket.price * 100,
		components: [{
			fareId: ticket.id,
			// todo: ticket.name
			// todo: ticket.faresAuthorityRef & ticket.faresAuthorityName
			// todo: ticket.tariffLevel & ticket.travelClass
			// todo: ticket.validityDuration
			currency: ticket.currency,
			cents: ticket.price * 100,
			// todo: routes[]
			// Note: This violates the DigiTransit GraphQL schema.
			url: generateFareUrl(ticket, journeysReq, logger),
		}],
	}
}

const fetchFaresForItinerary = async (logger, it) => {
	const transitLegs = it.legs.filter(l => l.transitLeg === true)
	if (transitLegs.length === 0) {
		logger.debug({itinerary: it}, 'itinerary has 0 transit lets, aborting')
		return []
	}

	if (it.legs.some(isOnDemandLeg)) {
		logger.info({itinerary: it}, 'itinerary has on-demand legs, aborting')
		return []
	}

	// Try using their routing (`TripRequest`) with intermediate stops.
	const journeysReq = {
		origin: stripOTPIdPrefix(transitLegs[0].from.stop.gtfsId),
		// Currently, the NVBW TRIAS API doesn't return fares for requests
		// including via. We hope that it will compute matching itineraries
		// nonetheless, which won't get sorted out by
		// `triasJourneyMatchesOtpItinerary`.
		// todo: let NVBW fix this or use a different API
		// via: transitLegs.slice(1).map(l => stripOTPIdPrefix(l.from.stop.gtfsId)),
		destination: stripOTPIdPrefix(transitLegs[transitLegs.length - 1].to.stop.gtfsId),
		departureTime: transitLegs[0].startTime,
		// todo: add support for the following fields to trias-client, use them here:
		// - PtModeFilter/LineFilter
		// - ImmediateTripStart
		maxResults: 5,
		includeFares: true,
	}
	logger.debug(journeysReq, 'fetching TRIAS journeys')
	const t0 = Date.now()
	const {journeys} = await triasClient.getJourneys(journeysReq)
	if (journeys.length === 0) {
		logger.warn({
			itinerary: it,
			journeysReq,
		}, 'TRIAS returned 0 journeys')
		return []
	}
	logger.info({
		duration: Date.now() - t0,
	}, `fetched ${journeys.length} TRIAS journeys`)

	const matchedJourney = journeys.find(triasJourneyMatchesOtpItinerary(logger, it))
	if (matchedJourney) {
		const format = formatTriasTicketAsOtpFare(journeysReq, logger)
		return matchedJourney.tickets.map(format)
	}
	logger.warn({
		itinerary: it,
		journeys,
	}, 'failed to match a TRIAS journey with the itinerary')

	// todo: Fall back to fetching legs individually.

	return []
}

fetchFaresForItinerary.triasJourneyMatchesOtpItinerary = triasJourneyMatchesOtpItinerary
module.exports = fetchFaresForItinerary
