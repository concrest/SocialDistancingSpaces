import * as geojson from 'geojson';
import * as L from 'leaflet';

export interface ClientOrNetworkError {  
  context: string,
  errorMessage: string
}

export interface ServerSideError {  
  context: string,
  errorMessage: string,  
  statusCode: number
}

export interface IndexFile {
  items: AreaMetadata[]
}

export interface AreaMetadata {
  name: string,
  bbox: geojson.BBox,  
  index?: string,
  features?: FeaturesMetadata,
  bboxBounds?: L.LatLngBounds
}

export interface FeaturesMetadata {
  url: string,
  totalSpaces: number
}
