import { Injectable } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { ApiService } from "./api.service";
import { DialogService, DialogTypes } from "./dialogs.service";
import { SocketService } from "./socket.service";
import { WindowsService } from "./windows.service";

// import { HttpClient, HttpHeaders } from "@angular/common/http";
// import { ApiService } from "./api.service";
// import { SocketService } from "./socket.service";
// import { ToastrService } from "ngx-toastr";
// import { WindowsService } from "./windows.service";
// import { LoadingService } from "./loading.service";

export type TNETWORK = 'LTC' | 'LTCTEST' | 'BTC' | 'BTCTEST';

// export interface RPCCredentials {
//   host: string,
//   port: number,
//   username: string,
//   password: string,
// };

export enum ENetwork {
  BTC = 'BTC',
  LTC = 'LTC',
  BTCTEST = 'BTCTEST',
  LTCTEST = 'LTCTEST',
};

@Injectable({
    providedIn: 'root',
})

export class RpcService {
  private _isCoreStarted: boolean = false;
  lastBlock: number = 0;
  isSynced: boolean = false;

    // private _isConnected: boolean = false;
    // private _isSynced: boolean = false;
    // private _isApiRPC: boolean = true;

    // private rpcHost: string = '';
    // private authToken: string = '';
    private _NETWORK: TNETWORK = "LTC";
    // public isAbleToRpc: boolean = false;
    // public isOffline: boolean = false;
    // public myVersion: string = 'Unknown';
  
    constructor(
      // private http: HttpClient,
      private apiService: ApiService,
      private socketService: SocketService,
      private dialogService: DialogService,
      private toasterService: ToastrService,
      // private loadingService: LoadingService,
      private windowsService: WindowsService,
    ) {
      this.socket.on('core-error', error => {
        this._isCoreStarted = false;
        this.toasterService.error(error || 'Undefiend Reason', 'Core Stopped Working');
        this.dialogService.openDialog(DialogTypes.RPC_CONNECT);
      });

      this.socket.on('new-block', lastBlock => {
        console.log(`New Block: ${lastBlock}`)
        this.lastBlock = lastBlock;
      });
    }

    get isCoreStarted() {
      return this._isCoreStarted;
    }

    set isCoreStarted(value: boolean) {
      this._isCoreStarted = value;
    }
  
    // get isApiRPC() {
    //   if (this.isOffline) return false;
    //   return this._isApiRPC;
    // }

    // set isApiRPC(value: boolean) {
    //   this._isApiRPC = value;
    // }

    get NETWORK() {
      return this._NETWORK;
    }

    set NETWORK(value: TNETWORK) {
      this.apiService._setNETOWRK(value);
      this._NETWORK = value;
    }

    // get isConnected() {
    //     return this._isConnected;
    // }

    // set isConnected(value: boolean) {
    //     this._isConnected = value;
    // }

    // get isSynced() {
    //   return this._isSynced;
    // }

    // set isSynced(value: boolean) {
    //   this._isApiRPC = !value;
    //   this._isSynced = value;
    // }

    get socket() {
      return this.socketService.socket;
    }

    get mainApi() {
      return this.apiService.mainApi;
    }

    get tlApi() {
      return this.apiService.tlApi;
    }

    // get tlApi() {
    //   return this.apiService.tlApi;
    // }

    // async saveConfigFile() {
    //   const isTestNet = this.NETWORK.endsWith('TEST');
    //   const res = await this.socketScriptApi.saveConfigFile(isTestNet).toPromise();
    // }

    // connect(credentials: RPCCredentials, network: TNETWORK) {
    //   return new Promise(async (res, rej) => {
    //     try {
    //       const isReady = await this._sendCredsToHomeApi(credentials);
    //       if (isReady) {
    //         this._saveCreds(credentials);
    //         this.NETWORK = network;
    //       }
    //       res(isReady);
    //     } catch (error) {
    //       rej(error);
    //     }
    //   })
    // }

    // private _sendCredsToHomeApi(credentials: RPCCredentials) {
    //   return this.socketScriptApi.connect(credentials).toPromise();
    // }

    async startWalletNode(
      path: string,
      network: ENetwork,
      flags: { reindex: boolean, startclean: boolean },
    ) {
      this.NETWORK = network;
      await this.tlApi.rpc('tl_getinfo').toPromise()
        .then(res2 => {
          if (res2.error || !res2.data) throw new Error(`${ res2.error || 'Undefined Error' }`);
        })
        .catch(error => {
          throw new Error(`Error with Tradelayer API Server: ${error.message || error || 'Undefined Error'}`);
        });
      return await this.mainApi
        .startWalletNode(path, network, flags)
        .toPromise()
        .then(async res => {
          if (!res.error && res.data) {
            await this.mainApi.rpcCall('getblockchaininfo').toPromise()
              .then(res3 => {
                if (res3.data.chain) {
                  if (res3.data.chain === 'main') this.NETWORK = ENetwork.LTC;
                  if (res3.data.chain === 'test') this.NETWORK = ENetwork.LTCTEST;
                  if (res3.data.chain !== 'main' && res3.data.chain !== 'test') {
                    throw new Error(`Undefined chain: ${res3.data.chain}`);
                  }
                  this.isCoreStarted = true;
                  this.dialogService.closeAllDialogs();
                  const syncTab = this.windowsService.tabs[0];
                  syncTab.minimized = false;
                } else {
                  throw new Error("Error with getting getblockchaininfo");
                }
              })
          }
          return res;
        });
    }
    // async startWalletNode(
    //     directory: string,
    //     network: ENetwork,
    //     flags: { reindex: boolean, startclean: boolean },
    //     startWithOffline: boolean = false,
    //   ) {
    //   const res = await this.socketScriptApi.startWalletNode(directory, network, flags, startWithOffline).toPromise();

    //   const isTestNet = network.endsWith('TEST');
    //   // if (res.error?.includes("Config file doesn't exist in")) {
    //   //   const dialogOptions = { disableClose: false, hasBackdrop: true, data: { directory, isTestNet, flags }};
    //   //   this.dialogService.openDialog(DialogTypes.NEW_NODE, dialogOptions);
    //   //   return { error: res.error };
    //   // }

    //   if (res.error || !res.data?.configObj) return { error: res.error };
    //   this.socketService.mainApiServerWaiting = true;

    //   this.isOffline = res.data.isOffline;
    //   this.myVersion = res.data.myVersion
    //   const host = 'localhost';
    //   const { rpcuser, rpcpassword, rpcport } = res.data.configObj;
    //   const connectCreds = { host, username: rpcuser, password: rpcpassword, port: rpcport };
    //   const connectRes = await this.connect(connectCreds, network);
    //   if (!connectRes) return { error: 'Unable to start local node. Probably already running' };
    //   this.dialogService.closeAllDialogs();
    //   return { data: connectRes };
    // }

    async createNewNode(params: { username: string, password: string, port: number, path: string }) {
      return await this.mainApi.createNewConfFile(params).toPromise();
    }

    // async smartRpc(method: string, params: any[] = []) {
    //   return this.isApiRPC
    //     ? this.apiRpc(method, params)
    //     : this.rpc(method, params);
    // }

    // localRpcCall(method: string, params: any) {
    //   return this.socketScriptApi.postRpcCall(method, params);
    // }

    // async apiRpc(method: string, params: any[] = []) {
    //   try {
    //     const res = await this.tlApi.rpc(method, params).toPromise();
    //     return res;
    //   } catch (err: any) {
    //     return { error: err.message || 'API-RPC: Undefined Error' };
    //   }
    // }

    // async rpc(method: string, params: any[] = []) {
    //   try {
    //     const url = this.rpcHost;
    //     const authToken = this.authToken;
    //     const id = Date.now();
    //     const body = { id, method, params };
    //     const headers = this._getHeaders(authToken);
    //     const methodRes = await this.http.post(url, JSON.stringify(body), { headers })
    //       .toPromise() as { error: any, result: any };
    //     const { error, result } = methodRes;
    //     if (error || !result) return { error: error.message || 'Error with RPC call' };
    //     return { data: result };
    //   } catch (err: any) {
    //     return { error: err.error?.error?.message || 'Undefined Error' }
    //   }
    // }

    // async clearRPC() {
    //   this.loadingService.isLoading = true;
    //   if (this.isConnected) await this.socketScriptApi.terminate().toPromise();
    //   this.isConnected = false;
    //   this.isSynced = false;
    //   this.isAbleToRpc = false;
    //   this.rpcHost = '';
    //   this.authToken = '';
    //   this.dialogService.closeAllDialogs();
    //   this.dialogService.openDialog(DialogTypes.RPC_CONNECT);
    //   this.NETWORK = 'LTC';
    //   this.loadingService.isLoading = false;
    // }

    // private _saveCreds(credentials: RPCCredentials) {
    //   this.isConnected = true;
    //   const url = `http://${credentials.host}:${credentials.port}`;
    //   this.rpcHost = url;
    //   this.authToken = window.btoa(`${credentials.username}:${credentials.password}`);
    // }
  
    // private _getHeaders(token: string) {
    //   return new HttpHeaders().set('Authorization', `Basic ${token}`);
    // }

    // async setEstimateFee() {
    //   if (this.isApiRPC) return;
    //   const estimateRes = await this.rpc('estimatesmartfee', [1]);
    //   if (estimateRes.error || !estimateRes.data?.feerate) {
    //     this.toasterService.warning('Error getting Estimate Fee');
    //   }

    //   const _feeRate = estimateRes.error || !estimateRes.data?.feerate
    //     ? '0.001'
    //     : estimateRes?.data?.feerate;

    //   const feeRate = parseFloat((parseFloat(_feeRate) * 1000).toFixed(8));
    //   const setFeeRes = await this.rpc('settxfee', [feeRate]);
    //   if (!setFeeRes.data || setFeeRes.error) {
    //     this.toasterService.error('Error with Setting Estimate Fee');
    //     return { error: true, data: null };
    //   }
    //   return setFeeRes;
    // }
  }