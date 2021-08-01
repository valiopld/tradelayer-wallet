import { Injectable } from "@angular/core";
import { AddressService } from "./address.service";
import { ApiService } from "./api.service";
import { RpcService } from "./rpc.service";
import { SocketService } from "./socket.service";

export interface BalancesByAddresses {
    [key: string]: Balances
}

export interface Balances {
    [key: string]: {
        propertyId: number,
        type: 'TOKEN' | 'FIAT';
        name: string;
        available: number;
        locked: number;
    }
}

@Injectable({
    providedIn: 'root',
})

export class BalanceService {
    private _balancesByAdresses: BalancesByAddresses = {};

    constructor(
        private apiServic: ApiService,
        private rpcServic: RpcService,
        private addressService: AddressService,
        private socketService: SocketService,
    ) {
        this.handleSocketEvents()
    }

    private get soChainApi() {
        return this.apiServic.soChainApi;
    }

    get selectedAddress() {
        return this.addressService.activeKeyPair?.address;
    }

    get selectedAddressBalances() {
        if (!this.selectedAddress) return null;
        return this.getBalancesByAddress(this.selectedAddress);
    }

    get allBalances() {
        return this._balancesByAdresses;
    }

    restartBalance() {
        this._balancesByAdresses = {};
    }

    getBalancesByAddress(_address?: string) {
        const address = _address || this.selectedAddress;
        if (!address) return {};
        return this._balancesByAdresses[address] || [];
    }

    getAddressBalanceForId(id: number, _address?: string) {
        const address = _address || this.selectedAddress;
        if (!address) return null;
        return this._balancesByAdresses[address]?.[`bal_${id}`] || null
    }

    getLtcBalance(_address?: string) {
        const address = _address || this.selectedAddress;
        if (!address) return null;
        return this._balancesByAdresses[address]?.[`bal_${999}`] || null
    }

    getAbailableByIdAndAddress(id: number, _address: string): number {
        const address = _address || this.selectedAddress;
        if (!address) return 0;
        return this._balancesByAdresses[address]?.[`bal_${id}`]?.available || 0;
    }

    async updateBalances(_address?: string) {
        const address = _address || this.selectedAddress;
        if (!address) return;
        await this.updateLtcBalanceForAddress(address);
        await this.updateTokensBalanceForAddress(address);
    }

    private async getTokenName(id: number) {
        if (id === 999) return 'tLTC'
        const gpRes = await this.rpcServic.rpc('tl_getproperty', [id]);
        if (gpRes.error || !gpRes.data?.name) return `ID_${id}`;
        return gpRes.data.name;
    }

    private handleSocketEvents() {
        this.socketService.socket.on('newBlock', (blockHeight) => {
            console.log(`New Block: ${blockHeight}`);
            if (this.selectedAddress) this.updateBalances(this.selectedAddress);
        })
    }

    async updateLtcBalanceForAddress(address: string) {
        const balanceRes: any = await this.soChainApi.getAddressBalance(address).toPromise();
        if (!balanceRes.data || balanceRes.status !== 'success') return;

        const { unconfirmed_balance, confirmed_balance } = balanceRes.data;
        if (!this._balancesByAdresses[address]) this._balancesByAdresses[address] = {};
        if (!this._balancesByAdresses[address][`bal_999`]) {
            this._balancesByAdresses[address][`bal_999`] = {
                propertyId: 999,
                type: 'FIAT',
                name: 'tLTC',
                available: 0,
                locked: 0,
            };
        }
        const available = parseFloat(parseFloat(confirmed_balance).toFixed(5));
        const locked = parseFloat(parseFloat(unconfirmed_balance).toFixed(5));
        const bal = { available, locked };
        this.addToBalance(address, 999, bal);
    }

    async updateTokensBalanceForAddress(address: string) {
        const balanceRes: any = await this.rpcServic.rpc('tl_getallbalancesforaddress', [address]);
        if (!balanceRes.data || balanceRes.error) return;
        if (!this._balancesByAdresses[address]) this._balancesByAdresses[address] = {};
        balanceRes.data.forEach(async (d: { propertyid: number, balance: string, reserve: string }) => {
                if (!this._balancesByAdresses[address][`bal_${d.propertyid}`]) {
                    this._balancesByAdresses[address][`bal_${d.propertyid}`] = {
                        propertyId: d.propertyid,
                        type: 'TOKEN',
                        name: await this.getTokenName(d.propertyid),
                        available: parseFloat(d.balance),
                        locked: 0,
                    }
                } else {
                    const balanceObj = { available: parseFloat(d.balance) , locked: 0 };
                    this.addToBalance(address, d.propertyid, balanceObj);
                }
            });
    }

    private addToBalance(address: string, id: number, balance: { available?: number, locked?: number }) {
        const { available, locked } = balance;
        const bal = this._balancesByAdresses[address][`bal_${id}`];
        if (available || available === 0) bal.available = available;
        if (locked || locked === 0) bal.locked = locked;
    }

    lockBalance(address: string, id: number, amount: number) {
        const bal = this._balancesByAdresses[address][`bal_${id}`]
        bal.available -= amount;
        bal.locked += amount;
    }

    async updateLockedBalancesByopenedPositions(positions: any) {
        await this.updateBalances();
        const address = this.selectedAddress;
        if (!address) return;
        const values = Object.values(this._balancesByAdresses[address]);
        if (!positions.length) {
            values.forEach(v => v.locked = 0);
        } else {
            positions.forEach((p: any) => {
                const fee = 0.05;
                const v = values.find(v => v.propertyId === 999);
                if (!v) return;
                const available = parseFloat((v.available - fee).toFixed(5));
                const locked = parseFloat((v.locked + fee).toFixed(5));
                this.addToBalance(address, v.propertyId, {available, locked});

                values.forEach(v => {
                    if (p.propIdForSale === v.propertyId) {
                        const amount = p.isBuy
                            ? parseFloat((p.amount * p.price).toFixed(4))
                            : p.amount;
                        const available = parseFloat((v.available - amount).toFixed(5));
                        const locked = parseFloat((v.locked + amount).toFixed(5));
                        this.addToBalance(address, v.propertyId, {available, locked});
                    }
                });
            })

        }
    }
}
