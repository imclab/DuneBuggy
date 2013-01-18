(function() {
	var faceMaterial = new THREE.MeshFaceMaterial({
		vetexColor: THREE.FaceColors
	});

	db.Missile = new Class({
		extend: db.GameObject,
	
		construct: function(options){
			// handle parameters
			options = jQuery.extend({
				position: new THREE.Vector3(0, 0, 0),
				rotation: new THREE.Vector3(1, 1, 1)
			}, options);
			
			var missileColor = options.type == 'friend' ? db.config.colors.friend : db.config.colors.enemy;
	
			// Load model
			var loader = new THREE.JSONLoader();
			loader.load("duneBuggy/models/missilePhoenix.js", function(geometry) {
				this.missileGeometry = geometry;
		
				// geometry.materials[0] = new THREE.MeshLambertMaterial({ color: missileColor, shading: THREE.FlatShading, vertexColors: THREE.VertexColors });
				var material = new THREE.MeshPhongMaterial({ color: missileColor, ambient: 0x050505, shading: THREE.FlatShading, vertexColors: THREE.VertexColors });
		
				// Body
				this.root = new Physijs.CylinderMesh(geometry, material, 5);
				this.root.scale.set(db.config.size.missile, db.config.size.missile, db.config.size.missile);
				
				this.root.castShadow = true;
				this.root.receiveShadow = true;
				
				// Set initial position
				this.root.position.copy(options.position);
				this.root.position.y = options.position.y+25;
				
				this.root.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
				
				this.root.__dirtyPosition = true;
				this.root.__dirtyRotation = true;

				this.game.scene.add(this.root);
				
				this.root.setLinearVelocity({x: 0, y: 100, z: 0});
			}.bind(this));
		
			// Store start time
			this.time = new Date().getTime();
		},
	
		setPosition: function(position, rotation) {
			console.log('setting missile position');
			
			// position
			this.root.position.x = position[0];
			this.root.position.y = position[1];
			this.root.position.z = position[2];

			// rotation
			this.root.rotation.y = rotation;
		},
		/*
		update: function(delta) {
			this.velocity = THREE.Math.clamp(this.speed + delta * this.ACCELERATION, 0, this.MAX_SPEED);
		
			// bullet update
			var forwardDelta = this.speed * delta;

			// displacement
			this.root.position.x += Math.sin(this.root.rotation.y) * forwardDelta;
			this.root.position.z += Math.cos(this.root.rotation.y) * forwardDelta;
		
			// Spin missile according to speed
			this.root.rotation.z += this.speed/Math.PI/512;
		}
		*/
	});

}());
