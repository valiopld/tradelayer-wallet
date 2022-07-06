import { exec, execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { coreFilePathObj, defaultDirObj } from "../conf/windows.conf";
import { RpcClient } from 'tl-rpc';
import { fasitfyServer } from "..";

interface IFlagsObject {
    testnet: number;
    txindex: number;
    startclean: number;
    reindex: number;
    addnode: string;
    datadir: string;
}

class FlagsObject implements IFlagsObject {
    public testnet: number = 0;
    public txindex: number = 0;
    public startclean: number = 0;
    public reindex: number = 0;
    public addnode: string = null;
    public datadir: string = null;

    constructor(options: any) {
        const toBool = (param: boolean) => param ? 1 : 0;

        this.testnet = toBool(!!options.testnet);
        this.txindex = toBool(!!options.txindex);
        this.startclean = toBool(!!options.startclean);
        this.reindex = toBool(!!options.reindex);
        this.addnode = options.addnode;
        this.datadir = options.datadir;
    }
}

export const startWalletNode = async (walletNodeOptions: any) => {
    try {
        const flagsObject = new FlagsObject(walletNodeOptions);

        // Read config File
        const path = flagsObject.datadir || defaultDirObj;
        const configFilePath = join(path, `litecoin.conf`);
        const isConfFileExist = existsSync(configFilePath);
        if (!isConfFileExist) throw(`Config file (litecoin.conf) doesn't exist in: ${path}`);
        const confFile = readFileSync(configFilePath, { encoding: 'utf8' });
        const configObj: any = structureConfFile(confFile);
        const { rpcuser, rpcport, rpcpassword } = configObj;
        if (!rpcuser || !rpcport || !rpcpassword) throw(`Incorrect Config File ${path}`);

        // Run The core
        const flagsString = convertFlagsObjectToString(flagsObject);
        const filePathWithFlags = coreFilePathObj.LTC + flagsString;
        if (!filePathWithFlags) throw(`Error with Starting Node. Code 1`)
        return await checkIsCoreStarted(filePathWithFlags, configObj);;
    } catch(error) {
        return { error: error.message || error || 'Undefined Error' };
    }
};

const convertFlagsObjectToString = (flagsObject: any) => {
    const _toStr = (flag: string, value: string | boolean) => ` -${flag}=${value}`;
    let str = ' -txindex=1';
    Object.keys(flagsObject)
        .forEach((flag: string) => {
            if (flagsObject[flag]) return str += _toStr(flag, flagsObject[flag]);
        });
    return str || '';
}

const structureConfFile = (conf: string) => {
    const confObj = {};
    conf.split('\n').forEach((l: string) => {
        const a = l.split('=');
        if (l.startsWith('#') || !a[0] || !a[1]) return;
        confObj[a[0]] = a[1].replace('\r', '');
    });
    return confObj;
};

const checkIsCoreStarted = async (filePathWithFlags: string, configObj: any) => {
    return new Promise(async (resolve) => {
        const { rpcuser, rpcport, rpcpassword, rpchost } = configObj;

        const client = new RpcClient({
            username: rpcuser,
            password: rpcpassword,
            host: rpchost || 'localhost',
            port: rpcport || 9332,
            timeout: 2000,
        });

        const isActiveCheck = () => {
            return new Promise(async (res) => {
                const check = await client.call('tl_getinfo');
                if (check.data) res(2);
                if (check.error && !check.error.includes('ECONNREFUSED')) res(check);
                if (check.error && check.error.includes('ECONNREFUSED')) res(0)
            });
        };
        const firstCheck = await isActiveCheck();
        if (firstCheck !== 0) return resolve({ error: 'The core is probably Already Running'});

        exec(filePathWithFlags, (error, stdout, stderr) => {
            resolve({ error: stderr || error || stdout || 'Error with Starting Node. Code 2'});
            fasitfyServer.mainSocketService.currentSocket
                .emit("core-error", stderr || error?.message || error || stdout);
            fasitfyServer.rpcClient = null;
            fasitfyServer.rpcPort = null;
        });

        const interval = setInterval(async () => {
            const check: any = await isActiveCheck();
            if (check === 0) return;
            if (check === 2) {
                fasitfyServer.rpcClient = client;
                fasitfyServer.rpcPort = rpcport;
                clearInterval(interval);
                fasitfyServer.mainSocketService.startBlockCounting(2000);
                resolve({ data: true });
            } else {
                fasitfyServer.mainSocketService.currentSocket
                    .emit("core-starting-error", check);
            }
        }, 500);
    });
};