import { Component, OnInit } from '@angular/core';
import { FuturesMarketsService } from 'src/app/@core/services/futures-services/futures-markets.service';

@Component({
  selector: 'tl-futures-page',
  templateUrl: './futures-page.component.html',
  styleUrls: ['./futures-page.component.scss']
})
export class FuturesPageComponent implements OnInit{
    constructor(
      private futuresMarketsService: FuturesMarketsService,
    ) {}

    get isAvailableMarkets() {
      return !!this.futuresMarketsService.futuresMarketsTypes?.length;
    }

    ngOnInit() { 
      this.getMarkets();
    }

    private getMarkets() {
      const marketsExists = this.futuresMarketsService?.futuresMarketsTypes?.length;
      if (!marketsExists) this.futuresMarketsService.getMarkets();
    }
}
