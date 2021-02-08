import com.hamoid.*;

Grid g;

int gridSize = 250;
int cellSize = 3;

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

  // g.q[gridSize/2][gridSize/2] = 1;
  // videoExport = new VideoExport(this, "hello.mp4");
  // videoExport.startMovie();
}

int frameNum = 0;
long stepTime = 0;
long drawTime = 0;




float S(float i, float x) {
  return (abs(x - i)<1.0) ? (1-abs(x - i)) : 0;
}

float particleX = gridSize/2;
float particleY = gridSize/2;

float particleXVel = 0;
float particleYVel = 0;

float particleXAcc = 0;
float particleYAcc = 0;

float q = 50;

void draw() {

  stepTime = -millis();

  

  for (int i = 0; i < 3; i++) {
    
    int particleXVelSign = (int)((mouseX - particleX*cellSize)/abs(mouseX - particleX*cellSize));
    int particleYVelSign = (int)((mouseY - particleY*cellSize)/abs(mouseY - particleY*cellSize));
    
    particleXVel = particleXVelSign*0.3/(1+exp(-0.05*abs(mouseX - particleX*cellSize) + 3));
    particleYVel = particleYVelSign*0.3/(1+exp(-0.05*abs(mouseY - particleY*cellSize) + 3));
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
  }
  stepTime += millis();

  // println(particleX + "," + particleY);

  drawTime = -millis();


  background(40);
  loadPixels();

  for (int xpix = 0; xpix < ((gridSize)-1)*cellSize; xpix++) {
    for (int ypix = 0; ypix < ((gridSize)-1)*cellSize; ypix++) {

      int x = xpix/cellSize;
      int y = ypix/cellSize;

      float E = 100*sqrt(g.Ex[x][y]*g.Ex[x][y] + g.Ey[x][y]*g.Ey[x][y]);
      float H = 100*abs(g.Hz[x][y]);
      pixels[xpix + gridSize*cellSize*ypix] = color(E, H, 0);
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
