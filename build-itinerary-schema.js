#!/usr/bin/env node
'use strict'

const fetch = require('node-fetch')
const {getIntrospectionQuery} = require('graphql/utilities/getIntrospectionQuery')
const {fromIntrospectionQuery} = require('graphql-2-json-schema')

const OTP_API = process.env.OTP_API || 'https://api.dev.stadtnavi.eu/routing/v1/router/index/graphql'

;(async () => {
	const res = await fetch(OTP_API, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'accept': 'application/json',
		},
		body: JSON.stringify({
			query: getIntrospectionQuery(),
		}),
	})
	if (!res.ok) {
		const err = new Error(`${res.status} ${res.statusText}`)
		err.res = res
		throw err
	}
	const introspection = (await res.json()).data

	const rootSchema = fromIntrospectionQuery(introspection, {
		nullableArrayItems: true,
	})
	process.stdout.write(JSON.stringify({
		...rootSchema,
		'$schema': undefined,
	}) + '\n')
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
