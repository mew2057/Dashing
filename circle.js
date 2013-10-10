/* -------------
    circle.js
    Defines the player behavior and combat system.
   
	@author John Dunham
	@since  2013-10-09
   --------------*/
   
//****************Circle*******************
/**
 * Defines the Circle Agent
 * Is a Collidable object.
 */
function Circle(){
    // The current velocity of the circle.
	this.movementVector 	= [0,0];
	// The normalization of the movementVector.
	this.moveNorm       	= [0,0];
	// The direction the character is facing.
	this.lastMove			= [0,0];	
	// The last dashed direction (this circumvents a particular bug.
	this.lastDash			= [0,0];
	// The radius of the Circle.
	this.radius 			= Circle.DEFAULT_RADIUS;
	// The radius that is actually checked in collision detection, not collision reaction.
	this.collidableRadius 	= this.radius;	
    // The base color of the circle.
    this.color 				= "blue";
	// The base color of the shield.
	this.shieldColor		= "red";
	// The thickness of the line.
	this.lineWeigth 		= Circle.STROKE_WEIGHT;
	// Flags that with react, update and draw.
	this.flags 				= [];
	// The health of the circle.
	this.health 			= Circle.STARTING_HEALTH;
	// The health of the shield.
	this.shieldHP 			= Circle.STARTING_SHIELD;	
    // The current operational state of the agent.
    this.alive				= true;	
	// Whether or not the agent is stunned.
	this.shieldStun 		= false;
	// Sets whether the attack button will do something or not.
	this.canAttack 			= true;	
	// Holds whether the circle is healing or not.
	this.healing 			= false;
	// States whether the circle has a enabled shield or not.
	this.shielded			= false;
	// If toggled clear out any dash opertations.
	this.dashComplete       = false;	
	
	// The collision object for the Circle.
	this.collision		    = new Collidable(0,0, this.radius * 2, this.radius * 2);
	this.collision.attachCircle(0,0,this.radius);
	this.collision.attachReaction(this,this.react);
};

// Tweakables.
//Misc
Circle.STROKE_WEIGHT   = 2;																  		// The thickness of the circle lines.
Circle.DEFAULT_RADIUS  = 16;   															  		// Constant value for the starting radius.
// Health
Circle.STARTING_HEALTH = 50;   															  		// Constant value for the starting health.
Circle.STARTING_SHIELD = 19;															 		// The base health for the shield.
// Attack
Circle.ATTACK_RADIUS   = Circle.DEFAULT_RADIUS * 1.3;									  		// The effective radius of the base attack.
Circle.ATTACK_DMG	   = 6;															      		// The base damage of the basic attack.
Circle.ATTACK_TIME     = 100; 															  		// How long the base attack will be effective.
// Shield
Circle.SHIELD_SMOOTH   = 10;															  		// The smoothing factor that determines the decay for the shield.
Circle.DECAY_TIME      = 7;																  		// The time it takes for the shield to fully decay.
Circle.HEAL_TIME       = 3.33;			 														// The time it takes for the shield to fully heal.
Circle.STUN 		   = 1300;															  		// The length of the shield stun.
Circle.SHIELD_DEC     = ((Circle.DECAY_TIME * 100) / Circle.SHIELD_SMOOTH);		        		// The time between shield health decrement calls.
Circle.SHIELD_INC     = ((Circle.HEAL_TIME * 100) / Circle.SHIELD_SMOOTH);				  		// The time between shield health increment calls.
Circle.SHIELD_DECAY    = Circle.STARTING_SHIELD / (Circle.SHIELD_SMOOTH * Circle.DECAY_TIME);	// Decay rate for the shield.
Circle.SHIELD_HEAL	   = Circle.STARTING_SHIELD / (Circle.SHIELD_SMOOTH * Circle.HEAL_TIME); 	// Heal rate for the shield.
// Movement
Circle.BASE_SPEED      = 5;																  		// The base movement speed for the circle.
Circle.BASE_SPEED_DIAG = Circle.BASE_SPEED / Math.sqrt(2);										// The decomposed Base Speed (only 45 degree angles).
// Dash
Circle.DASH_SPEED      = 2 * Circle.BASE_SPEED;											  		// The movement speed for the dash ability.	
Circle.DASH_SPEED_DIAG = Circle.DASH_SPEED / Math.sqrt(2);										// The decomposed Dash Speed (only 45 degree angles).
Circle.DASH_CD		   = 450;															  		// The cool down on the dash ability.
Circle.DASH_DAMAGE     = 14; 															  		// The damage dealt by the dash ability.
Circle.DASH_BLOWBACK   = 4;																  		// The reflected damage from the dash ability.

// A pseudo enumerated type to make debugging and code readability better for the controls.
Circle.INPUT_MAPPINGS = {
	up    : 0,
	down  : 1,
	left  : 2,
	right : 3,
	attack: 4,
	shield: 5,
	dash  : 6,
	dirMod:[-1,1,-1,1]
};

Circle.attackReact = function(circleAttacking, circleDefending)
{
	// If the enemy circle was shielded deal shield damage.
	// Else if the enemy circle was not shielded deal health damage.
	if(circleDefending.shielded)
	{
		circleDefending.shieldHP -= Circle.ATTACK_DMG;
	}
	else
	{
		circleDefending.health -= Circle.ATTACK_DMG;
	}
		
	circleAttacking.flags[Circle.INPUT_MAPPINGS.attack] = false;
};

/**
 * Defines the base components of a circle agent.
 */
Circle.prototype = {

	/**
	 * Sets the position of the Circle, updating the AABB and center for the collision space.
	 */
	setPosition : function(x,y)
	{
		this.collision.x = x - this.radius,
		this.collision.y = y - this.radius;
		this.collision.cX = x;
		this.collision.cY = y;
	},
	
	/**
	 * As JavaScript has no super construct (to my knowledge at the time of writing this)
	 * 
	 * 
	 * Performs the movement logic for the circle agent.
	 */
	updateBase:function ()
	{   
		// If the health is zero or lower kill the circle.
		// Else perform the shield checks and movement.
		if(this.health <=0)
		{
			this.alive = false;
		}
		else
		{
			if(!this.shielded && !this.shieldStun)
				this.collision.applyVector(this.movementVector[0],this.movementVector[1]);
				
			// Stun happens if the shieldHP is less than or equal to zero.
			if(this.shieldHP <= 0 && !this.shieldStun)
				this.shieldStunner();
			
			if(this.dashComplete)
			{
				this.completeDash(null,true);
				this.dashComplete = false;
			}
		}
	},
	
	/**
	 * Performs the draw operation on the supplied context.
	 * 
	 * @param context The canvas 2d drawing context for the draw operation.
	 */
	draw:function(context)
	{    
		// Do context settings.
		context.save();
		context.beginPath();
		context.strokeStyle = this.color;
		context.lineWidth = this.lineWeigth;
		context.fillStyle = this.shieldColor;
		
		// Draws the player circle and health bar.
		context.arc(this.collision.cX,this.collision.cY, this.radius ,0,Math.PI*2,false);    
		context.arc(this.collision.cX,this.collision.cY, this.radius *.75 ,0,Math.PI * this.health/Circle.STARTING_HEALTH,false); 		
		context.stroke();
		
		// Draws the visual representation of the shield.
		if(this.shieldHP > 0)
		{
			context.beginPath();
			context.arc(this.collision.cX,this.collision.cY, (Circle.DEFAULT_RADIUS * this.shieldHP)/Circle.STARTING_SHIELD,0,Math.PI*2,false);
			context.closePath();
			if(this.shielded)
				context.fill();
			else if( (Circle.DEFAULT_RADIUS * this.shieldHP)/Circle.STARTING_SHIELD != this.radius)
				context.stroke();
		}
		
		// Draws the reactive radius if the collidable radius is different.
		if(this.collision.r != this.radius)
		{
			context.beginPath();
			context.arc(this.collision.cX,this.collision.cY, this.collision.r ,Math.PI*2,false);
			context.closePath();
			context.stroke();			
		}
			
		// Draws the visual representation of the stun mechanic.
		if(this.shieldStun)
		{
			context.beginPath();
			context.moveTo(this.collision.cX - this.radius, this.collision.cY);
			context.lineTo(this.collision.cX + this.radius, this.collision.cY);
			context.moveTo(this.collision.cX,  this.collision.cY - this.radius);
			context.lineTo(this.collision.cX,  this.collision.cY + this.radius);
			context.closePath();
			context.stroke();
		}		
		
		// Draw the direction the player is facing
		context.beginPath();
		context.moveTo(this.collision.cX, this.collision.cY);
		context.lineTo(this.collision.cX + this.radius/2 * this.lastMove[0], this.collision.cY + this.radius/2 * this.lastMove[1]);
		context.closePath();
		context.stroke();	
		context.restore();  
	},

	/**
	 * Finds the distance between two points.
	 *
	 * @return The distance between two points.
	 */
	distance : function(x1,y1,x2,y2)
	{
		return Math.sqrt((x1 - x2)*(x1 - x2) +(y1 - y2)*(y1 - y2));
	},
	
	/**	
	 * Performs the collision reaction between two circles. Damage is both dealt and received in this function.
	 *
	 * @param collidable The collidable object that this reaction centers on.
	 * @param computedData Any data computed a priori that may help us here.
	 */
	react : function(collidable, computedData)
	{
		if(collidable.r) 					// Circle Collision!
			this.reactCircle(collidable);
		else if(collidable.polyline)				// Line Collision!
			this.reactLineSegment(collidable, computedData);			
		else										// Rectangle Collision!
			this.reactRect(collidable);
	},
	
	/**	
	 * Performs the collision reaction between two circles. Damage is both dealt and received in this function.
	 *
	 * @param circle The collidable circle will collide with this.
	 */
	reactCircle : function(circle)
	{	
		// The penetration vector.
		var pen = this.distance(this.collision.cX, this.collision.cY, circle.cX, circle.cY) -
			(this.radius + circle.reactor.radius);
		
		if(pen > 0)
			pen = 0;
			
		// The angle of penetration between this circle and the compared.
		var angle = (this.collision.cX === circle.cX) ? Math.PI/2 : 
			Math.atan((circle.cY - this.collision.cY)/(circle.cX - this.collision.cX));
			
		// The decomposition of the penetration vector.
		var penX = Math.round(pen * Math.cos(angle));
		var penY = Math.round(pen * Math.sin(angle));
		
		// If this circle was moving.
		// else the other circle was moving.
		if((this.movementVector[0] !== 0 || this.movementVector[1] !== 0))
		{
			// If the other circle was stationary.
			// else the other circle was moving.
			if((circle.reactor.movementVector[0] === 0 && circle.reactor.movementVector[1] === 0))
			{
				// If this circle was attacking deal attack damage.
				if(this.dashing)
					this.completeDash(circle.reactor,true);
				
				if(this.flags[Circle.INPUT_MAPPINGS.attack])
					Circle.attackReact(this,circle.reactor);
				
				// Make it so the circles are no longer penetrating.
				this.collision.applyVector(penX,penY);
				
			}
			else
			{
				if(this.dashing)
					this.completeDash(circle.reactor,true);
					
				if(circle.reactor.dashing)
					circle.reactor.completeDash(this,true);
					
				// If this circle was attacking deal attack damage.
				if(this.flags[Circle.INPUT_MAPPINGS.attack])
					Circle.attackReact(this,circle.reactor);
				
				// Make it so the circles are no longer penetrating.
				this.collision.applyVector(penX/2,penY/2);
				circle.applyVector(-penX/2,-penY/2);				
			}
		
		}
		else 
		{			
			if(circle.reactor.dashing)
				circle.reactor.completeDash(this,true);
					
			// If this circle was attacking deal attack damage.
			if(circle.reactor.flags[Circle.INPUT_MAPPINGS.attack])
				Circle.attackReact(circle.reactor,this);
			
			// Make it so the circles are no longer penetrating.
			circle.applyVector(-penX,-penY);
		}
	},
	
	/**	
	 * Performs the collision reaction a circle and a line segment.
	 * This is where the bounce logic exists.
	 *
	 * @param pline The line segment.
	 * @param intersectionInfo Details that make the reaction go quicker. 0 is penetration, 1 is closest point.
	 */
	reactLineSegment : function(pline, intersectionInfo)
	{
		var pen,closestPoint,angle,penX,penY;
		pen = Math.abs(intersectionInfo[0]);
		closestPoint = intersectionInfo[1];

		// If the angle is 90 degrees, determine if it's positive or negative.
		// Else just get the angle.
		if( this.collision.cX === closestPoint[0])
			angle = Math.PI/2 *  (this.collision.cY < closestPoint[1] ? -1 : 1);
		else		
			angle = Math.atan((closestPoint[1] - this.collision.cY)/(closestPoint[0] - this.collision.cX));
			
		if(this.collision.cX < closestPoint[0])
			angle*=-1;
		
		// The decomposition of the penetration vector.
		penX = (this.collision.cX < closestPoint[0] ? -1 : 1) * Math.round(pen * Math.cos(angle));
		penY = Math.round(pen * Math.sin(angle));		
		
		this.collision.applyVector(penX,penY);			

		if(this.dashing)
		{
			// If the player has zeroed their lastMove direction, ensure we have a bounce.
			if(this.lastMove[0] === 0 && this.lastMove[1] === 0)
			{
				this.lastMove[0] = this.lastDash[0];
				this.lastMove[1] = this.lastDash[1];
			}
			
			var temp = 0;
			switch(parseInt(pline.properties.bounce))
			{
				case 0:
					temp = this.lastMove[0];
					this.lastDash[0] = this.lastMove[0] = -this.lastMove[1];
					this.lastDash[1] = this.lastMove[1] = -temp;
					this.changeDashDirection(this.lastMove);
					this.dashComplete = false;
					break;
				case 1:
					temp = this.lastMove[0];
					this.lastDash[0] = this.lastMove[0] = this.lastMove[1];
					this.lastDash[1] = this.lastMove[1] = temp;
					this.changeDashDirection(this.lastMove);
					this.dashComplete = false;
					break;
				case 2:
					this.lastDash[1] = this.lastMove[1] *= -1;
					this.changeDashDirection(this.lastMove);
					this.dashComplete = false;
					break;
				case 3:
					this.lastDash[0] = this.lastMove[0] *= -1;
					this.changeDashDirection(this.lastMove);
					this.dashComplete = false;
					break;
				default:
					this.completeDash(null,true);
			}
		}
	},
	
	
	/**	
	 * Performs the collision reaction a circle and a rectangle.
	 *
	 * @param rectangle The rectangle.
	 */
	reactRect : function(rectangle)
	{	
		var intersection, touched;
	
		if(this.collision.cY < rectangle.cY) 	// Up
		{
			intersection = this.collision.circleLineIntersection(rectangle.x, rectangle.y, rectangle.x + rectangle.w, rectangle.y, 0, 0);
			if(intersection)
			{
				this.collision.applyVector(0,intersection[0]);
				
				if(this.dashing && this.movementVector[0] === 0)
				{
					this.dashComplete = true;
				}
			}
		}
		else if(this.collision.cY > rectangle.cY) // Down
		{
			intersection = this.collision.circleLineIntersection(rectangle.x, rectangle.y + rectangle.h, rectangle.x + rectangle.w, rectangle.y + rectangle.h, 0, 0);
			if(intersection)
			{
				this.collision.applyVector(0,-intersection[0]);
				
				if(this.dashing && this.movementVector[0] === 0)
				{
					this.dashComplete = true;
				}
			}
		}
		
		if(this.dashing && intersection)
			touched = true;
			
		if(this.collision.cX < rectangle.cX) // Left
		{
			intersection = this.collision.circleLineIntersection(rectangle.x, rectangle.y, rectangle.x , rectangle.y + rectangle.h, 0, 0);
			if(intersection)
			{
				this.collision.applyVector(intersection[0],0);
				
				if(this.dashing && this.movementVector[1] === 0)
				{
					this.dashComplete = true;
				}
			}
		}
		else if(this.collision.cX > rectangle.cX)	// Right
		{
			intersection = this.collision.circleLineIntersection(rectangle.x + rectangle.w, rectangle.y, rectangle.x + rectangle.w, rectangle.y + rectangle.h, 0, 0);
			if(intersection)
			{
				this.collision.applyVector(-intersection[0],0);
				
				if(this.dashing && this.movementVector[1] === 0)
				{					
					this.dashComplete = true;
				}
			}
		}
		
		if(this.dashing && (intersection || touched))
			this.collision.touched++;
		
		// Corner condition.
		if(this.collision.touched > 1)
			this.dashComplete = true;		
	},
	
	changeDashDirection : function(moveNormal)
	{
		this.applyMove(Circle.DASH_SPEED, Circle.DASH_SPEED_DIAG,moveNormal);
	},
		
	/**
	 * Applies the shield stun logic to this circle.
	 */
	shieldStunner : function()
	{			
		// Don't rerun if this is already active.
		if(this.shieldStun)
			return;
			
		var self        = this;
		
		// Set the boolean flags as needed.
		this.shieldStun = true;
		this.shielded   = false;
		
		// Revoke the stun in Circle.STUN time and begin the healing process.
		window.setTimeout(function(){
			self.shieldHP = 1;
			self.flags[Circle.INPUT_MAPPINGS.shield] = false;
			self.shieldStun = false;
			self.shieldHeal()},Circle.STUN);
	},
	
	/**
	 * Applies the time based shield decay logic to this circle.
	 */
	shieldDecay : function()
	{
		var self = this;
	
		// If the shield is not active, don't decay it.
		if(!self.flags[Circle.INPUT_MAPPINGS.shield] || self.shieldStun)
		{
			return;	
		}
		
		// Decay the shield.
		self.shieldHP -= Circle.SHIELD_DECAY;
		
		// If the shield is less than zero set the stun.
		// Else continue the decay.
		if (self.shieldHP > 0)
		{	
			window.setTimeout(function(){self.shieldDecay();},Circle.SHIELD_DEC);
		}
	},
	
	/**
	 * Applies the time based shield heal logic to this circle.
	 */
	shieldHeal : function()
	{
		var self = this;
		// If the shield is stunned or active, DO NOT HEAL.
		if(self.flags[Circle.INPUT_MAPPINGS.shield] || self.shieldStun)
		{
			return;	
		}
		
		// Heal the shield.
		self.shieldHP += Circle.SHIELD_HEAL;
		
		// If the shield is at the max or higher make it max and don't heal anymore.
		// Else continue the heal.
		if(self.shieldHP >= Circle.STARTING_SHIELD)
		{
			this.healing = false;
			self.shieldHP = Circle.STARTING_SHIELD;
		}
		else
		{
			this.healing = true;
			window.setTimeout(function(){self.shieldHeal();},Circle.SHIELD_INC);
		}
	},
	
	/**
	 * Completes the attack for the circle.
	 */
	attackComplete : function()
	{		
		var self = this;
		this.flags[Circle.INPUT_MAPPINGS.attack] = false;
		this.collision.changeRadiusTo(Circle.DEFAULT_RADIUS);
		window.setTimeout(function(){self.canAttack=true;},Circle.ATTACK_TIME);
	},

	/**
	 * Kicks off the dash action.
	 */
	setDash : function()
	{
		this.dashing = true;
		this.applyMove(Circle.DASH_SPEED,Circle.DASH_SPEED_DIAG,this.lastMove);
		this.lastDash[0] = this.lastMove[0];
		this.lastDash[1] = this.lastMove[1];
		
	},
	
	/**
	 * Ends the dash action.
	 *
	 * @param otherCircle The collided circle.
	 * @param blowback Applies blowback damage if specified.
	 */
	completeDash : function(otherCircle,blowback)
	{
		var self = this;
		if(otherCircle)			
			if(otherCircle.shielded)
				otherCircle.shieldHP -= Circle.DASH_DAMAGE;
			else
				otherCircle.health -= Circle.DASH_DAMAGE;

				
		if(blowback)
			this.health -= Circle.DASH_BLOWBACK;
		
		this.dashing = false;
		this.applyMove(Circle.BASE_SPEED,Circle.BASE_SPEED_DIAG,this.moveNorm);
				
		window.setTimeout(function(){self.flags[Circle.INPUT_MAPPINGS.dash] = false;},Circle.DASH_CD);
	},
	
	/**
	 * Moves the player in a new direction based on the current input and previous inputs.
	 *
	 * @param moveAction The direction of movement.
	 * @param start Toggles whether the move should be added or removed (true adds).
	 */
	handleMove:function(moveAction, start)
	{
		if(moveAction === Circle.INPUT_MAPPINGS.up || 
			moveAction === Circle.INPUT_MAPPINGS.down)
			this.move(moveAction,1,0,start);		
		else if(moveAction === Circle.INPUT_MAPPINGS.left || 
			moveAction === Circle.INPUT_MAPPINGS.right)
			this.move(moveAction,0,1,start);		
	},
	
	/**
	 * Performs the movement vector calculations.
	 *
	 * @param moveAction The direction of movement.
	 * @param dirToChange The direction (x,y) that the action dictates.
	 * @param dirOther The direction of the movement unaffected by this action.
	 * @param increment Toggles whether the move should be added or removed (true adds).
	 */
	move:function(moveAction, dirToChange, dirOther, increment)
	{
		// If this is invoked as the initial move add to the normal the direction modifier.
		// Else subtract from the normal.
		if(increment)
		{
			// Zero the lastMove if we were previously stationary
			if(this.moveNorm[dirOther] === 0 && this.moveNorm[dirToChange] === 0)
			{
				this.lastMove[dirToChange] = 0;
				this.lastMove[dirOther]    = 0;
			}
			
			this.lastMove[dirToChange] = this.moveNorm[dirToChange] += Circle.INPUT_MAPPINGS.dirMod[moveAction];	
		}
		else
		{
			this.moveNorm[dirToChange] -= Circle.INPUT_MAPPINGS.dirMod[moveAction];
			
			// If the circle is becoming stationary 
			if(this.moveNorm[dirOther] !== 0 || this.moveNorm[dirToChange] !== 0)
				this.lastMove[dirToChange] = this.moveNorm[dirToChange];
		}

		if(this.dashing)
			return;
			
		this.applyMove(Circle.BASE_SPEED, Circle.BASE_SPEED_DIAG, this.moveNorm);	
	},
	
	/**
	 * Performs the actual movement vector calculations.
	 *
	 * @param baseSpeed The horizontal speed.
	 * @param diagSpeed The diagonal speed.
	 * @param moveNormal The normal of the motion.
	 */
	applyMove: function(baseSpeed,diagSpeed,moveNormal)
	{
		// If the movement is not independent, move diagonally.
		// Else move on an axis.
		if(moveNormal[0] != 0 && moveNormal[1] != 0)
		{	
			this.movementVector[0]    = moveNormal[0] * diagSpeed;
			this.movementVector[1]    = moveNormal[1] * diagSpeed;
		}
		else
		{
			this.movementVector[0] =  moveNormal[0] * baseSpeed;
			this.movementVector[1] =  moveNormal[1] * baseSpeed;
		}
	},
	
	/**
	 * Handles action invocation for the Circle Agent.
	 * @param action The Circle.INPUT_MAPPINGS enumerated action that the will then be processed by the circle.
	 */
	invokeAction : function(action)
	{
		var self = this;
		switch(action)
		{			
			case Circle.INPUT_MAPPINGS.up    : 
			case Circle.INPUT_MAPPINGS.down  : 
			case Circle.INPUT_MAPPINGS.left  : 
			case Circle.INPUT_MAPPINGS.right : 
				this.handleMove(action,true);		
				break;			
			case Circle.INPUT_MAPPINGS.attack:
				if(!this.shieldStun && this.canAttack){
					this.canAttack=false;
					this.flags[Circle.INPUT_MAPPINGS.attack] = true;
					this.collision.changeRadiusTo(Circle.ATTACK_RADIUS);
					window.setTimeout(function(){self.attackComplete();},Circle.ATTACK_TIME);
					
					if(this.dashing)
						this.completeDash();
				}
				break;			
			case Circle.INPUT_MAPPINGS.shield : 
				if(!this.flags[Circle.INPUT_MAPPINGS.dash])
				{
					this.flags[Circle.INPUT_MAPPINGS.shield] = true;
					this.shielded = true;
					window.setTimeout(function(){self.shieldDecay();},Circle.SHIELD_DEC);
				}
				break;
			case Circle.INPUT_MAPPINGS.dash : 
				if(!this.dashing)
				{
					this.flags[Circle.INPUT_MAPPINGS.dash] = true;
					this.setDash();
				}				
				break;
		}
	},
	
	/**
	 *	Disables an action that should have been previously been running for the Circle Agent.
	 *  @param action The action to disable.
	 */
	revokeAction : function(action)
	{
		switch(action)
		{
			case Circle.INPUT_MAPPINGS.up    : 
			case Circle.INPUT_MAPPINGS.down  : 
			case Circle.INPUT_MAPPINGS.left  : 
			case Circle.INPUT_MAPPINGS.right : 
				this.handleMove(action);
				break;			
			case Circle.INPUT_MAPPINGS.shield : 
				if(this.flags[Circle.INPUT_MAPPINGS.shield] || this.shieldStun || !this.healing)
				{
					var self = this;
					this.shielded=false;
					this.flags[Circle.INPUT_MAPPINGS.shield] = false;
					window.setTimeout(function(){self.shieldHeal();},Circle.SHIELD_INC);
				}
				break;
		}
	}
};

//****************************************

//*************Circle Player***************

/**
 * Defines the Player controlled variant of the Circle class.
 */
function CirclePlayer(){
    this.controls = [0,0,0,0];    
	Circle.call(this);
}

CirclePlayer.prototype = new Circle();

/**
 * Invokes the parent update routine.
 */
CirclePlayer.prototype.update = function()
{
    this.updateBase();    
};

//****************************************
