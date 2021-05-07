#!/bin/sh
set -e
set -o pipefail
cd $(dirname $(realpath $0))

curl \
	-H 'content-type: application/json' --data '@itinerary.json' \
	-H 'accept: application/json' 'http://localhost:3000/' -v
