import body
import sys
import numpy as np
import random
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import os
import imageio

class Simulation:
	"""
	This class runs the simulation.
	"""
	def __init__(self, num_time_steps, delta_t, num_bodies):
		"""
		This is the consructor for the simulation class.
		:param num_time_steps: The number of iterations to run
		:param delta_t: The time difference between iterations
		:param num_bodies: The number of bodies in the system
		"""
		self.history = []
		self.num_time_steps = num_time_steps
		self.delta_t = delta_t
		self.num_bodies = num_bodies
		self.bodies = []
		for i in range(0, num_bodies):
			name = str(i)
			mass = random.randint(1, 11)
			r = np.zeros(3)
			v = np.zeros(3)
			for j in range(0, 3):
				r[j] += random.randint(-5, 6)
				v[j] += random.randint(-2, 3)
			new_body = body.Body(name, mass, r, v)
			self.bodies.append(new_body)

	def set_up_test_conditions(self):
		"""
		This function hardcodes in certain values to the system to test it.
		"""
		self.bodies[0].mass = 10
		self.bodies[1].mass = 10
		self.bodies[0].r[0] = 25
		self.bodies[0].r[1] = 0
		self.bodies[0].r[2] = 0
		self.bodies[1].r[0] = -25
		self.bodies[1].r[1] = 0
		self.bodies[1].r[2] = 0
		self.bodies[0].v[0] = 0
		self.bodies[0].v[1] = 1
		self.bodies[0].v[2] = 0
		self.bodies[1].v[0] = 0
		self.bodies[1].v[1] = -1
		self.bodies[1].v[2] = 0
	
	def grav_force(self, ind1, ind2):
		"""
		This function calculates the gravitational force between two bodies.
		:param ind1: The index of the first body
		:param ind2: The index of the second body
		:return grav_force: The force vector that the first body experiences
		"""
		G = 1
		body_1 = self.bodies[ind1]
		body_2 = self.bodies[ind2]
		if(np.array_equal(body_1.r, body_2.r)):
			return np.zeros(3)
		r_1to2 = np.subtract(body_2.r, body_1.r)
		r_squared = np.dot(r_1to2, r_1to2)
		r_1to2_unit = np.divide(r_1to2, math.sqrt(r_squared))
		grav_force = r_1to2_unit * G * body_1.mass * body_2.mass / r_squared
		return grav_force
		
	def run(self):
		"""
		This is the function that runs the simulation.
		"""
		for i in range(0, self.num_time_steps):
			# Record state of simulation
			state = []
			state.append(i*self.delta_t)
			for body in self.bodies:
				state.append(np.copy(body.r))
			self.history.append(state)

			# Calulate force on bodies
			force = np.zeros([self.num_bodies, 3])
			for j in range(0, self.num_bodies):
				for k in range(0, self.num_bodies):
					force[j] += self.grav_force(j, k)

			# Update body positions and velocities
			for j in range(0, self.num_bodies):
				self.bodies[j].r += self.bodies[j].v * self.delta_t
				self.bodies[j].v += force[j] * self.delta_t

	def generate_plots(self):
		"""
		This function generates plots for each time step and compiles them into a gif.
		"""
		# Remove all old plots
		for filename in os.listdir("./plots"):
			os.remove("./plots/"+filename)
		
		# Get the times and positions to plot
		t = np.zeros(len(self.history))
		positions = np.zeros([len(self.history), self.num_bodies, 3])
		for i in range(0, len(self.history)):
			t[i] = self.history[i][0]
			for j in range(0, self.num_bodies):
				positions[i][j][0] = self.history[i][j+1][0]
				positions[i][j][1] = self.history[i][j+1][1]
				positions[i][j][2] = self.history[i][j+1][2]

		# Generate a plot for each timestep
		for i in range(0, len(self.history)):
			file_number = str(i)
			while(len(file_number)<8):
				file_number = str(0) + file_number
			for j in range(0, self.num_bodies):
				plt.scatter(positions[i, j, 0], positions[i, j, 1], s=30)
			plt.xlim(-100, 100)
			plt.ylim(-100, 100)
			plt.savefig("./plots/plot"+file_number+".png")
			plt.close()

		# Generate a gif of all the plots
		images = []
		for filename in os.listdir("./plots"):
			images.append(imageio.imread("./plots/"+filename))
		imageio.mimsave("plots.gif", images)

"""
This code is the main function.
It is used so that it only runs if it is the python file being run.
"""
if(__name__ == "__main__"):
	if(len(sys.argv) != 4):
		print("You must pass in the number of timesteps, length of timestep, and number of bodies (eg. python sim.py 20 1 2).")
		sys.exit()
	sim = Simulation(int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]))
	sim.run()
	sim.generate_plots()
