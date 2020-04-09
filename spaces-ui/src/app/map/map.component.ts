import { Component, AfterViewInit } from '@angular/core';

import { MapService } from '../services/map/map.service';
import { MapInfo } from '../services/map/types';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  private mapInfo: MapInfo;

  constructor(
    private mapService: MapService
  ) { }

  ngAfterViewInit(): void {
    this.mapInfo = this.mapService.createMap('map');

    this.mapService.refreshZones(this.mapInfo);
  }
}