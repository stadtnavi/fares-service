'use strict'

const {getClient: createTriasClient} = require('trias-client')

const MOCK_FARE_COMPONENT_URL = 'https://example.org/fares/foo'

const nvbwProfile = {
	url: 'https://efa-bw.de/trias',
	requestorRef: process.env.TRIAS_REQUESTOR_REF,
	headers: {
		'content-type': 'text/xml',
		'accept': 'text/xml',
	},
}
const triasClient = createTriasClient(nvbwProfile)

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

	for (let i = 0; i < itTransitLegs; i++) {
		const itLeg = itTransitLegs[i]
		const jLeg = jTransitLegs[i]

		if (itLeg.from.stop.gtfsId !== jLeg.origin.id) {
			logger.debug(
				{itLeg, jLeg},
				`OTP leg ${i} & TRIAS leg ${i} have different from/origin stop`,
			)
			return false
		}
		if (itLeg.to.stop.gtfsId !== jLeg.destination.id) {
			logger.debug(
				{itLeg, jLeg},
				`OTP leg ${i} & TRIAS leg ${i} have different to/destination stop`,
			)
			return false
		}

		if (itLeg.route.gtfsId !== jLeg.line.id) {
			const itRouteName = itLeg.route.shortName.toLowerCase().trim()
			const jLineName = jLeg.line.name.toLowerCase().trim()
			if (itRouteName && jLineName && itRouteName !== jLineName) {
				logger.debug(
					{itLeg, jLeg},
					`OTP leg ${i} & TRIAS leg ${i} have different route IDs & names`,
				)
				return false
			}
		}

		let itDep = +new Date(itLeg.startTime)
		if ('number' === itLeg.departureDelay) itDep -= itLeg.departureDelay * 1000 // todo: seconds?
		const jDep = +new Date(jLeg.plannedDeparture)
		if (itDep !== jDep) {
				logger.debug(
					{itDep, jDep, itLeg, jLeg},
					`OTP leg ${i} & TRIAS leg ${i} have different departure times`,
				)
				return false
		}

		let itArr = +new Date(itLeg.endTime)
		if ('number' === itLeg.arrivalDelay) itArr -= itLeg.arrivalDelay * 1000 // todo: seconds?
		const jArr = +new Date(jLeg.plannedArrival)
		if (itArr !== jArr) {
				logger.debug(
					{itArr, jArr, itLeg, jLeg},
					`OTP leg ${i} & TRIAS leg ${i} have different arrival times`,
				)
				return false
		}
	}

	logger.debug('OTP itinerary & TRIAS journey match!')
	return true
}

const formatTriasTicketAsOtpFare = (ticket) => {
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
			// We don't have real fare (component) URLs yet, so we put a mock.
			// Note: This violates the DigiTransit GraphQL schema.
			url: MOCK_FARE_COMPONENT_URL,
		}],
	}
}

const otpIdPrefix = process.env.OTP_ID_PREFIX || '1:'
const stripOTPIdPrefix = id => id.replace(new RegExp('^' + otpIdPrefix), '')

const fetchFaresForItinerary = async (logger, it) => {
	const transitLegs = it.legs.filter(l => l.transitLeg === true)
	if (transitLegs.length === 0) return []

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
		maxResults: 5,
		includeFares: true,
	}
	logger.info(journeysReq, 'fetching TRIAS journeys')
	const {journeys} = await triasClient.getJourneys(journeysReq)

	const matchedJourney = journeys.find(triasJourneyMatchesOtpItinerary(logger, it))
	if (matchedJourney) {
		return matchedJourney.tickets.map(formatTriasTicketAsOtpFare)
	}

	// todo: Fall back to fetching legs individually.

	return []
}

module.exports = fetchFaresForItinerary
