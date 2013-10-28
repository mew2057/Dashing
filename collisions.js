/* -------------
    collisions.js
    Provides the collision detection scripts, reaction is handled elsewhere.
    
	@author John Dunham
	@since  2013-10-09
	------------ */
	
//************CollisionArea*************

/**
 * A collision area to contain Collidable objects. 
 * World objects are static, entity objects are dynamic.
 *
 * World objects are stored in a two dimensional array by order of precedence for collision detection.
 *
 */
function CollisionArea() {
	this.worldObjects = [];
	this.entityObjects = [];
}

CollisionArea.prototype = {
	
	/**
	 * Adds a world object to the collision space.
	 *
	 * @param collidable The Collidable object to add to the collision space.
	 * @param type The index for the bin in the collision space that this object belongs.
	 */
	addWorld : function(collidable, type) 
	{
		if(!this.worldObjects[type])
			this.worldObjects[type] = [];
			
		this.worldObjects[type].push(collidable);
	},
	
	/**
	 * Adds an entity object to the collision space.
	 *
	 * @param collidable The Collidable object to add to the collision space.
	 */
	addEntity : function (collidable)
	{
		this.entityObjects.push(collidable);
	},
	
	/**
	 * Checks to see if the dynamic entity objects collide with any objects in the collision space.
	 *
	 */
	checkCollisions : function()
	{	
		var reactionDetails;
				
		for(var entity in this.entityObjects)
		{
			// Check against the other dynamic objects.
			for(var otherEntity in this.entityObjects)
			{			
				reactionDetails = otherEntity != entity ? 
					this.entityObjects[entity].collides(this.entityObjects[otherEntity]) : 
					false;
					
				if(reactionDetails)
					this.entityObjects[entity].react(this.entityObjects[otherEntity],reactionDetails);
			}
			
			// Reset the touched count for the entity.
			this.entityObjects[entity].touched = 0;
			
			// Check against the static objects.
			for(var type in this.worldObjects)
			{
				for(var worldId in this.worldObjects[type])
				{
					reactionDetails = this.entityObjects[entity].collides(this.worldObjects[type][worldId]);
					
					if(reactionDetails)
						this.entityObjects[entity].react(this.worldObjects[type][worldId], reactionDetails);
				}
			}
		}
	}
}

//**************************************

//*************Collidable***************
/**
 * This implementation uses an Axis-Aligned Bounding Box to define collision areas.
 * By default only rectangle to rectangle collision detection occurs, but
 * if a circle is attached circle to circle, circle to line and circle to 
 * rectangle are all provided.
 * 
 * @param x The x position of the AABB.
 * @param y The y position of the AABB.
 * @param width The width of the AABB.
 * @param height The height of the AABB.
 */
function Collidable(x, y, width, height) 
{	
	// The definition of the AABB.
	this.x  = x;
	this.y  = y;
	this.w  = width;
	this.h  = height;
	
	// Center of the collidable (Circle Collisions happen so I added this to reduce the compute time)
	this.cX = x + width/2;
	this.cY = y + height/2;
	
	// Callback functions
	this.react = Collidable.prototype.baseReact;
	this.collides = Collidable.prototype.baseCollide;	
	this.funct = null;	
}

Collidable.prototype = {

	/**
	 * Attaches a polyline collision space for the sake of collision detection and reaction.
	 * 
	 * @param verticies A pair of verticies defined as : [{x:<int>,y:<int>},{x:<int>,y:<int>}].
	 *	These verticies are defined in a space relative to the bounding box, NOT world coordinates.
	 */
	attachPolyline : function(verticies)
	{
		// Initialize the place holders and the polyline.
		this.polyline = [];
		var maxX = maxY = 0;
		var minX = minY = 0;
	
	 	/*
   	 	 * Iterate over the vertices, initializing them in the collision 
		 * object and calculating the min and max values.
		 */
		for(var vert in verticies)
		{
			this.polyline[vert] = {x:0,y:0};
			
			if(maxX < verticies[vert].x)
				maxX = verticies[vert].x;
			else if(minX > verticies[vert].x)
				minX = verticies[vert].x;
				
			if(maxY < verticies[vert].y)
				maxY = verticies[vert].y;
			else if(minY > verticies[vert].y)
				minY = verticies[vert].y;	
				
		}
		
		// Adjust the bounding box as needed.
		this.w = maxX - minX;
		this.h = maxY - minY;
		this.x = this.x + minX;
		this.y = this.y + minY;
		
		// Perform a deep copy of the verticies modifying based on the min values.
		for(vert in verticies)
		{
			this.polyline[vert].x = verticies[vert].x - minX;			
			this.polyline[vert].y = verticies[vert].y - minY;	
		}
	},

	/**
	 * Attaches a circle collision space for the sake of collision detection and reaction.
	 * 
	 * @param cX The x position of the center of the attached circle.
	 * @param cY The y position of the center of the attached circle.
	 * @param radius The radius of the new circle.
	 */ 
	attachCircle : function(cX,cY,radius)
	{
		this.cX = cX;
		this.cY = cY;
		this.r = radius;
		
		// How many objects this collision is touching (for rectangles).
		this.touching = 0;
			
		// binds the circle collision operations to the this.circle property.
		this.collides = this.circleCollide;
	},
	
	/**
	 * Attaches a reation callback for the collision space.
	 * 
	 * @param reactor The object that will invoke the callback function.
	 * @param funct The callback function.
	 */
	attachReaction : function(reactor,funct)
	{
		this.reactor = reactor;
		this.funct = funct;
	},
	
	/**
	 * Performs the "gimme" reaction operations, and invokes the reaction callback if one is present.
	 *
	 * @param collidable The collidable object that is being reacted with.
	 * @param computedData Any computed data that may help.
	 */
	baseReact : function(collidable, computedData)
	{
		if(this.funct)
			this.funct.call(this.reactor, collidable, computedData)
	},
	
	/**
	 * Checks for a collision between two AABBs.
	 *
	 * @param collidable The collidable object that this is being checked for a collision with.
	 *
	 * @return true if collision occurs.
	 */
	baseCollide : function(collidable)
	{
		return !(
			this.x > collidable.x + collidable.w || // Left1 < Right2
			this.x + this.w < collidable.x       || // Right1 > Left2
			this.y > collidable.y + collidable.h || // Top1 < Bottom2
			this.y + this.h < collidable.y);        // Bottom1 > Top2
	},
	
	/**
	 * Performs Circle-to-___ collision checks.
	 * Currently supports: Circle-to-Circle, Circle-to-Line Segment, and Circle-to-Rectangle. 
	 *
 	 * @param collidable The collidable object that this is being checked for a collision with.
	 *
	 * @return With data or true if a collision occurs, else false.
	 */
	circleCollide : function(collidable)
	{
		if(!this.baseCollide(collidable))
			return;

		if(collidable.polyline)	// Circle-to-Line Segment
			return this.circleLineIntersection(collidable.polyline[0].x,
				collidable.polyline[0].y,
				collidable.polyline[1].x,
				collidable.polyline[1].y,
				collidable.x, 
				collidable.y);
		else if(collidable.r) // Circle-to-Circle
		    return this.circleInCircle(collidable.cX,collidable.cY, collidable.r);
		else				  // Circle-to-Rectangle
		{				
			// http://stackoverflow.com/questions/401847/circle-rectangle-collision-detection-intersection/402010#402010
			var distX = Math.abs(this.cX - collidable.cX);
			var distY = Math.abs(this.cY - collidable.cY);
			
			if( distX > collidable.w/2 + this.r || distY > collidable.h/2 + this.r)
				return false
			else if(distX <= collidable.w/2  || distY <= collidable.h/2 + this.r)
				return true;
			else
				return ((distX - collidable.w/2) * (distX - collidable.w/2) + ((distY - collidable.h/2) * (distY - collidable.h/2))) <= (this.r * this.r);
		}
		return false;
	},
	
	/**
	 * Performs the Circle-to-Circle collision check
	 *
	 * @param x The x position of the circle that is being checked against for collisions.
	 * @param y The y position of the circle that is being checked against for collisions.
	 * @param r The radius of the circle that is being checked against for collisions.
	 *
	 * @return True if a collision occurs.
	 */
	circleInCircle : function (x,y,r)
	{
		return (this.cX - x)*(this.cX - x) + (this.cY - y)*(this.cY - y)  <= (this.r + r)*(this.r + r);
	},
	
	/**
	 * Performs the Circle-to-Line Segment collision check.
	 *
	 * @param x1 The x of the first point in the line segment.
	 * @param y1 The y of the first point in the line segment.
	 * @param x2 The x of the second point in the line segment.
	 * @param y2 The y of the second point in the line segment.
	 * @param xOff The x offset of the line segment.
	 * @param yOff The y offset of the line segment.
	 *
	 * @return With an array length 2 with the penetration and closest point if a collision occurs, else false.
	 */
	circleLineIntersection : function(x1,y1,x2,y2,xOff,yOff)
	{
		// Find the closest point on the line segment to the circle center.
		var closest = this.circleLineClosestPoint(x1,y1,x2,y2,xOff,yOff);
		 
		// Find the penetration with the line
		var penetration = Math.sqrt((this.cX - closest[0]) * (this.cX - closest[0]) + (this.cY - closest[1]) * (this.cY - closest[1])) - this.r;

		if(penetration <= 0)
			return [penetration,closest];
		else
			return false;
		
	},
	
	/**
	 * Finds the closest point on the line segment to the circle.
	 *
	 * @param x1 The x of the first point in the line segment.
	 * @param y1 The y of the first point in the line segment.
	 * @param x2 The x of the second point in the line segment.
	 * @param y2 The y of the second point in the line segment.
	 * @param xOff The x offset of the line segment.
	 * @param yOff The y offset of the line segment.
	 *
	 * @return With an array length 2 that contains the x and y positions of the closest point.
	 */
	circleLineClosestPoint : function(x1,y1,x2,y2,xOff,yOff)
	{
		
		var closest;
		
		// Calculate the vector between the first point and the center point.
		var ptX = (this.cX - xOff) - x1;
		var ptY = (this.cY - yOff) - y1;
		
		// The definition of the segment c vector (this is the vector for the line segment).
		var cX  = x2 - x1;
		var cY  = y2 - y1;	
		var cMag = Math.sqrt(cX * cX + cY * cY);
		
		// The magnitude of the  projection of the pt vector onto the line segment.
		var projVMag = ptX*(cX/cMag) + ptY*(cY/cMag);
		
		/*
		 *	If projVMag is less than zero the closest point is the first point. 
		 *	Else if projVMag is greater than the length of the line segment the closest point is the second point.
		 *  Else time to do some calculations.
		 */
		if(projVMag < 0)
			closest = [x1,y1];
		else if (projVMag > cMag)
			closest =  [x2,y2];
		else
		{			
			// Determine the components of the projection vector.
			var angle = (cY < 0 && cX < 0 ? Math.PI : 0) + Math.atan(cY/cX);
			var projVX = projVMag * Math.cos(angle);
			var projVY = projVMag * Math.sin(angle);
			
			// Add the projection vector to the first point for the closest point.
			closest = [projVX + x1, projVY + y1];
		}
		
		// Apply an offset to the closest.
		closest[0] += xOff;
		closest[1] += yOff;
		
		return closest;
	},
	
	/**
	 * Changes the radius of the circle attached to this collision space 
	 * and updates the AABB accordingly.
	 *
	 * @param newRadius The modified radius of the circle.
	 */
	changeRadiusTo : function(newRadius)
	{
		var diff = this.r - newRadius;
		this.r = newRadius;
		this.x += diff;
		this.y += diff;
		this.w -= diff*2;
		this.h -= diff*2;
	},
	
	
	/**
	 * Applies a vector through addition to the current position of the object.
	 *
	 * @param xVel The modification to the x and cX properties.
	 * @param yVel The modification to the y and cY properties.
	 */
	applyVector : function(xVel, yVel)
	{
		this.x += xVel;
		this.y += yVel;
		this.cX+= xVel;
		this.cY+= yVel;
	}
}
//**************************************
