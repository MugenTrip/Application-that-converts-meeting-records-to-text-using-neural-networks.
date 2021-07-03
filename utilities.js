const { parse } = require('path');

function save_as(){
	const { ipcRenderer } = require('electron');
	const fs = require('fs');
	
	ipcRenderer.send('save_as')

	ipcRenderer.on('save_as_reply', (event, path) => {
		console.log(path.filePath);
		var txt = document.getElementById('textarea1');
		// write to a new file named 2pac.txt
		fs.writeFile(path.filePath, txt.value, (err) => {
    		// throws an error, you could also catch it here
    		if (err) throw err;
    		// success case, the file was saved
    		console.log('File saved!');
		});
	});
}

function draw_plot(evt,type){
	var audio = document.getElementById('audio_to_be_processed');
	var str = audio.src.split("/");
	var name = str[str.length-1];
	var duration = audio.duration;
	if(type=='OSD'){
		var csv_ovl = './results/ovl_csv/'+name.split('.')[0]+'_ovl'+'.csv';
		var csv_sd = '';
	}
	else if (type=='SD') {
		var csv_sd = './results/sd_csv/'+name.split('.')[0]+'_sd'+'.csv';
		var csv_ovl = '';
	} else {
		var csv_ovl = './results/ovl_csv/'+name.split('.')[0]+'_ovl'+'.csv';
		var csv_sd = './results/sd_csv/'+name.split('.')[0]+'_sd'+'.csv';
	}
	const { ipcRenderer } = require('electron')
	ipcRenderer.send('asynchronous-plot', { duration , csv_ovl , csv_sd })
}

function watch_file(name , attribute , arg){
	const csv = require('csv-parser');
	const fs = require('fs');
	const md5 = require('md5');
	console.log('Watching for file changes on ${txt_path}');
	let md5Previous = null;
	let fsWait = false;
	let count = 0;
	//Watch the txt file for the transcript
	fs.watch(name, (event , filename) => {
		if(filename){
			if(fsWait) return;
			fsWait = setTimeout( () => {
				fsWait = false;
			}, 100);
			const md5Current = md5(fs.readFileSync(name));
			if (md5Current === md5Previous) {
				return;
			}
			md5Previous = md5Current;
   			console.log(`${filename} file Changed`);
			//Watch for txt file that contains the result of the ASR system
			if (attribute=='txt') {
				fs.readFile(name, 'utf-8', (err, data) => {
					if (err) throw err;
					let lines = data.trim().split("\n")
					var txt_area = document.getElementById('textarea1')

					txt_area.style.textAlign = "right";
					txt_area.style += 'font-size: 6pt;font-family: Arial;'


					let line = lines[lines.length - 1];
					let timestamp = line.split('---->')
					if (timestamp.length == 3) {
						txt_area.value += timestamp[0]+' '+ timestamp[1]+'\n'+timestamp[2]+'\n\n'	
					}
					else{
						txt_area.value += timestamp[0]+' '+ timestamp[1]+'\n' + 'Speaker 1: ' + timestamp[2] +'\n' + 'Speaker 2:' + timestamp[3] +'\n\n'
					}
				})
			}
			else if (attribute=='txt-asr') {
				fs.readFile(name, 'utf-8', (err, data) => {
					if (err) throw err;
					let lines = data.trim().split("\n")
					var txt_area = document.getElementById('textarea1')

					txt_area.style.textAlign = "right";
					txt_area.style += 'font-size: 6pt;font-family: Arial;'


					let line = lines[lines.length - 1];
					let timestamp = line.split('---->')

					txt_area.value += timestamp[0]+' '+ timestamp[1]+'\n\n'	
				})
			}
			//Watch for csv file that contains the result of the SD system
			else if (attribute=='sd') {
				fs.createReadStream(name).pipe(csv()).on('data', (row) => {
					console.log(row);
					var results = document.getElementById('SD_results')
					// if (results.lastChild == null) {
					// }
					var new_conent = document.createElement('p');
					new_conent.innerHTML = 'Speaker: ' + row.label + '  is talking between: ' + '<br> [' + parseFloat(row.start).toPrecision(6) + ','+ parseFloat(row.end).toPrecision(6)+']';
					new_conent.myParam = row.start;
					new_conent.addEventListener("click", setToPoint , false);
					results.appendChild(new_conent);
				
				}).on('end', () => {
					console.log('CSV file successfully processed');
					var but = document.getElementById('plot_sd').style.visibility = 'visible';
				});
				
			}
			//Watch for csv file that contains the result of the OVD system
			else{
				fs.createReadStream(name).pipe(csv()).on('data', (row) => {
					console.log(row);
					var results = document.getElementById('OSD_results')
					var new_conent = document.createElement('p');
					new_conent.innerHTML = 'Overlapped region detected: <br>[' + parseFloat(row.start).toPrecision(7) + ','+ parseFloat(row.end).toPrecision(7)+']';
					new_conent.myParam = row.start;
					new_conent.addEventListener("click", setToPoint , false);
					results.appendChild(new_conent);	
				}).on('end', () => {
					console.log('CSV file successfully processed');
					var but = document.getElementById('plot_ovl').style.visibility = 'visible';
					if(arg){
						var btt = document.getElementById('plot_asr').style.visibility = 'visible';
					}
				});
			}
		}
	})
}

function seekTime(){
	var content = document.getElementById('seek_text').value;
	console.log(content)
	var sec = parseFloat( content.split(':')[2] );
	var min = parseFloat( content.split(':')[1] );
	var hr = parseFloat( content.split(':')[0] );


	var time = sec+min*60+hr*360;
	console.log(time)

	set_to(time)
}

function getTime(){
	var curr_track = document.querySelector('#audio_to_be_displayed');
	var time = curr_track.currentTime;
	console.log(time);
	var hours = Math.floor(time / 3600);
	var time =time % 3600;
	var minutes = Math.floor(time / 60);
	var seconds = time % 60;
	let hr;
	let min;
	let sec;
	if (hours<10) {hr = '0'+ hours.toString();}
	else{ hr = hours.toString(); }
	if (minutes<10) {min = '0'+ minutes.toString();}
	else{ min = minutes.toString(); }
	if (seconds<10) {sec = '0'+ seconds.toString();}
	else{ sec = seconds.toString(); }
	
	var content = document.getElementById('get_text')
	content.value = hr+':'+min+':'+sec
}