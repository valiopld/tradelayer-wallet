import { homedir } from 'os';
import { join } from 'path';

export const addTESTNETNodeServer = '5.9.150.112:19335';

export const defaultDirObj = {
    WINDOWS: `${homedir()}/AppData/Roaming/Litecoin`,
    LINUX: `${homedir()}/.litecoin/`,
    MAX: `${homedir()}/Library/Application Support/Litecoin/`,
};

export const coreFilePathObj = {
    WINDOWS: join(__dirname, 'litecoind.exe'),
    LINUX: join(__dirname, 'litecoind'),
    MAX: join(__dirname, 'litecoind-mac'),
};