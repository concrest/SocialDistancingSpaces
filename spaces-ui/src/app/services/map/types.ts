import * as L from 'leaflet';

export interface MapInfo {
    map:  L.Map
    categoryLayers: LayerInfo
}

interface LayerInfo {
    red: L.LayerGroup,
    amber: L.LayerGroup,
    green: L.LayerGroup,
}