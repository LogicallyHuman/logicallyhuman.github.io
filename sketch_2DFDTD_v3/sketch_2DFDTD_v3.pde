import com.hamoid.*;

Grid g;

int gridSize = 250;
int cellSize = 4;

void arrow(float x1, float y1, float x2, float y2) {

  line(x1, y1, x2, y2);
  circle(x2, y2, 4);
}
VideoExport videoExport;
void keyPressed() {
  if (key == 'q') {
    videoExport.endMovie();
    exit();
  }
}
void setup() {
  size(1, 1);
  surface.setSize((gridSize)*cellSize, (gridSize)*cellSize);
  surface.setLocation(300, 0);  
  noSmooth();

  g = new Grid(gridSize, gridSize);
  textSize(20);
  float s = 0;
  for(int i = -100; i < 100; i++)
    s += S(0,i);
  println(s);
  // g.q[gridSize/2][gridSize/2] = 1;
  // videoExport = new VideoExport(this, "hello.mp4");
  // videoExport.startMovie();
}

int frameNum = 0;
long stepTime = 0;
long drawTime = 0;




float S(float i, float x) {
  
    x -= i;
    
    //return (abs(x)<1.0) ? (1-abs(x)) : 0;
  
    if(0 <= abs(x) && abs(x) <= 0.5){
      return (0.75 - x*x);
    }
    else if(0.5 < abs(x) && abs(x) <= 1.5){
      return 0.125*(3.0 - 2.0*abs(x))*(3.0 - 2.0*abs(x));
    }
    else{
      return 0;
    }
  
}

float particleX = gridSize/2;
float particleY = gridSize/2;

float particleXVel = 0;
float particleYVel = 0;

float particleXAcc = 0;
float particleYAcc = 0;

float q = 100;

void draw() {
  
  


  stepTime = -millis();

  

  //for (int i = 0; i < 3; i++) {
    
    int particleXVelSign = (int)((mouseX - particleX*cellSize)/abs(mouseX - particleX*cellSize));
    int particleYVelSign = (int)((mouseY - particleY*cellSize)/abs(mouseY - particleY*cellSize));
    
   // particleXVel = particleXVelSign*0.3/(1+exp(-0.05*abs(mouseX - particleX*cellSize) + 3));
   // particleYVel = particleYVelSign*0.3/(1+exp(-0.05*abs(mouseY - particleY*cellSize) + 3));
   
   //particleXVel = 0.7;//0.3*sin((float)frameNum/20);
   particleXVel = 0.4*sin((float)frameNum/10);

    
    g.step();
    //g.q[25][25] = q;
    for (int x = 0; x < gridSize-1; x++)
      for (int y = 0; y < gridSize-1; y++) {
        g.q[x][y] = q*S(x, particleX)*S(y, particleY);
        g.Jx[x][y] = q*particleXVel*S(x+0.5, particleX)*S(y, particleY);
        g.Jy[x][y] = q*particleYVel*S(x, particleX)*S(y+0.5, particleY);
      }

    particleX += particleXVel;
    particleY += particleYVel;
  frameNum++;


  //  println(particleXVel + ", " + particleYVel);
 // }
  stepTime += millis();

  // println(particleX + "," + particleY);

  drawTime = -millis();


  background(40);
  loadPixels();

  for (int xpix = 0; xpix < ((gridSize)-1)*cellSize; xpix++) {
    for (int ypix = 0; ypix < ((gridSize)-1)*cellSize; ypix++) {

      int x = xpix/cellSize;
      int y = ypix/cellSize;

      int E = (int)(100*sqrt(g.Ex[x][y]*g.Ex[x][y] + g.Ey[x][y]*g.Ey[x][y]));
      int H = (int)(100*abs(g.Hz[x][y]));
      
      E = min(E, 0xFF)*0x10000;
      H = min(H, 0xFF)*0x100;
      
      pixels[xpix + gridSize*cellSize*ypix] = E | H | 0xFF000000 ;
    }
  }
  updatePixels();


  drawTime += millis();

  fill(255, 255, 255);
  text("frame time (step + draw) : " + int(stepTime) + "ms + "
    + int(drawTime) + "ms = "
    + int(stepTime + drawTime) + "ms ("
    + int(frameRate) + " FPS )    ideal:17ms (60FPS)", 10, 30);

  //videoExport.saveFrame();
}
