function clearFields(){
    Ex.clear();
    Ey.clear();
    Hz.clear();
    ICHx.clear();
    ICHy.clear();
    IHz.clear();
    divEminusQ.clear();
    q.clear();
    Jx.clear();
    Jy.clear();
}

function setEnvVacuum(){

    newEnviormentFunction = function(){
        
    for(let i = 0; i < gridSizeX; i++){
        for(let j = 0; j < gridSizeY; j++){
            eps[j][i] = 1.0;
        }        
    }

    
    }
}

function setEnvHalfDielectric(){
    clearFields();

}


function setEnvVacuum(){

    for(let i = 0; i < gridSizeX; i++){
        for(let j = 0; j < gridSizeY; j++){
            eps[j][i] = 1.0;
        }        
    }
}

function setEnvHalfDielectric(){
    clearFields();

}