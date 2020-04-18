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
  featuresCollection: geojson.FeatureCollection
}

export interface VisibleMapAreaChangedEvent {
  eventType: VisibleMapAreaChangedEventType,
  id: string
}

export interface FeatureCollectionVisibleEvent extends VisibleMapAreaChangedEvent {
  featureCollection: geojson.FeatureCollection,
  parentIndexUrls: string[]
}

export interface FeatureCollectionSummaryEvent extends VisibleMapAreaChangedEvent {
  parentIndexUrls: string[],
  bbox: geojson.BBox,
  name: string,
  totalSpaces: number
}

export enum VisibleMapAreaChangedEventType {
  FeatureCollectionVisible,
  FeatureCollectionOutOfView,
  IndexChildrenOutOfView,
  FeatureCollectionInViewOutsideMinZoom
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

  public onVisibleMapAreaChanged(visibleMapArea: L.LatLngBounds, zoom: number): Observable<VisibleMapAreaChangedEvent> {
    return new Observable<VisibleMapAreaChangedEvent>(subscriber => {
      this.getFeaturesFromIndex(this.rootIndexUrl, [], visibleMapArea, zoom, subscriber);
    });
  }

  private getFeaturesFromIndex(url: string, parentIndexUrls: string[], visibleMapArea: L.LatLngBounds, zoom: number, subscriber: Subscriber<VisibleMapAreaChangedEvent>) {
    this.getIndex(url).subscribe(indexInfo => {

      parentIndexUrls.push(url);

      indexInfo.indexFile.items.forEach(areaData => {

        if (areaData.bboxBounds == null) {
          const southWest = new L.LatLng(areaData.bbox[1], areaData.bbox[0]);
          const northEast = new L.LatLng(areaData.bbox[3], areaData.bbox[2]);

          areaData.bboxBounds = new L.LatLngBounds(southWest, northEast);
        }

        const isInsideArea = visibleMapArea.intersects(areaData.bboxBounds);

        if (areaData.features != null) {  

          const featuresUrl = `${indexInfo.parentPath}/${areaData.features.url}`;

          // this links to a feature collection
          if (isInsideArea) {
            if (zoom > 12) {  // TODO: decide what the cut off zoom level of spaces is
              // go and get the feature collection file
              this.getFeatures(featuresUrl, parentIndexUrls, subscriber);
            }
            else {              
              subscriber.next({
                eventType: VisibleMapAreaChangedEventType.FeatureCollectionInViewOutsideMinZoom,
                id: featuresUrl,
                name: areaData.name,
                parentIndexUrls: parentIndexUrls,
                totalSpaces: areaData.features.totalSpaces,
                bbox: areaData.bbox
              } as FeatureCollectionSummaryEvent);
            }
          }
          else {
            // TODO: The feature Collection is not visible, so pass the url up to the subscriber 
            // in case it needs to be removed from the map
            subscriber.next({
              eventType: VisibleMapAreaChangedEventType.FeatureCollectionOutOfView,
              id: featuresUrl
            });
          }
        }

        if (areaData.index != null) {
          const nextIndexUrl = `${indexInfo.parentPath}/${areaData.index}`;

          if (isInsideArea) {
            // recurse back into this function for the next URL
            this.getFeaturesFromIndex(nextIndexUrl, parentIndexUrls, visibleMapArea, zoom, subscriber);
          }
          else {
            // The children of this entire area are all out of bounds - indicate this with an event
            subscriber.next({
              eventType: VisibleMapAreaChangedEventType.IndexChildrenOutOfView,
              id: nextIndexUrl
            });
          }
        }                
      });          
    });
  }

  private getFeatures(url: string, parentIndexUrls: string[], subscriber: Subscriber<VisibleMapAreaChangedEvent>) : void {
    const self = this as FeatureService;

    const cachedCollection = self.getFeaturesFromCache(url);

    if (cachedCollection !== null) {
      // TODO: Is this the right place to do this? 
      // Don't want the features redrawing on every move, but it does need to support moving between regions
      // that haven't been loaded yet.

      self.log.info("FeatureCollection cached for", url);

      subscriber.next({
        eventType: VisibleMapAreaChangedEventType.FeatureCollectionVisible,
        id: url,
        featureCollection: cachedCollection.featuresCollection,
        parentIndexUrls: parentIndexUrls
      } as FeatureCollectionVisibleEvent);

      return;
    }

    self.log.info("Getting FeatureCollection from server for", url);

    self.getFeaturesFromServer(url).subscribe( collectionInfo => {
      self.featureCollectionCache.push(collectionInfo);

      subscriber.next({
        eventType: VisibleMapAreaChangedEventType.FeatureCollectionVisible,
        id: url,
        featureCollection: collectionInfo.featuresCollection,
        parentIndexUrls: parentIndexUrls
      } as FeatureCollectionVisibleEvent);

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
            featuresCollection: collection
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
