const { time } = require('console');
const electron = require('electron');

const {Menu , Tray , dialog} = electron.remote;

var path = require('path');

//File path of the added audio file
global.filepath = undefined;

//Create menu templates
const mainMenuTemplate = [
	{
		label:'File',
		submenu: [
			{
				label: 'Add recording',
				click(){
					createAddRecording();
				}
			},
			{
				label:'Quit',
				accelerator: process.platform == 'darwin' ? 'Command+Q' : 
				'Ctrl+Q',
				click(){
					app.quit();
				}
			}
		]
	},
    {
		label: 'Developer Tools',
		submenu:[
			{
				label: 'Toggle DevTools',
				accelerator: process.platform == 'darwin' ? 'Command+I' : 
				'Ctrl+I',
				click(item,focusedWindow){
					focusedWindow.toggleDevTools();
				}
			},
			{
				role: 'reload'
			}
		]
	},
	{
		label:	'Commands',
		submenu:[
			{
				label: 'Overlapped Speech Detection',
				click(){
					OverlappedSpeechDetection();
				}
			},
			{
				label: 'Speaker Diarization',
				click(){
					SpeakerDiarization();
				}
			},
			{
				label: 'Speech Separation',
				click(){
					SpeakerSeparation();
				}
			},
			{
				label: 'Automatic Speech Recognition',
				click(){
					ASR();
				}
			},
			{
				label: 'Meeting Conversion',
				click(){
					MeetingConversion();
				}
			}
		]
	},
];

const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
Menu.setApplicationMenu(mainMenu);

//If mac , add empty object on menu
if(process.platform == 'darwin'){
	mainMenuTemplate.unshift({});
}

const WFPlayer = require('/home/mugen/Desktop/projects/GUI/node_modules/wfplayer/dist/wfplayer.js');
                
var wf = new WFPlayer({
	container: document.querySelector('#waveform'),
	
	mediaElement: document.querySelector('#audio_to_be_displayed'),
	// Whether use web worker
		useWorker: true,

	// The refresh delay time
	refreshDelay: 50,

	// Whether to display wave
	wave: true,

	// Waveform color
	waveColor: 'rgba(255, 255, 255, 0.1)',

	// Background color
	backgroundColor: 'rgb(28, 32, 34)',

	// Whether to display cursor
	cursor: true,

	// Cursor color
	cursorColor: '#ff0000',

	// Whether to display progress
	progress: true,

	// progress color
	progressColor: 'rgba(255, 255, 255, 0.5)',

	// Whether to display grid
	grid: true,

	// Grid color
	gridColor: 'rgba(255, 255, 255, 0.05)',

	// Whether to display ruler
	ruler: true,

	// Ruler color
	rulerColor: 'rgba(255, 255, 255, 0.5)',

	// Whether to display ruler at the top
	rulerAtTop: true,

	// Pixel ratio
	pixelRatio: window.devicePixelRatio,

	// Which audio channel to render
	channel: 0,

	// Duration of rendering
	duration: 10,

	// Waveform height scale ratio
	waveScale: 1,
});

wf.setOptions({
	duration: 100 ,
	wave: true,
});

//Handle create add recording
function createAddRecording(){
	if (process.platform !== 'darwin') {
		const files = dialog.showOpenDialog({
			title: 'Select the Audio File to be uploaded',
			defaultPath: path.join(__dirname, './'),
			buttonLabel: 'Upload',
			// Restricting the user to only Audio Files.
			properties: ['openFile'],
			filters: [{
				name:'Audio Files', 
				extensions:[ 'wav' ]
			}]
		}).then(file => {
			// Stating whether dialog operation was
			// cancelled or not.
			console.log(file.canceled);
			if (!file.canceled) {
			// Updating the GLOBAL filepath variable
			// to user-selected file.
				global.filepath = file.filePaths[0].toString();
				console.log(global.filepath);
                
				var audio_to_be_processed = document.getElementById('audio_to_be_processed');
                audio_to_be_processed.src = global.filepath;
                audio_to_be_processed.preload="metadata";
				
				var audio_to_be_displayed = document.getElementById('audio_to_be_displayed');

				audio_to_be_processed.onloadedmetadata = function() {
					var duration = Math.ceil( audio_to_be_processed.duration)
					if(duration >= 100){
						wf.setOptions({
							duration: 100 ,
						});
					}else{
						wf.setOptions({
							duration: duration ,
						});
					}
				};
				
				console.log('Conversion start');
				const in_file_audio = global.filepath;
				const out_file_audio = in_file_audio.split('.')[0]+'.mp3';

				
				const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
				var FFmpeg = require('fluent-ffmpeg');
				FFmpeg.setFfmpegPath(ffmpegInstaller.path);
				
				var command = FFmpeg({ source: in_file_audio }).withAudioChannels(1).withAudioFrequency(8000).on('start', function(commandLine) {
					// The 'start' event is emitted just after the FFmpeg
					// process is spawned.
					console.log('Spawned FFmpeg with command: ' + commandLine);
				}).on('codecData', function(data) {
					// The 'codecData' event is emitted when FFmpeg first
					// reports input codec information. 'data' contains
					// the following information:
					// - 'format': input format
					// - 'duration': input duration
					// - 'audio': audio codec
					// - 'audio_details': audio encoding details
					// - 'video': video codec
					// - 'video_details': video encoding details
					console.log('Input is ' + data.audio + ' audio with ' + data.video + ' video');
				}).on('progress', function(progress) {
					// The 'progress' event is emitted every time FFmpeg
					// reports progress information. 'progress' contains
					// the following information:
					// - 'frames': the total processed frame count
					// - 'currentFps': the framerate at which FFmpeg is
					//   currently processing
					// - 'currentKbps': the throughput at which FFmpeg is
					//   currently processing
					// - 'targetSize': the current size of the target file
					//   in kilobytes
					// - 'timemark': the timestamp of the current frame
					//   in seconds
					// - 'percent': an estimation of the progress
			 
					console.log('Processing: ' + progress.percent + '% done');
				}).on('error', function(err) {
					// The 'error' event is emitted when an error occurs,
					// either when preparing the FFmpeg process or while
					// it is running
					console.log('Cannot process video: ' + err.message);
				}).on('end', function() {
					// The 'end' event is emitted when FFmpeg finishes
					// processing.
					
					//Load the waveform
					audio_to_be_displayed.src = out_file_audio;
					wf.load(audio_to_be_displayed);
                	// Load the track 
					loadTrack(audio_to_be_displayed.src);
					console.log('Processing finished successfully');
				}).saveToFile(out_file_audio);
			}
		}).catch(err => {
			console.log(err)
		});
	}else{
		// If the platform is 'darwin' (macOS)
		dialog.showOpenDialog({
			title: 'Select the File to be uploaded',
			defaultPath: path.join(__dirname, './'),
			buttonLabel: 'Upload',
			filters: [
				{
					name: 'Audio Files',
					extensions: ['wav']
				}, ],
			// Specifying the File Selector and Directory
			// Selector Property In macOS
			properties: ['openFile', 'openDirectory']
		}).then(file => {
			console.log(file.canceled);
			if (!file.canceled) {
				global.filepath = file.filePaths[0].toString();
				console.log(global.filepath);
			}
		}).catch(err => {
			console.log(err)
		});
	}
}
//Handle Overlap Detection System
function OverlappedSpeechDetection(){
	var audio = document.getElementById('audio_to_be_processed');
	var str = audio.src.split("/");
	var name = str[str.length-1];
	var path = audio.src
	var duration = audio.duration;
	var csv_path = './results/ovl_csv/'+name.split('.')[0]+'_ovl.csv';

	const { ipcRenderer } = require('electron')
	ipcRenderer.send('asynchronous-overlap', {name , path , duration , csv_path})

	const fs = require('fs');
	fs.closeSync(fs.openSync(csv_path, 'w'));
	
	//Catch the results from the output csv file every time it is updated
	watch_file(csv_path,'ovl',false)
};
//Handle Speaker Diarization System
function SpeakerDiarization(){
	var audio = document.getElementById('audio_to_be_processed');
	var str = audio.src.split("/");
	var name = str[str.length-1];
	var path = audio.src
	var duration = audio.duration;
	var csv_path = './results/sd_csv/'+name.split('.')[0]+'_sd.csv';

	const { ipcRenderer } = require('electron')
	ipcRenderer.send('asynchronous-speaker_diarization', {name , path , duration,csv_path})

	const fs = require('fs');
	fs.closeSync(fs.openSync(csv_path, 'w'))

	//Catch the results from the output csv file every time it is updated
	watch_file(csv_path,'sd',false)
}
//Handle Spekaer Separation System
function SpeakerSeparation(){
	var audio = document.getElementById('audio_to_be_processed');
	var str = audio.src.split("/");
	var name = str[str.length-1];
	var path = audio.src
	var duration = audio.duration;

	const { ipcRenderer } = require('electron')
	ipcRenderer.send('asynchronous-speaker_separation', {name , path , duration})
	//Create play stop button for each separated source
	ipcRenderer.on('asynchronous-reply-SS', (event, arg) => {
		console.log(arg);
		var results = document.getElementById('SS_results');
		var s = document.createElement('div');
		var audio1 = document.createElement('audio');
		audio1.id = 'track1'
		audio1.src = arg.s1;
		var audio2 = document.createElement('audio');
		audio2.src = arg.s2
		audio2.id = 'track2'
		
		s.appendChild(audio1);
		s.appendChild(audio2);
		//Create button 1
		var but_div1 = document.createElement('div');
		but_div1.className = 'buttons'
		but_div1.style.cssText += 'height: 10%;width: 100%;border: double;'

		var but_div2 = document.createElement('div');
		but_div2.className = "playpause-track";
		but_div2.style.cssText += 'position: relative;border: double;height: 65%;width: 75%;'
		
		var track_text = document.createElement('i')
		track_text.textContent = 'Estimation 1'
		track_text.style.cssText = 'position: absolute;border: double; left: 0%; top:25%;'
		
		//Start-Pause button
		var btt = document.createElement('i');
		btt.id = 'button1'
		btt.className = "fa fa-play-circle "
		btt.style.cssText += 'position: absolute;border: double; right: 0%; top:25%;'
		btt.myParamId = btt.id;
		btt.myParamTrack ='track1';
		btt.myParamIsPLaying =false;
		btt.addEventListener("click", play_pause , false);
		//Stop button
		var btt_stop = document.createElement('i');
		btt_stop.id = 'button1_stop'
		btt_stop.className = "fa fa-stop-circle "
		btt_stop.style.cssText += 'position: absolute;border: double; right: 25%; top:25%;'
		
		btt_stop.myParamId = btt.id;
		btt_stop.myParamTrack ='track1';
		btt_stop.addEventListener("click", stop , false);

		but_div2.appendChild(btt);
		but_div2.appendChild(btt_stop);
		but_div2.appendChild(track_text);

		but_div1.appendChild(but_div2);
		s.appendChild(but_div1);
		
		//Create button 2
		var but2_div1 = document.createElement('div');
		but2_div1.className = 'buttons'
		but2_div1.style.cssText += 'height: 10%;width: 100%;border: double;'

		var but2_div2 = document.createElement('div');
		but2_div2.className = "playpause-track";
		but2_div2.style.cssText += 'position: relative;border: double;height: 65%;width: 75%;'
	
		var track_text2 = document.createElement('i')
		track_text2.textContent = 'Estimation 2'
		track_text2.style.cssText = 'position: absolute;border: double; left: 0%; top:25%;'
		
		//Start-Pause button
		var btt2 = document.createElement('i');
		btt2.id = 'button2'
		btt2.className = "fa fa-play-circle "
		btt2.style.cssText += 'position: absolute;border: double;right: 0%; top:25%;'

		btt2.myParamId = btt2.id;
		btt2.myParamTrack ='track2';
		btt2.myParamIsPLaying =false;
		btt2.addEventListener("click", play_pause , false);
		//Stop button
		var btt2_stop = document.createElement('i');
		btt2_stop.id = 'button2_stop'
		btt2_stop.className = "fa fa-stop-circle "
		btt2_stop.style.cssText += 'position: absolute;border: double; right: 25%; top:25%;'
		
		btt2_stop.myParamId = btt2.id;
		btt2_stop.myParamTrack ='track2';
		btt2_stop.addEventListener("click", stop , false);

		but2_div2.appendChild(btt2);
		but2_div2.appendChild(btt2_stop);
		but2_div2.appendChild(track_text2);
		but2_div1.appendChild(but2_div2);
		s.appendChild(but2_div1);
		
		results.appendChild(s)

		//console.log(btt.parentElement)
		//console.log(but_div2.parentElement)
	})
}

function ASR(){
	var audio = document.getElementById('audio_to_be_processed');
	var str = audio.src.split("/");
	var name = str[str.length-1];
	var path = audio.src
	var duration = audio.duration;
	var txt_name = name.split('.')[0] + '.txt';
	var txt_path = './results/asr_txt/'+txt_name;

	//Create the nessesary txt file that needed to save the transcript
	const fs = require('fs');
	fs.closeSync(fs.openSync(txt_path, 'w'))
	
	const { ipcRenderer } = require('electron')
	ipcRenderer.send('asynchronous-ASR', {name , path , duration})

	watch_file(txt_path,'txt-asr',false);
}

function MeetingConversion(){
	var audio = document.getElementById('audio_to_be_processed');
	var str = audio.src.split("/");
	var name = str[str.length-1];
	var path = audio.src
	var duration = audio.duration;
	var txt_name = name.split('.')[0] + '.txt';
	var txt_path = './results/asr_txt/'+txt_name;
	var ovl_csv = './results/ovl_csv/'+name.split('.')[0]+'_ovl.csv'
	var sd_csv = './results/sd_csv/'+name.split('.')[0]+'_sd.csv'



	//Create the nessesary txt file that needed to save the transcript
	const fs = require('fs');
	fs.closeSync(fs.openSync(ovl_csv, 'w'))
	fs.closeSync(fs.openSync(sd_csv, 'w'))
	fs.closeSync(fs.openSync(txt_path, 'w'))
	
	const { ipcRenderer } = require('electron')
	ipcRenderer.send('asynchronous-meeting', {name , path , duration,txt_path,ovl_csv,sd_csv})

	//Watch the txt file for the transcript
	watch_file(sd_csv,'sd',true);
	watch_file(ovl_csv,'ovl',true);
	watch_file(txt_path,'txt',true);

}
//Function that set the main track to point of detected occurance
function setToPoint(event) {
	set_to(event.currentTarget.myParam);
}
//Start and pause side menu tracks
function play_pause(event){
	isPlaying = event.currentTarget.myParamIsPLaying;
	track = document.getElementById(event.currentTarget.myParamTrack);
	button = document.getElementById(event.currentTarget.myParamId);
	if (!isPlaying){
		// Play the loaded track
		track.play();
		event.currentTarget.myParamIsPLaying = true;
		button.className = "fa fa-pause-circle"
	}else{
		track.pause();
		event.currentTarget.myParamIsPLaying=false;
		button.className = "fa fa-play-circle" 
	}
}
//Stop and reset side menu tracks
function stop(event){
	track = document.getElementById(event.currentTarget.myParamTrack);
	button = document.getElementById(event.currentTarget.myParamId);
	isPlaying = button.myParamIsPLaying;
	if (!isPlaying){
		// Play the loaded track
		track.pause();
		track.currentTime = 0
		button.myParamIsPLaying = false;
	}else{
		track.pause();
		track.currentTime = 0
		button.myParamIsPLaying=false;
		button.className = "fa fa-play-circle"
	}
	
}