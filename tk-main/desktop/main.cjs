const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('node:path');

// GFI Desktop Application Wrapper — Uses unified Sky First Digital Operations Center backend & RBAC
const TARGET_URL = process.env.SFN_APP_URL || 'https://nghiepvu.skyfirst.io.vn';
const ALLOWED_HOSTS = new Set([
  'nghiepvu.skyfirst.io.vn',
  'www.skyfirst.io.vn',
  'ctt.skyfirst.io.vn',
  '127.0.0.1',
  'localhost'
]);

function isAllowedHost(urlStr) {
  try {
    const u = new URL(urlStr);
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Trung tâm Nghiệp vụ Số Sky First — Sky First Network',
    icon: path.join(__dirname, '..', 'public', 'sfn-logo.png'),
    backgroundColor: '#f5f9fc',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedHost(url)) {
      return { action: 'allow' };
    }
    if (url.startsWith('https://') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedHost(url)) {
      event.preventDefault();
      if (url.startsWith('https://')) shell.openExternal(url);
    }
  });

  win.loadURL(TARGET_URL).catch(() => {
    win.loadFile(path.join(__dirname, '..', 'public', 'index.html'));
  });
}

app.whenReady().then(() => {
  const template = [
    {
      label: 'Hệ thống',
      submenu: [
        { label: 'Tải lại trang', accelerator: 'CmdOrCtrl+R', click: (_, w) => w && w.reload() },
        { type: 'separator' },
        { label: 'Thoát', role: 'quit' }
      ]
    },
    {
      label: 'Hiển thị',
      submenu: [
        { label: 'Thu phóng chuẩn', role: 'resetZoom' },
        { label: 'Phóng to', role: 'zoomIn' },
        { label: 'Thu nhỏ', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toàn màn hình', role: 'togglefullscreen' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
