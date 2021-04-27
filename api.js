'use strict'

const pino = require('pino')
const express = require('express')
const createCors = require('cors')
const compression = require('compression')
const pkg = require('./package.json')

const mockFares = [{
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
		cors,
		corsOrigin,
		csp,
	} = {
		logger: pino({
			level: process.env.LOG_LEVEL || 'info',
		}),
		etags: process.env.ETAGS || 'weak',
		cors: process.env.CORS !== 'false',
		corsOrigin: process.env.CORS_ORIGIN ? new RegExp(process.env.CORS_ORIGIN) : /\bstadtnavi\.de$/,
		csp: process.env.CSP || `default-src 'none'`,
		...cfg,
	}

	const api = express()
	api.locals.logger = logger
	api.set('etag', etags)

	if (cors) {
		const cors = createCors({
			origin: corsOrigin,
			exposedHeaders: '*',
		})
		api.options('*', cors)
		api.use(cors)
	}

	api.use((req, res, next) => {
		// https://helmetjs.github.io/docs/dont-sniff-mimetype/
		res.setHeader('X-Content-Type-Options', 'nosniff')
		if (csp) res.setHeader('content-security-policy', csp)
		res.setHeader('X-Powered-By', [pkg.name, pkg.version].join(' '))
		res.setHeader('X-API-Version', pkg.version)
		next()
	})

	api.use(compression())

	// todo: prevent caching?
	// todo: expose TRIAS response times via Server-Timing?
	api.post('/fares', (req, res) => {
		// todo: parse & validate req.body, send 400 on errors

		// todo: find fares
		// todo: generate ticket link
		res.json(mockFares)
	})

	return api
}

module.exports = createApi
