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
	def __init__(self, num_time_steps, delta_t, sim_type, given_filename):
		"""
		This is the consructor for the simulation class.
		:param num_time_steps: The number of iterations to run
		:param delta_t: The time difference between iterations
		:param sim_type: The type of simulation to run
		"""
		self.history = []
		self.num_time_steps = num_time_steps
		self.delta_t = delta_t
		self.bodies = []
		if(sim_type == "random"):
			self.set_up_random_simulation()
		elif(sim_type == "test"):
			self.set_up_test_simulation()
		elif(sim_type == "given"):
			self.set_up_given_simulation(given_filename)
		else:
			print("Invalid simulation type.")
			sys.exit()

	def set_up_given_simulation(self, given_filename):
		"""
		This function reads in a data file and creates the simulation based off of that.
		"""
		f = open(given_filename)
		for line_num, line in enumerate(f):
			if(line_num != 0):
				line_arr = line.split()
				name = line_arr[0]
				mass = float(line_arr[1])
				radius = float(line_arr[2])
				r = np.array([float(line_arr[3]), float(line_arr[4]), float(line_arr[5])])
				v = np.array([float(line_arr[6]), float(line_arr[7]), float(line_arr[8])])
				new_body = body.Body(name, mass, radius, r, v)
				self.bodies.append(new_body)
		self.num_bodies = len(self.bodies)

	def set_up_random_simulation(self):
		"""
		This function sets up a random system.
		"""
		self.num_bodies = random.randint(1, 11)
		for i in range(0, self.num_bodies):
			name = str(i)
			mass = float(random.randint(1, 11))
			radius = float(random.randint(1, 11))
			r = np.zeros(3)
			v = np.zeros(3)
			for j in range(0, 3):
				r[j] += float(random.randint(-5, 6))
				v[j] += float(random.randint(-2, 3))
			new_body = body.Body(name, mass, radius, r, v)
			self.bodies.append(new_body)

	def set_up_test_simulation(self):
		"""
		This function hardcodes in certain values to the system to test it.
		"""
		self.num_bodies = 2
		r1 = np.array([5., 0., 0.])
		r2 = np.array([-5., 0., 0.])
		v1 = np.array([0., 0.75, 0.])
		v2 = np.array([0., -0.75, 0.])
		body1 = body.Body("1", 10, 3, r1, v1)
		body2 = body.Body("2", 10, 3, r2, v2)
		self.bodies.append(body1)
		self.bodies.append(body2)
	
	def grav_force(self, ind1, ind2):
		"""
		This function calculates the gravitational force between two bodies.
		:param ind1: The index of the first body
		:param ind2: The index of the second body
		:return grav_force: The force vector that the first body experiences
		"""
		G = 6.67408e-11
		body_1 = self.bodies[ind1]
		body_2 = self.bodies[ind2]
		if(np.array_equal(body_1.r, body_2.r)):
			return np.zeros(3)
		r_1to2 = np.subtract(body_2.r, body_1.r)
		r_squared = np.dot(r_1to2, r_1to2)
		r_1to2_unit = np.divide(r_1to2, math.sqrt(r_squared))
		grav_force = r_1to2_unit * G * body_1.mass * body_2.mass / r_squared
		return grav_force

	def potential_energy(self):
		"""
		This function calculates the potential energy of the system.
		:return U: The potiential energy of the system
		"""
		G = 6.67408e-11
		U = 0
		for i in range(0, self.num_bodies):
			for j in range(0, self.num_bodies):
				if(i != j):
					body1 = self.bodies[i]
					body2 = self.bodies[j]
					r_1to2 = np.subtract(body2.r, body1.r)
					r_1to2_mag = math.sqrt(np.dot(r_1to2, r_1to2))
					U += -1*G*body1.mass*body2.mass/r_1to2_mag
		# Divide by 2 to account for double counting
		U /= 2
		return U

	def kinetic_energy(self):
		"""
		This function calculates the kinetic energy of the system.
		:return T: The kinetic energy of the system
		"""
		T = 0
		for i in range(0, self.num_bodies):
			cur_body = self.bodies[i]
			T += 0.5*cur_body.mass*np.dot(cur_body.v, cur_body.v)
		return T
		
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
			U = self.potential_energy()
			T = self.kinetic_energy()
			E = U+T
			state.append(U)
			state.append(T)
			state.append(E)
			self.history.append(state)

			# Calulate force on bodies
			force = np.zeros([self.num_bodies, 3])
			for j in range(0, self.num_bodies):
				for k in range(0, self.num_bodies):
					force[j] += self.grav_force(j, k)

			# Update body positions and velocities
			for j in range(0, self.num_bodies):
				self.bodies[j].r += self.bodies[j].v * self.delta_t
				self.bodies[j].v += force[j]/self.bodies[j].mass * self.delta_t

	def generate_plots(self):
		"""
		This function generates plots for each time step and compiles them into a gif.
		"""
		# Remove all old plots
		for filename in os.listdir("./plots"):
			os.remove("./plots/"+filename)
		
		# Get the times, positions, and energies to plot
		t = np.zeros(len(self.history))
		positions = np.zeros([len(self.history), self.num_bodies, 3])
		U = np.zeros(len(self.history))
		T = np.zeros(len(self.history))
		E = np.zeros(len(self.history))
		for i in range(0, len(self.history)):
			t[i] = self.history[i][0]
			for j in range(0, self.num_bodies):
				positions[i][j][0] = self.history[i][j+1][0]
				positions[i][j][1] = self.history[i][j+1][1]
				positions[i][j][2] = self.history[i][j+1][2]
			U[i] = self.history[i][-3]
			T[i] = self.history[i][-2]
			E[i] = self.history[i][-1]

		# Scale body radii to plot
		scaled_radii = np.zeros(self.num_bodies)
		plt_s_factor = 120
		largest_radius = 0
		for i in range(0, self.num_bodies):
			cur_body = self.bodies[i]
			if(cur_body.radius > largest_radius):
				largest_radius = cur_body.radius
		for i in range(0, self.num_bodies):
			cur_body = self.bodies[i]
			scaled_radii[i] = cur_body.radius/largest_radius
			scaled_radii[i] *= plt_s_factor

		# Generate a location plot for each timestep
		num_frames = 60.
		for i in range(0, len(self.history)):
			# Skip generating plots for some steps to speed up simulation
			if(i%(len(self.history)/num_frames)):
				continue
			file_number = str(i)
			while(len(file_number)<8):
				file_number = str(0) + file_number
			for j in range(0, self.num_bodies):
				plt.scatter(positions[i, j, 0], positions[i, j, 1], s=scaled_radii[j])
			bound = 2e11
			plt.xlim(-1*bound, bound)
			plt.ylim(-1*bound, bound)
			plt.savefig("./plots/plot"+file_number+".png")
			plt.close()

		# Generate a gif of all the plots
		images = []
		for filename in os.listdir("./plots"):
			images.append(imageio.imread("./plots/"+filename))
		imageio.mimsave("./results/plots.gif", images)

		# Generate energy plots
		plt.plot(t, U)
		plt.savefig("./results/potential_energy.png")
		plt.close()
		plt.plot(t, T)
		plt.savefig("./results/kinetic_energy.png")
		plt.close()
		plt.plot(t, E)
		plt.savefig("./results/total_energy.png")
		plt.close()

		# Save data
		np.savetxt("./results/time.txt", t)
		for j in range(0, self.num_bodies):
			np.savetxt("./results/body_num_"+str(j)+".txt", positions[:, j, :])

"""
This code is the main function.
It is used so that it only runs if it is the python file being run.
"""
if(__name__ == "__main__"):
	if(not (len(sys.argv) == 4 or len(sys.argv) == 5)):
		print("You must pass in the number of timesteps, length of timestep, and the simulation to run (random, test, given filename).  For example, try running:\npython sim.py 20 1 random\n python sim.py 50 1 given solar_system.txt")
		sys.exit()
	timesteps = int(sys.argv[1])
	delta_t = int(sys.argv[2])
	sim_type = sys.argv[3]
	if(len(sys.argv) == 4):
		given_filename = "NONE"
	else:
		given_filename = sys.argv[4]
	sim = Simulation(timesteps, delta_t, sim_type, given_filename)
	sim.run()
	sim.generate_plots()
