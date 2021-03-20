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

   /* Ex = createTexture(gridSizeY - 1, gridSizeX)
    Ey = createTexture(gridSizeY, gridSizeX - 1);
    Hz = createTexture(gridSizeY - 1, gridSizeX - 1);
    ICHx = createTexture(gridSizeY - 1, gridSizeX)
    ICHy = createTexture(gridSizeY, gridSizeX - 1);
    IHz = createTexture(gridSizeY - 1, gridSizeX - 1);
    divEminusQ = createTexture(gridSizeY , gridSizeX );
    q = createTexture(gridSizeY , gridSizeX );
    Jx = createTexture(gridSizeY - 1, gridSizeX)
    Jy = createTexture(gridSizeY, gridSizeX - 1);*/

    Ex = createTexture(gridSizeY - 1, gridSizeX)
    Ey = createTexture(gridSizeY, gridSizeX - 1);
    Hz = createTexture(gridSizeY - 1, gridSizeX - 1);
    ICHx = createTexture(gridSizeY - 1, gridSizeX)
    ICHy = createTexture(gridSizeY, gridSizeX - 1);
    IHz = createTexture(gridSizeY - 1, gridSizeX - 1);
    divEminusQ = createTexture(gridSizeY , gridSizeX );
    q = createTexture(gridSizeY , gridSizeX );
    Jx = createTexture(gridSizeY - 1, gridSizeX)
    Jy = createTexture(gridSizeY, gridSizeX - 1);


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