import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import * as geojson from 'geojson';

import { MapService } from '../services/map/map.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  private map: L.Map;

  constructor(
    private mapService: MapService
  ) { }

  ngAfterViewInit(): void {
    this.map = this.mapService.createMap('map');

    this.mapService.refreshZones(this.map);
  }
}