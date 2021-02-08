function asd(){
canvas = document.getElementById('canvas');
ctx = canvas.getContext('2d');
canvasWidth = canvas.width;
canvasHeight = canvas.height;
id = ctx.getImageData(0, 0, 1, 1);

ctx.clearRect(0, 0, canvasWidth, canvasHeight);
ctx.clearRect(0, 0, 500, 500);
var id = ctx.getImageData(0, 0, 500, 500);
var pixels = id.data;

var t0 = new Date().getTime();

for (var i = 0; i < 100000; ++i) {
  var x = Math.floor(Math.random() * canvasWidth);
  var y = Math.floor(Math.random() * canvasHeight);
  var r = Math.floor(Math.random() * 256);
  var g = Math.floor(Math.random() * 256);
  var b = Math.floor(Math.random() * 256);
  var off = (y * id.width + x) * 4;
  pixels[off] = r;
  pixels[off + 1] = g;
  pixels[off + 2] = b;
  pixels[off + 3] = 255;
}
ctx.putImageData(id, 0, 0);
}

/*

function createArray(x, y) {
    var arr = new Array(x);
    
	for (var i = 0; i < x; i++) {
	  arr[i] = new Array(y); // make each element an array
	}
	
	for (var i = 0; i < x; i++) {
		for (var j = 0; j < y; j++) {
		  arr[i][j] = 0;
		}	
	}	
    return arr;
}

class Grid {
  constructor(x, y) {
	  this.Hz = createArray(x-1,y-1);
	  this.Ex = createArray(x-1,y);
	  this.Ey = createArray(x,y-1);
	  this.q =  createArray(x,y);
	  this.divEminusQ = createArray(x,y);
	  this.Jx = createArray(x-1,y);
	  this.Jy = createArray(x,y-1);

	  this.SizeX = x;
	  this.SizeY = y;

	  this.Cdtds = 0.7;
  }
  
  updateH(){
	  
	var x, y;
    for (x = 0; x < this.SizeX - 1; x++)
      for (y = 0; y < this.SizeY - 1; y++)
        this.Hz[x][y] =  this.Hz[x][y] + this.Cdtds*(this.Ex[x][y+1] - this.Ex[x][y] - this.Ey[x+1][y] + this.Ey[x][y]);
	
	return;
  }
  updateE() {
    var x, y;
    for (x = 0; x < this.SizeX - 1; x++)
      for (y = 1; y < this.SizeY - 1; y++)
        this.Ex[x][y] = this.Ex[x][y] + this.Cdtds*(this.Hz[x][y] - this.Hz[x][y-1]) - this.Jx[x][y];
    for (x = 1; x < this.SizeX - 1; x++)
      for (y = 0; y < this.SizeY - 1; y++)
        this.Ey[x][y] = this.Ey[x][y] - this.Cdtds*(this.Hz[x][y] - this.Hz[x-1][y]) - this.Jy[x][y];
	return;
  } 
  applyGauss() {
    var x, y;

    var d = 0.1;


    for (x = 1; x < this.SizeX - 1; x++)
      for (y = 1; y < this.SizeY - 1; y++)
        this.divEminusQ[x][y] = d*(this.Ex[x][y] + this.Ey[x][y] - this.Ex[x-1][y] - this.Ey[x][y-1] - this.q[x][y]);

    for (x = 0; x < this.SizeX - 2; x++)
      for (y = 0; y < this.SizeY - 2; y++) {
        this.Ex[x][y] += (this.divEminusQ[x+1][y] - this.divEminusQ[x][y]);
        this.Ey[x][y] += (this.divEminusQ[x][y+1] - this.divEminusQ[x][y]);
      }
	  
	return;
  }
  step() {
    this.updateH();   
    //tfsfUpdate(g);
    this.updateE();
    //abc();

    for (var i = 0; i < 20; i++)
      this.applyGauss();
	return;
  }
}

var g;

var gridSize = 30;
var cellSize;



function setup() { 
  createCanvas(windowHeight, windowHeight);
  cellSize = windowHeight/gridSize;
  g = new Grid(gridSize, gridSize);
  
  textSize(20);
  
} 


var frameNum = 0;
var stepTime = 0;
var drawTime = 0;


function S(i, x) {
  return (abs(x - i)<1.0) ? (1-abs(x - i)) : 0;
}

var particleX = gridSize/2;
var particleY = gridSize/2;

var particleXVel = 0;
var particleYVel = 0;

var particleXAcc = 0;
var particleYAcc = 0;

var q = 50;


function draw() { 
	stepTime = -millis();
 

  for (var i = 0; i < 3; i++) {
    
    var particleXVelSign = ((mouseX - particleX*cellSize)/abs(mouseX - particleX*cellSize));
    var particleYVelSign = ((mouseY - particleY*cellSize)/abs(mouseY - particleY*cellSize));
    
    particleXVel = particleXVelSign*0.3/(1+exp(-0.05*abs(mouseX - particleX*cellSize) + 3));
    particleYVel = particleYVelSign*0.3/(1+exp(-0.05*abs(mouseY - particleY*cellSize) + 3));
    g.step();
    //g.q[25][25] = q;
    for (var x = 0; x < gridSize-1; x++)
      for (var y = 0; y < gridSize-1; y++) {
        g.q[x][y] = q*S(x, particleX)*S(y, particleY);
        g.Jx[x][y] = q*particleXVel*S(x+0.5, particleX)*S(y, particleY);
        g.Jy[x][y] = q*particleYVel*S(x, particleX)*S(y+0.5, particleY);
      }

    particleX += particleXVel;
    particleY += particleYVel;
  frameNum++;


  //  println(particleXVel + ", " + particleYVel);
  }
  stepTime += millis();

  // println(particleX + "," + particleY);

  drawTime = -millis();

background(40);

for (var x = 0; x < gridSize-1; x++) {
    for (var y = 0; y < gridSize-1; y++) {
      
      fill(40, 40, 40);
       strokeWeight(0);
       //rect(x*cellSize, y*cellSize, (x+1)*cellSize, (y+1)*cellSize);
       strokeWeight(4);
       stroke(100*g.Ex[x][y] + 20, 20, 20);
       line(x*cellSize, y*cellSize, (x+1)*cellSize, y*cellSize);
       stroke(100*g.Ey[x][y] + 20, 20, 20);
       line(x*cellSize, y*cellSize, x*cellSize, (y+1)*cellSize);
       strokeWeight(0);
       fill(100*g.Hz[x][y] + 20, 100*g.Hz[x][y] + 20, 20);
       
       stroke(-100*g.Hz[x][y] + 20, -100*g.Hz[x][y] + 20, 20);
       circle((x+0.5)*cellSize, (y+0.5)*cellSize, 4);

    }
  }


  drawTime += millis();

  fill(255, 255, 255);
  text("frame time (step + draw) : " + (stepTime) + "ms + "
    + (drawTime) + "ms = "
    + (stepTime + drawTime) + "ms ("
    + (frameRate) + " FPS )    ideal:17ms (60FPS)", 10, 30);
}

/* full screening will change the size of the canvas */
//function windowResized() {
//  resizeCanvas(windowWidth, windowHeight);
//}
