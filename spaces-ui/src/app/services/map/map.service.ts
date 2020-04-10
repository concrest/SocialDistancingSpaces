import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import * as geojson from 'geojson';

import { FeatureService } from '../feature/feature.service';
import { MapInfo } from './types'

@Injectable({
  providedIn: 'root'
})

export class MapService {

  private defaultCentre: L.LatLngExpression = [ 53.050039, -1.406985 ];
  private defaultZoom: number = 15;
  private defaultTileLayerTemplate: string = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  private defaultTileLayerAttribution: string = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  private defaultTileLayerMaxZoom: number = 19;

  constructor(
    private featureService: FeatureService
  ) { }

  public createMap(element: string | HTMLElement): MapInfo {

    const streetMapLayer = this.createStreetMapLayer();

    const map = L.map(element, {
      center: this.defaultCentre,
      zoom: this.defaultZoom,
      layers: [streetMapLayer]
    });

    const redLayer = this.createCategoryLayerGroup(map); 
    const amberLayer = this.createCategoryLayerGroup(map); 
    const greenLayer = this.createCategoryLayerGroup(map); 

    const categoryLayers = {
      "Red Spaces": redLayer,
      "Amber Spaces": amberLayer,
      "Green Spaces": greenLayer
    }

    L.control.layers(null, categoryLayers).addTo(map);

    return {
      map: map,
      categoryLayers: {
        red: redLayer,
        amber: amberLayer,
        green: greenLayer
      }
    };
  }

  public refreshZones(mapInfo: MapInfo) : void {
    const self = this;

    // TODO: Needs to handle the error case of the index call erroring
    this.featureService.getFeatures().subscribe(
      geojson => {
        
        const mapFeature = L.geoJSON(geojson, {
          onEachFeature: function(feature, layer) {
            if (feature.properties) {              
              layer.bindPopup(self.getPopupContents(feature));
            }
          },
          style: function(feature) {
            return self.getFeatureStyle(feature.properties.category);
          }
        });
        
        mapFeature.addTo(mapInfo.categoryLayers[geojson.properties.category]);        
      }
    );
  }

  private createCategoryLayerGroup(map: L.Map) : L.LayerGroup {
    const layer = L.layerGroup(); 
    layer.addTo(map);

    return layer;
  }

  private createStreetMapLayer() : L.TileLayer {
    return L.tileLayer(this.defaultTileLayerTemplate, {
      maxZoom: this.defaultTileLayerMaxZoom,
      attribution: this.defaultTileLayerAttribution
    });
  }

  private getPopupContents(feature: geojson.Feature<geojson.GeometryObject, any>) : string {
    // Could this be generated from a template?
    return `<strong>${feature.properties.location}</strong><br/>${feature.properties.description}`;
  }

  private getFeatureStyle(category: string){
    switch (category) {
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
}
