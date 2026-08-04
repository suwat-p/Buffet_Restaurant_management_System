import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class Constants {
  public readonly API_ENDPOINT: string = environment.apiEndpoint;
  public readonly URL_signalR: string = environment.urlSignalR;
  // public readonly API_ENDPOINT: string =
  //   'https://buffetapi-853684840693.asia-southeast3.run.app/api';
  // public readonly URL_signalR: string = 'https://buffetapi-853684840693.asia-southeast3.run.app/';
}
