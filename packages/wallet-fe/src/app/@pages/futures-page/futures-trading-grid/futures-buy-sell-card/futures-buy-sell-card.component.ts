import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReplaySubject } from 'rxjs';
import { AddressService } from 'src/app/@core/services/address.service';
import { LoadingService } from 'src/app/@core/services/loading.service';
import { FuturesMarketsService, IContract } from 'src/app/@core/services/futures-services/futures-markets.service';
import { IFuturesTradeConf, TradeService } from 'src/app/@core/services/trade.service';

@Component({
  selector: 'tl-futures-buy-sell-card',
  templateUrl: '../../../shared/trading-grid/buy-sell/shared-buy-sell-card.component.html',
  styleUrls: ['../../../shared/trading-grid/buy-sell/shared-buy-sell-card.component.scss'],
})
export class FuturesBuySellCardComponent implements OnInit, OnDestroy {
    private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
    buySellGroup: FormGroup = new FormGroup({});

    constructor(
      private futuresMarketsService: FuturesMarketsService,
      private fb: FormBuilder,
      private addressService: AddressService,
      private loadingService: LoadingService,
      private tradeService: TradeService,
    ) {}

    get isLoading(): boolean {
      return this.loadingService.tradesLoading;
    }

    get selectedMarket(): IContract {
      return this.futuresMarketsService.selectedContract;
    }

    get activeKeyPair() {
      return this.addressService.activeKeyPair;
    }

    get currentAddress() {
      return this.addressService.activeKeyPair?.address;
    }

    ngOnInit() {
      this.buildForms();
      this.trackPriceHandler();
    }

    private buildForms() {
      this.buySellGroup = this.fb.group({
        price: [null, [Validators.required, Validators.min(0.01)]],
        amount: [null, [Validators.required, Validators.min(0.01)]],
      })
    }

    fillMax(isBuy: boolean) {
      const value = parseFloat(this.getMaxAmount(isBuy));
      this.buySellGroup?.controls?.['amount'].setValue(value);
    }

    getTotal(isBuy: boolean): string {
      // const { price, amount } = this.buySellGroup.value;
      // const tokenName = isBuy 
      //   ? this.selectedMarket.second_token.shortName
      //   : this.selectedMarket.first_token.shortName;
      // const _amount = isBuy
      //   ? (price * amount).toFixed(4)
      //   : (amount || 0).toFixed(4);
      // return `${_amount} ${tokenName}`;
      return '0'
    }

    getMaxAmount(isBuy: boolean) {
      // if (!this.currentAddress) return '0';
      // if (!this.buySellGroup?.controls?.['price']?.value) return '0';
      // const fee = 0.1;
      // const _price = this.buySellGroup.value['price'];
      // const price = parseFloat((_price + fee));

      // const propId = isBuy
      //   ? this.selectedMarket.second_token.propertyId
      //   : this.selectedMarket.first_token.propertyId;

      // const balance = this.balanceService.getAddressBalanceForId(propId)?.available;
      // if (!balance || ((balance / price) <= 0)) return '0';
      // return isBuy ? (balance / price).toFixed(4): balance.toFixed(4);
      return '0';
    }


    handleBuySell(isBuy: boolean) {
      const { price, amount } = this.buySellGroup.value;
      const market = this.selectedMarket;
      const contractId = market.contractId;
      if (!this.activeKeyPair) return;
      const order: IFuturesTradeConf = {
        keypair: {
          address: this.activeKeyPair?.address,
          pubkey: this.activeKeyPair?.pubKey,
        },
        action: isBuy ? "BUY" : "SELL",
        type: "FUTURES",
        props: {
          contract_id: contractId,
          amount: amount,
          price: price,
        }
      };
      this.tradeService.newOrder(order);
      this.buySellGroup.reset();
    }

    getButtonDisabled(isBuy: boolean) {
      // const availableLTC = this.balanceService.getLtcBalance()?.available || 0;
      // const v = this.buySellGroup.value.amount <= this.getMaxAmount(isBuy);
      // return !this.buySellGroup.valid || !v || availableLTC < 0.05;
      return false;
    }

    private trackPriceHandler() {
      // this.orderbookService.outsidePriceHandler
      // .pipe(takeUntil(this.destroyed$))
      // .subscribe(price => {
      //   this.buySellGroup.controls['price'].setValue(price);
      // });
    }

    ngOnDestroy() {
      this.destroyed$.next(true);
      this.destroyed$.complete();
    }
}
