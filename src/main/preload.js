// Preload: bruecke zwischen Main-Prozess und Renderer.
// Markdown-Rendering laeuft hier, weil hier Node-Module verfuegbar sind.
'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const MarkdownIt = require('markdown-it');
const taskLists = require('markdown-it-task-lists');

// markdown-it mit GFM-naher Konfiguration.
const md = new MarkdownIt({
  html: false, // Sicherheit: kein rohes HTML aus Markdown
  linkify: true, // Auto-Links
  typographer: true,
  breaks: false,
});
md.use(taskLists, { enabled: false, label: true });

// Bilder mit relativen Pfaden zum data:-URI aufloesen, damit sie im
// file://-Kontext zuverlaessig laden. Alternativ koennten wir auf file:// URLs
// umstellen, aber data: ist robuster und vermeidet Caching-Probleme.
function resolveImagesForBase(html, basePath) {
  if (!basePath) return html;
  const baseDir = path.dirname(basePath);
  return html.replace(/<img\s+([^>]*?)src="([^"]+)"([^>]*)>/gi, (match, pre, src, post) => {
    if (/^(https?:|data:|file:)/i.test(src)) return match;
    const abs = path.resolve(baseDir, decodeURI(src));
    try {
      const ext = path.extname(abs).slice(1).toLowerCase();
      const mime = mimeForImage(ext);
      const data = fs.readFileSync(abs).toString('base64');
      return `<img ${pre}src="data:${mime};base64,${data}"${post}>`;
    } catch {
      return match;
    }
  });
}

function mimeForImage(ext) {
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'bmp': return 'image/bmp';
    default: return 'application/octet-stream';
  }
}

contextBridge.exposeInMainWorld('api', {
  // Datei-Operationen
  openDialog: () => ipcRenderer.invoke('file:openDialog'),
  readFile: (p) => ipcRenderer.invoke('file:read', p),
  resolveLink: (basePath, target) => ipcRenderer.invoke('file:resolveLink', basePath, target),
  isMarkdownPath: (p) => ipcRenderer.invoke('file:isMarkdown', p),
  fileExists: (p) => ipcRenderer.invoke('file:exists', p),
  unwatchFile: (p) => ipcRenderer.invoke('file:unwatch', p),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Pfad-Helfer (Dateinamen ohne Verzeichnis)
  basename: (p) => path.basename(p),
  dirname: (p) => path.dirname(p),

  // Drag-&-Drop: seit Electron 32 ist File.path weg, daher webUtils.
  getPathForFile: (file) => webUtils.getPathForFile(file),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // System
  getLocale: () => ipcRenderer.invoke('app:locale'),
  getTheme: () => ipcRenderer.invoke('theme:current'),

  // Markdown-Rendering
  renderMarkdown: (text, basePath) => {
    const html = md.render(text || '');
    return resolveImagesForBase(html, basePath);
  },

  // Events vom Main-Prozess
  onFileChanged: (cb) => ipcRenderer.on('file:changed', (_e, p) => cb(p)),
  onFileRemoved: (cb) => ipcRenderer.on('file:removed', (_e, p) => cb(p)),
  onOpenExternal: (cb) => ipcRenderer.on('file:openExternal', (_e, files) => cb(files)),
  onThemeChanged: (cb) => ipcRenderer.on('theme:changed', (_e, theme) => cb(theme)),
});
