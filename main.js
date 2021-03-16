//const cellSize = 1;

let gpucanvas = document.getElementById("canvas")

var gridSizeY = 500;
var gridSizeX = 500;

gpucanvas.width = gridSizeX;
gpucanvas.height = gridSizeY;

let gpuTimeText = document.getElementById("gputime-text");

const gpu = new GPU({ canvas: gpucanvas, mode: 'webgl' });



var Hz;
var Ex;
var Ey;
var q;
var Jx;
var Jy;
var divEminusQ;

const Cdtds = 0.7;



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
    Hz = createField(gridSizeY - 1, gridSizeX - 1);
    Ex = createField(gridSizeY, gridSizeX - 1);
    Ey = createField(gridSizeY - 1, gridSizeX);
    q = createField(gridSizeY, gridSizeX);
    divEminusQ = createField(gridSizeY, gridSizeX);
    Jx = createField(gridSizeY, gridSizeX - 1);
    Jy = createField(gridSizeY - 1, gridSizeX);
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

function updateEx(Ex, Hz, Jx) {
    let i = this.thread.x;
    let j = this.thread.y;

    let ret = 0.0;

    if(j > 0)
        ret -= Hz[j - 1][i];
    if(j < this.constants.gridSizeY - 1)
        ret += Hz[j][i];
    ret *= this.constants.Cdtds;
    ret += Ex[j][i] - Jx[j][i]; 
    return ret;
}

function updateEy(Ey, Hz, Jy) {
    let i = this.thread.x;
    let j = this.thread.y;

    let ret = 0.0;

    if(i > 0)
        ret += Hz[j][i - 1];
    if(i < this.constants.gridSizeX - 1)
        ret -= Hz[j][i];
    ret *= this.constants.Cdtds;
    ret += Ey[j][i] - Jy[j][i]; 
    return ret;
        
}

function updateHz(Hz, Ex, Ey) {
    let i = this.thread.x;
    let j = this.thread.y;

    return Hz[j][i] + this.constants.Cdtds * (Ex[j + 1][i] - Ex[j][i] - Ey[j][i + 1] + Ey[j][i]);
}

function calcDivEminusQ(Ex, Ey, q) {
    let i = this.thread.x;
    let j = this.thread.y;

    let ret = 0.0;

    if(i < this.constants.gridSizeX - 1)
        ret += Ex[j][i];
    if(j < this.constants.gridSizeY - 1)
        ret += Ey[j][i];
    if(j > 0)
        ret -= Ey[j - 1][i];
    if(i > 0)
        ret -= Ex[j][i - 1];
    ret -= q[j][i];
        return 0.24*ret;

}

function updateExWithDiv(Ex, divEminusQ) {
    let i = this.thread.x;
    let j = this.thread.y;

    return Ex[j][i] + (divEminusQ[j][i + 1] - divEminusQ[j][i]);
}

function updateEyWithDiv(Ey, divEminusQ) {
    let i = this.thread.x;
    let j = this.thread.y;

    return Ey[j][i] + (divEminusQ[j + 1][i] - divEminusQ[j][i]);
}

function calculateQ(particleX, particleY) {
    let zero = 0.0;

    return S(zero + this.thread.x, particleX) * S(zero + this.thread.y, particleY)
}

function calculateJx(particleX, particleY, particleXVel) {
    let zero = 0.0;

    return particleXVel * S(0.5 + this.thread.x, particleX) * S(zero + this.thread.y, particleY);
}

function calculateJy(particleX, particleY, particleYVel) {
    let zero = 0.0;

    return particleYVel * S(zero + this.thread.x, particleX) * S(zero + this.thread.y, particleY);
}

function renderOutput(Ex, Ey, Hz, Jx, q) {

    let i = this.thread.x;
    let j = this.thread.y;


    if (q[j][i] > 0.001) {
        this.color(255, 255, 255);
    }
    else {
        this.color(
            300 * Math.sqrt(Ex[j][i] * Ex[j][i] + Ey[j][i] * Ey[j][i]),
            300 * Math.abs(Hz[j][i]),
            0);
    }
}

function globalVariables() {

}

gpu.addFunction(S);


const updateExKernel = gpu.createKernel(updateEx);
const updateEyKernel = gpu.createKernel(updateEy);
const updateHzKernel = gpu.createKernel(updateHz);
const calcDivEminusQKernel = gpu.createKernel(calcDivEminusQ);
const updateExWithDivKernel = gpu.createKernel(updateExWithDiv);
const updateEyWithDivKernel = gpu.createKernel(updateEyWithDiv);
const calculateQKernel = gpu.createKernel(calculateQ);
const calculateJxKernel = gpu.createKernel(calculateJx);
const calculateJyKernel = gpu.createKernel(calculateJy);
const renderOutputKernel = gpu.createKernel(renderOutput);


updateExKernel.setOutput([gridSizeX-1, gridSizeY ]);
updateEyKernel.setOutput([gridSizeX, gridSizeY-1]);
updateHzKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);
calcDivEminusQKernel.setOutput([gridSizeX, gridSizeY]);
updateExWithDivKernel.setOutput([gridSizeX-1, gridSizeY ]);
updateEyWithDivKernel.setOutput([gridSizeX, gridSizeY-1]);
calculateQKernel.setOutput([gridSizeX, gridSizeY]);
calculateJxKernel.setOutput([gridSizeX - 1, gridSizeY]);
calculateJyKernel.setOutput([gridSizeX, gridSizeY - 1]);
renderOutputKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);


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

updateExKernel.setConstants({ Cdtds: Cdtds, gridSizeX: gridSizeX, gridSizeY: gridSizeY });
updateEyKernel.setConstants({ Cdtds: Cdtds, gridSizeX: gridSizeX, gridSizeY: gridSizeY });
updateHzKernel.setConstants({ Cdtds: Cdtds, gridSizeX: gridSizeX, gridSizeY: gridSizeY });
updateExWithDivKernel.setConstants({gridSizeX: gridSizeX, gridSizeY: gridSizeY });
updateEyWithDivKernel.setConstants({gridSizeX: gridSizeX, gridSizeY: gridSizeY });
calcDivEminusQKernel.setConstants({gridSizeX: gridSizeX, gridSizeY: gridSizeY });

renderOutputKernel.setGraphical(true)


var lastFrame = 0;
var startTime;
var currentFrame;


var particleX = gridSizeX / 2;
var particleY = gridSizeY / 2;

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
        simulationStep();
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
    for (i = 0; i < 10; i++) {
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
    gpuTime = performance.now();

    for (i = 0; i < m; i++) {
        q = calculateQKernel(particleX, particleY);
        Jx = calculateJxKernel(particleX, particleY, particleXVel);
        Jy = calculateJyKernel(particleX, particleY, particleYVel);

        frameNum += 1.0 / m;

        updateFields();
    }
    out();

    gpuTime = performance.now() - gpuTime;
    showPerformance(gpuTime);


    let particleXNew = smoothness * mouseX + (1.0 - smoothness) * particleX;
    let particleYNew = smoothness * mouseY + (1.0 - smoothness) * particleY;

    particleXVel = (particleXNew - particleX)/10;
    particleYVel = (particleYNew - particleY)/10;

    particleX = particleXNew;
    particleY = particleYNew;


}

var smoothness = 0.2;
var mouseX = gridSizeX / 2;
var mouseY = gridSizeY / 2;

function updateParticlePostion(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = gridSizeY - event.clientY + rect.top;



}

gpucanvas.addEventListener('mousemove', function (e) {
    updateParticlePostion(gpucanvas, e)
})

requestAnimationFrame(simulationLoop);
