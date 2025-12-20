import { Injectable } from '@angular/core';
import { presentationManagementControllerGetOffer, sessionControllerGetSession } from '@eudiplo/sdk';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VerifyService {
  id?: string;
  credentials: { [key: string]: unknown; }[] | undefined;
  interval?: NodeJS.Timeout;

  constructor() {
  }

  start() {
    return presentationManagementControllerGetOffer({
      body: {
        response_type: 'uri',
        requestId: environment.presentationId,
      }
    }).then((response) => {
      this.id = response.data.session;
      clearInterval(this.interval);
      this.checkStatus();
      return response.data.uri
    });
  }

  checkStatus() {
    this.interval = setInterval(() => {
      sessionControllerGetSession({ path: { id: this.id! } }).then((response) => {
        console.log('Session status:', response.data.status);
        switch(response.data.status) {
          case 'completed':
            //TODO: here more logic needs to be applied
            this.credentials = response.data.credentials;
            break;
          default:
            console.log('Waiting for presentation...');
            break;
        }
      });
    }, 2000);
  }
}
