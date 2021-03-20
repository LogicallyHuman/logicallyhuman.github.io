function clearFields(){
    Ex.delete();
    Ey.delete();
    Hz.delete();
    ICHx.delete();
    ICHy.delete();
    IHz.delete();
    divEminusQ.delete();
    q.delete();
    Jx.delete();
    Jy.delete();

    Ex = createExSizeEmptyTextureKernel();
    Ey = createEySizeEmptyTextureKernel();
    Hz = createHzSizeEmptyTextureKernel();
    ICHx = createExSizeEmptyTextureKernel();
    ICHy = createEySizeEmptyTextureKernel();
    IHz = createHzSizeEmptyTextureKernel();
    divEminusQ = createQSizeEmptyTextureKernel();
    q = createQSizeEmptyTextureKernel();
    Jx = createExSizeEmptyTextureKernel();
    Jy = createEySizeEmptyTextureKernel();


}

function setEnvVacuum(){

    newEnvironmentFunction = function(){
    particleX = gridSizeX/2;
    particleY = gridSizeY/2;
    mouseX = gridSizeX/2;
    mouseY = gridSizeY/2;

    clearFields();
    for(let i = 0; i < gridSizeX; i++){
        for(let j = 0; j < gridSizeY; j++){
            eps[j][i] = 1.0;
        }        
    }

    setupUpdateParameters();
    
    }
}

function setEnvHalfDielectric(){
    
        newEnvironmentFunction = function(){
            particleX = gridSizeX/2;
            particleY = gridSizeY/2;
            mouseX = gridSizeX/2;
            mouseY = gridSizeY/2;
        
            clearFields();

            for(let i = 0; i < gridSizeX; i++){
                for(let j = 0; j < gridSizeY; j++){
                    eps[j][i] = (j < gridSizeY/2) ? 3 : 1.0;
                }        
            }
        
            setupUpdateParameters();
        
        }

}