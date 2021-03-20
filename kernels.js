//Field update equations

function updateEx(Ex, Ey, CHx, Jx, Jy, q, ICHx, mEx, mCHx, mJx, mICHx) {
    let j = this.thread.x;
    let i = this.thread.y;

    return mEx[i][j] * Ex[i][j] + mCHx[i][j] * CHx[i][j] + mJx[i][j] * Jx[i][j] + mICHx[i][j] * ICHx[i][j];
}


function updateEy(Ex, Ey, CHy, Jx, Jy, q, ICHy, mEy, mCHy, mJy, mICHy) {
    let j = this.thread.x;
    let i = this.thread.y;

    return mEy[i][j] * Ey[i][j] + mCHy[i][j] * CHy[i][j] + mJy[i][j] * Jy[i][j] + mICHy[i][j] * ICHy[i][j];
}


function updateHz(CEz, Hz, Jx, Jy, q, IHz, mHz, mCEz, mIHz) {
    let j = this.thread.x;
    let i = this.thread.y;

    return mHz[i][j] * Hz[i][j] + mCEz[i][j] * CEz[i][j] + mIHz[i][j] * IHz[i][j];
}


//Curl calculations

function calcCHx(Hz) {
    let j = this.thread.x;
    let i = this.thread.y;

    let CHx = 0.0;

    if (j > 0)
        CHx -= Hz[i][j - 1];
    if (j < this.constants.sizeY - 1)
        CHx += Hz[i][j];

    return CHx;
}

function calcCHy(Hz) {
    let j = this.thread.x;
    let i = this.thread.y;

    let CHy = 0.0;

    if (i > 0)
        CHy += Hz[i - 1][j];
    if (i < this.constants.sizeX - 1)
        CHy -= Hz[i][j];

    return CHy;
}


function calcCEz(Ex, Ey) {
    let j = this.thread.x;
    let i = this.thread.y;

    return Ey[i + 1][j] - Ey[i][j] - Ex[i][j + 1] + Ex[i][j];
}

//Electrostatic solving





function calcDivEminusQ(Ex, Ey, q, eps) {
    let j = this.thread.x;
    let i = this.thread.y;

    let ret = 0.0;

    if (i < this.constants.sizeX - 1)
        ret += Ex[i][j];
    if (j < this.constants.sizeY - 1)
        ret += Ey[i][j];
    if (j > 0)
        ret -= Ey[i][j - 1];
    if (i > 0)
        ret -= Ex[i - 1][j];
    ret -= q[i][j]/eps[i][j];
    return 0.24 * ret;

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



//Source field calculations

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


//Particle size

function S(i, x) {
    let scale = 10.0;

    x /= scale;
    i /= scale;

    x -= i;


    if (0.0 <= Math.abs(x) && Math.abs(x) <= 0.5) {
        return (0.75 - x * x) / scale;
    }
    else if (0.5 < Math.abs(x) && Math.abs(x) <= 1.5) {
        return 0.125 * (3.0 - 2.0 * Math.abs(x)) * (3.0 - 2.0 * Math.abs(x)) / scale;
    }
    else {
        return 0.0;
    }

}

//Auxiliary

function updateSum(sum, value) {
    let j = this.thread.x;
    let i = this.thread.y;

    return sum[i][j] + value[i][j];
}

//Output

function renderOutput(Ex, Ey, Hz, Jx, q, eps) {

    let j = this.thread.x/this.constants.cellSize;
    let i = this.thread.y/this.constants.cellSize;

    let vEx = Ex[i][j];
    let vEy = Ey[i][j];
    let vHz = Hz[i][j];

    if (q[i][j] > 0.001) {
        this.color(0, 0, 255);
    }
    else {
        this.color(
            100 * Math.sqrt(Ex[i][j] * Ex[i][j] + Ey[i][j] * Ey[i][j])  + 0.1*(eps[i][j] - 1.0),
            100 * Math.abs(Hz[i][j])+ 0.1*(eps[i][j] - 1.0),
            0.1*(eps[i][j] - 1.0));
    }
}

function createEmptyTexture(){
    return 0.0;
}

//Setup

function setupKernels() {

    gpu.addFunction(S);


    updateExKernel = gpu.createKernel(updateEx);
    updateEyKernel = gpu.createKernel(updateEy);
    updateHzKernel = gpu.createKernel(updateHz);
    updateExTypeSumKernel = gpu.createKernel(updateSum);
    updateEyTypeSumKernel = gpu.createKernel(updateSum);
    updateHzTypeSumKernel = gpu.createKernel(updateSum);
    calcCHxKernel = gpu.createKernel(calcCHx);
    calcCHyKernel = gpu.createKernel(calcCHy);
    calcCEzKernel = gpu.createKernel(calcCEz);
    calcDivEminusQKernel = gpu.createKernel(calcDivEminusQ);
    updateExWithDivKernel = gpu.createKernel(updateExWithDiv);
    updateEyWithDivKernel = gpu.createKernel(updateEyWithDiv);
    calculateQKernel = gpu.createKernel(calculateQ);
    calculateJxKernel = gpu.createKernel(calculateJx);
    calculateJyKernel = gpu.createKernel(calculateJy);
    renderOutputKernel = gpu.createKernel(renderOutput);
    createExSizeEmptyTextureKernel = gpu.createKernel(createEmptyTexture);
    createEySizeEmptyTextureKernel = gpu.createKernel(createEmptyTexture);
    createHzSizeEmptyTextureKernel = gpu.createKernel(createEmptyTexture);
    createQSizeEmptyTextureKernel = gpu.createKernel(createEmptyTexture);


    updateExKernel.setOutput([gridSizeX, gridSizeY - 1]);
    updateEyKernel.setOutput([gridSizeX - 1, gridSizeY]);
    updateHzKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);
    updateExTypeSumKernel.setOutput([gridSizeX, gridSizeY - 1]);
    updateEyTypeSumKernel.setOutput([gridSizeX - 1, gridSizeY]);
    updateHzTypeSumKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);
    calcCHxKernel.setOutput([gridSizeX, gridSizeY - 1]);
    calcCHyKernel.setOutput([gridSizeX - 1, gridSizeY]);
    calcCEzKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);
    calcDivEminusQKernel.setOutput([gridSizeX, gridSizeY]);
    updateExWithDivKernel.setOutput([gridSizeX, gridSizeY - 1]);
    updateEyWithDivKernel.setOutput([gridSizeX - 1, gridSizeY]);
    calculateQKernel.setOutput([gridSizeX, gridSizeY]);
    calculateJxKernel.setOutput([gridSizeX, gridSizeY - 1]);
    calculateJyKernel.setOutput([gridSizeX - 1, gridSizeY]);
    renderOutputKernel.setOutput([(gridSizeX - 1)*cellSize, (gridSizeY - 1)*cellSize]);
    createExSizeEmptyTextureKernel.setOutput([gridSizeX, gridSizeY - 1]);
    createEySizeEmptyTextureKernel.setOutput([gridSizeX - 1, gridSizeY]);
    createHzSizeEmptyTextureKernel.setOutput([gridSizeX - 1, gridSizeY - 1]);
    createQSizeEmptyTextureKernel.setOutput([gridSizeX, gridSizeY]);


    updateExKernel.setPipeline(true);
    updateEyKernel.setPipeline(true);
    updateHzKernel.setPipeline(true);
    updateExTypeSumKernel.setPipeline(true);
    updateEyTypeSumKernel.setPipeline(true);
    updateHzTypeSumKernel.setPipeline(true);
    calcCHxKernel.setPipeline(true);
    calcCHyKernel.setPipeline(true);
    calcCEzKernel.setPipeline(true);
    calcDivEminusQKernel.setPipeline(true);
    updateExWithDivKernel.setPipeline(true);
    updateEyWithDivKernel.setPipeline(true);
    calculateQKernel.setPipeline(true);
    calculateJxKernel.setPipeline(true);
    calculateJyKernel.setPipeline(true);
    createExSizeEmptyTextureKernel.setPipeline(true);
    createEySizeEmptyTextureKernel.setPipeline(true);
    createHzSizeEmptyTextureKernel.setPipeline(true);
    createQSizeEmptyTextureKernel.setPipeline(true);

    updateExKernel.setImmutable(true);
    updateEyKernel.setImmutable(true);
    updateHzKernel.setImmutable(true);
    updateExTypeSumKernel.setImmutable(true);
    updateEyTypeSumKernel.setImmutable(true);
    updateHzTypeSumKernel.setImmutable(true);
    calcCHxKernel.setImmutable(true);
    calcCHyKernel.setImmutable(true);
    calcCEzKernel.setImmutable(true);
    calcDivEminusQKernel.setImmutable(true);
    updateExWithDivKernel.setImmutable(true);
    updateEyWithDivKernel.setImmutable(true);
    calculateQKernel.setImmutable(true);
    calculateJxKernel.setImmutable(true);
    calculateJyKernel.setImmutable(true);
    createExSizeEmptyTextureKernel.setImmutable(true);
    createEySizeEmptyTextureKernel.setImmutable(true);
    createHzSizeEmptyTextureKernel.setImmutable(true);
    createQSizeEmptyTextureKernel.setImmutable(true);

    calcCHxKernel.setConstants({sizeY: gridSizeX, sizeX: gridSizeY });
    calcCHyKernel.setConstants({sizeY: gridSizeX, sizeX: gridSizeY });
    calcCEzKernel.setConstants({sizeY: gridSizeX, sizeX: gridSizeY });
    updateExWithDivKernel.setConstants({ sizeY: gridSizeX, sizeX: gridSizeY });
    updateEyWithDivKernel.setConstants({ sizeY: gridSizeX, sizeX: gridSizeY });
    calcDivEminusQKernel.setConstants({ sizeY: gridSizeX, sizeX: gridSizeY });
    renderOutputKernel.setConstants({ cellSize: cellSize});

    renderOutputKernel.setGraphical(true)

}