class Grid {

  float Hz[][];
  float Ex[][];
  float Ey[][];
  float q[][];
  float Jx[][];
  float Jy[][];
  float divEminusQ[][];

  int SizeX;
  int SizeY;

  float Cdtds = 0.7;

  Grid(int x, int y) {
    SizeX = x;
    SizeY = y;

    Hz   = new float[x-1][y-1];
    Ex   = new float[x-1][y];
    Ey   = new float[x][y-1];
    q    = new float[x][y];
    divEminusQ = new float[x][y];
    Jx   = new float[x-1][y];
    Jy   = new float[x][y-1];
    
    EyLeftArray = new float[(SizeY - 1) * 6];
    
  }

  void updateH() {
    int x, y;
    for (x = 0; x < SizeX - 1; x++)
      for (y = 0; y < SizeY - 1; y++)
        Hz[x][y] =  Hz[x][y] + Cdtds*(Ex[x][y+1] - Ex[x][y] - Ey[x+1][y] + Ey[x][y]);
  }

  void updateE() {
    int x, y;
    for (x = 0; x < SizeX - 1; x++)
      for (y = 1; y < SizeY - 1; y++)
        Ex[x][y] = Ex[x][y] + Cdtds*(Hz[x][y] - Hz[x][y-1]) - Jx[x][y];
    for (x = 1; x < SizeX - 1; x++)
      for (y = 0; y < SizeY - 1; y++)
        Ey[x][y] = Ey[x][y] - Cdtds*(Hz[x][y] - Hz[x-1][y]) - Jy[x][y];
  }

  void applyGauss() {
    int x, y;

    float d = 0.1;


    for (x = 1; x < SizeX - 1; x++)
      for (y = 1; y < SizeY - 1; y++)
        divEminusQ[x][y] = d*(Ex[x][y] + Ey[x][y] - Ex[x-1][y] - Ey[x][y-1] - q[x][y]);

    for (x = 0; x < SizeX - 2; x++)
      for (y = 0; y < SizeY - 2; y++) {
        Ex[x][y] += (divEminusQ[x+1][y] - divEminusQ[x][y]);
        Ey[x][y] += (divEminusQ[x][y+1] - divEminusQ[x][y]);
      }
  }


  float EyLeftArray[];

  float EyLeft(int N, int Q, int M) {
    return EyLeftArray[(N) * 6 + (Q) * 3 + (M)];
  }

  void SetEyLeft(int N, int Q, int M, float val) {
    EyLeftArray[(N) * 6 + (Q) * 3 + (M)] = val;
  } 

  void abc() {

    float temp1  = Cdtds;
    float temp2 = 1.0 / temp1 + 2.0 + temp1;
    float coef0 = -(1.0 / temp1 - 2.0 + temp1) / temp2;
    float coef1 = -2.0 * (temp1 - 1.0 / temp1) / temp2;
    float coef2 = 4.0 * (temp1 + 1.0 / temp1) / temp2;

    int mm, nn;


    //left
    for (nn = 0; nn < SizeY - 1; nn++) {
      Ey[0][nn] = coef0 * (Ey[2][nn] + EyLeft(0, 1, nn))
        + coef1 * (EyLeft(0, 0, nn) + EyLeft(2, 0, nn)
        - Ey[1][nn] - EyLeft(1, 1, nn))
        + coef2 * EyLeft(1, 0, nn) - EyLeft(2, 1, nn);

      for (mm = 0; mm < 3; mm++) {
        SetEyLeft(mm, 1, nn, EyLeft(mm, 0, nn));
        SetEyLeft(mm, 0, nn, Ey[mm][nn]);
      }
    }
  }
  void step() {
    updateH();   
    //tfsfUpdate(g);
    updateE();
    //abc();

    for (int i = 0; i < 20; i++)
      applyGauss();
  }
};
