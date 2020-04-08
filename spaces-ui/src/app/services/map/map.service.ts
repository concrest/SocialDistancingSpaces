import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { FeatureService } from '../feature/feature.service';

@Injectable({
  providedIn: 'root'
})

export class MapService {

  private defaultCentre: L.LatLngExpression = [ 53.050039, -1.406985 ];
  private defaultZoom: number = 15;
  private defaultTileLayerTemplate: string = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  private defaultTileLayerAttribution: string = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  private defaultTileLayerMaxZoom: number = 19;

  private myStyle = {
    "color": "#ff7800",
    "weight": 5,
    "opacity": 0.65
  };

  constructor(
    private featureService: FeatureService
  ) { }

  public createMap(element: string | HTMLElement): L.Map {
    let map = L.map(element, {
      center: this.defaultCentre,
      zoom: this.defaultZoom
    });

    const tiles = L.tileLayer(this.defaultTileLayerTemplate, {
      maxZoom: this.defaultTileLayerMaxZoom,
      attribution: this.defaultTileLayerAttribution
    });

    tiles.addTo(map);

    return map;
  }

  public refreshZones(map: L.Map) : void {
    this.featureService.getFeatures().subscribe(
      //obj => console.log(obj)
      geojson => {
        L.geoJSON(geojson, {
          onEachFeature: function(feature, layer) {
            if (feature.properties) {              
              layer.bindPopup(`${feature.properties.location}: ${feature.properties.description}`);
          }
          },
          style: function(feature) {
            switch (feature.properties.category) {
              case 'green': return {
                "color": "green",
                "weight": 2,
                "opacity": 1
              };
              case 'amber': return {
                "color": "orange",
                "weight": 2,
                "opacity": 1
              };
              case 'red': return {
                "color": "red",
                "weight": 2,
                "opacity": 1
              };
            }
          }
        }).addTo(map);
      }
    );
  }
}
