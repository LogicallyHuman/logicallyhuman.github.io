//Get needed HTML elements
let gpucanvas = document.getElementById("canvas")
let fpsText = document.getElementById("gputime-text");


//GPU
const gpu = new GPU({ canvas: gpucanvas, mode: 'webgl2' });



//Starting size
var gridSizeX = 500;//window.innerWidth;
var gridSizeY = 500;//window.innerHeight;

const smoothness = 0.2;//Mouse smoothness

var mouseX = gridSizeY / 2;//Mouse position
var mouseY = gridSizeX / 2;


//Used for frame timing
var delta = 0;
var then = 0;
const interval = 1000 / 60;


//Used for performance display
const perfSmoothness = 0.05;//Performance numbers smoothing constant
var smoothedFps = 0;//Recorded FPS



//Grid values
var Ex;//EM Fields
var Ey;
var Hz;
var q;//Source Fields
var Jx;
var Jy;
var divEminusQ;//Aux field
var mEx;//Update parameters for Ex
var mCHx;
var mICHx;
var mJx;
var mEy;//Update parameters for Ey
var mCHy;
var mICHy;
var mJy;
var mHz;//Update parameters for Hz
var mCEz;
var mIHz;
var IHz;//Summations for PML
var ICHy;
var ICHx;
var sigmaEx;//PML Sigmas
var sigmaEy;

//Kernels
var updateExKernel;//Update equations
var updateEyKernel;
var updateHzKernel;
var updateExTypeSumKernel;//Predefined kernels for summing
var updateEyTypeSumKernel;
var updateHzTypeSumKernel;
var calcCHxKernel;//Curl calculation kernels
var calcCHyKernel;
var calcCEzKernel;
var calcDivEminusQKernel;//Electrostatic field kernels
var updateExWithDivKernel;
var updateEyWithDivKernel;
var calculateQKernel;//Source field kernels
var calculateJxKernel;
var calculateJyKernel;
var renderOutputKernel;//Output kernel

//Particle position
var particleX = gridSizeY / 2;
var particleY = gridSizeX / 2;

//Particle velocity
var particleXVel = 0;
var particleYVel = 0;

//Called when mouse updates
function updateParticlePostion(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    mouseY = event.clientX - rect.left;
    mouseX = gridSizeY - event.clientY + rect.top;
}

function createArray(sizeX, sizeY) {//Creates a 2D array
    let a = new Array(sizeX);
    for (let i = 0; i < sizeX; i++) {
        a[i] = new Array(sizeY);
        for (let j = 0; j < sizeY; j++) {
            a[i][j] = 0.0;
        }
    }

    return a;
}

function createTexture(sizeX, sizeY) { //Creates a 2D texture

    function copy(a) {
        return a[this.thread.y][this.thread.x];
    }

    textureGen = gpu.createKernel(copy);
    textureGen.setOutput([sizeY, sizeX]);
    textureGen.setPipeline(true);
    textureGen.setImmutable(true);

    let a = new Array(sizeX);

    for (let i = 0; i < sizeX; i++) {
        a[i] = new Array(sizeY);
        for (let j = 0; j < sizeY; j++) {
            a[i][j] = 0.0;
        }
    }

    a = textureGen(a);

    textureGen.destroy();

    return a;
}


function createTextureFromArray(a) { //Convert an array to a texture
    let sizeX = a.length;
    let sizeY = a[0].length;

    function copy(a) {
        return a[this.thread.y][this.thread.x];
    }

    textureGen = gpu.createKernel(copy);
    textureGen.setOutput([sizeY, sizeX]);
    textureGen.setPipeline(true);
    textureGen.setImmutable(true);

    a = textureGen(a);

    textureGen.destroy();

    return a;
}

function showPerformance(fps) {//Update HTML Performance numbers
    smoothedFps = perfSmoothness * fps + (1.0 - perfSmoothness) * smoothedFps;
    fpsText.innerHTML = (smoothedFps).toFixed("2");
}

function initFields() {


    //Main EM Fields
    Hz = createTexture(gridSizeY - 1, gridSizeX - 1);
    Ex = createTexture(gridSizeY - 1, gridSizeX);
    Ey = createTexture(gridSizeY, gridSizeX - 1);

    //Source fields
    q = createTexture(gridSizeY, gridSizeX);
    Jx = createTexture(gridSizeY - 1, gridSizeX);
    Jy = createTexture(gridSizeY, gridSizeX - 1);

    //Aux fields used for compuation
    divEminusQ = createTexture(gridSizeY, gridSizeX);

    //Sumation Fields, needed for PML
    ICHx = createTexture(gridSizeY - 1, gridSizeX);
    ICHy = createTexture(gridSizeY, gridSizeX - 1);
    IHz = createTexture(gridSizeY - 1, gridSizeX - 1);

    //Update parameters for Ex update equation
    mEx = createArray(gridSizeY - 1, gridSizeX);
    mCHx = createArray(gridSizeY - 1, gridSizeX);
    mICHx = createArray(gridSizeY - 1, gridSizeX);
    mJx = createArray(gridSizeY - 1, gridSizeX);

    //Update parameters for Ey update equation
    mEy = createArray(gridSizeY, gridSizeX - 1);
    mCHy = createArray(gridSizeY, gridSizeX - 1);
    mICHy = createArray(gridSizeY, gridSizeX - 1);
    mJy = createArray(gridSizeY, gridSizeX - 1);

    //Update parameters for Hz update equation
    mHz = createArray(gridSizeY - 1, gridSizeX - 1);
    mCEz = createArray(gridSizeY - 1, gridSizeX - 1);
    mIHz = createArray(gridSizeY - 1, gridSizeX - 1);

        
    sigmaEx = createArray(gridSizeY, gridSizeX);
    sigmaEy = createArray(gridSizeY, gridSizeX);

}


function setupUpdateParameters(){

    var dx = 1.0; //DO NOT CHANGE!!!!!!!! This is assumed to be 1 in update equations
    var dt = 0.6;
    var eps = 1.0;
    var mu = 1.0;
    
    var c = 1.0 / Math.sqrt(eps * mu);

    var PMLWidth = 30;

    //Calculate PML Sigmas
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
    


    //Set Ex parameters
    for (let i = 0; i < gridSizeX; i++) {
        for (let j = 0; j < gridSizeY - 1; j++) {
            let m0 = 1.0 / dt + (sigmaEy[j][i]) / (2.0 * eps);
            mEx[j][i] = 1.0 / (m0) * (1.0 / dt - sigmaEy[j][i] / (2.0 * eps));
            mCHx[j][i] = c / (m0 * eps);
            mICHx[j][i] = (1.0 / m0) * (c * dt * sigmaEx[j][i]) / (eps * eps);
            mJx[j][i] = -1.0 / eps;
        }
    }
    
    //Set Ey parameters
    for (let i = 0; i < gridSizeX - 1; i++) {
        for (let j = 0; j < gridSizeY; j++) {
            let m0 = 1.0 / dt + (sigmaEx[j][i]) / (2.0 * eps);
            mEy[j][i] = (1.0 / m0) * (1.0 / dt - sigmaEx[j][i] / (2.0 * eps));
            mCHy[j][i] = c / (m0 * eps);
            mICHy[j][i] = (1.0 / m0) * (c * dt * sigmaEy[j][i]) / (eps * eps);
            mJy[j][i] = -1.0 / eps;
        }
    }
    
    //Set Hz parameters
    for (let i = 0; i < gridSizeX - 1; i++) {
        for (let j = 0; j < gridSizeY - 1; j++) {
            let m0 = 1.0 / dt + (sigmaEx[j][i] + sigmaEy[j][i]) / (2.0 * eps) + dt * (sigmaEx[j][i] * sigmaEy[j][i]) / (4.0 * eps * eps);
            mHz[j][i] = 1.0 / m0 * (1.0 / dt - (sigmaEx[j][i] + sigmaEy[j][i]) / (2.0 * eps) - dt * (sigmaEx[j][i] * sigmaEy[j][i]) / (4.0 * eps * eps));
            mCEz[j][i] = -(1.0 / m0) * (c / mu) / eps;
            mIHz[j][i] = -(1.0 / m0) * (dt / (eps * eps)) * (sigmaEx[j][i] * sigmaEy[j][i]) / eps;
        }
    }

    mEx = createTextureFromArray(mEx);
    mCHx = createTextureFromArray(mCHx);
    mICHx = createTextureFromArray(mICHx);
    mJx = createTextureFromArray(mJx);
    mEy = createTextureFromArray(mEy);
    mCHy = createTextureFromArray(mCHy);
    mICHy = createTextureFromArray(mICHy);
    mJy = createTextureFromArray(mJy);
    mHz = createTextureFromArray(mHz);
    mCEz = createTextureFromArray(mCEz);
    mIHz = createTextureFromArray(mIHz);

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
        divEminusQ = calcDivEminusQKernel(Ex, Ey, q);
        
        Ex2 = updateExWithDivKernel(Ex, divEminusQ);
        Ex.delete();
        Ex = Ex2;


        Ey2 = updateEyWithDivKernel(Ey, divEminusQ);
        Ey.delete();
        Ey = Ey2;

        divEminusQ.delete();

    }
}



function updateParticleState(){
    let particleXNew = smoothness * mouseX + (1.0 - smoothness) * particleX;
    let particleYNew = smoothness * mouseY + (1.0 - smoothness) * particleY;

    particleXVel = 0.1 * (particleXNew - particleX);
    particleYVel = 0.1 * (particleYNew - particleY);

    particleX = particleXNew;
    particleY = particleYNew;

}

function simulationStep() {

    updateParticleState();//Update particle

    //Calculate source fields
    q = calculateQKernel(particleX, particleY);
    Jx = calculateJxKernel(particleX, particleY, particleXVel);
    Jy = calculateJyKernel(particleX, particleY, particleYVel);

    updateFields();//Update fields

    //Delete source fields
    q.delete();
    Jx.delete();
    Jy.delete();


    renderOutputKernel(Ex, Ey, Hz, Jx, q);//Output


}

function simulationLoop(time) {
    delta = time - then;

    if (delta > interval) {
        then = time;
        showPerformance(1000 / delta);
        simulationStep();//Execute 3 steps for faster simulation
        simulationStep();
        simulationStep()
    }
    requestAnimationFrame(simulationLoop);

}


gpucanvas.addEventListener('mousemove', function (e) {updateParticlePostion(gpucanvas, e)});//Setup mouse event
initFields();//Setup fields
setupKernels();//Setup kernels
setupUpdateParameters();//Setup update parameters
requestAnimationFrame(simulationLoop);//Start animation
