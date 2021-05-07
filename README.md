# fares-service

**Fetches fares for an [OpenTripPlanner 2](https://docs.opentripplanner.org/en/dev-2.x/) `Itinerary` from the [VVS TRIAS API](https://www.openvvs.de/pages/api).**

The [uage example](example/example.sh) demonstrates how to use the API.

[![Docker build status](https://img.shields.io/docker/build/stadtnavi/fares-service.svg)](https://hub.docker.com/r/stadtnavi/fares-service/)
[![dependency status](https://img.shields.io/david/stadtnavi/fares-service.svg)](https://david-dm.org/stadtnavi/fares-service)
![ISC-licensed](https://img.shields.io/github/license/stadtnavi/fares-service.svg)


## running via Docker

A Docker image [is available as `stadtnavi/fares-service`](https://hub.docker.com/r/stadtnavi/fares-service).

```shell
docker run -d -p 3000:3000 stadtnavi/fares-service
```


## running manually

```shell
git clone https://github.com/stadtnavi/fares-service.git
cd fares-service
npm install --production
npm start
```
