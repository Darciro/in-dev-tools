// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const axios = require("axios");
const { exec } = require('child_process');
const fs = require('fs');
const fsPromise = require('fs/promises');
const publicPath = path.join(__dirname, 'public');
const configFile = publicPath + '/config-integer-dev-tools';
const apiBaseURL = 'https://dev.azure.com/integer-consulting/_apis/projects'; // ?api-version=2.0

// Uncomment to enable live reload
/*require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});*/

let authConfig = false;
let mainWindow;
let userApi;
let tokenApi;
let apiConfig;

// Tries to load config file on start
(() => {
  if( !fs.existsSync(configFile) )
      return;

    fs.readFile(configFile, function (err, data) {
      if (err)
        return false;

      const fileData = data.toString()
      const fileLines = fileData.split("\n");
      fileLines.forEach((line) => {
        if( line.length === 0 )
          return;

        const cols = line.split('=');
        if( cols[0] === 'email' ) {
          userApi = cols[1];
        }

        if( cols[0] === 'token' ) {
          tokenApi = cols[1];
        }

        apiConfig = {
          headers: {
            'Authorization': 'Basic ' + btoa(userApi + ':' + tokenApi)
          }
        }
      });
    });

    authConfig = true;
})();

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200, // 1200
    height: 800,
    // frame: false,
    show: false,
    icon: path.join(__dirname, 'images/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if( authConfig ) {
    // and load the index.html of the app.
    mainWindow.loadFile('index.html')
  } else {
    mainWindow.loadFile('login.html')
  }

  // shows the window (set to false on creation)
  mainWindow.show()

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // mainWindow.maximize();

  mainWindow.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });

}

// Write configuration file with API authentication
createAuthConfig = async (userData) => {
  const configString = 'email=' + userData.email + '\n' + 'token=' + userData.token;
  fs.writeFile(configFile, configString, (error) => {
    if( error )
      return false;

    return true;
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// Handle authentication
ipcMain.handle('auth-channel', async (event, userData) => {
  return await axios.get(apiBaseURL, {
    headers: {
      'Authorization': 'Basic ' + btoa(userData.email + ':' + userData.token)
    }
  }).then((res) => {
    if (res.status !== 200)
      return false;

    createAuthConfig(userData);
    mainWindow.loadFile('index.html')
  })
  .catch((error) => {
    console.error('Error', error)
    return false;
  });
})

// Returns all projects for the logged user
ipcMain.handle('get-projects-channel', async () => {
  const response = await axios.get(apiBaseURL, apiConfig);
  return response.data;
})

// Returns data from a given project
ipcMain.handle('get-single-project-channel', async (event, projectID) => {
  const response = await axios.get(apiBaseURL + '/' + projectID, apiConfig);
  return response.data;
})

// Retrieve information from a local file for a given project
ipcMain.handle('get-project-local-file-channel', async (event, file) => {
  try {
    const fileData = await fsPromise.readFile(publicPath + '/' + file,  (err, buffer) => {
      if (!err)
        return buffer;

      return false;
    });

    return fileData.toString();

  } catch (err) {
    return false;
  }
})

// Writes project local data
ipcMain.handle('set-project-local-file-channel', async (event, file, data) => {
  fs.writeFile(publicPath + '/' + file, data, (error) => {
    console.error(error)
  })
})

// Initiate devilbox
ipcMain.handle('start-devilbox-channel', async () => {
  exec('cd C:\\xampp\\devilbox & docker-compose up -d php mysql httpd', (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }

    console.log(`stdout: ${stdout}`);
  });
})

// Initiate an IDE (VSCode or PHPStorm) for given project path
ipcMain.handle('open-ide-channel', async (event, ide, project) => {
  const ideName = ide === 'vscode' ? 'code ' : 'PhpStorm ';
  exec(ideName + project, (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }

    console.log(`stdout: ${stdout}`);
  });
})