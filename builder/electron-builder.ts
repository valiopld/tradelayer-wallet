import { App, app, BrowserWindow, globalShortcut, ipcMain, dialog, ipcRenderer } from 'electron';
import { AppImageUpdater, NsisUpdater, MacUpdater } from 'electron-updater';
import { ChildProcess, fork } from 'child_process';
import * as url from 'url';
import * as path from 'path';

class ElectronApp {
    private app: App;
    private serverProcess: ChildProcess;
    private autoUpdater: AutoUpdater;
    public mainWindow: BrowserWindow | null = null;

    constructor(app: App) {
        this.app = app;
        this.handleOnEvents();
        this.handleAngularSignals()
        this.disableSecurityWarnings();
        this.serverProcess = fork(path.join(__dirname, './server/index.js'), ['args'], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        this.serverProcess.on("message", (message: any) => console.log({message}));
        this.serverProcess.send('init');
    }

    private handleAngularSignals() {
        ipcMain.on('angular-electron-message', (_, message) => {
            const { event, data } = message;
            switch (event) {
                case 'open-dir-dialog':
                    this.openSelectDirDialog();
                    break;
            
                case 'check-version':
                    this.autoUpdater = new AutoUpdater(this);
                    break;

                case 'download-new-version':
                    this.autoUpdater.download();
                    break;

                default:
                    break;
            }
        });
    }

    private async openSelectDirDialog() {
        const result = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openDirectory'],
          });
        const path = result.filePaths[0];
        this.sendMessageToAngular('selected-dir', path);
    }

    sendMessageToAngular(event: string, data: any) {
        if (!this.mainWindow) return;
        this.mainWindow.webContents.send('angular-electron-message', { event, data });
    }

    private handleOnEvents() {
        this.app.on('ready', () => this.createMainWindow());

        this.app.on('window-all-closed', async () => {
            if (process.platform !== 'darwin') app.quit();
            await new Promise(res => {
                this.serverProcess.on("exit", () => res(true));
                setTimeout(() => res(true), 10000);
            });
            app.quit();
        });

        this.app.on('activate', () => {
            if (!this.mainWindow) this.createMainWindow();
        });

        this.app.on('browser-window-focus', function () {
            globalShortcut.register("CommandOrControl+R", () => console.log("ctrl+R Shortcut Disabled"));
            globalShortcut.register("F5", () => console.log("F5 Disabled"));
        });

        this.app.on('browser-window-blur', function () {
            globalShortcut.unregister('CommandOrControl+R');
            globalShortcut.unregister('F5');
        });
    }

    private handleMainWindowEvents() {
        if (!this.mainWindow) return;
        this.mainWindow.webContents.on('did-fail-load', () => {
            if (this.mainWindow) this.loadUrl(this.mainWindow);
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        this.mainWindow.on('close', async () => {
            if (this.serverProcess?.connected) this.serverProcess.send('stop');
        });
    }


    createMainWindow() {
        this.serverProcess.send('start');
        const windowOptions = {
            width: 1280,
            height: 800,
            webPreferences: {
              nodeIntegration: true,
              contextIsolation: false,
            }
        };
        this.mainWindow = new BrowserWindow(windowOptions);
        this.handleMainWindowEvents();
        this.loadUrl(this.mainWindow);
        // this.mainWindow.webContents.openDevTools();
    }

    private loadUrl(window: BrowserWindow) {
        window.loadURL(
            url.format({
              pathname: path.join(__dirname, `./fe/index.html`),
              protocol: "file:",
              slashes: true
            }),
        );
    }

    private disableSecurityWarnings() {
        process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
    }
}

class AutoUpdater {
    private autoUpdater: NsisUpdater | MacUpdater | AppImageUpdater;
    private electronApp: ElectronApp;

    constructor(app: ElectronApp) {
        this.electronApp = app;
        this.initAutoUpdater();
        this.handleEvents();
        this.check();
    }

    initAutoUpdater() {
        this.autoUpdater = process.platform === "win32"
        ? new NsisUpdater()
        : process.platform === "darwin"
            ? new MacUpdater()
            : process.platform === "linux"
                ? new AppImageUpdater()
                : null;

        if (!this.autoUpdater) return;
        this.autoUpdater.autoDownload = false;
        this.autoUpdater.setFeedURL({
            owner: "valiopld",
            repo: 'tradelayer-wallet',
            provider: 'github',
            user: 'valiopld',
        });
    }

    handleEvents() {
        if (!this.autoUpdater) return;
        const e = 'update-app';
        this.autoUpdater.on("error", (error) => this.electronApp.sendMessageToAngular(e, { state: 1, data: error }));
        this.autoUpdater.on("checking-for-update", (data) => this.electronApp.sendMessageToAngular(e, { state: 2, data }));
        this.autoUpdater.on("update-not-available", () => this.electronApp.sendMessageToAngular(e, { state: 3, data: null }));
        this.autoUpdater.on("update-available", () => this.electronApp.sendMessageToAngular(e, { state: 4, data: null }));
        this.autoUpdater.on("download-progress", () => this.electronApp.sendMessageToAngular(e, { state: 5, data: null }));
        this.autoUpdater.on("update-downloaded", () => {
            this.electronApp.sendMessageToAngular(e, { state: 6, data: null });
            this.autoUpdater.quitAndInstall(true, true);
        });
    }

    async download() {
        this.autoUpdater.downloadUpdate();
    }

    async check() {
        this.autoUpdater.checkForUpdates();
    }
}

new ElectronApp(app);
