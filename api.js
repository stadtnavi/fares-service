'use strict'

const pino = require('pino')
const express = require('express')
const compression = require('compression')
const {json: parseJSONBody} = require('body-parser')
const pkg = require('./package.json')
const validateItinerary = require('./lib/validate-itinerary')
const fetchFaresForItinerary = require('./lib/fetch-fares')

const mockPublicTransportFares = [{
	// https://github.com/HSLdevcom/digitransit-ui/blob/8d756832f6b986a0d38a16db1e0f5774d4d19c64/app/util/fareUtils.js
	type: 'regular',
	currency: 'EUR',
	cents: 370,
	components: [{
		fareId: 'foo',
		currency: 'EUR',
		cents: 370,
		routes: [{
			id: 'bar',
			gtfsId: 'baz',
		}],
	}],
}]

const createApi = (cfg = {}) => {
	const {
		logger,
		etags,
		csp,
	} = {
		logger: pino({
			level: process.env.LOG_LEVEL || 'info',
		}),
		etags: process.env.ETAGS || 'weak',
		csp: process.env.CSP || `default-src 'none'`,
		...cfg,
	}

	const api = express()
	api.locals.logger = logger
	api.set('etag', etags)

	api.use((req, res, next) => {
		// https://helmetjs.github.io/docs/dont-sniff-mimetype/
		res.setHeader('X-Content-Type-Options', 'nosniff')
		if (csp) res.setHeader('content-security-policy', csp)
		res.setHeader('X-Powered-By', [pkg.name, pkg.version].join(' '))
		res.setHeader('X-API-Version', pkg.version)
		next()
	})

	api.use(compression())

	const parseJSON = parseJSONBody({
		limit: '1mb', // increase size limit for large itineraries
	})
	// todo: prevent caching?
	// todo: expose TRIAS response times via Server-Timing?
	api.post('/', parseJSON, (req, res, next) => {
		const itinerary = req.body
		logger.debug({itinerary}, 'received request')
		try {
			validateItinerary(itinerary)
		} catch (validationError) {
			validationError.statusCode = 400
			return next(validationError)
		}

		fetchFaresForItinerary(logger, itinerary)
		.then((fares) => {
			res.json(fares)
			// todo: generate ticket links?
			next()
		})
		.catch(next)
	})

	api.use((error, req, res, next) => {
		logger.error(error)
		if (!res.headersSent) {
			res.status(error.statusCode || 500)
			res.json({
				...error,
				message: error.message,
				statusCode: undefined,
			})
		}
		next()
	})

	return api
}

module.exports = createApi
