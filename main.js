//const cellSize = 1;

let gpucanvas = document.getElementById("canvas")
gpucanvas.width = 400;
gpucanvas.height = 400;

let fpsText = document.getElementById("fps-text");
let timeText = document.getElementById("time-text");


var gridSizeX;
var gridSizeY;

var Hz;
var Ex;
var Ey;
var q;
var divEminusQ;
var Jx;
var Jy;

const Cdtds = 0.7;

function initSizes() {
    gridSizeY = gpucanvas.height;//window.innerWidth;
    gridSizeX = gpucanvas.width;//window.innerHeight;
}

function createField(sizeX, sizeY) {
    let a = new Array(sizeX);
    for (let i = 0; i < gridSizeX; i++) {
        a[i] = new Array(sizeY);
        for (let j = 0; j < sizeY; j++) {
            a[i][j] = 0.0;
        }
    }
    return a;
}

function initArrays() {
    Hz = createField(gridSizeX - 1, gridSizeY - 1);
    Ex = createField(gridSizeX - 1, gridSizeY);
    Ey = createField(gridSizeX, gridSizeY - 1);
    q = createField(gridSizeX, gridSizeY);
    divEminusQ = createField(gridSizeX, gridSizeY);
    Jx = createField(gridSizeX - 1, gridSizeY);
    Jy = createField(gridSizeX, gridSizeY - 1);
}


initSizes();
initArrays();


//resizeCanvas();

const gpu = new GPU({ canvas: gpucanvas, mode: 'webgl' });

gpu.addFunction(f);
gpu.addFunction(palette)
gpu.addFunction(vectorLength);
gpu.addFunction(S);



function f(x, c) {
    return [
        (x[0] * x[0]) - (x[1] * x[1]) + c[0],
        (x[0] * x[1]) + (x[0] * x[1]) + c[1],
    ];
}

function palette(t, a, b, c, d) {
    return [
        a[0] + b[0] * Math.cos(6.28318 * (c[0] * t + d[0])),
        a[1] + b[1] * Math.cos(6.28318 * (c[1] * t + d[1])),
        a[2] + b[2] * Math.cos(6.28318 * (c[2] * t + d[2]))
    ];
}
function S(i, x) {
	let scale = 0.1;
	
	x*=scale;
	i*=scale;

    x -= i;

    //return (abs(x)<1.0) ? (1-abs(x)) : 0;

    if (0.0 <= Math.abs(x) && Math.abs(x) <= 0.5) {
        return (0.75 - x * x)*scale;
    }
    else if (0.5 < Math.abs(x) && Math.abs(x) <= 1.5) {
        return 0.125 * (3.0 - 2.0 * Math.abs(x)) * (3.0 - 2.0 * Math.abs(x))*scale;
    }
    else {
        return 0.0;
    }

}


function vectorLength(vector) {
    return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
}

function updateEx(Ex, Hz, Jx, Cdtds) {
    return Ex[this.thread.y][this.thread.x] + Cdtds * (Hz[this.thread.y][this.thread.x] - Hz[this.thread.y][this.thread.x - 1]) - Jx[this.thread.y][this.thread.x];
}

function updateEy(Ey, Hz, Jy, Cdtds) {
    //if (this.thread.y == 0)
    //return 0;
    return Ey[this.thread.y][this.thread.x] - Cdtds * (Hz[this.thread.y][this.thread.x] - Hz[this.thread.y - 1][this.thread.x]) - Jy[this.thread.y][this.thread.x];
}

function updateHz(Hz, Ex, Ey, Cdtds) {
    return Hz[this.thread.y][this.thread.x] + Cdtds * (Ex[this.thread.y][this.thread.x + 1] - Ex[this.thread.y][this.thread.x] - Ey[this.thread.y + 1][this.thread.x] + Ey[this.thread.y][this.thread.x]);
}

function calcDivEminusQ(Ex, Ey, q) {
    return 0.2 * (Ex[this.thread.y][this.thread.x] + Ey[this.thread.y][this.thread.x] - Ex[this.thread.y - 1][this.thread.x] - Ey[this.thread.y][this.thread.x - 1] - q[this.thread.y][this.thread.x]);
}

function updateExWithDiv(Ex, divEminusQ) {
    return Ex[this.thread.y][this.thread.x] + (divEminusQ[this.thread.y + 1][this.thread.x] - divEminusQ[this.thread.y][this.thread.x]);
}

function updateEyWithDiv(Ey, divEminusQ) {
    return Ey[this.thread.y][this.thread.x] + (divEminusQ[this.thread.y][this.thread.x + 1] - divEminusQ[this.thread.y][this.thread.x]);
}

function calculateQ(particleX, particleY){
	let zero = 0.0;
	
	return S(zero + this.thread.y, particleX) * S(zero + this.thread.x, particleY)
}

function calculateJx(particleX, particleY, particleXVel){
	let zero = 0.0;
	
	return particleXVel * S(0.5 + this.thread.y, particleX) * S(zero + this.thread.x, particleY);
}

function calculateJy(particleX, particleY, particleYVel){
	let zero = 0.0;
	
	return particleYVel * S(zero + this.thread.y, particleX) * S(zero + this.thread.x, particleY);
}

const updateExKernel = gpu.createKernel(updateEx);
updateExKernel.setOutput([gridSizeY, gridSizeX - 1]);

const updateEyKernel = gpu.createKernel(updateEy);
updateEyKernel.setOutput([gridSizeY - 1, gridSizeX]);

const updateHzKernel = gpu.createKernel(updateHz);
updateHzKernel.setOutput([gridSizeY - 1, gridSizeX - 1]);

const calcDivEminusQKernel = gpu.createKernel(calcDivEminusQ);
calcDivEminusQKernel.setOutput([gridSizeY - 1, gridSizeX - 1]);

const updateExWithDivKernel = gpu.createKernel(updateExWithDiv);
updateExWithDivKernel.setOutput([gridSizeY, gridSizeX - 1]);

const updateEyWithDivKernel = gpu.createKernel(updateEyWithDiv);
updateEyWithDivKernel.setOutput([gridSizeY - 1, gridSizeX]);

const calculateQKernel = gpu.createKernel(calculateQ);
calculateQKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);

const calculateJxKernel = gpu.createKernel(calculateJx);
calculateJxKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);

const calculateJyKernel = gpu.createKernel(calculateJy);
calculateJyKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);
/*
const superKernel = gpu.combineKernels(updateExKernel, updateEyKernel, updateHzKernel, calcDivEminusQKernel, updateExWithDivKernel, updateEyWithDivKernel) {
        Hz = updateHzKernel(Hz, Ex, Ey, Cdtds);
    Ex = updateExKernel(Ex, Hz, Jx, Cdtds);
    Ey = updateEyKernel(Ey, Hz, Jy, Cdtds);

        Ex = updateExWithDivKernel(Ex, divEminusQ);
        Ey = updateEyWithDivKernel(Ey, divEminusQ);
  
  return multiply(add(a, b), c);
});*/


/*
updateExKernel.setOptimizeFloatMemory(true);
updateEyKernel.setOptimizeFloatMemory(true);
updateHzKernel.setOptimizeFloatMemory(true);
calcDivEminusQKernel.setOptimizeFloatMemory(true);
updateExWithDivKernel.setOptimizeFloatMemory(true);
updateEyWithDivKernel.setOptimizeFloatMemory(true);
*/
updateExKernel.setPipeline(true);
updateEyKernel.setPipeline(true);
updateHzKernel.setPipeline(true);
calcDivEminusQKernel.setPipeline(true);
updateExWithDivKernel.setPipeline(true);
updateEyWithDivKernel.setPipeline(true);

updateExKernel.setImmutable(true);
updateEyKernel.setImmutable(true);
updateHzKernel.setImmutable(true);
calcDivEminusQKernel.setImmutable(true);
updateExWithDivKernel.setImmutable(true);
updateEyWithDivKernel.setImmutable(true);

function renderOutput(Ex, Ey, Hz, Jx, q) {
	if(q[this.thread.x][this.thread.y] > 0.004){
		this.color(255,255,255);
	}
	else{
		this.color(
		10 * Math.sqrt(Ex[this.thread.x][this.thread.y] * Ex[this.thread.x][this.thread.y] + Ey[this.thread.x][this.thread.y] * Ey[this.thread.x][this.thread.y]),
		10 * Math.abs(Hz[this.thread.x][this.thread.y]),
		0);
	}
}
const renderOutputKernel = gpu.createKernel(renderOutput);

renderOutputKernel.setGraphical(true)
renderOutputKernel.setOutput([gpucanvas.width, gpucanvas.height]);


var lastFrame = 0;
var startTime;
var currentFrame;



var particleX = gridSizeX / 2;
var particleY = gridSizeY / 2;

var particleXVel = 0;
var particleYVel = 0;

var frameNum = 0;


var now = 0;
var then = 0;
var delta = 0;

interval = 1000 / 60;

var scale = 0.1;


function mainLoop(time) {  // time in ms accurate to 1 micro second 1/1,000,000th second
    delta = time - then;

    if (delta > interval) {
        then = time; // This weird stuff
		timeText.innerHTML = (frameNum).toFixed("2");

        doGameUpdate(delta);
    }
    requestAnimationFrame(mainLoop);

}
const charge = 1.0;

var firstRun = true;

function GPUCompute() {
    Hz2 = updateHzKernel(Hz, Ex, Ey, Cdtds);
    Ex2 = updateExKernel(Ex, Hz2, Jx, Cdtds);
    Ey2 = updateEyKernel(Ey, Hz2, Jy, Cdtds);
    if (!firstRun) {
        Ex.delete();
        Ey.delete();
        Hz.delete();
    }
    //Ex = Ex2.clone();
    //Ey = Ey2.clone();
    Hz = Hz2;
    Ex = Ex2;
    Ey = Ey2;
	firstRun = false;

    for (i = 0; i < 3; i++) {
        divEminusQ = calcDivEminusQKernel(Ex, Ey, q);
        /*	    for (x = 1; x < gridSizeX - 1; x++)
            for (y = 1; y < gridSizeY - 1; y++)
                divEminusQ[x][y] = 0.1 * (Ex[x][y] + Ey[x][y] - Ex[x - 1][y] - Ey[x][y - 1] - q[x][y]);*/

        Ex2 = updateExWithDivKernel(Ex, divEminusQ);
        Ey2 = updateEyWithDivKernel(Ey, divEminusQ);
		
		//if (Ex.constructor.name == "GLTextureFloat2D") {
			Ex.delete();
			Ey.delete();
		//}
        divEminusQ.delete();
        Ex = Ex2;
        Ey = Ey2;

    }
}
	var m = 1;
	
    function doGameUpdate(delta) {
	fpsText.innerHTML = (1000.0/delta).toFixed("2");
		
		for(i = 0; i < m; i++){
		
			particleXVel = 5.0 * Math.sin(((frameNum-200.0) / 5.0));

			q =  calculateQKernel(particleX, particleY);
			Jx = calculateJxKernel(particleX, particleY, particleXVel);
			Jy = calculateJyKernel(particleX, particleY, particleYVel);

			

			particleX += particleXVel/m;
			particleY += particleYVel/m;
			frameNum += 1.0/m;
		
			//for(i = 0; i < 5; i++)
			GPUCompute();
		}
		
        renderOutputKernel(Ex, Ey, Hz, Jx, q);

    }


    requestAnimationFrame(mainLoop);
