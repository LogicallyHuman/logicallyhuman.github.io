

//Get needed HTML elements
let gpucanvas = document.getElementById("canvas")
let fpsText = document.getElementById("gputime-text");

//Starting size
var gridSizeX = 800;
var gridSizeY = 500;

//Courant number
const Cdtds = 0.7;


//GPU
const gpu = new GPU({ canvas: gpucanvas, mode: 'webgl2' });

//Grid values
var Hz;//Texture
var Ex;//Texture
var Ey;//Texture
var Dx;//Texture
var Dy;//Texture
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
var loopTime = 0.0;
function simulationLoop(time) {
    delta = time - then;

    if (delta > interval) {
        then = time;
        showPerformance(1000 / delta);
        simulationStep();
        simulationStep();

    }
    requestAnimationFrame(simulationLoop);

}


const charge = 1.0;

var firstRun = true;


var dx = 1.0; //DO NOT CHANGE!!!!!!!!
var dt = 0.6;
var eps = 1.0;
var mu = 1.0;

var c = 1.0 / Math.sqrt(eps * mu);

var sigmaEx = createField(gridSizeY, gridSizeX);
var sigmaEy = createField(gridSizeY, gridSizeX);


var mEx = createField(gridSizeY - 1, gridSizeX);
var mCHx = createField(gridSizeY - 1, gridSizeX);
var mICHx = createField(gridSizeY - 1, gridSizeX);
var mIEx = createField(gridSizeY - 1, gridSizeX);
var mJx = createField(gridSizeY - 1, gridSizeX);

var PMLWidth = 30;

for (let i = 0; i < gridSizeX; i++) {
    for (let j = 0; j < gridSizeY; j++) {
        if (i < PMLWidth)
            sigmaEy[j][i] = eps / (2.0 * dt) * (1.0 - i / PMLWidth) * (1.0 - i / PMLWidth) * (1.0 - i / PMLWidth);
        if (i > gridSizeX - PMLWidth)
            sigmaEy[j][i] = eps / (2.0 * dt) * (1.0 - (gridSizeX - i) / PMLWidth) * (1.0 - (gridSizeX - i) / PMLWidth) * (1.0 - (gridSizeX - i) / PMLWidth);

        
        if (j < PMLWidth)
            sigmaEx[j][i] = eps / (2.0 * dt) * (1.0 - j / PMLWidth) * (1.0 - j / PMLWidth) * (1.0 - j / PMLWidth);
        if (j > gridSizeY - PMLWidth)
            sigmaEx[j][i] = eps / (2.0 * dt) * (1.0 - (gridSizeY - j) / PMLWidth) * (1.0 - (gridSizeY - j) / PMLWidth) * (1.0 - (gridSizeY - j) / PMLWidth);

    }
}


for (let i = 0; i < gridSizeX; i++) {
    for (let j = 0; j < gridSizeY - 1; j++) {
        let m0 = 1.0 / dt + (sigmaEy[j][i]) / (2.0 * eps);
        mEx[j][i] = (1.0 / m0) * (1.0 / dt - sigmaEy[j][i] / (2.0 * eps));
        mCHx[j][i] = c / m0;
        mICHx[j][i] = (1.0 / m0) * (c * dt * sigmaEx[j][i]) / eps;
        mJx[j][i] = -1.0;
    }
}


var mICHy = createField(gridSizeY, gridSizeX - 1);
var mIEy = createField(gridSizeY, gridSizeX - 1);
var mEy = createField(gridSizeY, gridSizeX - 1);
var mCHy = createField(gridSizeY, gridSizeX - 1);
var mJy = createField(gridSizeY, gridSizeX - 1);


for (let i = 0; i < gridSizeX - 1; i++) {
    for (let j = 0; j < gridSizeY; j++) {
        let m0 = 1.0 / dt + (sigmaEx[j][i]) / (2.0 * eps);
        mEy[j][i] = (1.0 / m0) * (1.0 / dt - sigmaEx[j][i] / (2.0 * eps));
        mCHy[j][i] = c / m0;
        mICHy[j][i] = (1.0 / m0) * (c * dt * sigmaEy[j][i]) / eps;
        mJy[j][i] = -1.0;
    }
}

var mHz = createField(gridSizeY - 1, gridSizeX - 1);
var mCEz = createField(gridSizeY - 1, gridSizeX - 1);
var mICEz = createField(gridSizeY - 1, gridSizeX - 1);
var mIHz = createField(gridSizeY - 1, gridSizeX - 1);

for (let i = 0; i < gridSizeX - 1; i++) {
    for (let j = 0; j < gridSizeY - 1; j++) {
        let m0 = 1.0/dt + (sigmaEx[j][i] + sigmaEy[j][i])/(2.0*eps) + dt*(sigmaEx[j][i]*sigmaEy[j][i])/(4.0*eps*eps);
        mHz[j][i] = 1.0/m0 * (1.0/dt - (sigmaEx[j][i] + sigmaEy[j][i])/(2.0*eps) - dt*(sigmaEx[j][i]*sigmaEy[j][i])/(4.0*eps*eps));
        mCEz[j][i] = -(1.0/m0)*(c/mu);
        mIHz[j][i] = -(1.0/m0)*(dt/(eps*eps))*(sigmaEx[j][i]*sigmaEy[j][i]);
    }
}


var ICHx = createField(gridSizeY - 1, gridSizeX);
var IEx = createField(gridSizeY - 1, gridSizeX);

var ICHy = createField(gridSizeY, gridSizeX - 1);
var IEy = createField(gridSizeY, gridSizeX - 1);

var ICEz = createField(gridSizeY - 1, gridSizeX - 1);
var IHz = createField(gridSizeY - 1, gridSizeX - 1);

var CHx = createField(gridSizeY - 1, gridSizeX);
var CHy = createField(gridSizeY, gridSizeX - 1);
var CEz = createField(gridSizeY - 1, gridSizeX - 1);



mEx = createTextureFromArrayForEx(mEx);
mCHx = createTextureFromArrayForEx(mCHx);
mJx = createTextureFromArrayForEx(mJx);
mICHx = createTextureFromArrayForEx(mICHx);
mIEx = createTextureFromArrayForEx(mIEx);
mICHy = createTextureFromArrayForEy(mICHy);
mIEy = createTextureFromArrayForEy(mIEy);
mICEz = createTextureFromArrayForHz(mICEz);
mIHz = createTextureFromArrayForHz(mIHz);

ICHx = createTextureFromArrayForEx(ICHx);
IEx = createTextureFromArrayForEx(IEx);
ICHy = createTextureFromArrayForEy(ICHy);
IEy = createTextureFromArrayForEy(IEy);
ICEz = createTextureFromArrayForHz(ICEz);
IHz = createTextureFromArrayForHz(IHz);

mEy = createTextureFromArrayForEy(mEy);
mCHy = createTextureFromArrayForEy(mCHy);
mJy = createTextureFromArrayForEy(mJy);

mHz = createTextureFromArrayForHz(mHz);
mCEz = createTextureFromArrayForHz(mCEz);

function updateFields() {

    CEz = calcCEzKernel(Ex, Ey);
    
    IHz2 = updateHzTypeSumKernel(IHz, Hz);

    Hz2 = updateHzKernel(CEz, Hz, Jx, Jy, q, ICEz, IHz2, mHz, mCEz, mICEz, mIHz);

    CHx = calcCHxKernel(Hz2);
    CHy = calcCHyKernel(Hz2);

    ICHx2 = updateExTypeSumKernel(ICHx, CHx);
    ICHy2 = updateEyTypeSumKernel(ICHy, CHy);

    Ex2 = updateExKernel(Ex, Ey, CHx, Jx, Jy, q, ICHx2, IEx, mEx, mCHx, mJx, mICHx, mIEx);
    Ey2 = updateEyKernel(Ex, Ey, CHy, Jx, Jy, q, ICHy2, IEy, mEy, mCHy, mJy, mICHy, mIEy);

    CHx.delete();
    CHy.delete();
    CEz.delete();

    if (!firstRun) {
        Ex.delete();
        Ey.delete();
        Hz.delete();
        ICHx.delete();
        IEx.delete();
        ICHy.delete();
        IEy.delete();
        ICEz.delete();
        IHz.delete();
    }
    firstRun = false;

    Hz = Hz2;
    Ex = Ex2;
    Ey = Ey2;
    ICHx = ICHx2;
    //IEx = IEx2;
    ICHy = ICHy2;
    //IEy = IEy2;
    //ICEz = ICEz2;
    IHz = IHz2;

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
var smoothedFps = 0;
function showPerformance(fps) {
    smoothedFps = perfSmoothness * fps + (1.0 - perfSmoothness) * smoothedFps;
    fpsText.innerHTML = (smoothedFps).toFixed("2");

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

    particleXVel = 0.1 * (particleXNew - particleX) / dt;
    particleYVel = 0.1 * (particleYNew - particleY) / dt;

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
