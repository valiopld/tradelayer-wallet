import { Injectable } from "@angular/core";
import { ApiService } from "../api.service";
import { SocketService } from "../socket.service";

export interface ISpotMarketType {
    name: string,
    markets: IMarket[],
    icon: string,
    disabled: boolean,
}

export interface IMarket {
    first_token: IToken;
    second_token: IToken;
    disabled: boolean,
    pairString: string;
}

export interface IToken {
    shortName: string;
    fullName: string;
    propertyId: number;
}

@Injectable({
    providedIn: 'root',
})

export class SpotMarketsService {

    private _spotMarketsTypes: ISpotMarketType[] = [];

    private _selectedMarketType: ISpotMarketType = this.spotMarketsTypes[0] || null;
    private _selectedMarket: IMarket = this.selectedMarketType?.markets[0] || null;

    constructor(
        private apiService: ApiService,
        private socketServic: SocketService,
    ) { }

    get spotMarketsTypes() {
        return this._spotMarketsTypes;
    }

    get selectedMarketType(): ISpotMarketType {
        return this._selectedMarketType;
    }
    
    set selectedMarketType(value: ISpotMarketType) {
        if (!this.spotMarketsTypes.length) return;
        this._selectedMarketType = value;
        this.selectedMarket = this.marketsFromSelectedMarketType[0];
    }

    get selectedMarketTypeIndex() {
        return this.spotMarketsTypes.indexOf(this.selectedMarketType);
    }

    get marketsFromSelectedMarketType(): IMarket[] {
        if (!this.spotMarketsTypes.length) return [];
        return this.selectedMarketType.markets;
    }

    get selectedMarket(): IMarket {
        return this._selectedMarket;
    }

    set selectedMarket(value: IMarket) {
        this._selectedMarket = value;
        this.changeOrderbookMarketFilter(value);
    }

    get selectedMarketIndex() {
        return this.marketsFromSelectedMarketType.indexOf(this.selectedMarket);
    }

    get socket() {
        return this.socketServic.socket;
    }
    
    getMarkets() {
        this.apiService.marketApi.getSpotMarkets()
            .subscribe((marketTypes: ISpotMarketType[]) => {
                this._spotMarketsTypes = marketTypes;
                this.selectedMarketType = marketTypes[0];
            });
    }

    private changeOrderbookMarketFilter(market: IMarket) {
        const marketFilter = {
            firstId: market.first_token.propertyId,
            secondId: market.second_token.propertyId,
        };
        this.socket.emit('orderbook-market-filter', marketFilter);
    }
}