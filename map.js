/* -------------
    maps.js
    Provides map loading and drawing functionality and manages the game objects.
    
	@author John Dunham
	@since  2013-10-09
	------------ */
	
//************Map*************

/**
 * Holds the map data, manages entities, and preforms the map draw call.
 * Assumes Tiled created maps of the json data type.
 *
 * @param mapIndex The index of the mapto be loaded based on the predefined maps array.
 */
function Map(mapIndex) {
	this.collisionMap = new CollisionArea();
	this.entities     =  [];
	this.highestID    = 0;
	this.tiles;
	
	this.tileSheetCanvas;
	this.tileSheetCtx;
	
	this.tileImg;	
	this.tileHeight;
	this.tileWidth;
	this.tilesPerRow;
	
	this.mapWidth;
	this.active = mapIndex;
	
	this.loadMap(mapIndex);

}

// A work around for loading maps on a local machine
Map.maps = [
	finalMap,
	protoMap1,
	protoMap2,
	protoMap3,
	protoMap4	
];

/**
 * Defines the array index of different layer types.
 */
Map.typeOrder = {
	"No_Bounce":0,
	"Bounce":1,
	"fail":2
};


Map.prototype = {

	/** 
	 * Checks the collision space for collisions with the CollisionMap.
	 */
	checkCollisions : function()
	{
		this.collisionMap.checkCollisions();
	},
	
	/**
	 * Adds a new entity to the collision map and entity array.
	 * Generates a new id for each entity for the sake of killing them later.
	 *
	 * @param entity The entity to be added to the map.
	 */
	addEntity : function(entity)
	{
		entity.id = this.highestID++;
		this.entities.push(entity);
		this.collisionMap.addEntity(entity.collision);
	},

	/**
	 * Kills the entity at the supplied index.
	 *
	 * @param entityIndex The index of the entity to kill.
	 */
	killEntity : function(entityIndex)
	{
		for(var ent in this.collisionMap.entityObjects)
		{
			if(this.collisionMap.entityObjects[ent].reactor.id === this.entities[entityIndex].id)
			{
				this.collisionMap.entityObjects.splice(ent, 1);
				this.entities.splice(entityIndex,1);
			}
		}
	},
	
	/**
	 * Loads the json map defined at the index.
	 *
	 * @param mapIndex The index of the corresponding map in Map.maps.
	 */
	loadMap : function(mapIndex)
	{
		var map = Map.maps[mapIndex];

		this.prepTileSheet(map.tilesets);
		
		// Load the Layers.
		for(var index in map.layers)
		{			
			if(map.layers[index].name === "collisions")
				this.generateCollsionMap(map.layers[index].objects);
			else if(map.layers[index].name === "tiles")
				this.generateTileMap(map.layers[index]);
			else if(map.layers[index].name === "entities")
				this.generateEntities(map.layers[index].objects);
		
		}
	},
	
	/**
	 * Initializes the image for the tile sheet and predraws it for (hopefully) faster draw calls.
	 *
	 * @param tileSets The Tilesets from the json map definition, only the first is used!
	 */
	prepTileSheet : function(tileSets)
	{
		this.tileSheetCanvas = document.createElement("canvas");
		this.tileSheetCtx    = this.tileSheetCanvas.getContext('2d');
		this.tileImg		 = new Image();

		this.tileHeight      = tileSets[0].tileheight;
		this.tileWidth       = tileSets[0].tilewidth;
		this.tilesPerRow     = Math.floor(tileSets[0].imagewidth / this.tileWidth);
		this.tileImg.src     = tileSets[0].image;
		
		this.tileSheetCanvas.width = tileSets[0].imagewidth;
		this.tileSheetCanvas.height = tileSets[0].imageheight;

		this.tileSheetCtx.drawImage(this.tileImg,0,0);
	},
	
	/**
	 * Draws the tile map in accordance with the map data.
	 *
	 * @param ctx The context this draw is to be invoked on.
	 */
	drawMap : function(ctx)
	{
		var x, y, sx, sy;
		
		for(var tile in this.tiles)
		{
			sx = (this.tiles[tile]  % this.tilesPerRow)  * this.tileWidth;
			sy = Math.floor(this.tiles[tile]  / this.tilesPerRow)  * this.tileHeight ;
			x  = (tile % this.mapWidth ) *  this.tileWidth;
			y  = Math.floor(tile / this.mapWidth ) *  this.tileWidth;

			ctx.drawImage(this.tileImg, 
				sx, sy, this.tileWidth, this.tileHeight, 
				x, y, this.tileWidth, this.tileHeight);
		}
	},
	
	/**
	 * Extracts the tile data from the supplied layer and applies the offset as Tiled starts at 1.
	 *
	 * @param layer The layer containing the tile data.
	 */
	generateTileMap : function(layer)
	{
		this.tiles = [];
		for(var index in layer.data)
		{
			this.tiles[index] = layer.data[index] -1 ;
		}

		this.mapWidth = layer.width;
	},
	
	
	/**
	 * Creates collision objects for all of the collision objects supplied.
	 * Sets the type of collision and attaches polylines where needed to the AABB.
	 *
	 * @param objects The collision objects before being translated to the Collidable object structure.
	 */
	generateCollsionMap : function(objects)
	{
		var newCollidable;
		var type;
		for ( var object in objects)
		{
			newCollidable = new Collidable(
				objects[object].x, 
				objects[object].y, 
				objects[object].width,
				objects[object].height);
				
				
			if(objects[object].polyline)
			{
				newCollidable.attachPolyline(objects[object].polyline);
			}

			newCollidable.properties = objects[object].properties;
			type = Map.typeOrder[objects[object].type];

			if(type <0)
			{
				type = Map.typeOrder.fail;
			}	
			
			this.collisionMap.addWorld(newCollidable,type);		
		}
	},
	
	/**
	 * Generates user controlled entities. At present assume CirclePlayer entities.
	 *
	 * @param entities The entities that are to be spawned in on the map.
	 */
	generateEntities : function(entities)
	{
		var newCircle;
		for (var entity in entities)
		{
			newCircle = new CirclePlayer();
			newCircle.setPosition(entities[entity].x + newCircle.radius,entities[entity].y + newCircle.radius);
			newCircle.lastMove = [parseInt(entities[entity].properties.x),parseInt(entities[entity].properties.y)];
			newCircle.color = entities[entity].properties.color;
			newCircle.shieldColor = entities[entity].properties.shield;
			newCircle.controls = CircleGame.ControlSchemes[parseInt(entities[entity].properties.controller)];
			
			this.addEntity(newCircle);
		}	
	}
};

//****************************
