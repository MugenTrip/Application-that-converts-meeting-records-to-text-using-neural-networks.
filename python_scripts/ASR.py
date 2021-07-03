import torch
import numpy as np
import sys
import os
import math
import time
import soundfile as sf
from speechbrain.pretrained import EncoderDecoderASR 
from pyannote.audio.utils.signal import Binarize

def automatic_speech_recognition(name,path,duration , txt_name):
    #Import ASR_model from speechbrain
    asr_model = EncoderDecoderASR.from_hparams(source="speechbrain/asr-crdnn-rnnlm-librispeech",
        savedir="pretrained_models/asr-crdnn-rnnlm-librispeech")
    #If the duration is too small transcribe it directy else use voice activity detection to cut it in batches
    if(duration<=8):
        var = asr_model.transcribe_file(path)
        print(var)
    else:
        # speech activity detection model trained on AMI training set
        sad = torch.hub.load('pyannote/pyannote-audio', 'sad_ami')
        #Load the file
        test_file = {'uri': name, 'audio': path}
        # obtain raw SAD scores (as `pyannote.core.SlidingWindowFeature` instance)
        sad_scores = sad(test_file)
        # binarize raw SAD scores
        # NOTE: both onset/offset values were tuned on AMI dataset.
        # you might need to use different values for better results.
        binarize = Binarize(offset=0.52, onset=0.52, log_scale=True, 
            min_duration_off=0.1, min_duration_on=0.1)
        # speech regions (as `pyannote.core.Timeline` instance)
        speech = binarize.apply(sad_scores, dimension=1)
        
        #Read the file
        track = sf.SoundFile(path)
        can_seek = track.seekable() # True
        if not can_seek:
	        raise ValueError("Not compatible with seeking")
        sr = track.samplerate
        audio_mix = []
        wav_length = torch.FloatTensor([1])

        #Create the txt file to save the results
        f = open(txt_name, "a")
        #Transcribe each segment 
        for segment in speech:
            segment_duration = segment.end-segment.start
            message = str()
            #If the segment is too long cut it to 4sec segments
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
                    
                    var, _ = asr_model.transcribe_batch(temp.unsqueeze(0) , wav_length)
                   
                    #Save the results
                    if(i==0):
                        millistart = "{:.4f}".format(segment.start).split('.')
                        milliend = "{:.4f}".format(segment.end).split('.')
                        start = time.strftime("%H:%M:%S.", time.gmtime(segment.start))+millistart[1]
                        end = time.strftime("%H:%M:%S.", time.gmtime(segment.end))+milliend[1]
                        message += f'[ {start} , {end}] ----> ' + str(var)
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
                
                var, _ = asr_model.transcribe_batch(temp.unsqueeze(0) , wav_length)
                
                #Save the results
                millistart = "{:.4f}".format(segment.start).split('.')
                milliend = "{:.4f}".format(segment.end).split('.')                
                start = time.strftime("%H:%M:%S.", time.gmtime(segment.start))+millistart[1]
                end = time.strftime("%H:%M:%S.", time.gmtime(segment.end))+milliend[1]
                message = f'[ {start} , {end} ] ----> ' + str(var) +'\n'
                
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
    automatic_speech_recognition(name,path,duration ,txt_name)