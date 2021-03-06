import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { TNETWORK } from "../services/rpc.service";


@Injectable({
    providedIn: 'root',
})

export class TradeLayerApiService {
    private NETWORK: TNETWORK = 'LTC';

    constructor(
        private http: HttpClient,
    ) {}

    private get apiURL() {
        return this.NETWORK === 'LTCTEST'
            ? environment.relayerUrlTestnet
            : environment.relayerUrl;
    }

    _setNETWORK(value: TNETWORK) {
        this.NETWORK = value;
    }

    rpc(method: string, params: any[]): Observable<{
        data?: any;
        error?: any;
    }> {
        const body = { params };
        return this.http.post<{
            data?: any;
            error?: any;
        }>(this.apiURL + '/rpc/' + method, body);
    }
}
