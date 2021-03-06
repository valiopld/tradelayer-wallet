import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import ltcUtils from '../../utils/litecore.util'
import { AddressService, IKeyPair, IMultisigPair } from "./address.service";
import { ApiService } from "./api.service";
import { BalanceService } from "./balance.service";
import { DialogService, DialogTypes } from "./dialogs.service";
import { LiquidityProviderService } from "./liquidity-provider.service";
import { RpcService } from "./rpc.service";
import { SocketService } from "./socket.service";
import { DealerService } from "./spot-services/dealer.service";
import { SpotPositionsService } from "./spot-services/spot-positions.service";
import { TxsService } from "./spot-services/txs.service";

@Injectable({
    providedIn: 'root',
})

export class AuthService {
    public encKey: string = '';
    savedFromUrl: string = '';
    constructor(
        private router: Router,
        private addressService: AddressService,
        private dialogService: DialogService,
        private toastrService: ToastrService,
        private balanceService: BalanceService,
        private apiService: ApiService,
        private txsService: TxsService,
        private rpcService: RpcService,
        private socketService: SocketService,
        private spotPositionsService: SpotPositionsService,
        private dealerService: DealerService,
        private liquidityProviderService: LiquidityProviderService,
    ) {}

    get isLoggedIn() {
        return this.addressService.keyPairs.length > 0;
    }

    async register(pass: string) {
        const pair = await this.addressService.generateNewKeyPair() as IKeyPair;
        if (pair.address && pair.privKey, pair.pubKey) {
            this.login([pair]);
        };

        this.encKey = ltcUtils.encryptKeyPair(this.addressService.keyPairs, pass);
        this.dialogService.openEncKeyDialog(this.encKey);
    }

    async loginFromKeyFile(key: string, pass: string) {
        const res = ltcUtils.decryptKeyPair(key, pass) as (IKeyPair | IMultisigPair)[];
        if (!res?.length) {
            this.toastrService.error('Wrong Password or keyFile', 'Error');
            return;
        }

        const keyPairs = res.filter((e) => !('redeemScript' in e)) as IKeyPair[];

        if (!keyPairs?.length) return this.toastrService.error('Wrong keyFile', 'Error');
        for (const i in keyPairs) {
            const kp = keyPairs[i];
            if (!kp?.address || !kp?.pubKey || !kp?.privKey) {
                this.toastrService.error('Wrong keyFile', 'Error');
                return;
            }
            const vaRes = await this.rpcService.rpc('validateaddress', [kp.address]);

            if (vaRes.error || !vaRes.data) {
                this.toastrService.error('Error with validating wallet', 'Error');
                return;
            }

            if (!vaRes.data?.isvalid) {
                this.toastrService.error('The Address is not valid', 'Error');
                return;
            }
    
            if (vaRes.data?.isvalid && !vaRes.data?.ismine) {
                const ipkRes = await this.rpcService.rpc('importprivkey', [kp.privKey, "tl-wallet", false]);
            }
        }


        if (!this.rpcService.isOffline && !this.rpcService.isApiRPC) {
            const luRes = await this.rpcService.smartRpc('listunspent', [0, 999999999, [keyPairs[0]?.address]]);
            const scLuRes: any = await this.apiService.soChainApi.getTxUnspents(keyPairs[0]?.address).toPromise()
            if (luRes.error || !luRes.data || scLuRes.status !== "success" || !scLuRes.data) {
                this.toastrService.error('Unexpecter Error. Please try again!', 'Error');
                return;
            }
            if (luRes.data.length < scLuRes.data.txs?.length) {
                this.toastrService.info('There may be some incorect balance data', 'Not full UTXOs');
                // this.dialogService.openDialog(DialogTypes.RESCAN, { disableClose: true, data: { key, pass } });
                // return;
            }
        }

        if (this.rpcService.isOffline) {
            this.toastrService.info('There may be some incorect balance data', 'Offline wallet');
        }

        this.login(res);
        const allKeyParis = [
            ...this.addressService.keyPairs, 
            ...this.addressService.multisigPairs, 
            ...this.addressService.rewardAddresses,
            ...this.addressService.liquidityAddresses,
        ];
        this.encKey = ltcUtils.encryptKeyPair(allKeyParis, pass);
        return;
    }

    login(pairs: (IKeyPair | IMultisigPair)[]) {
        pairs.forEach((p: any, index: number) => {
            if (p.redeemScript) {
                this.addressService.addMultisigAddress(p)
            } else {
                if (p.rewardAddress) {
                    this.addressService.addRewardAddress(p);
                } else {
                    if (p.liquidity_provider) {
                        this.addressService.addLiquidtyAddress(p);
                    } else {
                        this.addressService.addDecryptedKeyPair(p, index === 0);
                    }
                }
            }
            this.balanceService.updateBalances();
        });
        this.router.navigateByUrl(this.savedFromUrl);
    }

    private clearSpotData() {
        this.dealerService.myDealerTrades = [];
        this.spotPositionsService.openedPositions = [];
        this.txsService.pendingTxs = [];
    }

    logout() {
        this.clearSpotData();
        this.addressService.removeAllKeyPairs();
        this.balanceService.restartBalance();
        if (this.liquidityProviderService.isLiquidityStarted) {
            const address = this.liquidityProviderService.liquidityAddresses?.[0].address;
            this.liquidityProviderService.stopLiquidityProviding(address);
        }
        this.encKey = '';
        this.router.navigateByUrl('login');
        this.socketService.socket.emit('logout');
    }
}
