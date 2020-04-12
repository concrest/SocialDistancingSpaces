import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  // TODO: store logs and send batches to server when there is an API we can use

  constructor() { }

  public error(message?: any, ...optionalParams: any[]): void {
    console.error(message, optionalParams);
  }
}


