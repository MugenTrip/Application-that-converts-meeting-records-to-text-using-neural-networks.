const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow  , dialog , ipcMain , Menu  } = electron;
const csv = require('csv-parser');
const fs = require('fs');

let mainWindow;

//Listen for the app to be ready
app.on('ready' , function()
{
	//Create new Window
	mainWindow = new BrowserWindow({
		webPreferences:{
			nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
	});
	//Load html into window
	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname , "mainWindow.html"),
		protocol:'file:',
		slashes: true
	}));

	//Quit app when closed
	mainWindow.on('closed' , function(){
		app.quit();
	});
});


//Handle the Overlapped Detection Request
ipcMain.on('asynchronous-overlap', (event, arg) => {
	var name = arg.name;
	var duration = arg.duration;
	var audio_path = arg.path;
	var csv = arg.csv_path;
	audio_path = audio_path.split('file://')[1];
	var image_name = name.split('.')[0] + '.png'
	console.log(csv)

	const {PythonShell} = require('python-shell');

	let option = {
		mode: 'text',
  		pythonOptions: ['-u'], // get print results in real-time
  		scriptPath: './python_scripts/',
  		args: [name,audio_path,duration,csv]
	}

	PythonShell.run('overlap_detection.py',option,function(err,results) {
		if(err) throw err;
		console.log('Finished')

	});
})

//Handle the Speaker Diarization Request
ipcMain.on('asynchronous-speaker_diarization', (event, arg) => {
	var name = arg.name;
	var duration = arg.duration;
	var audio_path = arg.path;
	audio_path = audio_path.split('file://')[1];
	var csv = arg.csv_path;

	const {PythonShell} = require('python-shell');

	let option = {
		mode: 'text',
  		pythonOptions: ['-u'], // get print results in real-time
  		scriptPath: './python_scripts/',
  		args: [name,audio_path,duration,csv]
	}

	PythonShell.run('speaker_diarization.py',option,function(err,results) {
		if(err) throw err;
		console.log('Finished');
	});


})

//Handle the Speech Separation Request
ipcMain.on('asynchronous-speaker_separation', (event, arg) => {
	var name = arg.name;
	var duration = arg.duration;
	var audio_path = arg.path;
	audio_path = audio_path.split('file://')[1];
	var csv_name = name.split('.')[0] + '.csv';
	var image_name = name.split('.')[0] + '.png'

	const {PythonShell} = require('python-shell');

	let option = {
		mode: 'text',
  		pythonOptions: ['-u'], // get print results in real-time
  		scriptPath: './python_scripts/',
  		args: [name , audio_path]
	}

	PythonShell.run('speech_separation.py',option,function(err,results) {
		if(err) throw err;
		var arg = {s1:results[results.length - 2], s2:results[results.length - 1]};
		event.reply('asynchronous-reply-SS', arg);
		console.log('Finished');
	});


})

//Handle Automatic Speech Recognition Request
ipcMain.on('asynchronous-ASR', (event, arg) => {
	var name = arg.name;
	var duration = arg.duration;
	var audio_path = arg.path;
	audio_path = audio_path.split('file://')[1];
	var txt_name = './results/asr_txt/'+name.split('.')[0] + '.txt';
	var image_name = name.split('.')[0] + '.png'

	const {PythonShell} = require('python-shell');

	let option = {
		mode: 'text',
  		pythonOptions: ['-u'], // get print results in real-time
  		scriptPath: './python_scripts/',
  		args: [name,audio_path,duration,txt_name]
	}

	PythonShell.run('ASR.py',option,function(err,results) {
		if(err) throw err;
		console.log('Finished');
	});


})

//Handle Speech to Text meeting conversion
ipcMain.on('asynchronous-meeting', (event, arg) => {
	var name = arg.name;
	var duration = arg.duration;
	var audio_path = arg.path;
	audio_path = audio_path.split('file://')[1];
	var txt_path = arg.txt_path;
	var ovl_csv = arg.ovl_csv;
	var sd_csv = arg.sd_csv;

	console.log(txt_path)

	const {PythonShell} = require('python-shell');

	let option = {
		mode: 'text',
  		pythonOptions: ['-u'], // get print results in real-time
  		scriptPath: './python_scripts/',
  		args: [name,audio_path,duration,txt_path,ovl_csv,sd_csv]
	}

	PythonShell.run('meeting_conversion.py',option,function(err,results) {
		if(err) throw err;
		console.log('Finished');
	});


})

//Handle Save As request
ipcMain.on('save_as', (event, arg) => {

	const options = {
  		defaultPath: './' ,
	}
	dialog.showSaveDialog(null, options).then( (path) => {
 		console.log(path);
		event.reply('save_as_reply', path);
	});
})

//Handle the plot request
ipcMain.on('asynchronous-plot', (event, arg) => {
	var duration = arg.duration;
	var csv_ovl = arg.csv_ovl;
	var csv_sd = arg.csv_sd;

	console.log(csv)

	const {PythonShell} = require('python-shell');

	let option = {
		mode: 'text',
  		pythonOptions: ['-u'], // get print results in real-time
  		scriptPath: './python_scripts/',
  		args: [duration,csv_ovl,csv_sd]
	}

	PythonShell.run('draw_plot.py',option,function(err,results) {
		if(err) throw err;
	});
})