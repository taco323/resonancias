// --- VARIABLES DE LA FIGURA ORGÁNICA ---
let nodes = 3;
let nodeStartX = [], nodeStartY = [], nodeX = [], nodeY = [], angle = [], frequency = [];
let centerX, centerY, accelX = 0, accelY = 0, deltaX = 0, deltaY = 0;
let springing = 0.0009, damping = 0.98, organicConstant = 1.0, rotAngle = 0, radius = 120;

// --- VARIABLES DE BOIDS ---
let flock;

function setup() {
  let canvas = createCanvas(windowWidth, 525);
  canvas.parent('canvas-container'); // <-- Agregado para que el canvas esté en el contenedor
  colorMode(RGB);
  angleMode(DEGREES);

  centerX = width / 2;
  centerY = height / 2;

  for (let i = 0; i < nodes; i++) {
    nodeStartX[i] = nodeStartY[i] = nodeX[i] = nodeY[i] = angle[i] = 0;
    frequency[i] = random(5, 12);
  }

  flock = new Flock();
  for (let i = 0; i < 100; i++) {
    flock.addBoid(new Boid(random(width), random(height)));
  }

  document.body.style.margin = 0;
}

function draw() {
  background(137, 151, 196, 20); // fondo lavanda claro
  drawShape();
  moveShape();
  flock.run();
}

function mouseDragged() {
  flock.addBoid(new Boid(mouseX, mouseY));
}

function drawShape() {
  rotAngle = 0;
  for (let i = 0; i < nodes; i++) {
    nodeStartX[i] = centerX + cos(rotAngle) * radius;
    nodeStartY[i] = centerY + sin(rotAngle) * radius;
    rotAngle += 360.0 / nodes;
  }

  curveTightness(organicConstant);
  let shapeColor = lerpColor(color(200, 40, 90), color(240, 40, 100), organicConstant);
  fill(shapeColor);
  noStroke();

  beginShape();
  for (let i = 0; i < nodes; i++) {
    curveVertex(nodeX[i], nodeY[i]);
  }
  endShape(CLOSE);
}

function moveShape() {
  deltaX = mouseX - centerX;
  deltaY = mouseY - centerY;
  deltaX *= springing;
  deltaY *= springing;
  accelX += deltaX;
  accelY += deltaY;
  centerX += accelX;
  centerY += accelY;
  accelX *= damping;
  accelY *= damping;
  organicConstant = 1 - (abs(accelX) + abs(accelY)) * 0.1;

  for (let i = 0; i < nodes; i++) {
    nodeX[i] = nodeStartX[i] + sin(angle[i]) * (accelX * 2);
    nodeY[i] = nodeStartY[i] + sin(angle[i]) * (accelY * 2);
    angle[i] += frequency[i];
  }
}

// --- CLASES DE BOIDS ---
class Flock {
  constructor() {
    this.boids = [];
  }
  run() {
    for (let boid of this.boids) {
      boid.run(this.boids);
    }
  }
  addBoid(b) {
    this.boids.push(b);
  }
}

class Boid {
  constructor(x, y) {
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.position = createVector(x, y);
    this.size = 3.0;
    this.maxSpeed = 3;
    this.maxForce = 0.05;
    this.color = color(210 + random(-10, 10), 30, 90); // tonos suaves lavanda
  }

  run(boids) {
    this.flock(boids);
    this.update();
    this.borders();
    this.render();
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  flock(boids) {
    let separation = this.separate(boids);
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);

    separation.mult(1.5);
    alignment.mult(1.0);
    cohesion.mult(1.0);

    this.applyForce(separation);
    this.applyForce(alignment);
    this.applyForce(cohesion);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.position);
    desired.normalize();
    desired.mult(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
  }

  render() {
    let theta = this.velocity.heading() + radians(90);
    fill(this.color);
    stroke(255);
    push();
    translate(this.position.x, this.position.y);
    rotate(theta);
    beginShape();
    vertex(0, -this.size * 2);
    vertex(-this.size, this.size * 2);
    vertex(this.size, this.size * 2);
    endShape(CLOSE);
    pop();
  }

  borders() {
    if (this.position.x < -this.size) this.position.x = width + this.size;
    if (this.position.y < -this.size) this.position.y = height + this.size;
    if (this.position.x > width + this.size) this.position.x = -this.size;
    if (this.position.y > height + this.size) this.position.y = -this.size;
  }

  separate(boids) {
    let desiredSeparation = 25.0;
    let steer = createVector(0, 0);
    let count = 0;
    for (let boid of boids) {
      let d = p5.Vector.dist(this.position, boid.position);
      if (d > 0 && d < desiredSeparation) {
        let diff = p5.Vector.sub(this.position, boid.position);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) {
      steer.div(count);
      steer.normalize();
      steer.mult(this.maxSpeed);
      steer.sub(this.velocity);
      steer.limit(this.maxForce);
    }
    return steer;
  }

  align(boids) {
    let neighborDist = 50;
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxSpeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxForce);
      return steer;
    }
    return createVector(0, 0);
  }

  cohesion(boids) {
    let neighborDist = 50;
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.position);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      return this.seek(sum);
    }
    return createVector(0, 0);
  }
}
