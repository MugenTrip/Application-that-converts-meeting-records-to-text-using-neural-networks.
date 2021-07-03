import torch
import csv
import numpy as np
from pyannote.core import Segment
import sys

def speaker_diarization(name,path,duration,csv_name):
    #Load speaker diarization model from pyannote
    pipeline = torch.hub.load('pyannote/pyannote-audio', 'dia_ami')

    #Load test file
    test_file = {'uri': name, 'audio': path}


    diarization = pipeline(test_file)

    #Save the result in a csv file
    with open(csv_name, 'w') as f:
        writer = csv.writer(f)
        header = ['start','end','label']
        writer.writerow(header)
        for segment,track,label in diarization.itertracks(yield_label=True):
            row = [str(segment.start),str(segment.end),str(label)]
            writer.writerow( row )



if __name__ == "__main__":
    name = sys.argv[1]
    path = sys.argv[2]
    duration = float(sys.argv[3])
    csv_name = sys.argv[4]
    speaker_diarization(name,path,duration,csv_name)