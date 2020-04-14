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
export class Feature2Service {

  // TODO: Probably need a base URL for this?
  private readonly fileRootUrl = 'assets/fakeFileRoot';
  private readonly regionsUrl = `${this.fileRootUrl}/_regions.json`;

  private readonly getMetaDataErrorHandler = this.createErrorHandlerFor<Index>('getMetaData');
  private readonly getFeatureCollectionErrorHandler = this.createErrorHandlerFor<geojson.Feature>('getFeatureCollection');

  private readonly getIndexErrorHandler = this.createErrorHandlerFor<Index>('getIndex');
  private readonly getFeatureErrorHandler = this.createErrorHandlerFor<geojson.Feature>('getFeature');

  private 

  constructor(
    private log: LogService,
    private http: HttpClient
  ) { }

  public getFeaturesForPoint(centre: geojson.Position, zoom: number) : Observable<geojson.Feature> {
    throw new Error("Method not implemented.");
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
