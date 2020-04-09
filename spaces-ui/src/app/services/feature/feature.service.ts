import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable} from 'rxjs';
import * as geojson from 'geojson';

import { Index } from './types';

@Injectable({
  providedIn: 'root'
})
export class FeatureService {

  // TODO: Probably need a base URL for this?
  private demoFeaturesBaseUrl = 'assets/demo/';

  constructor(
    private http: HttpClient
  ) { }

  getFeatures(/* TODO: bbox args? */): Observable<geojson.Feature> {

    return new Observable<geojson.Feature>(subscriber => {
      this.getIndex(this.demoFeaturesBaseUrl + "index.json").subscribe( index =>{
        index.files.forEach(filename => {
          this.getFeature(this.demoFeaturesBaseUrl + filename).subscribe(
            geojson => subscriber.next(geojson)
          );
        });
      }); 
    });
  }

  private getFeature(url: string): Observable<geojson.Feature> {
    return this.http.get<geojson.Feature>(url);
  }

  private getIndex(url: string) : Observable<Index> {
    return this.http.get<Index>(url);
  }
}
