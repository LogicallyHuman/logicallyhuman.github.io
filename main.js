//const cellSize = 1;

let gpucanvas = document.getElementById("canvas")
gpucanvas.width = window.innerWidth;
gpucanvas.height = window.innerHeight;


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
    gridSizeY = window.innerWidth;
    gridSizeX = window.innerHeight;
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

const gpu = new GPU({ canvas: gpucanvas });

gpu.addFunction(f);
gpu.addFunction(palette)
gpu.addFunction(vectorLength);




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

function vectorLength(vector) {
    return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
}

function updateEx(Ex, Hz, Jx, Cdtds) {
    //    value[this.thread.x][this.thread.y+1] = Ex[this.thread.x][this.thread.y+1] + Cdtds * (Hz[this.thread.x][this.thread.y+1] - Hz[this.thread.x][this.thread.y]) - Jx[this.thread.x][this.thread.y+1];
    //value[this.thread.x][this.thread.y] = 0;
    //if (this.thread.x == 0)
    //    return 0;
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




const updateExKernel = gpu.createKernel(updateEx);
updateExKernel.setOutput([gridSizeY, gridSizeX - 1]);

const updateEyKernel = gpu.createKernel(updateEy);
updateEyKernel.setOutput([gridSizeY - 1, gridSizeX]);

const updateHzKernel = gpu.createKernel(updateHz);
updateHzKernel.setOutput([gridSizeY - 1, gridSizeX - 1]);

function renderOutput(Ex, Ey, Hz, Jx) {
    let E = Math.sqrt(Ex[this.thread.x][this.thread.y] * Ex[this.thread.x][this.thread.y] + Ey[this.thread.x][this.thread.y] * Ey[this.thread.x][this.thread.y]);
    let H = Math.abs(Hz[this.thread.x][this.thread.y]);

    this.color(10 * E, 10 * H, 0);
}
const renderOutputKernel = gpu.createKernel(renderOutput);

renderOutputKernel.setGraphical(true)
renderOutputKernel.setOutput([window.innerWidth, window.innerHeight]);


var frameRate = 1000 / 1;
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

function applyGauss() {
    let x, y;

    let d = 0.1;


    for (x = 1; x < gridSizeX - 1; x++)
        for (y = 1; y < gridSizeY - 1; y++)
            divEminusQ[x][y] = d * (Ex[x][y] + Ey[x][y] - Ex[x - 1][y] - Ey[x][y - 1] - q[x][y]);

    for (x = 0; x < gridSizeX - 2; x++)
        for (y = 0; y < gridSizeY - 2; y++) {
            Ex[x][y] += (divEminusQ[x + 1][y] - divEminusQ[x][y]);
            Ey[x][y] += (divEminusQ[x][y + 1] - divEminusQ[x][y]);
        }
}

function S(i, x) {

    x -= i;

    //return (abs(x)<1.0) ? (1-abs(x)) : 0;

    if (0 <= Math.abs(x) && Math.abs(x) <= 0.5) {
        return (0.75 - x * x);
    }
    else if (0.5 < Math.abs(x) && Math.abs(x) <= 1.5) {
        return 0.125 * (3.0 - 2.0 * Math.abs(x)) * (3.0 - 2.0 * Math.abs(x));
    }
    else {
        return 0;
    }

}

function mainLoop(time) {  // time in ms accurate to 1 micro second 1/1,000,000th second
    delta = time - then;

    if (delta > interval) {
        then = time; // This weird stuff
        doGameUpdate(delta);
    }

    requestAnimationFrame(mainLoop);
}
const charge = 1;

function GPUCompute(){
    Hz = updateHzKernel(Hz, Ex, Ey, Cdtds);
    Ex = updateExKernel(Ex, Hz, Jx, Cdtds);
    Ey = updateEyKernel(Ey, Hz, Jy, Cdtds);
}

function doGameUpdate(delta) {
        particleXVel = 0.5 * Math.sin(frameNum / 10);

        for (x = 400; x < gridSizeX - 1 - 400; x++)
            for (y = 400; y < gridSizeY - 1 - 400; y++) {
                q[x][y] = charge * S(x, particleX) * S(y, particleY);
                Jx[x][y] = charge * particleXVel * S(x + 0.5, particleX) * S(y, particleY);
                Jy[x][y] = charge * particleYVel * S(x, particleX) * S(y + 0.5, particleY);
            }

        //q[gridSizeX / 2][gridSizeY / 2] = 0;//Math.sin(frameNum/10);
        particleX += particleXVel;
        particleY += particleYVel;
        frameNum++;

        GPUCompute();

        for (let i = 0; i < 20; i++)
            //applyGauss()

            renderOutputKernel(Ex, Ey, Hz, Jx);

    
}


requestAnimationFrame(mainLoop);