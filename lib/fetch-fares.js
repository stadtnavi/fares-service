'use strict'

const {getClient: createTriasClient} = require('trias-client')

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

const fetchFaresForItinerary = async (logger, it) => {
	const transitLegs = it.legs.filter(l => l.transitLeg === true)
	if (transitLegs.length === 0) return []

	// Try using their routing (`TripRequest`) with intermediate stops.
	const journeysReq = {
		origin: transitLegs[0].from.stop.gtfsId,
		via: transitLegs.slice(1).map(l => l.from.stop.gtfsId),
		destination: transitLegs[transitLegs.length - 1].to.stop.gtfsId,
		departureTime: transitLegs[0].startTime,
		maxResults: 5,
		includeFares: true,
	}
	logger.info(journeysReq, 'fetching TRIAS journeys')
	const {journeys} = await triasClient.getJourneys(journeysReq)

	const matchedJourney = journeys.find(triasJourneyMatchesOtpItinerary(logger, it))
	if (matchedJourney) {
		// todo: rename fields
		return matchedJourney.tickets
	}

	// todo: Fall back to fetching legs individually.

	return []
}

module.exports = fetchFaresForItinerary
