/* -------------
    circleGame.js
    Home of the Update and Draw loops and manages overall game state.
    
	@author John Dunham
	@since  2013-10-09
   --------------*/
   
// The request animation frame function, for the draw function.
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 33);
          };
})();

//*************Circle Game*****************
/**
 * The class that defines the actual game rules.
 */
function CircleGame()
{
	this.gameArea = {w:0,h:0}; 	// The game area.
	this.canvas = null;     	// The game play canvas.
    this.context = null;    	// The context of the canvas.
    this.baseCircleCount = 0;	// The circles
    this.gameOver = false;  	// Self explanatory.
    this.liveCircleIndex = -1;	// The current circle being served
    this.playerCount = 0;   	// The number of players on the game grid.  
	this.inputs = [];			// An input flagger to prevent duplicate inputs.
	this.map;  			        // Contains the game world.
	this.mapID;
}

// The valid control schemes for the player circle agent.

// up, down, left, right, boost, shield
CircleGame.ControlSchemes = [ 
	[87, 83, 65, 68, 89, 84 ,82],	// W, S, A, D, R, T, Y 
	[38, 40, 37, 39, 191, 190, 188]  // Up, Down, Left, Right, /, . , ,
	];

// Circle game "singleton".
CircleGame.Game = null;

/**
 * The game loop for the game, invokes the update and draw routines on the singleton.
 */
CircleGame.gameLoop = function()
{
    CircleGame.Game.update();
    CircleGame.Game.draw();
	
	window.requestAnimFrame(CircleGame.gameLoop);
};


CircleGame.prototype = {

	/**
	 * Invokes the draw functions of the circles that are still active.
	 */
	draw : function ()
	{ 
		this.context.clearRect(0, 0, this.gameArea.w, this.gameArea.h);
		
		this.map.drawMap(this.context);
		
		for( var circle in this.map.entities)
		{
			if(this.map.entities[circle].alive)
				this.map.entities[circle].draw(this.context);    
		}
			
	},

	/**
	 * Invokes the update subroutines for the circles.
	 */
	update : function ()
	{ 
		var liveCircles = 0;
		this.liveCircleIndex = -1;
		for(var circle in this.map.entities)
		{
			// If we have a dead circle. Send flowers to the programmer and move along.
			if(this.map.entities[circle].alive)
			{
				this.map.entities[circle].update();  
				liveCircles++;
				this.liveCircleIndex = circle;
			}
			else
			{
				this.map.killEntity(circle);
			}
		}
		
		// If there aren't any combatant circles left time to trigger the game over messages.
		// Else collision detection is good to go.
		if(liveCircles === 0 || (liveCircles === 1 &&  liveCircles < this.baseCircleCount))
			this.gameOver = true;
			
			
		this.collisionDetection();
	},

	/**
	 * Checks each circle against  other active circles for collisions.
	 */
	collisionDetection : function()
	{
		this.map.checkCollisions();
	},

	/**
	 * Acts as the controller for the playing character circle agents.
	 */
	handleInput : function(event)
	{
		event.stopPropagation();
		event.preventDefault();
		
		if(this.inputs[event.keyCode])
		{
			return;
		}

		this.inputs[event.keyCode] = true;

		if(event.keyCode === 13)
		{
			this.reset(this.baseCircleCount, this.playerCount, this.mapID);
			// If it was in a state of game over make the game active again.
			if(this.gameOver)
				this.gameOver = false;
		}
			
		// Checks to see if any of the currently active circles respond to the input.
		for(var index = 0; index < this.map.entities.length;index++)
		{
			if(this.map.entities[index].controls && 
				this.map.entities[index].controls.indexOf(event.keyCode) != -1)
			{
				this.map.entities[index].invokeAction(this.map.entities[index].controls.indexOf(
					event.keyCode));
			}
		}
	},
	
	/**
	  * Clears out the multiple keyboard inputs.
	  */
	clearInput : function(event)
	{
		event.stopPropagation();
		event.preventDefault();
		this.inputs[event.keyCode] = false;
			
		// Checks to see if any of the currently active circles respond to the input.
		for(var index = 0; index < this.map.entities.length;index++)
		{
			if(this.map.entities[index].controls && 
				this.map.entities[index].controls.indexOf(event.keyCode) != -1)
			{
				this.map.entities[index].revokeAction(this.map.entities[index].controls.indexOf(
					event.keyCode));
			}			
		}
	},
	
	/**
	 *  Resets the game state with the supplied details.
	 * @param numPlayers  0-2 defines number of players.
	 * @param numCircles  1-2  defines number of circles.
	 */
	reset : function ( numCircles, numPlayers, map)
	{
		this.mapID = map;
		this.playerCount=0;
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		this.context.fillStyle = "#000000";//"#02181d";
		this.context.strokeStyle = "#b5ffff";			
		
		
		this.baseCircleCount = numCircles;
		if(this.map)
		{		
			//if(!isNaN(map) && this.map.active !== map && map < Map.maps.length  && map >= 0)
				this.map = new Map(map);			
		}
		else	
		{		
			if(!isNaN(map) && map < Map.maps.length  && map >= 0)		
				this.map = new Map(map); 		
			else 
				this.map = new Map(0);
		}
	}
};

/**
 * Initializes the game.
 * 
 * @param numPlayers 0 - 2 defines number of players.
 * @param numCircles  1 - 2 defines number of circles.
 * @param canvas     The circle game cavas (if not specified the game will make its own.
 */
CircleGame.init = function(numPlayers, numCircles, mapIndex, canvas)
{
    CircleGame.Game = new CircleGame();
    
    if(!canvas)
    {
        // Establishes the canvas with an id and a tabindex.
        $('<canvas id="circlesGameCanvas" tabIndex="0">HTML5 not supported in your browser</canvas>').prependTo('body');
    }
    else
    {
        $(canvas).attr("id","circlesGameCanvas");
    }
    
    //Removes the focus border.
    $("#circlesGameCanvas").css("outline","none");    
    $("#circlesGameCanvas").focus();    
    $("#circlesGameCanvas").css("float","left");    

    
    // Sets up the canvas and drawing context details for the game.
    CircleGame.Game.canvas = document.getElementById("circlesGameCanvas");
    CircleGame.Game.gameArea.w = CircleGame.Game.canvas.width = 800;
    CircleGame.Game.gameArea.h = CircleGame.Game.canvas.height = 800;
	
    $("#circlesGameCanvas").keydown(function(e){CircleGame.Game.handleInput(e);});
	$("#circlesGameCanvas").keyup(function(e){CircleGame.Game.clearInput(e);});


    CircleGame.Game.context = CircleGame.Game.canvas.getContext("2d");    
    CircleGame.Game.context.font = "12px monospace";
	CircleGame.Game.mapID = mapIndex;
    CircleGame.Game.reset(numCircles, numPlayers, mapIndex);
	
    // This lets the post intialization garbage collection run and prevents the initial stutter.
    setTimeout(function() {
        CircleGame.gameLoop();
    }, 100);
};

//**********************************************
