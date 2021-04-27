FROM node:alpine
LABEL org.opencontainers.image.title="ticketing-service"
LABEL org.opencontainers.image.description="Fetches fares for an OpenTripPlanner Itinerary from the VVS TRIAS API."
LABEL org.opencontainers.image.authors="Jannis R <mail@jannisr.de>, Stadtnavi contributors"
LABEL org.opencontainers.image.documentation="https://github.com/stadtnavi/ticketing-service/tree/5"
LABEL org.opencontainers.image.source="https://github.com/stadtnavi/ticketing-service"
LABEL org.opencontainers.image.revision="1"
LABEL org.opencontainers.image.licenses="ISC"
WORKDIR /app

ADD package.json package-lock.json /app/
RUN npm ci --only=production && npm cache clean --force

WORKDIR /app

ADD . /app

EXPOSE 3000
ENV PORT 3000

CMD ["node", "index.js"]
