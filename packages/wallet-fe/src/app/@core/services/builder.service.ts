import { Injectable } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { ApiService } from "./api.service";
import { RpcService } from "./rpc.service";


@Injectable({
    providedIn: 'root',
})

export class BuilderService {

    constructor(
        private apiService: ApiService,
        private rpcService: RpcService,
    ) {}

    get ssApi() {
        return this.apiService.socketScriptApi;
    }

    get soChainApi() {
        return this.apiService.soChainApi;
    }

    async build(txInfo: any) {
        try {
            if (!this.rpcService.isOffline) {
                const { fromAddress } = txInfo;
                const utxosRes: any = await this.soChainApi.getTxUnspents(fromAddress).toPromise();
                if (utxosRes.status !== 'success' || !utxosRes.data?.txs) {
                    return { error: 'Error with getting UTXOS of provided Address', data: null };
                }
                txInfo.inputs = utxosRes.data?.txs.map((tx: any) => {
                    return {
                        txid: tx.txid,
                        vout: tx.output_no,
                        amount: parseFloat(tx.value),
                        scriptPubKey: tx.script_hex,
                    };
                });
            }
    
            const res = await this.ssApi.build(txInfo).toPromise();
            return res;
        } catch(err) {
            return { error: 'Error with getting UTXOS of provided Address', data: null }
        }
    }
}
