const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 700,
        height: 650,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
        },
        autoHideMenuBar: true, // Oculta la barra de menú estándar
        frame: true, // Elimina el marco de la ventana para un diseño personalizado
    });

    mainWindow.loadFile('index.html');

    ipcMain.handle('open-file-dialog', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Excel Files', extensions: ['xlsm'] },
            ],
        });
        return result.filePaths;
    });

    mainWindow.on('closed', () => {
        app.quit(); // Cierra la aplicación cuando todas las ventanas están cerradas
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
