import { Component, AfterViewInit } from '@angular/core';

import { MapService } from '../services/map/map.service';
import { MapInfo } from '../services/map/types';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LogService } from '../services/log/log.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  private mapInfo: MapInfo;

  showModal: boolean = true;

  constructor(
    private log: LogService,
    private mapService: MapService,
    private snackBar: MatSnackBar,
  ) { }

  ngAfterViewInit(): void {
    this.mapInfo = this.mapService.createMap('map');

    this.mapService.refreshZones(this.mapInfo);
  }

  browseMap() : void {
    this.hideModal();
  } 

  hideModal() : void {
    this.showModal = false;
  }
  
  findUser() : void {
    this.mapService.geolocate(this.mapInfo).subscribe(
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