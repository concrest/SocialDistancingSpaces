import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, noop, of, Subscriber} from 'rxjs';
import { catchError, retry} from 'rxjs/operators';

import * as L from 'leaflet';
import * as geojson from 'geojson';

import { ClientOrNetworkError, ServerSideError, IndexFile } from './types';
import { LogService } from '../log/log.service';

export type HandleError = <T> (error: HttpErrorResponse) => Observable<T>;

interface IndexFileInfo {
  indexFile: IndexFile,
  fullPath: string,
  filename: string,
  parentPath: string
}

interface FeatureCollectionInfo {
  fullPath: string,  
  features: geojson.Feature[]
}

@Injectable({
  providedIn: 'root'
})
export class FeatureService {
  // TODO: Probably need a base URL for this?
  private readonly fileRootUrl = 'assets/fakeFileRoot';
  private readonly rootIndexUrl = `${this.fileRootUrl}/_index.json`;

  private readonly getIndexErrorHandler = this.createErrorHandlerFor<IndexFileInfo>('getIndex');
  private readonly getFeatureErrorHandler = this.createErrorHandlerFor<geojson.FeatureCollection>('getFeature');

  // Probably need a better caching mechanism than this
  private indexInfoCache: IndexFileInfo[] = [];
  private featureCollectionCache: FeatureCollectionInfo[] = [];

  constructor(
    private log: LogService,
    private http: HttpClient
  ) { }

  public getFeaturesForArea(visibleMapArea: L.LatLngBounds, zoom: number): Observable<geojson.Feature> {
    return new Observable<geojson.Feature>(subscriber => {
      this.getFeaturesFromIndex(this.rootIndexUrl, visibleMapArea, zoom, subscriber);
    });
  }

  private getFeaturesFromIndex(url: string, visibleMapArea: L.LatLngBounds, zoom: number, subscriber: Subscriber<geojson.Feature>) {
    this.getIndex(url).subscribe(indexInfo => {
      indexInfo.indexFile.items.forEach(areaData => {

        const southWest = new L.LatLng(areaData.bbox[1], areaData.bbox[0]);
        const northEast = new L.LatLng(areaData.bbox[3], areaData.bbox[2]);

        const areaBounds = new L.LatLngBounds(southWest, northEast);

        if (visibleMapArea.intersects(areaBounds)) {
          this.log.info("Inside area", areaData.name);

          if (areaData.features != null) { // && zoom > _someSetLimit
            const featuresUrl = `${indexInfo.parentPath}/${areaData.features}`;

            // go and get the feature collection file
            this.getFeatures(featuresUrl, subscriber);
          }

          if (areaData.index != null) {
            
            const nextIndexUrl = `${indexInfo.parentPath}/${areaData.index}`;

            // recurse back into this function for the next URL
            this.getFeaturesFromIndex(nextIndexUrl, visibleMapArea, zoom, subscriber);
          }
        }
        else {
          // not in the area any more - could clear features from cache for the child indices of this region?
        }          
      });          
    });
  }

  private getFeatures(url: string, subscriber: Subscriber<geojson.Feature>) : void {
    const self = this as FeatureService;

    const cachedCollection = self.getFeaturesFromCache(url);

    if (cachedCollection !== null) {
      // TODO: Is this the right place to do this? 
      // Don't want the features redrawing on every move, but it does need to support moving between regions
      // that haven't been loaded yet.

      self.log.info("Features already loaded for", url);

      // TODO: Could make this service *always* return features, and let the map decide what to do?
      // That seems cleaner, but not sure how the map would know that a feature was already added to a layer yet.
      //cachedCollection.features.forEach(f => subscriber.next(f));

      return;
    }

    self.log.info("Getting features from server for ", url);

    self.getFeaturesFromServer(url).subscribe( collectionInfo => {
      self.featureCollectionCache.push(collectionInfo);

      collectionInfo.features.forEach(f =>{
        subscriber.next(f);
      });
      
      subscriber.complete();

    }, error => subscriber.error(error));
  }

  private getFeaturesFromServer(url: string) : Observable<FeatureCollectionInfo> {
    return new Observable<FeatureCollectionInfo>(subscriber => {
      this.http.get<geojson.FeatureCollection>(url)
        .pipe(
          //retry(3), // TODO: Consider using retries for HTTP calls
          catchError(this.getFeatureErrorHandler)
        )
        .subscribe((collection:geojson.FeatureCollection)  => {
          const collectionInfo: FeatureCollectionInfo = {
            fullPath: url,
            features: collection.features
          };

          subscriber.next(collectionInfo);
          subscriber.complete();
        });
    });
  }

  private getFeaturesFromCache(featuresUrl: string) : FeatureCollectionInfo {
    if (this.featureCollectionCache.length === 0){
      return null;
    }

    const item = this.featureCollectionCache.find(info => info.fullPath == featuresUrl);
    if (item != null){
      return item;
    }

    return null;
  }

  private getIndex(url: string): Observable<IndexFileInfo> {
    const self = this as FeatureService;

    const cachedIndex = this.getIndexFromCache(url);

    if (cachedIndex !== null) {
      // TODO: work out how to refresh this if the user is on the page for a long time
      return of(cachedIndex);
    }

    return new Observable<IndexFileInfo>(subscriber => {
      this.getIndexFromServer(url).subscribe( indexFile => {
        self.indexInfoCache.push(indexFile);

        subscriber.next(indexFile);
        subscriber.complete();

      }, error => subscriber.error(error));
    });
  }

  private getIndexFromCache(url: string) : IndexFileInfo {
    if (this.indexInfoCache.length === 0){
      return null;
    }

    const item = this.indexInfoCache.find(info => info.fullPath == url);
    if (item != null){
      return item;
    }

    return null;
  }

  private getIndexFromServer(url: string) : Observable<IndexFileInfo> {

    const separatorIndex = url.lastIndexOf('/');
    const filename = url.substring(separatorIndex+1);
    const parentPath = url.substring(0, separatorIndex)

    return new Observable<IndexFileInfo>(subscriber => {
      this.http.get<IndexFile>(url)
        .pipe(
          catchError(this.getIndexErrorHandler)
        )
        .subscribe(indexFile => {

          subscriber.next({
            indexFile: indexFile,
            fullPath: url,
            filename: filename,
            parentPath: parentPath
          } as IndexFileInfo);

          subscriber.complete();
        });
    });
  }

  // This could have a default response instead of using throwError.  
  // See https://stackblitz.com/angular/jrlxnmobgoe?file=src%2Fapp%2Fhttp-error-handler.service.ts
  private createErrorHandlerFor<T>(context: string) { 
    return (error: HttpErrorResponse): Observable<T> => {
      if (error.error instanceof ErrorEvent) {
        
        this.log.error('An error occurred:', context, error.error.message);
  
        return throwError({
          context: context,
          errorMessage: error.error.message
        } as ClientOrNetworkError);

      } else {
                
        this.log.error(
          `${context} Backend returned code ${error.status}, ` +
          `body was: ${error.error}`);
  
          return throwError({
            context: context,
            errorMessage: error.error,
            statusCode: error.status
          } as ServerSideError);
      }
    };
  }
}
