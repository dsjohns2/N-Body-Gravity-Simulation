#!/bin/bash

echo "Running simulation..."
rm web_display/body_num_*.txt
python -W ignore sim.py 17520 1800 given sim_initial_data/solar_system.txt
cp ./results/body_num_*.txt web_display

cd web_display
echo "Simulation finished. Open display.html in the web_display folder."
python simple-cors-http-server.py > /dev/null
