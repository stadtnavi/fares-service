'use strict'

// configure transparent HTTP request mocking
if (process.env.VCR_MODE && !process.env.VCR_OFF) {
	const nock = require('nock')
	const {join: pathJoin} = require('path')
	const {writeFileSync} = require('fs')

	const mocksFile = pathJoin(__dirname, 'http-mocks.json')

	if (!process.env.TRIAS_REQUESTOR_REF) {
		console.error('Missing TRIAS_REQUESTOR_REF env var, needed for secrets redaction.')
		process.exit(1)
	}
	const redactSecrets = (req) => {
		if ('string' !== typeof req.body) return req
		// note: only replaces *once*
		req.body = req.body.replace(process.env.TRIAS_REQUESTOR_REF, '$TRIAS_REQUESTOR_REF')
		return req
	}
	const revealSecrets = (req) => {
		if ('string' !== typeof req.body) return req
		// note: only replaces *once*
		req.body = req.body.replace('$TRIAS_REQUESTOR_REF', process.env.TRIAS_REQUESTOR_REF)
		return req
	}

	if (process.env.VCR_MODE === 'record') {
		// https://github.com/octokit/fixtures/blob/b679b3f6d21db374fa0cd2029a66d2bc7e8ea336/lib/record-scenario.js
		console.debug('recording HTTP requests')
		nock.recorder.rec({
			output_objects: true,
			dont_print: true,
			enable_reqheaders_recording: true,
		})

		const onExit = () => {
			console.debug('saving recorded HTTP requests')
			const recordedRequests = nock.recorder.play().map(redactSecrets)
			nock.recorder.clear()
			nock.restore()

			writeFileSync(mocksFile, JSON.stringify(recordedRequests))
			console.debug('saving recorded HTTP requests: done')

			process.exit()
		}
		process.on('SIGINT', onExit)
		process.on('SIGTERM', onExit)
		process.on('beforeExit', onExit)
	} else if (process.env.VCR_MODE === 'playback') {
		console.debug('mocking HTTP requests from recordings')
		// https://github.com/nock/nock/blob/3efd7382011a8d1ca084bfc4043a332a796a0618/README.md#output_objects-option
		const nockDefs = nock.loadDefs(mocksFile).map(revealSecrets)
		nock.define(nockDefs)
	}
}

// run API server as usual
const server = require('..')

if (process.send) server.on('listening', () => process.send('listening'))
