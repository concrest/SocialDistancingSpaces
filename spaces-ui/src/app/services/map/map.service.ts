import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import * as geojson from 'geojson';

import { FeatureService } from '../feature/feature.service';
import { MapInfo } from './types'
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class MapService {
  

  private defaultCentre: L.LatLngExpression = [54.65118896, -4.416503906];
  private defaultZoom: number = 6;
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

    const { redLayer, amberLayer, greenLayer } = this.addLayerControl(map);

    this.setupEventHandlers(map);

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
        self.putFeatureOnMap(mapInfo, geojson);
      }
    );
  }

  public geolocate(mapInfo: MapInfo) : Observable<L.LocationEvent> {

    return new Observable<L.LocationEvent>(subscriber => {
      mapInfo.map.on('locationfound', e => subscriber.next(e));
      mapInfo.map.on('locationerror', e => subscriber.error(e));

      mapInfo.map.locate({setView: true, maxZoom: 16});
    });    
  }

  public goToDemoArea(mapInfo: MapInfo) {
    // TODO: remove when done with demo
    mapInfo.map.flyTo([53.052339, -1.395106], 15, {
      animate: false
    });
  }

  private setupEventHandlers(map: L.Map) {
    map.on('moveend', this.onMoveEnd, this) // <-- context === `this` makes `this` point to MapService in `onMoveEnd`. Otherwise `this` will be `map`
  }

  private onMoveEnd(event: L.LeafletEvent): void {
    const self = this as MapService; // <-- `this` is the MapService as `setupEventHandlers` passed that in as the `context`
    const map = event.sourceTarget as L.Map;

    self.refreshSpaces(map);
  }

  private refreshSpaces(map: L.Map) : void {
    const centre = map.getCenter();
    const zoom = map.getZoom();

    //this.featureService.getFeaturesForPoint([centre.lat, centre.lng], zoom);
  }

  private putFeatureOnMap(mapInfo: MapInfo, geojson: geojson.Feature) : void {
    const self = this;

    // Get the map layer first, so we don't create a feature if we have
    // nowhere to put it
    const mapLayer = this.getLayer(mapInfo, geojson);
    if (mapLayer) {      
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
      
      mapFeature.addTo(mapLayer);        
    }
  }

  private getLayer(mapInfo: MapInfo, geojson: geojson.Feature) : L.LayerGroup {
    if (geojson.properties && geojson.properties.category) {
      return mapInfo.categoryLayers[geojson.properties.category];
    }

    return null;
  }
  
  private addLayerControl(map: L.Map) {
    const redLayer = this.createCategoryLayerGroup(map);
    const amberLayer = this.createCategoryLayerGroup(map);
    const greenLayer = this.createCategoryLayerGroup(map);
    
    const categoryLayers = {
      "Red Spaces": redLayer,
      "Amber Spaces": amberLayer,
      "Green Spaces": greenLayer
    };

    L.control.layers(null, categoryLayers).addTo(map);

    return { redLayer, amberLayer, greenLayer };
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

    return {
      color: this.getColour(category),
      weight: 2,
      opacity: 1,
      fillOpacity: 0.6
    };
  }

  private getColour(category: string) : string {
    switch (category) {
      case 'green': return '#14801b';
      case 'amber': return '#eb9234';
      case 'red': return 'red';      
    }

    return 'green';
  }
}
