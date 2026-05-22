// 1. Added ipcMain to the requirements
const { app, BrowserWindow, screen, ipcMain } = require('electron'); 
const path = require('path');

function createWindow() {
    const displays = screen.getAllDisplays();
    
    // 2. Safer Display Logic: 
    // Tries for the 3rd display (index 2), falls back to primary (index 0)
    const targetDisplay = displays[3];

    const win = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        frame: false,
        fullscreen: true, // Recommended for a "Music Video" app experience
        transparent: false,
        webPreferences: {
            // Note: autoplayPolicy usually needs a user gesture in Electron 
            // even with this flag, which is why your splash screen is so important!
            autoplayPolicy: "no-user-gesture-required",
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile(path.join(__dirname, 'index.html'));

    win.webContents.on('did-finish-load', () => {
        console.log("Thalassaphobia Link Established...");
    });

    // 3. This listener stays outside the win object but inside createWindow
    ipcMain.on('close-app', () => {
        console.log("Severing Link...");
        app.quit();
    });
}

// Handle closing when all windows are shut (Standard Electron behavior)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(createWindow);
