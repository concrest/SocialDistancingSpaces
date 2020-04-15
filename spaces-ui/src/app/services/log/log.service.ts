import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  // TODO: store logs and send batches to server when there is an API we can use

  constructor() { }

  public info(message?: any, ...optionalParams: any[]): void {
    if (environment.production) return;
    
    console.log(message, optionalParams);
  }

  public error(message?: any, ...optionalParams: any[]): void {
    console.error(message, optionalParams);
  }
}


