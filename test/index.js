'use strict'

const execa = require('execa')
const superagent = require('superagent')
const assert = require('assert')
const itGärtringenHerrenberg = require('./otp-itinerary-gärtringen-herrenberg.json')
const gärtringenHerrenbergFares = require('./gärtringen-herrenberg-fares')
const itNufringenHerrenberg = require('./otp-itinerary-nufringen-herrenberg.json')
const nufringenHerrenbergFares = require('./nufringen-herrenberg-fares')

const spawnApiServer = async () => {
	console.debug('spawning API server as a child process')
	const server = execa.node(require.resolve('./server'), {
		env: {
			LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
		},
	})
	server.stdout.pipe(process.stdout)
	server.stderr.pipe(process.stderr)
	server.once('close', (exitCode) => {
		if (exitCode === null) return;
		console.error(`server exited unexpectedly with exit code ${exitCode}`)
		process.exit(exitCode || 1)
	})
	await new Promise(res => server.once('message', res))

	const stop = () => {
		console.debug('terminating API server child process')
		server.kill('SIGTERM', {forceKillAfterTimeout: 1000})
	}
	return stop
}

;(async () => {
	const stopApiServer = await spawnApiServer()

	const res = await superagent
	.post('http://localhost:3000/')
	.set('content-type', 'application/json')
	.set('accept', 'application/json')
	.send(JSON.stringify(itGärtringenHerrenberg))

	assert.strictEqual(res.statusCode, 200)
	assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
	assert.deepStrictEqual(res.body, gärtringenHerrenbergFares)

	const res2 = await superagent
	.post('http://localhost:3000/')
	.set('content-type', 'application/json')
	.set('accept', 'application/json')
	.send(JSON.stringify(itNufringenHerrenberg))

	assert.strictEqual(res2.statusCode, 200)
	assert.strictEqual(res2.headers['content-type'], 'application/json; charset=utf-8')
	assert.deepStrictEqual(res2.body, nufringenHerrenbergFares)

	console.info('✔︎ basic public transport works')

	stopApiServer()
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
