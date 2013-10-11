/* -------------
    collisionBounds.js
    Contains a set of functions to define collision boundaries.
	Additionally contains an implementation of the quadtree.
    
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

//************AABB*****************
function AABB(x,y,w,h)
{
	this.min = [x    , y    ];
	this.max = [x + w, y + h];
}

function containsPoint(x,y)
{
	return x < this.max[0] && x > this.min[0] && 
		y < this.max[1] && y > this.min[1];
}

function intersectsAABB(other)
{
	if(other.max[0] < this.min[0] || other.min[0] > this.max[0])
		return false;
	else if(other.max[1] < this.min[1] || other.min[1] > this.max[1])
		return false;
	
	return true;
}

//*********************************

//************Circle***************

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
