'use strict'

const createApi = require('./api')

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000

const api = createApi()

const server = api.listen(port, (err) => {
	const {logger} = api.locals
	if (err) {
		logger.error(err)
		process.exit(1)
	}
	logger.info(`listening on port ${port}`)
})

module.exports = server
