import torch
import csv
import numpy as np
import sys
import os
import yaml
import pandas as pd
import soundfile as sf
from asteroid.utils import tensors_to_device
from model import load_best_model
import math
import time
from speechbrain.pretrained import EncoderDecoderASR 
from pyannote.audio.utils.signal import Binarize
from pyannote.core import Timeline,Segment, notebook , Annotation
from speech_separation import main

def meeting_conversion(name,path,txt_name,duration,ovl_csv,sd_csv):
    #test file to be processed
    test_file = {'uri': name, 'audio': path}
    #Diarization
    pipeline = torch.hub.load('pyannote/pyannote-audio', 'dia_ami')
    diarization = pipeline(test_file)
    #save the diarization results
    with open(sd_csv, 'w') as f:
        writer = csv.writer(f)
        header = ['start','end','label']
        writer.writerow(header)
        for segment,track,label in diarization.itertracks(yield_label=True):
            row = [str(segment.start),str(segment.end),str(label)]
            writer.writerow( row )
    #Overlapped Speech detection
    ovl = torch.hub.load('pyannote/pyannote-audio', 'ovl_ami')
    ovl_scores = ovl(test_file)
    binarize = Binarize(offset=0.55, onset=0.55, log_scale=True, min_duration_off=0.1, min_duration_on=0.1)
    # overlapped speech regions (as `pyannote.core.Timeline` instance)
    overlap = binarize.apply(ovl_scores, dimension=1)
    #save the overlap detectin results
    with open(ovl_csv, 'w') as f:
	    writer = csv.writer(f)
	    header = ['start','end']
	    writer.writerow(header)
	    for segment in overlap:
		    row = [str(segment.start),str(segment.end)]
		    writer.writerow( row )
    #Creating the Annotation with the overllaped
    cropped = diarization.crop(overlap,'intersection')
    timeline = Timeline()
    cropped_timeline = Timeline()
    for segment , tracks, label in diarization.itertracks(yield_label=True):
    	timeline.add(segment)
    for segment, tracks, label in cropped.itertracks(yield_label=True):
    	timeline.add(segment)
    	cropped_timeline.add(segment)

    timeline = timeline.segmentation()
    for segment in cropped_timeline:
    	timeline.remove(segment)

    final_annot = Annotation()
    for segment, tracks, label in diarization.itertracks(yield_label=True):
    	for segments in timeline:
    		if(segments&segment):
    			final_annot[segments, tracks] = label
    id = 0
    for segment in cropped_timeline:
    	final_annot[segment, 'ov'+str(id) ] = 'Overlapped'
    	id+=1

    #Import ASR_model from speechbrain
    asr_model = EncoderDecoderASR.from_hparams(source="speechbrain/asr-crdnn-rnnlm-librispeech",
            savedir="pretrained_models/asr-crdnn-rnnlm-librispeech")

    #Open the file with the sounfile library for further process
    track = sf.SoundFile(path)
    can_seek = track.seekable() # True
    if not can_seek:
        raise ValueError("Not compatible with seeking")
    sr = track.samplerate
    audio_mix = []
    wav_length = torch.FloatTensor([1])
    f = open(txt_name, "a")

    for segment, tracks, label in final_annot.itertracks(yield_label=True):
        segment_duration = segment.end-segment.start
        message = str()
        #Small file can't be processed and they dont have any information
        if(segment_duration<=0.03):
            continue
        #Detected overlapped region. They will be separated first and then they will be transribed
        if(label=='Overlapped'):
            #Necessary variables
            point_to_start = math.floor(sr*segment.start)
            offset = sr*(segment.end-segment.start)
            track.seek(point_to_start)
            temp = track.read(math.ceil(offset))

            #Save the overlapped region as a wav file
            sf.write('./separate_mixtures/'+str(tracks)+'.wav',temp,sr)
            
            #Speaker Separation
            arg_dic = dict()
            conf_path = os.path.join('./python_scripts/', "conf.yml")
            with open(conf_path) as q:
                train_conf = yaml.safe_load(q)
            arg_dic["sample_rate"] = train_conf["data"]["sample_rate"]
            arg_dic["train_conf"] = train_conf
            mixture_name = str(tracks)+'.wav'
            audio_path = './separate_mixtures/'+str(tracks)+'.wav'
            main(arg_dic,mixture_name,audio_path)

            #Trascribe each 
            path1 = './separate_mixtures/'+str(tracks).split('.')[0]+'/'+'s1_estimate.wav'
            path2 = './separate_mixtures/'+str(tracks).split('.')[0]+'/'+'s2_estimate.wav'
            var1 = asr_model.transcribe_file(path1)
            var2 = asr_model.transcribe_file(path2)

            millistart = "{:.4f}".format(segment.start).split('.')
            milliend = "{:.4f}".format(segment.end).split('.')
            start = time.strftime("%H:%M:%S.", time.gmtime(segment.start))+millistart[1]
            end = time.strftime("%H:%M:%S.", time.gmtime(segment.end))+milliend[1]
            message += f'Speaker: Overlapped ----> [{start} , {end}] : ---->' + str(var1) + '---->' + str(var2) +'\n'
            f.write(message)
            #Update the content of the file
            f.flush()
            # typically the above line would do. however this is used to ensure that the file is written
            os.fsync(f.fileno())
        #Not an overlapped region
        #Almost the same code as ASR.py
        else:
            if(segment_duration>=8):
                segment_segments = math.ceil(segment_duration/4)
                for i in range(segment_segments):
                    point_to_start = math.floor( sr*(i*4+segment.start) )
                    if(i==segment_segments-1):
                        offset = sr*(segment.end-point_to_start)

                    offset = sr*4
                    track.seek(point_to_start)
                    temp = track.read(math.ceil(offset))
                    temp = torch.FloatTensor(temp)
                    #Transcribe
                    var, _ = asr_model.transcribe_batch(temp.unsqueeze(0) , wav_length)
                    #save the results
                    if(i==0):
                        millistart = "{:.4f}".format(segment.start).split('.')
                        milliend = "{:.4f}".format(segment.end).split('.')
                        start = time.strftime("%H:%M:%S.", time.gmtime(segment.start))+millistart[1]
                        end = time.strftime("%H:%M:%S.", time.gmtime(segment.end))+milliend[1]
                        message += f'Speaker:{label} ----> [{start} , {end}] ----> ' + str(var)
                    elif(i==segment_segments-1):
                        message += ' '+str(var) + '\n'
                    else:
                        message += ' '+str(var)

                f.write(message)
                #Update the content of the file
                f.flush()
                # typically the above line would do. however this is used to ensure that the file is written
                os.fsync(f.fileno())
            else:        
                point_to_start = math.floor(sr*segment.start)
                offset = sr*(segment.end-segment.start)
                track.seek(point_to_start)
                temp = track.read(math.ceil(offset))
                temp = torch.FloatTensor(temp)
                #Transcribe
                var, _ = asr_model.transcribe_batch(temp.unsqueeze(0) , wav_length)
                #Save the results
                millistart = "{:.4f}".format(segment.start).split('.')
                milliend = "{:.4f}".format(segment.end).split('.')                
                start = time.strftime("%H:%M:%S.", time.gmtime(segment.start))+millistart[1]
                end = time.strftime("%H:%M:%S.", time.gmtime(segment.end))+milliend[1]
                message = f'Speaker:{label} ----> [{start} , {end} ] ----> ' + str(var) +'\n'
                f.write(message)
                #Update the content of the file
                f.flush()
                # typically the above line would do. however this is used to ensure that the file is written
                os.fsync(f.fileno())
    
    f.close()

if __name__ == "__main__":
    name = sys.argv[1] 
    path = sys.argv[2]
    duration = float(sys.argv[3])
    txt_name = sys.argv[4]
    ovl_csv = sys.argv[5]
    sd_csv = sys.argv[6]
    meeting_conversion(name,path ,txt_name,duration,ovl_csv,sd_csv)
