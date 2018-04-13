#!/bin/bash

python sim.py 17520 1800 given sim_initial_data/solar_system.txt
cp ./results/body_num_*.txt web_display
