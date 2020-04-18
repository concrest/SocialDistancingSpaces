import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import * as L from 'leaflet';
import * as geojson from 'geojson';

import { FeatureService, VisibleMapAreaChangedEventType, FeatureCollectionVisibleEvent, FeatureCollectionSummaryEvent, VisibleMapAreaChangedEvent, bboxToLatLngBounds } from '../feature/feature.service';
import { LogService } from '../log/log.service';

interface VisibleFeatureCollectionLayer {
  url: string,
  parentIndexUrls: string[],
  layer: L.GeoJSON
}

interface RegionMarkerInfo {
  id: string,
  parentIndexUrls: string[],
  bbox: geojson.BBox,
  name: string,
  totalSpaces: number,
  marker?: L.Marker
}

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private defaultCentre: L.LatLngExpression = [54.65118896, -4.416503906];
  private defaultZoom: number = 6;
  private defaultTileLayerTemplate: string = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  private defaultTileLayerAttribution: string = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  private defaultTileLayerMaxZoom: number = 19;

  private featureCollectionLayer: VisibleFeatureCollectionLayer[] = [];
  private regionMarkerLayer: RegionMarkerInfo[] = [];

  constructor(
    private featureService: FeatureService,
    private log: LogService
  ) { }

  public createMap(element: string | HTMLElement): L.Map {

    const streetMapLayer = this.createStreetMapLayer();

    const map = L.map(element, {
      center: this.defaultCentre,
      zoom: this.defaultZoom,
      layers: [streetMapLayer]
    });

    this.setupEventHandlers(map);

    return map
  }

  public geolocate(map: L.Map) : Observable<L.LocationEvent> {

    return new Observable<L.LocationEvent>(subscriber => {
      map.on('locationfound', e => subscriber.next(e));
      map.on('locationerror', e => subscriber.error(e));

      map.locate({setView: true, maxZoom: 16});
    });    
  }

  public goToDemoArea(map: L.Map) {
    // TODO: remove when done with demo
    map.flyTo([53.052339, -1.395106], 15, {
      animate: false
    });
  }

  private setupEventHandlers(map: L.Map) {
    map.on('moveend', this.onMoveEnd, this) // <-- context === `this` makes the `this` in `onMoveEnd` point to MapService. Otherwise `this` will be `map`
  }

  private onMoveEnd(event: L.LeafletEvent): void {
    const map = event.sourceTarget as L.Map;      
    this.refreshSpaces(map);
  }

  private refreshSpaces(map: L.Map) : void {
    const visibleMapArea = map.getBounds()
    const zoom = map.getZoom();

    this.featureService.onVisibleMapAreaChanged(visibleMapArea, zoom).subscribe(evt => {
      switch (evt.eventType){
        case VisibleMapAreaChangedEventType.FeatureCollectionVisible:
          this.onFeatureCollectionVisible(map, evt as FeatureCollectionVisibleEvent);
          break;
        case VisibleMapAreaChangedEventType.FeatureCollectionOutOfView:
          this.onFeatureCollectionOutOfView(map, evt);
          break;
        case VisibleMapAreaChangedEventType.FeatureCollectionInViewOutsideMinZoom:
          this.onFeatureCollectionInViewOutsideMinZoom(map, evt as FeatureCollectionSummaryEvent);
          break;
        case VisibleMapAreaChangedEventType.IndexChildrenOutOfView:
          this.onIndexChildrenOutOfView(map, evt);
          break;
      }
    });
  }

  private onFeatureCollectionVisible(map: L.Map, evt: FeatureCollectionVisibleEvent) {
    this.log.info("FeatureCollectionVisible Event", evt);

    // remove region marker if there is one
    this.removeRegionMarkerById(map, evt.id);

    const existingIndex = this.featureCollectionLayer.findIndex(f => f.url === evt.id);
    if (existingIndex < 0) {
      this.putFeatureCollectionOnMap(map, evt.featureCollection, evt.id, evt.parentIndexUrls);
    }
  }

  private onFeatureCollectionInViewOutsideMinZoom(map: L.Map, evt: FeatureCollectionSummaryEvent) {
    this.log.info("FeatureCollectionInViewOutsideMinZoom Event", evt);

    this.removeFeatureCollectionById(map, evt.id);
    this.addRegionMarker(map, evt as RegionMarkerInfo);
  }

  private onFeatureCollectionOutOfView(map: L.Map, evt: VisibleMapAreaChangedEvent) {
    this.log.info("FeatureCollectionOutOfView Event", evt);

    this.removeFeatureCollectionById(map, evt.id);
    this.removeRegionMarkerById(map, evt.id);
  }

  private onIndexChildrenOutOfView(map: L.Map, evt: VisibleMapAreaChangedEvent) {
    this.log.info("IndexChildrenOutOfView Event", evt);

    this.removeFeatureCollectionByIndexRef(map, evt.id);
    this.removeRegionMarkerByIndexRef(map, evt.id);
  }

  private addRegionMarker(map: L.Map, regionMarker: RegionMarkerInfo) {
    // only add if not already there
    const existingIndex = this.regionMarkerLayer.findIndex(f => f.id === regionMarker.id);
    if (existingIndex < 0) {
      const center = bboxToLatLngBounds(regionMarker.bbox).getCenter();
      regionMarker.marker = L.marker(center);

      this.regionMarkerLayer.push(regionMarker);

      regionMarker.marker.addTo(map);
    }
  }

  private removeRegionMarkerById(map: L.Map, regionMarkerId: string) {
    const index = this.regionMarkerLayer.findIndex(f => f.id === regionMarkerId);
    if (index > -1) {
      const marker = this.regionMarkerLayer[index].marker;
      if (marker != null) marker.remove();    

      this.regionMarkerLayer.splice(index, 1);
    }
  }

  private removeRegionMarkerByIndexRef(map: L.Map, indexId: string) {
    const layerIndex = this.regionMarkerLayer.findIndex(l => l.id === indexId || l.parentIndexUrls.some(i => i === indexId));
    if (layerIndex < 0) return;

    const marker = this.regionMarkerLayer[layerIndex].marker;
    if (marker != null) marker.remove();    

    this.regionMarkerLayer.splice(layerIndex, 1);

    // search again 
    this.removeRegionMarkerByIndexRef(map, indexId);
  }

  private removeFeatureCollectionById(map: L.Map, featureCollectionid: string) {
    const index = this.featureCollectionLayer.findIndex(f => f.url === featureCollectionid);
    if (index > -1) {
      this.featureCollectionLayer[index].layer.remove();    
      this.featureCollectionLayer.splice(index, 1);
    }
  }

  private removeFeatureCollectionByIndexRef(map: L.Map, indexId: string) {
    const layerIndex = this.featureCollectionLayer.findIndex(l => l.parentIndexUrls.some(i => i === indexId));
    if (layerIndex < 0) return;

    this.featureCollectionLayer[layerIndex].layer.remove();    
    this.featureCollectionLayer.splice(layerIndex, 1);

    // search again 
    this.removeFeatureCollectionByIndexRef(map, indexId);
  }

  private putFeatureCollectionOnMap(map: L.Map, geojson: geojson.FeatureCollection, id: string, parentIndexUrls: string[]) : void {
    const self = this;

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

    this.featureCollectionLayer.push({
      layer: mapFeature,
      url: id,
      parentIndexUrls: parentIndexUrls
    });
    
    mapFeature.addTo(map);          
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
