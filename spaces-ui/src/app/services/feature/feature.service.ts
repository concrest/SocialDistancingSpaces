import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, noop} from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import * as geojson from 'geojson';

import { Index, ClientOrNetworkError, ServerSideError } from './types';
import { LogService } from '../log/log.service';

export type HandleError = <T> (error: HttpErrorResponse) => Observable<T>;

@Injectable({
  providedIn: 'root'
})
export class FeatureService {

  // TODO: Probably need a base URL for this?
  private demoFeaturesBaseUrl = 'assets/demo/';
  private getIndexErrorHandler = this.createErrorHandlerFor<Index>('getIndex');
  private getFeatureErrorHandler = this.createErrorHandlerFor<geojson.Feature>('getFeature');

  constructor(
    private log: LogService,
    private http: HttpClient
  ) { }

  getFeatures(/* TODO: bbox args? */): Observable<geojson.Feature> {

    return new Observable<geojson.Feature>(subscriber => {
      this.getIndex(this.demoFeaturesBaseUrl + "index.json").subscribe( index => {
        // Index lookup sucessful
        index.files.forEach(filename => {
          this.getFeature(this.demoFeaturesBaseUrl + filename).subscribe(
            // Feature loaded successfully
            geojson => subscriber.next(geojson),
            noop // ignore error - already been logged            
          );
        });        
      }, indexError => {
        // Pass error to observable's subscriber
        subscriber.error(indexError);
      }); 
    });
  }

  private getFeature(url: string): Observable<geojson.Feature> {
    return this.http.get<geojson.Feature>(url)
      .pipe(
        //retry(3), // TODO: Consider using retries for HTTP calls
        catchError(this.getFeatureErrorHandler)
      );
  }

  private getIndex(url: string) : Observable<Index> {
    return this.http.get<Index>(url)
      .pipe(
        catchError(this.getIndexErrorHandler)
      );
  }

  // This could have a default response instead of using throwError.  
  // See https://stackblitz.com/angular/jrlxnmobgoe?file=src%2Fapp%2Fhttp-error-handler.service.ts
  private createErrorHandlerFor<T>(context: string) { 

    // TODO: Log to a Logger service instead

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
