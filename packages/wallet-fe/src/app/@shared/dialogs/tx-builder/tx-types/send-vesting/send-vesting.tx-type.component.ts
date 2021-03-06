import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { BuilderService } from 'src/app/@core/services/builder.service';
import { RpcService } from 'src/app/@core/services/rpc.service';
import { TX_TYPES } from '../../tabs/build/build-tab.component';

@Component({
  selector: 'tx-type-send-vesting',
  templateUrl: './send-vesting.tx-type.component.html',
  styleUrls: ['./send-vesting.tx-type.component.scss']
})
export class SendVestingTxTypeComponent {
    @Output('loading') loadingEmmiter: EventEmitter<boolean> = new EventEmitter();
    @Output('hexOutput') hexOutputEmmiter: EventEmitter<string> = new EventEmitter();

    @Input('sender') sender: string = '';

    private _loading: boolean = false;
    private _toAddress: string = '';

    amount: number = 0;
    isAddressValid: boolean | null | 'PENDING' = null;

    constructor (
      private rpcService: RpcService,
      private toastrService: ToastrService,
      private builderSrvice: BuilderService,
    ) { }

    get toAddress() {
      return this._toAddress;
    }

    set toAddress(value: string) {
        this._toAddress = value;
        this.isAddressValid = null;
    }

    get buttonDisabled() {
      return !this.sender || !this.toAddress || !this.amount || this.isAddressValid === 'PENDING' || this.isAddressValid === false;
    }
      
    get loading() {
      return this._loading;
    }

    set loading(value: boolean) {
      this.loadingEmmiter.emit(value);
      this._loading = value;
    }

    async validateAddress(address: string) {
      this.isAddressValid = 'PENDING';
      const vaRes = await this.rpcService.rpc('validateaddress', [address]);
      const { error, data } = vaRes;
      if (error || !data) {
          this.toastrService.error(error.message || 'Error with validateing the address', 'Validation Error');
          this.isAddressValid = null;
          return
      }
      await new Promise((res) => setTimeout(() => res(true), 3000));
      const { isvalid } = data;
      this.isAddressValid = isvalid;
    }
  
    async build() {
      this.loading = true;
      this.hexOutputEmmiter.emit('');
      const tradeData = {
        fromAddress: this.sender,
        toAddress: this.toAddress,
        amount: this.amount,
        txType: TX_TYPES.SEND_VESTING,
      };

      const result = await this.builderSrvice.build(tradeData);
      result.error || !result.data
        ? this.toastrService.error(result.error || 'Undefined Error!', 'Error')
        : this.hexOutputEmmiter.emit(result.data);
      this.loading = false;
    }
}
