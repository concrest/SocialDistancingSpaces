import * as geojson from 'geojson';

export interface Index {
  files: string[]
}

export interface ClientOrNetworkError {  
  context: string,
  errorMessage: string
}

export interface ServerSideError {  
  context: string,
  errorMessage: string,  
  statusCode: number
}

export interface Region {
  name: string,
  bbox: geojson.BBox,
  sectorsRef: string  
}

export interface Sector {
  name: string,
  bbox: geojson.BBox,
  featureCollectionRef: string
}