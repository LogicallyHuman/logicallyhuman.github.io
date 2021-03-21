//Get needed HTML elements
let gpucanvas = document.getElementById("canvas");
let fpsText = document.getElementById("gputime-text");

//GPU
const gpu = new GPU({ canvas: gpucanvas, mode: 'webgl2' });

//Starting size
let gridSizeX = Math.min(400, Math.floor(window.innerWidth / 3));
let gridSizeY = Math.min(400, Math.floor(window.innerHeight / 3));

let cellSize = 2; //Cell size in pixels, resulting canvas size is gridSize*cellSize

const smoothness = 0.2; //Mouse smoothness

let mouseX = gridSizeY / (2 * cellSize); //Mouse position
let mouseY = gridSizeX / (2 * cellSize);


//Used for frame timing
var previousFrameTime = 0;



//Used for performance display
const perfSmoothness = 0.05; //Performance numbers smoothing constant
let smoothedFps = 0; //Recorded FPS

let newEnvironmentFunction = () => { };

//Grid values
let Ex; //EM Fields
let Ey;
let Hz;
let q; //Source Fields
let Jx;
let Jy;
let divEminusQ; //Aux field
let mEx; //Update parameters for Ex
let mCHx;
let mICHx;
let mJx;
let mEy; //Update parameters for Ey
let mCHy;
let mICHy;
let mJy;
let mHz; //Update parameters for Hz
let mCEz;
let mIHz;
let IHz; //Summations for PML
let ICHy;
let ICHx;
let sigmaEx; //PML Sigmas
let sigmaEy;
let eps;

//Kernels
let updateExKernel; //Update equations
let updateEyKernel;
let updateHzKernel;
let updateExTypeSumKernel; //Predefined kernels for summing
let updateEyTypeSumKernel;
let updateHzTypeSumKernel;
let calcCHxKernel; //Curl calculation kernels
let calcCHyKernel;
let calcCEzKernel;
let calcDivEminusQKernel; //Electrostatic field kernels
let updateExWithDivKernel;
let updateEyWithDivKernel;
let calculateQKernel; //Source field kernels
let calculateJxKernel;
let calculateJyKernel;
let renderOutputKernel; //Output kernel
let createExSizeTextureKernel;
//Particle position
let particleX = gridSizeY / 2;
let particleY = gridSizeX / 2;

//Particle velocity
let particleXVel = 0;
let particleYVel = 0;


//Called when mouse updates
function updateParticlePostion(canvas, e) {
    let x, y;

    if (e.type.includes('touch')) {
        let touch = e.touches[0] || e.changedTouches[0];
        x = touch.pageX;
        y = touch.pageY;
    } else if (e.type.includes('mouse')) {
        x = e.clientX;
        y = e.clientY;
    }


    const rect = canvas.getBoundingClientRect();
    mouseY = (x - rect.left) / cellSize;
    mouseX = gridSizeY - (y + rect.top) / cellSize + rect.top;
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


    sigmaEx = createArray(gridSizeY, gridSizeX);
    sigmaEy = createArray(gridSizeY, gridSizeX);

    eps = createArray(gridSizeY, gridSizeX);

}


function setupUpdateParameters() {

    if (typeof (mEx) != "undefined") { //If the parameters already exist, delete them
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




    let dx = 1.0; //DO NOT CHANGE!!!!!!!! This is assumed to be 1 in update equations
    let dt = 0.6;
    let mu = 1.0;

    let c = 1.0 / Math.sqrt(1 * mu);

    let PMLWidth = 30;

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
    newEnvironmentFunction();
    newEnvironmentFunction = () => { };

    showPerformance(1000 / (time - previousFrameTime));

    simulationStep(); //Execute 2 steps for faster simulation
    simulationStep();

    previousFrameTime = time;
    
    requestAnimationFrame(simulationLoop);
}


gpucanvas.addEventListener('mousemove', e => updateParticlePostion(gpucanvas, e)); //Setup mouse event
gpucanvas.addEventListener('touchmove', e => updateParticlePostion(gpucanvas, e)); //Setup swipe event
setupKernels(); //Setup kernels
initFields(); //Setup fields
setEnvVacuum(); //Setup default enviorment
requestAnimationFrame(simulationLoop); //Start animation
