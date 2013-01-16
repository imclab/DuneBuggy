db.Buggy = new Class({
	extend: db.GameObject,
	
	getTurret: function() {
		return this.turret;
	},

	setPosition: function (position, rotation, tRot) {
		// Set position
		this.root.position.set(position[0], position[1], position[2]);

		// Set rotation
		if (rotation)
			this.root.rotation.set(rotation[0], rotation[1], rotation[2]);
		
		// Set turret rotation
		if (tRot !== undefined)
			this.turret.rotation.y = tRot;
			
		// Tell the physics engine to update our position
		this.root.__dirtyPosition = true;
		this.root.__dirtyRotation = true;
	},

	construct: function(options) {
		this.options = options;
		
		this.game = options.game;
		
		this.root = new THREE.Object3D();
		
		this.turret = new THREE.Object3D();
		
		// Store bullets and last fire time
		this.bullets = [];
		this.lastFireTime = {};
		
		var input = this.controls = {
			power: null,
			direction: null,
			steering: 0,
			force: 0
		};
		
		var tuning = {};
		tuning['max_power'] = 600; // was 1400;
		tuning['boost_power'] = 1200;
		tuning['mass'] = 12;
		
		var k = 0.95; // almost full damping
		
		tuning['suspension_stiffness'] = 25;
		tuning['suspension_damping'] = k * 2.0 * Math.sqrt(tuning['suspension_stiffness']);
		tuning['suspension_compression'] = k * 2.0 * Math.sqrt(tuning['suspension_stiffness']);
		tuning['max_suspension_travel_cm'] = 350;
		tuning['friction_slip'] = 10; // was 0.8?
		tuning['max_suspension_force'] = 13000;
		
		tuning['wheel_radius'] = 5.5;
		tuning['suspension_rest_length'] = 0.400;
		
		tuning['steering_increment'] = 1/50;
		tuning['max_steering_radius'] = 0.25;
		
		var axle_width = 11.5;
		var wheel_z_front = 19;
		var wheel_z_back = -15;
		
		var box_height = 14;
		
		var wheel_y_front = -0.5-box_height/6;
		var wheel_y_back = -0.25-box_height/6;
		
		var tuning_frontWheel = {
			suspension_stiffness: tuning['suspension_stiffness'],
			suspension_compression: tuning['suspension_compression'],
			suspension_damping: tuning['suspension_damping'],
			max_suspension_travel: tuning['max_suspension_travel'],
			max_suspension_force: tuning['max_suspension_force']
		};
	
		var tuning_backWheel = {
			suspension_stiffness: tuning['suspension_stiffness'],
			suspension_compression: tuning['suspension_compression'],
			suspension_damping: tuning['suspension_damping'],
			max_suspension_travel: tuning['max_suspension_travel'],
			max_suspension_force: tuning['max_suspension_force']
		};
		
		var that = this;
		
		var loader = new THREE.JSONLoader();
		loader.load( "duneBuggy/models/buggy_body.js", function( car, materials ) {
			loader.load( "duneBuggy/models/buggy_turret.js", function( turret ) {
				loader.load( "duneBuggy/models/buggy_wheel.js", function( wheel ) {
					materials[0].map.flipY = false;
					car.doubleSided = true;
					
					var material = new THREE.MeshFaceMaterial(materials);
					
					this.turret = new THREE.Mesh(turret, material);
					this.turret.position.z = -4.5;
					
					if (options.alliance === 'self') {
					
						/*
						var mesh = this.root = new Physijs.BoxMesh(
							new THREE.CubeGeometry(
								axle_width+5, // width
								box_height, // height,
								32 // depth: 45 fits length of buggy base
							),
							new THREE.MeshBasicMaterial({
								color: 0xFF0000,
								opacity: 0.5,
								visible: true // Show the bounding box
							}),
							tuning['mass']
						);
						*/
					
						var mesh = this.root = new Physijs.ConvexMesh(
							car,
							material,
							tuning['mass']
						);
						
						this.root.add(this.turret);

						if (options.position)
							mesh.position.copy(options.position);
						else
							mesh.position.y = 145;
						
						mesh.castShadow = mesh.receiveShadow = true;
					
					
						var vehicle = this.vehicle = new Physijs.Vehicle(mesh, new Physijs.VehicleTuning(
							tuning['suspension_stiffness'],
							tuning['suspension_compression'],
							tuning['suspension_damping'],
							tuning['max_suspension_travel_cm'],
							tuning['friction_slip'],
							tuning['max_suspension_force']
						));
					
						//mesh.useQuaternion = true;
					
						options.game.scene.add( vehicle );
					
						options.game.scene.addEventListener(
							'update',
							function() {
								if ( input && vehicle ) {
									if (input.reset) {
										//mesh.position.y = mesh.position.y + 5;
										//mesh.position.set(769.3665771484375, 146.9954833984375, 3229.85205078125);
										mesh.position.set(0, 120, 0);
										mesh.__dirtyPosition = true;
									
										//mesh.rotation.set(0,mesh.rotation.y,0);
										//mesh.rotation.set(-0.17233238852962912, 3.017261689394642, -0.016288831497271422);
										mesh.rotation.set(0,mesh.rotation.y,0);
										mesh.__dirtyRotation = true;
									
										mesh.setLinearVelocity({x: 0, y: 0, z: 0});
										mesh.setAngularVelocity({x: 0, y: 0, z: 0});
										return;
									}
								
									if ( input.direction !== null ) {
										input.steering += input.direction * tuning['steering_increment'];
										if ( input.steering < -tuning['max_steering_radius'] ) input.steering = -tuning['max_steering_radius'];
										if ( input.steering > tuning['max_steering_radius'] ) input.steering = tuning['max_steering_radius'];
									}
									else {
										if ( input.steering < 0 )
											input.steering = Math.min(input.steering + tuning['steering_increment'], 0);
										else
											input.steering = Math.max(input.steering - tuning['steering_increment'], 0);
									}
									vehicle.setSteering( input.steering, 0 );
									vehicle.setSteering( input.steering, 1 );

									if ( input.power === true ) {
										/*
										input.force += tuning['max_power']/10;
										if (input.force > tuning['max_power'])
											input.force = tuning['max_power'];
										*/
										input.force = tuning['max_power'];
									
										if (input.boost) {
											input.force = tuning['boost_power'];
										}
										
										vehicle.applyEngineForce(input.force);
									} else if ( input.power === false ) {
										input.force = 0;
										vehicle.setBrake( 120, 2 );
										vehicle.setBrake( 120, 3 );
									} else {
										input.force = 0;
										vehicle.applyEngineForce( 0 );
									}
									
									if (input.fire)
										that.handleFire();
								}
							}
						);
					
					
						for ( var i = 0; i < 4; i++ ) {
							var leftWheel = i % 2 === 0;
							var frontWheel = i > 1;
						
							// TODO: flip wheel for left/right sides
							vehicle.addWheel(
								wheel,
								material,
								/* connection_point */ new THREE.Vector3(
										leftWheel ? -axle_width : axle_width,
										frontWheel ? wheel_y_front : wheel_y_back,
										frontWheel ? wheel_z_back : wheel_z_front
								),
								/* wheel_direction */ new THREE.Vector3( 0, -1, 0 ),
								/* wheel_axle */ new THREE.Vector3( -1, 0, 0 ),
								/* suspension_rest_length */ tuning['suspension_rest_length'],
								/* wheel_radius */ tuning['wheel_radius'],
								/* is_front_wheel */ frontWheel,
								/* tuning */ !frontWheel ? tuning_frontWheel : tuning_backWheel
							);
						}
					}
					else {
					
						this.carMesh = new THREE.Mesh(car, material);
						this.carMesh.add(this.turret);
					
						this.root.add(this.carMesh);
					
						this.root.position.y = 145;
						for ( var i = 0; i < 4; i++ ) {
							var leftWheel = i % 2 === 0;
							var frontWheel = i > 1;
						
							var wheelMesh = new THREE.Mesh(wheel, material);
							wheelMesh.position.set(
								leftWheel ? -axle_width : axle_width,
								frontWheel ? wheel_y_front+0.5 : wheel_y_back+0.5,
								frontWheel ? wheel_z_back : wheel_z_front
							);
							
							this.root.add(wheelMesh);
						}
					}
					
					if (options.callback)
						options.callback.call(this);
				}.bind(this));
			}.bind(this));
		}.bind(this));
	},
	handleFire: function() {
		var time = new Date().getTime();
		if (this.controls.fire && (!this.lastFireTime[this.game.currentWeapon] || time-this.lastFireTime[this.game.currentWeapon] >= db.config.weapons[this.game.currentWeapon].interval)) {
			var tankMesh = this.getRoot();
			var tankPosition = tankMesh.position.clone();
			var tankRotation = tankMesh.rotation.clone();
			var turretRotation = tankRotation.worldY + this.turret.rotation.y;
			
			var type = this.game.currentWeapon;
			var bulletPosition = tankPosition.clone();

			// Create ordinance
			var bulletModel;
			if (type == 'missile') {
				bulletModel = new db.Missile({
					game: this.game,
					position: bulletPosition,
					rotation: tankRotation,
					type: 'friend'
				});
			}
			else {
				bulletModel = new db.Bullet({
					game: this.game,
					position: bulletPosition,
					rotation: tankRotation,
					type: 'friend'
				});
			}

			// Store bullet
			this.bullets.push({
				instance: bulletModel,
				type: type,
				time: time
			});

			// Emit event
			/*
			this.trigger('fire', {
				pos: [bulletPosition.x, bulletPosition.z],
				rot: turretRotation,
				type: type
			});
			*/
			
			var soundInfo = db.config.weapons[this.game.currentWeapon].sound;
			this.game.sound.play(soundInfo.file, soundInfo.volume);

			// Store last fire time
			this.lastFireTime[this.game.currentWeapon] = time;
		}
	},
	getPositionPacket: function() {
		var root = this.getRoot();
		var turret = this.getTurret();
		
		var tankPosition = (root && root.position) || new THREE.Vector3();
		var tankRotation = (root && root.rotation) || new THREE.Vector3();
		var turretRotation = (turret && turret.rotation) || new THREE.Vector3();

		return {
			pos: [tankPosition.x, tankPosition.y, tankPosition.z],
			rot: [tankRotation.x, tankRotation.y, tankRotation.z],
			tRot: turretRotation.y
		};
	}
});