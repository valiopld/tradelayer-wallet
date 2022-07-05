import { Component, ElementRef, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { first } from 'rxjs/operators';
import { AuthService, EAddress } from 'src/app/@core/services/auth.service';
import { BalanceService } from 'src/app/@core/services/balance.service';
import { DialogService, DialogTypes } from 'src/app/@core/services/dialogs.service';
import { RpcService } from 'src/app/@core/services/rpc.service';
import { PasswordDialog } from 'src/app/@shared/dialogs/password/password.component';

@Component({
  selector: 'tl-portoflio-page',
  templateUrl: './portfolio-page.component.html',
  styleUrls: ['./portfolio-page.component.scss']
})
export class PortfolioPageComponent implements OnInit {
  cryptoBalanceColumns: string[] = ['address', 'confirmed', 'unconfirmed', 'actions'];
  tokensBalanceColums: string[] = ['propertyid', 'name', 'balance', 'actions'];
  selectedAddress: string = '';

  constructor(
    private balanceService: BalanceService,
    private dialogService: DialogService,
    private toastrService: ToastrService,
    private rpcService: RpcService,
    private authService: AuthService,
    private elRef: ElementRef,
    public matDialog: MatDialog
  ) {}

  get walletKeys() {
    return this.authService.walletKeys;
  }

  get allAddresses() {
    return [
      ...this.walletKeys.main
    ]
  }

  get fiatBalance() {
    return Object.keys(this.allBalances)
      .map(address => ({ address, ...(this.allBalances?.[address]?.fiatBalance || {}) }));
  }

  get tokensBalances() {
    return this.balanceService.getTokensBalancesByAddress(this.selectedAddress);
  }

  get allBalances() {
    return this.balanceService.allBalances;
  }
 
  get nonSynced() {
    return this.rpcService.isOffline || !this.rpcService.isSynced;
  }

  get isApiRPC() {
    return this.rpcService.isApiRPC;
  }

  ngOnInit() {}

  getAvailableFiatBalance(element: any) {
    const confirmed = element?.confirmed || 0;
    const locked = element?.locked || 0;
    const _available = confirmed - locked;
    const available = _available <= 0 ? 0 : _available;
    return available.toFixed(5);
  }

  getReservedFiatBalance(element: any) {
    const locked = element?.locked || 0;
    return locked.toFixed(5);
  }

  getTotalFiatBalnace(element: any) {
    const confirmed = element?.confirmed || 0;
    const unconfirmed = element?.unconfirmed || 0;

    return `${confirmed.toFixed(3)}/${unconfirmed.toFixed(3)}`
  }

  getAvailableTokensBalance(element: any) {
    const balance = element?.balance || 0;
    const locked = element?.locked || 0;
    const _available = balance - locked;
    const available = _available <= 0 ? 0 : _available;
    return available.toFixed(5);
  }

  getLockedTokensBalance(element: any) {
    const locked = element?.locked || 0;
    return locked.toFixed(5);
  }

  getReservedTokensBalance(element: any) {
    const locked = element?.reserved || 0;
    return locked.toFixed(5);
  }

  openDialog(dialog: string, address?: any, _propId?: number) {
    if (this.nonSynced && !this.isApiRPC) {
      this.toastrService.warning('Not Allowed on offline wallet', 'Warning');
      return;
    }
    const data = { address, propId: _propId };
    const TYPE = dialog === 'deposit'
      ? DialogTypes.DEPOSIT
      : dialog === 'withdraw'
        ? DialogTypes.WITHDRAW
        : null;
    if (!TYPE || !data) return;
    this.dialogService.openDialog(TYPE, { disableClose: false, data });
  }

  async newAddress() {
    const passDialog = this.matDialog.open(PasswordDialog);
    const password = await passDialog.afterClosed()
        .pipe(first())
        .toPromise();

    if (!password) return;
    this.authService.addKeyPair(EAddress.MAIN, password);
  }

  showTokens(address: string) {
    this.selectedAddress = address;
    try {
        const { nativeElement } = this.elRef;
        setTimeout(() => nativeElement.scrollTop = nativeElement.scrollHeight);
    } catch(err) { }   
  }

  copy(text: string) {
    navigator.clipboard.writeText(text);
    this.toastrService.info('Address Copied to clipboard', 'Copied')
  }
}