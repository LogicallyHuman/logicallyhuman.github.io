

//Get needed HTML elements
let gpucanvas = document.getElementById("canvas")
let gpuTimeText = document.getElementById("gputime-text");

//Starting size
var gridSizeX = 1000;
var gridSizeY = 1000;

//Courant number
const Cdtds = 0.7;


//GPU
const gpu = new GPU({ canvas: gpucanvas, mode: 'webgl2' });

//Grid values
var Hz;//Texture
var Ex;//Texture
var Ey;//Texture
var q;
var Jx;
var Jy;
var divEminusQ;//Texture


var updateExKernel;
var updateEyKernel;
var updateHzKernel;
var calcDivEminusQKernel;
var updateExWithDivKernel;
var updateEyWithDivKerne;
var calculateQKernel;
var calculateJxKernel;
var calculateJyKerne;
var renderOutputKernel;

function createField(sizeX, sizeY) {
    let a = new Array(sizeX);
    for (let i = 0; i < sizeX; i++) {
        a[i] = new Array(sizeY);
        for (let j = 0; j < sizeY; j++) {
            a[i][j] = 0.0;
        }
    }
    return a;
}

function initArrays() {
    /*
    Hz = createField(gridSizeX - 1, gridSizeY - 1);
    Ex = createField(gridSizeX, gridSizeY - 1);
    Ey = createField(gridSizeX - 1, gridSizeY);
    q = createField(gridSizeX, gridSizeY);
    divEminusQ = createField(gridSizeX, gridSizeY);
    Jx = createField(gridSizeX, gridSizeY - 1);
    Jy = createField(gridSizeX - 1, gridSizeY);
    */

    Hz = createField(gridSizeY - 1, gridSizeX - 1);
    Ex = createField(gridSizeY - 1, gridSizeX);
    Ey = createField(gridSizeY, gridSizeX - 1);
    q = createField(gridSizeY, gridSizeX);
    divEminusQ = createField(gridSizeY, gridSizeX);
    Jx = createField(gridSizeY - 1, gridSizeX);
    Jy = createField(gridSizeY, gridSizeX - 1);

}


initArrays();



function S(i, x) {
    let scale = 0.05;

    x *= scale;
    i *= scale;

    x -= i;


    if (0.0 <= Math.abs(x) && Math.abs(x) <= 0.5) {
        return (0.75 - x * x) * scale;
    }
    else if (0.5 < Math.abs(x) && Math.abs(x) <= 1.5) {
        return 0.125 * (3.0 - 2.0 * Math.abs(x)) * (3.0 - 2.0 * Math.abs(x)) * scale;
    }
    else {
        return 0.0;
    }

}






gpu.addFunction(S);



setupKernels();

var lastFrame = 0;
var startTime;
var currentFrame;


var particleX = gridSizeY / 2;
var particleY = gridSizeX / 2;

var particleXVel = 0;
var particleYVel = 0;

var frameNum = 0;



var delta = 0;

interval = 1000 / 60;


var then = 0;
function simulationLoop(time) {
    delta = time - then;

    if (delta > interval) {
        then = time;
        gpuTime = performance.now();
        simulationStep();
        gpuTime = performance.now() - gpuTime;
        showPerformance(gpuTime);
    
    }
    requestAnimationFrame(simulationLoop);

}


const charge = 1.0;

var firstRun = true;

function updateFields() {
    Ex2 = updateExKernel(Ex, Hz, Jx);
    Ey2 = updateEyKernel(Ey, Hz, Jy);
    Hz2 = updateHzKernel(Hz, Ex2, Ey2);

    if (!firstRun) {
        Ex.delete();
        Ey.delete();
        Hz.delete();
    }
    firstRun = false;
    Hz = Hz2;
    Ex = Ex2;
    Ey = Ey2;
    for (i = 0; i < 100; i++) {
        divEminusQ = calcDivEminusQKernel(Ex, Ey, q);
        Ex2 = updateExWithDivKernel(Ex, divEminusQ);
        Ey2 = updateEyWithDivKernel(Ey, divEminusQ);
        Ex.delete();
        Ey.delete();
        divEminusQ.delete();
        Ex = Ex2;
        Ey = Ey2;

    }
}
var m = 1;

function out() {
    renderOutputKernel(Ex, Ey, Hz, Jx, q);
}

var perfSmoothness = 0.05;
var smoothedGpuTime = 0;
function showPerformance(gpuTime) {
    smoothedGpuTime = perfSmoothness * gpuTime + (1.0 - perfSmoothness) * smoothedGpuTime;
    gpuTimeText.innerHTML = (smoothedGpuTime).toFixed("2");

}

function simulationStep() {

    q = calculateQKernel(particleX, particleY);
    Jx = calculateJxKernel(particleX, particleY, particleXVel);
    Jy = calculateJyKernel(particleX, particleY, particleYVel);

    updateFields();

    q.delete();
    Jx.delete();
    Jy.delete();


    out();



    let particleXNew = smoothness * mouseX + (1.0 - smoothness) * particleX;
    let particleYNew = smoothness * mouseY + (1.0 - smoothness) * particleY;

    particleXVel = (particleXNew - particleX) / 10;
    particleYVel = (particleYNew - particleY) / 10;

    particleX = particleXNew;
    particleY = particleYNew;


}

var smoothness = 0.2;
var mouseX = gridSizeY / 2;
var mouseY = gridSizeX / 2;

function updateParticlePostion(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    mouseY = event.clientX - rect.left;
    mouseX = gridSizeY - event.clientY + rect.top;



}

gpucanvas.addEventListener('mousemove', function (e) {
    updateParticlePostion(gpucanvas, e)
})

requestAnimationFrame(simulationLoop);
