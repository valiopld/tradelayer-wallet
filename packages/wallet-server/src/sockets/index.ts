import { FastifyInstance } from "fastify"
import { Socket, Server } from "socket.io";
import { io, Socket as SocketClient } from 'socket.io-client';
import { SocketScript } from '../socket-script/socket-script';
export let walletSocketSevice: WalletSocketSevice;
export let serverSocketService: ServerSocketService;

export const initWalletConnection = (app: FastifyInstance, socketScript: SocketScript) => {
    walletSocketSevice = new WalletSocketSevice(app, socketScript);
};

export const initServerConnection = () => {
    serverSocketService = new ServerSocketService();
}

class WalletSocketSevice {
    public io: Server;
    private socketScript: SocketScript;
    private lastBlock: number = 0;

    constructor(app: FastifyInstance, socketScript: SocketScript) {
        const socketOptions = { cors: { origin: "*", methods: ["GET", "POST"] } };
        this.io = new Server(app.server, socketOptions);
        this.socketScript = socketScript;
        this.handleEvents()
    }

    private handleEvents() {
        this.io.on('connection', this.onConnection.bind(this));
    }

    private onConnection(socket: Socket) {
        console.log(`FE app Connected`);
        this.startBlockCounting(socket);
        this.handleFromWalletToServer(socket, 'orderbook-market-filter');
        this.handleFromWalletToServer(socket, 'update-orderbook');
        this.handleFromWalletToServer(socket, 'dealer-data');

        this.handleFromServerToWallet(socket, 'orderbook-data');
        this.handleFromServerToWallet(socket, 'aksfor-orderbook-update');
    }

    private handleFromServerToWallet(socket: Socket, eventName:string) {
        serverSocketService.socket.on(eventName, (data: any) => socket.emit(eventName, data));
    }

    private handleFromWalletToServer(socket: Socket, eventName: string) {
        socket.on(eventName, (data: any) => serverSocketService.socket.emit(eventName, data));
    }

    private startBlockCounting(socket: Socket) {
            setInterval(async () => {
                const { asyncClient } = this.socketScript;
                if (!asyncClient) return;
                const bbhRes = await asyncClient('getbestblockhash');
                if (bbhRes.error || !bbhRes.data) return null;
                const bbRes = await asyncClient('getblock', bbhRes.data);
                if (bbRes.error || !bbRes.data?.height) return null;
                const height = bbRes.data.height;

                if (this.lastBlock < height) {
                    this.lastBlock = height;
                    socket.emit('newBlock', height);
                    console.log(`New Block: ${height}`)
                }
            }, 5000);
    }
}

class ServerSocketService {
    public socket: SocketClient;
    constructor() {
        const host = 'http://66.228.57.16:76'
        this.socket = io(host, { timeout: 1000, reconnectionAttempts: 2 });
        this.handleEvents();
    }

    private handleEvents() {
        this.socket.on('connect', this.onConnection);
    }

    private onConnection() {
        console.log(`Connected to the API Server`);
    }
}