/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 * 
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

let idtApi = {
  auth: async(userData) => {
    return await ipcRenderer.invoke('auth-channel', userData);
  },
  getProjects: async() => {
    return await ipcRenderer.invoke('get-projects-channel');
  },
  getSingleProject: async(projectID) => {
    return await ipcRenderer.invoke('get-single-project-channel', projectID);
  },
  getProjectLocalFile: async(file) => {
    return await ipcRenderer.invoke('get-project-local-file-channel', file);
  },
  setProjectLocalFile: async(file, data) => {
    return await ipcRenderer.invoke('set-project-local-file-channel', file, data);
  },
  startDevilbox: async() => {
    return await ipcRenderer.invoke('start-devilbox-channel');
  },
  openIDE: async(ide, project) => {
    return await ipcRenderer.invoke('open-ide-channel', ide, project);
  },
}

contextBridge.exposeInMainWorld('inDevTools', idtApi);