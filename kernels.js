/*
function updateEx(Ex, Ey, Hz, Jx, Jy, q) {
    let j = this.thread.x;
    let i = this.thread.y;

    let CHz = 0.0;

    if(j > 0)
        CHz -= Hz[i][j - 1];
    if(j < this.constants.sizeY - 1)
        CHz  += Hz[i][j];
    return Ex[i][j] + CHz*this.constants.Cdtds - Jx[i][j]; 
 }*/


function updateEx(Ex, Ey, Hz, Jx, Jy, q, mEx, mCHx, mJx) {
    let j = this.thread.x;
    let i = this.thread.y;

    let CHx = 0.0;

    if(j > 0)
        CHx -= Hz[i][j - 1];
    if(j < this.constants.sizeY - 1)
        CHx  += Hz[i][j];

    return mEx[i][j]*Ex[i][j] + mCHx[i][j]*CHx + mJx[i][j]*Jx[i][j]; 
}



function updateEy(Ex, Ey, Hz, Jx, Jy, q, mEy, mCHy, mJy) {
    let j = this.thread.x;
    let i = this.thread.y;

    let CHy = 0.0;

    if(i > 0)
        CHy += Hz[i - 1][j];
    if(i < this.constants.sizeX - 1)
        CHy -= Hz[i][j];
    
    return mEy[i][j] * Ey[i][j] + mCHy[i][j]*CHy + mJy[i][j]*Jy[i][j]; 
    
        
}

function updateHz(Ex, Ey, Hz, Jx, Jy, q, mHz, mCEz) {
    let j = this.thread.x;
    let i = this.thread.y;
    

    return mHz[i][j] * Hz[i][j] + mCEz[i][j] * (Ex[i][j + 1] - Ex[i][j] - Ey[i + 1][j] + Ey[i][j]);
}

function calcDivEminusQ(Ex, Ey, q) {
    let j = this.thread.x;
    let i = this.thread.y;

    let ret = 0.0;

    if(i < this.constants.sizeX - 1)
        ret += Ex[i][j];
    if(j < this.constants.sizeY - 1)
        ret += Ey[i][j];
    if(j > 0)
        ret -= Ey[i][j - 1];
    if(i > 0)
        ret -= Ex[i - 1][j];
    ret -= q[i][j];
        return 0.24*ret;

}

function updateExWithDiv(Ex, divEminusQ) {
    let j = this.thread.x;
    let i = this.thread.y;

    let a = Ex[i][j] + (divEminusQ[i + 1][j] - divEminusQ[i][j])
    return a;
}

function updateEyWithDiv(Ey, divEminusQ) {
    let j = this.thread.x;
    let i = this.thread.y;

    let a = Ey[i][j] + (divEminusQ[i][j + 1] - divEminusQ[i][j]);
    return a;
}

function calculateQ(particleX, particleY) {
    let zero = 0.0;

    return S(zero + this.thread.y, particleX) * S(zero + this.thread.x, particleY)
}

function calculateJx(particleX, particleY, particleXVel) {
    let zero = 0.0;

    return particleXVel * S(0.5 + this.thread.y, particleX) * S(zero + this.thread.x, particleY);
}

function calculateJy(particleX, particleY, particleYVel) {
    let zero = 0.0;

    return particleYVel * S(zero + this.thread.y, particleX) * S(zero + this.thread.x, particleY);
}

function renderOutput(Ex, Ey, Hz, Jx, q) {

    let j = this.thread.x;
    let i = this.thread.y;


    if (q[i][j] > 0.001) {
        this.color(255, 255, 255);
    }
    else {
        this.color(
            300 * Math.sqrt(Ex[i][j] * Ex[i][j] + Ey[i][j] * Ey[i][j]),
            300 * Math.abs(Hz[i][j]),
            0);
    }
}



function createTextureFromArray(array){
    return array[this.thread.y][this.thread.x];
}


function  setupKernels(){

    updateExKernel = gpu.createKernel(updateEx);
    updateEyKernel = gpu.createKernel(updateEy);
    updateHzKernel = gpu.createKernel(updateHz);
    calcDivEminusQKernel = gpu.createKernel(calcDivEminusQ);
    updateExWithDivKernel = gpu.createKernel(updateExWithDiv);
    updateEyWithDivKernel = gpu.createKernel(updateEyWithDiv);
    calculateQKernel = gpu.createKernel(calculateQ);
    calculateJxKernel = gpu.createKernel(calculateJx);
    calculateJyKernel = gpu.createKernel(calculateJy);
    renderOutputKernel = gpu.createKernel(renderOutput);
    createTextureFromArrayForEx = gpu.createKernel(createTextureFromArray);
    createTextureFromArrayForEy = gpu.createKernel(createTextureFromArray);
    createTextureFromArrayForHz = gpu.createKernel(createTextureFromArray);

    updateExKernel.setOutput([gridSizeX, gridSizeY - 1 ]);
    updateEyKernel.setOutput([gridSizeX-1, gridSizeY]);
    updateHzKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);
    calcDivEminusQKernel.setOutput([gridSizeX, gridSizeY]);
    updateExWithDivKernel.setOutput([gridSizeX, gridSizeY - 1 ]);
    updateEyWithDivKernel.setOutput([gridSizeX - 1, gridSizeY]);
    calculateQKernel.setOutput([gridSizeX, gridSizeY]);
    calculateJxKernel.setOutput([gridSizeX, gridSizeY  - 1]);
    calculateJyKernel.setOutput([gridSizeX  - 1, gridSizeY]);
    renderOutputKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);
    createTextureFromArrayForEx.setOutput([gridSizeX, gridSizeY - 1 ]);
    createTextureFromArrayForEy.setOutput([gridSizeX - 1, gridSizeY]);
    createTextureFromArrayForHz.setOutput([gridSizeX - 1, gridSizeY - 1 ]);    
    
    updateExKernel.setPipeline(true);
    updateEyKernel.setPipeline(true);
    updateHzKernel.setPipeline(true);
    calcDivEminusQKernel.setPipeline(true);
    updateExWithDivKernel.setPipeline(true);
    updateEyWithDivKernel.setPipeline(true);
    calculateQKernel.setPipeline(true);
    calculateJxKernel.setPipeline(true);
    calculateJyKernel.setPipeline(true);
    createTextureFromArrayForEx.setPipeline(true);
    createTextureFromArrayForEy.setPipeline(true);
    createTextureFromArrayForHz.setPipeline(true);  

    updateExKernel.setImmutable(true);
    updateEyKernel.setImmutable(true);
    updateHzKernel.setImmutable(true);
    calcDivEminusQKernel.setImmutable(true);
    updateExWithDivKernel.setImmutable(true);
    updateEyWithDivKernel.setImmutable(true);
    calculateQKernel.setImmutable(true);
    calculateJxKernel.setImmutable(true);
    calculateJyKernel.setImmutable(true);
    createTextureFromArrayForEx.setImmutable(true);
    createTextureFromArrayForEy.setImmutable(true);
    createTextureFromArrayForHz.setImmutable(true);  

    updateExKernel.setConstants({ Cdtds: Cdtds, sizeY: gridSizeX, sizeX: gridSizeY });
    updateEyKernel.setConstants({ Cdtds: Cdtds, sizeY: gridSizeX, sizeX: gridSizeY });
    updateHzKernel.setConstants({ Cdtds: Cdtds, sizeY: gridSizeX, sizeX: gridSizeY });
    updateExWithDivKernel.setConstants({sizeY: gridSizeX, sizeX: gridSizeY });
    updateEyWithDivKernel.setConstants({sizeY: gridSizeX, sizeX: gridSizeY });
    calcDivEminusQKernel.setConstants({sizeY: gridSizeX, sizeX: gridSizeY });
    
    renderOutputKernel.setGraphical(true)
    
}