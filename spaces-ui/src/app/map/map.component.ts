import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';

import { MapService } from '../services/map/map.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LogService } from '../services/log/log.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  private map: L.Map;

  showModal: boolean = true;

  constructor(
    private log: LogService,
    private mapService: MapService,
    private snackBar: MatSnackBar,
  ) { }

  ngAfterViewInit(): void {
    this.map = this.mapService.createMap('map');
  }

  browseMap() : void {
    this.hideModal();
  } 

  hideModal() : void {
    this.showModal = false;
  }

  goToDemoArea() : void {
    this.mapService.goToDemoArea(this.map);
    this.hideModal();
  }
  
  findUser() : void {
    this.mapService.geolocate(this.map).subscribe(
      () => this.hideModal(),
      error => {
        this.log.error(error);
        // TODO: Probably need a help topic on this
        this.snackBar.open('Can\'t find current location. Please Browse instead.', null, {
          duration: 5000
        });
      }
    );
  }
}