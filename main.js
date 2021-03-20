//Get needed HTML elements
let gpucanvas = document.getElementById("canvas");
let fpsText = document.getElementById("gputime-text");


//GPU
const gpu = new GPU({ canvas: gpucanvas, mode: 'webgl2' });



//Starting size
var gridSizeX = 400; //window.innerWidth;
var gridSizeY = 400; //window.innerHeight;

var cellSize = 2; //Cell size in pixels, resulting canvas size is gridSize*cellSize

const smoothness = 0.2; //Mouse smoothness

var mouseX = gridSizeY / (2 * cellSize); //Mouse position
var mouseY = gridSizeX / (2 * cellSize);


//Used for frame timing
var delta = 0;
var then = 0;
const interval = 1000 / 60;


//Used for performance display
const perfSmoothness = 0.05; //Performance numbers smoothing constant
var smoothedFps = 0; //Recorded FPS

var newEnvironmentFunction = function() {};

//Grid values
var Ex; //EM Fields
var Ey;
var Hz;
var q; //Source Fields
var Jx;
var Jy;
var divEminusQ; //Aux field
var mEx; //Update parameters for Ex
var mCHx;
var mICHx;
var mJx;
var mEy; //Update parameters for Ey
var mCHy;
var mICHy;
var mJy;
var mHz; //Update parameters for Hz
var mCEz;
var mIHz;
var IHz; //Summations for PML
var ICHy;
var ICHx;
var sigmaEx; //PML Sigmas
var sigmaEy;
var eps;

//Kernels
var updateExKernel; //Update equations
var updateEyKernel;
var updateHzKernel;
var updateExTypeSumKernel; //Predefined kernels for summing
var updateEyTypeSumKernel;
var updateHzTypeSumKernel;
var calcCHxKernel; //Curl calculation kernels
var calcCHyKernel;
var calcCEzKernel;
var calcDivEminusQKernel; //Electrostatic field kernels
var updateExWithDivKernel;
var updateEyWithDivKernel;
var calculateQKernel; //Source field kernels
var calculateJxKernel;
var calculateJyKernel;
var renderOutputKernel; //Output kernel
var createExSizeTextureKernel;
//Particle position
var particleX = gridSizeY / 2;
var particleY = gridSizeX / 2;

//Particle velocity
var particleXVel = 0;
var particleYVel = 0;


//Called when mouse updates
function updateParticlePostion(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    mouseY = (event.clientX - rect.left) / cellSize;
    mouseX = gridSizeY - (event.clientY + rect.top) / cellSize + rect.top;
}

//Called when key is pressed
function keyPress(event) {
    if (event.keyCode == 114) {
        clearFields();
    }
}

function createArray(sizeX, sizeY) { //Creates a 2D array
    let a = new Array(sizeX);
    for (let i = 0; i < sizeX; i++) {
        a[i] = new Array(sizeY);
        for (let j = 0; j < sizeY; j++) {
            a[i][j] = 0.0;
        }
    }

    return a;
}


function showPerformance(fps) { //Update HTML Performance numbers
    smoothedFps = perfSmoothness * fps + (1.0 - perfSmoothness) * smoothedFps;
    fpsText.innerHTML = (smoothedFps).toFixed("2");
}

function initFields() {


    //Main EM Fields
    Hz = createHzSizeEmptyTextureKernel();
    Ex = createExSizeEmptyTextureKernel();
    Ey = createEySizeEmptyTextureKernel();

    //Source fields
    q = createQSizeEmptyTextureKernel();
    Jx = createExSizeEmptyTextureKernel();
    Jy = createEySizeEmptyTextureKernel();

    //Aux fields used for compuation
    divEminusQ = createQSizeEmptyTextureKernel();

    //Sumation Fields, needed for PML
    ICHx = createExSizeEmptyTextureKernel();
    ICHy = createEySizeEmptyTextureKernel();
    IHz = createHzSizeEmptyTextureKernel();


    sigmaEx = createArray(gridSizeX, gridSizeY);
    sigmaEy = createArray(gridSizeX, gridSizeY);

    eps = createArray(gridSizeX, gridSizeY);

}


function setupUpdateParameters() {

    if (typeof(mEx) != "undefined") { //If the parameters already exist, delete them
        mEx.delete();
        mCHx.delete();
        mICHx.delete();
        mJx.delete();
        mEy.delete();
        mCHy.delete();
        mICHy.delete();
        mJy.delete();
        mHz.delete();
        mCEz.delete();
        mIHz.delete();
    }

    //Update parameters for Ex update equation
    ARRmEx = createArray(gridSizeY - 1, gridSizeX);
    ARRmCHx = createArray(gridSizeY - 1, gridSizeX);
    ARRmICHx = createArray(gridSizeY - 1, gridSizeX);
    ARRmJx = createArray(gridSizeY - 1, gridSizeX);

    //Update parameters for Ey update equation
    ARRmEy = createArray(gridSizeY, gridSizeX - 1);
    ARRmCHy = createArray(gridSizeY, gridSizeX - 1);
    ARRmICHy = createArray(gridSizeY, gridSizeX - 1);
    ARRmJy = createArray(gridSizeY, gridSizeX - 1);

    //Update parameters for Hz update equation
    ARRmHz = createArray(gridSizeY - 1, gridSizeX - 1);
    ARRmCEz = createArray(gridSizeY - 1, gridSizeX - 1);
    ARRmIHz = createArray(gridSizeY - 1, gridSizeX - 1);




    var dx = 1.0; //DO NOT CHANGE!!!!!!!! This is assumed to be 1 in update equations
    var dt = 0.6;
    var mu = 1.0;

    var c = 1.0 / Math.sqrt(1 * mu);

    var PMLWidth = 30;

    //Calculate PML Sigmas
    for (let i = 0; i < gridSizeX; i++) {
        for (let j = 0; j < gridSizeY; j++) {
            if (i < PMLWidth)
                sigmaEy[j][i] = eps[j][i] / (2.0 * dt) * (1.0 - i / PMLWidth) * (1.0 - i / PMLWidth) * (1.0 - i / PMLWidth);
            if (i > gridSizeX - PMLWidth)
                sigmaEy[j][i] = eps[j][i] / (2.0 * dt) * (1.0 - (gridSizeX - i) / PMLWidth) * (1.0 - (gridSizeX - i) / PMLWidth) * (1.0 - (gridSizeX - i) / PMLWidth);


            if (j < PMLWidth)
                sigmaEx[j][i] = eps[j][i] / (2.0 * dt) * (1.0 - j / PMLWidth) * (1.0 - j / PMLWidth) * (1.0 - j / PMLWidth);
            if (j > gridSizeY - PMLWidth)
                sigmaEx[j][i] = eps[j][i] / (2.0 * dt) * (1.0 - (gridSizeY - j) / PMLWidth) * (1.0 - (gridSizeY - j) / PMLWidth) * (1.0 - (gridSizeY - j) / PMLWidth);

        }
    }



    //Set Ex parameters
    for (let i = 0; i < gridSizeX; i++) {
        for (let j = 0; j < gridSizeY - 1; j++) {
            let m0 = 1.0 / dt + (sigmaEy[j][i]) / (2.0 * eps[j][i]);
            ARRmEx[j][i] = 1.0 / (m0) * (1.0 / dt - sigmaEy[j][i] / (2.0 * eps[j][i]));
            ARRmCHx[j][i] = c / (m0 * eps[j][i]);
            ARRmICHx[j][i] = (1.0 / m0) * (c * dt * sigmaEx[j][i]) / (eps[j][i] * eps[j][i]);
            ARRmJx[j][i] = -1.0 / eps[j][i];
        }
    }

    //Set Ey parameters
    for (let i = 0; i < gridSizeX - 1; i++) {
        for (let j = 0; j < gridSizeY; j++) {
            let m0 = 1.0 / dt + (sigmaEx[j][i]) / (2.0 * eps[j][i]);
            ARRmEy[j][i] = (1.0 / m0) * (1.0 / dt - sigmaEx[j][i] / (2.0 * eps[j][i]));
            ARRmCHy[j][i] = c / (m0 * eps[j][i]);
            ARRmICHy[j][i] = (1.0 / m0) * (c * dt * sigmaEy[j][i]) / (eps[j][i] * eps[j][i]);
            ARRmJy[j][i] = -1.0 / eps[j][i];
        }
    }

    //Set Hz parameters
    for (let i = 0; i < gridSizeX - 1; i++) {
        for (let j = 0; j < gridSizeY - 1; j++) {
            let m0 = 1.0 / dt + (sigmaEx[j][i] + sigmaEy[j][i]) / (2.0 * eps[j][i]) + dt * (sigmaEx[j][i] * sigmaEy[j][i]) / (4.0 * eps[j][i] * eps[j][i]);
            ARRmHz[j][i] = 1.0 / m0 * (1.0 / dt - (sigmaEx[j][i] + sigmaEy[j][i]) / (2.0 * eps[j][i]) - dt * (sigmaEx[j][i] * sigmaEy[j][i]) / (4.0 * eps[j][i] * eps[j][i]));
            ARRmCEz[j][i] = -(1.0 / m0) * (c / mu) / eps[j][i];
            ARRmIHz[j][i] = -(1.0 / m0) * (dt / (eps[j][i] * eps[j][i])) * (sigmaEx[j][i] * sigmaEy[j][i]) / eps[j][i];
        }
    }

    mEx = createExSizeTextureKernel(ARRmEx);
    mCHx = createExSizeTextureKernel(ARRmCHx);
    mICHx = createExSizeTextureKernel(ARRmICHx);
    mJx = createExSizeTextureKernel(ARRmJx);
    mEy = createEySizeTextureKernel(ARRmEy);
    mCHy = createEySizeTextureKernel(ARRmCHy);
    mICHy = createEySizeTextureKernel(ARRmICHy);
    mJy = createEySizeTextureKernel(ARRmJy);
    mHz = createHzSizeTextureKernel(ARRmHz);
    mCEz = createHzSizeTextureKernel(ARRmCEz);
    mIHz = createHzSizeTextureKernel(ARRmIHz);

}

function updateFields() {

    //Calculate E curl
    CEz = calcCEzKernel(Ex, Ey);

    //Sum Hz
    IHz2 = updateHzTypeSumKernel(IHz, Hz);
    IHz.delete();
    IHz = IHz2;

    //Update Hz
    Hz2 = updateHzKernel(CEz, Hz, Jx, Jy, q, IHz2, mHz, mCEz, mIHz);
    Hz.delete();
    Hz = Hz2;

    //Calc H curl
    CHx = calcCHxKernel(Hz);
    CHy = calcCHyKernel(Hz);

    //Sum H curl
    ICHx2 = updateExTypeSumKernel(ICHx, CHx);
    ICHx.delete();
    ICHx = ICHx2;
    ICHy2 = updateEyTypeSumKernel(ICHy, CHy);
    ICHy.delete();
    ICHy = ICHy2;

    //Update E
    Ex2 = updateExKernel(Ex, Ey, CHx, Jx, Jy, q, ICHx2, mEx, mCHx, mJx, mICHx);
    Ey2 = updateEyKernel(Ex, Ey, CHy, Jx, Jy, q, ICHy2, mEy, mCHy, mJy, mICHy);
    Ex.delete();
    Ey.delete();
    Ex = Ex2;
    Ey = Ey2;

    //Delte curls
    CHx.delete();
    CHy.delete();
    CEz.delete();

    //Iterate poisson solver for electrostatic field
    for (i = 0; i < 5; i++) {
        divEminusQ = calcDivEminusQKernel(Ex, Ey, q, eps);

        Ex2 = updateExWithDivKernel(Ex, divEminusQ);
        Ex.delete();
        Ex = Ex2;


        Ey2 = updateEyWithDivKernel(Ey, divEminusQ);
        Ey.delete();
        Ey = Ey2;

        divEminusQ.delete();

    }
}



function updateParticleState() {

    let maxSpeed = 150;

    let particleXNew = smoothness * mouseX + (1.0 - smoothness) * particleX;
    let particleYNew = smoothness * mouseY + (1.0 - smoothness) * particleY;

    let speed = (particleXNew - particleX) ** 2 + (particleYNew - particleY) ** 2;
    if (speed > 10) {
        let speedDivisor = Math.sqrt(speed / maxSpeed);
        particleXNew = (particleXNew - particleX) / speedDivisor + particleX;
        particleYNew = (particleYNew - particleY) / speedDivisor + particleY;
    }

    particleXVel = 0.2 * (particleXNew - particleX);
    particleYVel = 0.2 * (particleYNew - particleY);

    particleX = particleXNew;
    particleY = particleYNew;

}

function simulationStep() {

    updateParticleState(); //Update particle

    //Calculate source fields
    q = calculateQKernel(particleX, particleY);
    Jx = calculateJxKernel(particleX, particleY, particleXVel);
    Jy = calculateJyKernel(particleX, particleY, particleYVel);

    updateFields(); //Update fields

    //Delete source fields
    q.delete();
    Jx.delete();
    Jy.delete();


    renderOutputKernel(Ex, Ey, Hz, Jx, q, eps); //Output


}



function simulationLoop(time) {
    delta = time - then;

    if (delta > interval) {
        then = time;
        newEnvironmentFunction();
        newEnvironmentFunction = function() {};
        showPerformance(1000 / delta);
        simulationStep(); //Execute 2 steps for faster simulation
        simulationStep();
    }
    requestAnimationFrame(simulationLoop);

}


gpucanvas.addEventListener('mousemove', e => updateParticlePostion(gpucanvas, e)); //Setup mouse event
setupKernels(); //Setup kernels
initFields(); //Setup fields
setEnvVacuum(); //Setup default enviorment
requestAnimationFrame(simulationLoop); //Start animation
