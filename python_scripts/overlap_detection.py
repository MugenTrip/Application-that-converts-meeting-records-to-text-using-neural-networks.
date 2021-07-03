import torch
import csv
import numpy as np
from matplotlib import pyplot as plt
from pyannote.core import Timeline,Segment, notebook
import sys

def overlap_detection(name,path,duration,csv_name):
	temp = name.split(".")
	plt_name = temp[0]+'.png'

	#Load overlap speech detection model from pyannote
	ovl = torch.hub.load('pyannote/pyannote-audio', 'ovl_ami')

	test_file = {'uri': name , 'audio': path}
	# obtain raw OVL scores (as `pyannote.core.SlidingWindowFeature` instance)
	ovl_scores = ovl(test_file)
	#print('Score_size: '+ovl_scores.shape)

	# binarize raw OVL scores
	# NOTE: both onset/offset values were tuned on AMI dataset.
	# you might need to use different values for better results.
	from pyannote.audio.utils.signal import Binarize
	binarize = Binarize(offset=0.55, onset=0.55, log_scale=True, 
						min_duration_off=0.1, min_duration_on=0.1)

	# overlapped speech regions (as `pyannote.core.Timeline` instance)
	overlap = binarize.apply(ovl_scores, dimension=1)

	#Save the result in a csv file
	with open(csv_name, 'w') as f:
		writer = csv.writer(f)
		header = ['start','end']
		writer.writerow(header)
		for segment in overlap:
			row = [str(segment.start),str(segment.end)]
			writer.writerow(row)


if __name__ == "__main__":
	name = sys.argv[1] 
	path = sys.argv[2]
	duration = float(sys.argv[3])
	csv_name = sys.argv[4]
	overlap_detection(name,path,duration,csv_name)
