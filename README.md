# ticketing-service

**Fetches fares for an [OpenTripPlanner 2](https://docs.opentripplanner.org/en/dev-2.x/) `Itinerary` from the [VVS TRIAS API](https://www.openvvs.de/pages/api).**

[![Docker build status](https://img.shields.io/docker/build/stadtnavi/ticketing-service.svg)](https://hub.docker.com/r/stadtnavi/ticketing-service/)
[![dependency status](https://img.shields.io/david/stadtnavi/ticketing-service.svg)](https://david-dm.org/stadtnavi/ticketing-service)
![ISC-licensed](https://img.shields.io/github/license/stadtnavi/ticketing-service.svg)


## running via Docker

A Docker image [is available as `stadtnavi/ticketing-service`](https://hub.docker.com/r/stadtnavi/ticketing-service).

```shell
docker run -d -p 3000:3000 stadtnavi/ticketing-service
```


## running manually

```shell
git clone https://github.com/stadtnavi/ticketing-service.git
cd ticketing-service
npm install --production
npm start
```
