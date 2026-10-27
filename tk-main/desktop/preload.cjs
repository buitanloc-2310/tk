const { contextBridge } = require('electron');

// Zero embedded secrets or admin tokens. Uses server-side session & RBAC of nghiepvu.skyfirst.io.vn.
contextBridge.exposeInMainWorld('sfnDesktop', {
  platform: process.platform,
  arch: process.arch,
  appName: 'Trung tâm Nghiệp vụ Số Sky First',
  organization: 'Mạng lưới Giáo dục và Phát triển Cộng đồng Sky First',
  appUrl: 'https://nghiepvu.skyfirst.io.vn',
  version: '6.0.0'
});
