class Body:
	"""
	This class is the body that make up the simulation.
	"""
	def __init__(self, name, mass, radius, r, v):
		"""
		This is the constructor for the body class.
		:param name: The name of the body
		:param mass: The mass of the body
		:param radius: The radius of the body
		:param r: The position vector of the body
		:param v: The velocity vector of the body
		"""
		self.name = name
		self.mass = mass
		self.radius = radius
		self.r = r
		self.v = v

	def print_body(self):
		"""
		This function prints out the body information.
		"""
		print("Name: " + self.name)
		print("Mass: " + str(self.mass))
		print("Radius: " + str(self.radius))
		print("Position: " + str(self.r))
		print("Velocity: " + str(self.v))
