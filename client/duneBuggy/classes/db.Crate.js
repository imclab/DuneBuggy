db.Crate = new Class({
	toString: 'Crate',
	extend: db.MapItem,
	options: {
		hp: 21,
		model: {
			name: "crate",
			yPosition: 4,
			size: db.config.size.crate,
			castShadow: true,
			wrapTextures: false
		}
	}
});
