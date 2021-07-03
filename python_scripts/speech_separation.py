import sys
import os
import yaml
import torch
import soundfile as sf
from asteroid.utils import tensors_to_device
from model import load_best_model

def main(conf,mixture_name,audio_path):
    #path to save the mixxtures
    mixtures_path = './separate_mixtures/'
    #Load model
    model = load_best_model(conf["train_conf"], conf["train_conf"]["main_args"]["exp_dir"])
    model_device = next(model.parameters()).device
    #Read the mixture
    audio_mix, _ = sf.read(audio_path, dtype="float32") 
    audio_mix = torch.from_numpy(audio_mix)
    # Forward the network on the mixture.
    mix = tensors_to_device(audio_mix, device=model_device)
    #Create the directory to be stored
    ex_save_dir = os.path.join(mixtures_path, mixture_name.split('.')[0]+'/')
    try:
        os.makedirs(ex_save_dir,exist_ok=True)
    except OSError:
        print ("Creation of the directory %s failed" % ex_save_dir)
    else:
        print ("Successfully creation the directory %s" % ex_save_dir)
    #Make the separation
    if conf["train_conf"]["training"]["loss_alpha"] == 1:
             #If Deep clustering only, use DC masks.
        est_sources, dic_out = model.dc_head_separate(mix[None , None])
    else:
            # If Chimera, use mask-inference head masks
        est_sources, dic_out = model.separate(mix[None,None])
    #Save the results
    results = []
    est_sources_np = est_sources.squeeze(0).cpu().data.numpy()
    idx = 1
    for src_idx, est_src in enumerate(est_sources_np):    
        sf.write(ex_save_dir + "s{}_estimate.wav".format(src_idx + 1),est_src,conf["sample_rate"],)
        results.append(ex_save_dir + "s{}_estimate.wav".format(src_idx + 1))
    print('Separation completed')
    return results
    

if __name__ == "__main__":
    arg_dic = dict()
    # Load training config
    conf_path = os.path.join('./python_scripts/', "conf.yml")
    with open(conf_path) as f:
        train_conf = yaml.safe_load(f)

    arg_dic["sample_rate"] = train_conf["data"]["sample_rate"]
    arg_dic["train_conf"] = train_conf
    mixture_name = sys.argv[1]
    audio_path = sys.argv[2]
    results = main(arg_dic,mixture_name,audio_path)
    print(results[0])
    print(results[1])