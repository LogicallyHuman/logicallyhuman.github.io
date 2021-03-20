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
    Jx = createEySizeEmptyTextureKernel();
    Jy = createEySizeEmptyTextureKernel();
}



function setEnvVacuum(){

    newEnvironmentFunction = function(){


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


            for(let i = 0; i < gridSizeX; i++){
                for(let j = 0; j < gridSizeY; j++){
                    eps[j][i] = (j < gridSizeY/2) ? 3 : 1.0;
                }        
            }
        
            setupUpdateParameters();
        
        }

}

function setEnvCircle(){
    
    newEnvironmentFunction = function(){


        for(let i = 0; i < gridSizeX; i++){
            for(let j = 0; j < gridSizeY; j++){
                eps[j][i] = (i - gridSizeX/2)*(i - gridSizeX/2) + (j - gridSizeY/2)*(j - gridSizeY/2) < gridSizeX/5*gridSizeX/5? 3 : 1.0;
            }        
        }
    
        setupUpdateParameters();
    
    }

}


function setEnvParabolicMirror(){
    
    newEnvironmentFunction = function(){


        for(let i = 0; i < gridSizeX; i++){
            for(let j = 0; j < gridSizeY; j++){
                eps[j][i] = j < 4*((i-gridSizeX/2)**2)/gridSizeX**2*(gridSizeY/2 - gridSizeY/20)+ gridSizeY/20? 1100 : 1.0;
            }        
        }
    
        setupUpdateParameters();
    
    }

}
