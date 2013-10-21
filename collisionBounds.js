/* -------------
    collisionBounds.js
    Contains a set of functions to define collision boundaries.
	Additionally contains an implementation of the quad tree.
    
	@author John Dunham
	@since  2013-10-09
	------------ */

//************Point****************
function Point(x,y)
{
	this.x = x;
	this.y = y;
}	
//*********************************

//************Vector***************
function Vector(x,y)
{
	this.x = x;
	this.y = y;
}	
//*********************************
//************AABB*****************
function AABB(x,y,w,h)
{
	this.min = [x    , y    ];
	this.max = [x + w, y + h];
}

AABB.prototype = {
	containsPoint : function(x,y)
	{
		return x < this.max[0] && x > this.min[0] && 
			y < this.max[1] && y > this.min[1];
	}

	intersectsAABB : function(other)
	{
		return (other.max[0] < this.min[0] || other.min[0] > this.max[0] || 
			other.max[1] < this.min[1] || other.min[1] > this.max[1]);
	}

	move : function(dX,dY)
	{
		this.min.x += dX;
		this.min.y += dY;
		this.max.x += dX;
		this.max.y += dY;
	}
}
//*********************************

//*********CircleBounds************
/**
 * A narrow phase collision detection check.
 */
function CircleBound(x,y,r)
{
	this.x = x;
	this.y = y;
	this.r = r;
}

CircleBound.prototype = {
	move : function(dX,dY)
	{
		this.x += dX;
		this.y += dY;
	}
}

//*********************************

function CollisionOps(){}
CollisionOps.collides_AABB_Circle(bBox, bCircle)
{
	/*var distX = Math.abs(bCircle.x - bBox.min.x);
	var distY = Math.abs(bCircle.y - collidable.cY);
			
	if(distX > collidable.w/2 + this.r || distY > collidable.h/2 + this.r)
		return false
	else if(distX <= collidable.w/2  || distY <= collidable.h/2 + this.r)
		return true;
	else
		return ((distX - collidable.w/2) * (distX - collidable.w/2) + ((distY - collidable.h/2) * (distY - collidable.h/2))) <= (this.r * this.r);
	}*/	
}

CollisionOps.collides_AABB_Line(bBox, line)
{
	
}

CollisionOps.collides_Circle_Line(bCircle, line)
{
	
}


//*********SweepAndPrune***********

/**
 * A sweep and prune implementation for collision detection.
 *
 * @param arguments Arrays containing objects which have an AABB defined as AABB.
 */
function SweepAndPrune()
{
	var axisList = [], activeList = [], overlaps = [];
	
	// Sweep
	// O(n)
	for(var index in arguments)
	{
		for(var object in arguments[index])
		{
			axisList.push(arguments[index][object]);
		}
	}
	// O(n log(n))
	axisList.sort(SweepAndPrune.compare);
	
	// Prune
	for(index = 0; index < axisList.length; index++)
	{		
		for(object = 0; object < activeList.length; object++)
		{
			if(axisList[index].min.x > activeList[object].max.x)
			{
				activeList.splice(object, 1);
				object--;
			}
			else
			{
				overlaps.push([activeList[object], axisList[index]]);
			}
		}
		
		activeList.push(axisList[index]);		
	}
	
	return overlaps;
}

/**
 * Provides the compare function for the Sweep and Prune sort in JavaScript.
 * Assumes that the objects have an AABB property called AABB.
 *
 *	@param objectA A collision object with a AABB object.
 *	@param objectB A collision object with a AABB object.
 */
SweepAndPrune.compare = function(objectA, objectB)
{
	return objectA.AABB.min.x - objectB.AABB.min.x
}

//*********************************

//************QuadTree*************

/**
 * An implementation of the quadtree data structure.
 *
 * @param x The x center position of the quadtree.
 * @param y The y center position of the quadtree.
 * @param w The width of the quadtree.
 * @param h The height of the quadtree.
 */
function QuadTree(x,y,w,h)
{
	// Bounding Box for quadrent (type: AABB)
	this.quad 	   = new AABB(x,y,w,h);
	
	// A collection of objects to be contained in the bounding box (type: ?)
	this.objects   = [];
	
	// Children (type: Quadtree)
	this.northEast = null;
	this.northWest = null;
	this.southEast = null;
	this.southWest = null;
}

// XXX Modify please.
// Constants.
QuadTree.maxObjects = 40;
QuadTree.maxDepth   = 10;

QuadTree.prototype = {

	
	insert : function(object, x, y)
	{
		// If this is not a leaf continue in the recursion.
		if(this.northEast)
		{
			
			return;
		}
		// In theory we should be at the right leaf at this point.
		this.objects.push(object);			
	}
}

//*********************************
