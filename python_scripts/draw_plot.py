import torch
import csv
import numpy as np
from matplotlib import pyplot as plt
from pyannote.core import Timeline,Segment,Annotation,notebook
import sys
from pyannote.core import SlidingWindowFeature
	
duration = float(sys.argv[1])
csv_ovl = sys.argv[2]
csv_sd = sys.argv[3]


#Plot the result only from both sysytem together
if(csv_ovl!='' and csv_sd!=''):
    #read speaker diarizatin results form the csv file
    annotation = Annotation()
    with open(csv_sd) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        id = 0
        for row in csv_reader:
            if line_count == 0:
                line_count += 1
                pass
            else:
                annotation[ Segment(float(row[0]),float(row[1])), id ] = row[2]
                print(annotation)
                id+=1
                line_count += 1
    #read overlapped results form the csv file
    timeline = Timeline()
    with open(csv_ovl) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        for row in csv_reader:
            if line_count == 0:
                line_count += 1
                pass
            else:
                timeline.add(Segment( float(row[0]),float(row[1]) ))
                print(Segment( float(row[0]),float(row[1]) ))
                line_count += 1
        print(f'Processed {line_count} lines.')


    #Plot overlapped and speaker regions using pyannote.core visualization API
    notebook.crop = Segment(0, duration)
    # helper function to make visualization prettier
    plot_ready = lambda scores: SlidingWindowFeature(np.exp(scores.data[:, 1:]), scores.sliding_window)
    # create a figure with 8 rows with matplotlib
    nrows = 2
    fig, ax = plt.subplots(nrows=nrows, ncols=1)
    fig.set_figwidth(20)
    fig.set_figheight(nrows * 2)

    # 1nd row: pipeline output
    notebook.plot_annotation(annotation, ax=ax[0], time=True)
    ax[0].text(notebook.crop.start + 0.5, 0.1, 'Diarization', fontsize=14)

    # 2th row: OVL result
    notebook.plot_timeline(timeline, ax=ax[1], time=True)
    ax[1].text(notebook.crop.start + 0.5, 0.1, 'overlapped speech detection', fontsize=14)
    plt.show()
#Plot the result only from the Speaker Diarization
elif(csv_ovl==''):
    annotation = Annotation()
    with open(csv_sd) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        id = 0
        for row in csv_reader:
            if line_count == 0:
                line_count += 1
                pass
            else:
                annotation[ Segment(float(row[0]),float(row[1])), id ] = row[2]
                print(annotation)
                id+=1
                line_count += 1
        print(f'Processed {line_count} lines.')

    notebook.crop = Segment(0, duration)
    # create a figure with 1 rows with matplotlib
    nrows = 1
    fig, ax = plt.subplots(nrows=nrows, ncols=1)
    fig.set_figwidth(20)
    fig.set_figheight(nrows * 2)

    # 2nd row: pipeline output
    notebook.plot_annotation(annotation, ax, time=True)
    ax.text(notebook.crop.start + 0.5, 0.1, 'Speaker Diarization', fontsize=14)
    plt.show()
#Plot the result only from the overlapped detection
else:
    timeline = Timeline()
    with open(csv_ovl) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        for row in csv_reader:
            if line_count == 0:
                line_count += 1
                pass
            else:
                timeline.add(Segment( float(row[0]),float(row[1]) ))
                print(Segment( float(row[0]),float(row[1]) ))
                line_count += 1
        print(f'Processed {line_count} lines.')

    notebook.crop = Segment(0, duration)
    # helper function to make visualization prettier
    plot_ready = lambda scores: SlidingWindowFeature(np.exp(scores.data[:, 1:]), scores.sliding_window)
    # create a figure with 8 rows with matplotlib
    nrows = 1
    fig, ax = plt.subplots(nrows=nrows, ncols=1)
    fig.set_figwidth(20)
    fig.set_figheight(nrows * 2)
    # 1th row: OVL result
    notebook.plot_timeline(timeline, ax, time=True)
    ax.text(notebook.crop.start + 0.5, 0.1, 'Overlapped speech detection', fontsize=14)
    plt.show()