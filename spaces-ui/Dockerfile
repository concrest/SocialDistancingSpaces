### STAGE 1: Build ###

# We label our stage as ‘builder’
FROM node:12-alpine as builder

ARG BUILD_BUILDNUMBER=0.0
ARG BUILD_SOURCEVERSION=local-dev-build
ARG BUILD_DATE=unknown-date

COPY package.json package-lock.json ./

## Storing node modules on a separate layer will prevent unnecessary npm installs at each build

RUN npm ci && mkdir /ng-app && mv ./node_modules ./ng-app

WORKDIR /ng-app

COPY . .

## Build the angular app in production mode and store the artifacts in dist folder

RUN node set-versioning.js "$BUILD_SOURCEVERSION" "$BUILD_DATE" "$BUILD_BUILDNUMBER"

RUN npm run ng build -- --prod --output-path=dist

### STAGE 2: Setup ###

FROM nginx:1.17.9-alpine

## Copy our default nginx config
COPY nginx/default.conf /etc/nginx/conf.d/

## Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

## From ‘builder’ stage copy over the artifacts in dist folder to default nginx public folder
COPY --from=builder /ng-app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]