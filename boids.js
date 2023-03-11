// Size of canvas. These get updated to fill the whole browser.
let width = 150;
let height = 150;

const numBoids = 400;
const numPreds = 5;
const visualRange = 75;

var boids = [];
var preds = [];
var startTime = Date.now();

function initBoids() {
  const margin = 200;
  for (var i = 0; i < numBoids; i += 1) {
    boids[boids.length] = {
      x: Math.random() * width-margin,
      y: Math.random() * height-margin,
      dx: Math.random() * 10 - 5,
      dy: Math.random() * 10 - 5,
      history: [],
    };
  }
}

function initPreds() {
  const margin = 200;
  for (var i = 0; i < numPreds; i += 1) {
    preds[preds.length] = {
      x: Math.random() * width-margin,
      y: Math.random() * height-margin,
      dx: Math.random() * 10 - 5,
      dy: Math.random() * 10 - 5,
      prevdx: self.dx,
      prevdy: self.dy,
      history: [],
    };
  }
}

function distance(boid1, boid2) {
  return Math.sqrt(
    (boid1.x - boid2.x) * (boid1.x - boid2.x) +
      (boid1.y - boid2.y) * (boid1.y - boid2.y),
  );
}

// Called initially and whenever the window resizes to update the canvas
// size and width/height variables.
function sizeCanvas() {
  const canvas = document.getElementById("boids");
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

// Constrain a boid to within the window. If it gets too close to an edge,
// nudge it back in and reverse its direction.
function keepWithinBounds(boid) {
  const margin = 100;
  const turnFactor = 1.5;

  if (boid.x < margin) {
    boid.dx += turnFactor;
  }
  if (boid.x > width - margin) {
    boid.dx -= turnFactor
  }
  if (boid.y < margin) {
    boid.dy += turnFactor;
  }
  if (boid.y > height - margin) {
    boid.dy -= turnFactor;
  }
}

function addNoise(boid) {
  const noiseFactor = 0.3;
  boid.dx += (Math.random()-0.5) * noiseFactor;
  boid.dy += (Math.random()-0.5) * noiseFactor;
}

function hunt(pred) {
  const centeringFactor = 0.1; // adjust velocity by this %
  const range = 200

  let centerX = 0;
  let centerY = 0;
  let numNeighbors = 0;

  for (let boid of boids) {
    if (distance(pred, boid) < range) {
      centerX += boid.x;
      centerY += boid.y;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    centerX = centerX / numNeighbors;
    centerY = centerY / numNeighbors;

    pred.dx += (centerX - pred.x) * centeringFactor;
    pred.dy += (centerY - pred.y) * centeringFactor;
  }
}

function fleePredator(boid) {
  const fleeFactor = 0.03;
  const fleeRadius = 100;
  let moveX = 0;
  let moveY = 0;
  for (let pred of preds) {
    if (distance(boid, pred)<fleeRadius) {
      moveX += boid.x - pred.x;
      moveY += boid.y - pred.y;
    }
  }
  boid.dx += moveX * fleeFactor;
  boid.dy += moveY * fleeFactor;
}

function matchOrientation(boid) {
  const matchFactor = 0.3
  const radius = 100
  dxSum = 0
  dySum = 0
  totalBoids = 0
  for (let otherBoid of boids) {
    if (otherBoid !== boid && distance(boid, otherBoid)<radius) {
      dxSum += otherBoid.dx
      dySum += otherBoid.dy
      totalBoids += 1
    }
  }
  if (totalBoids) {
    dxAvg = dxSum/totalBoids
    dyAvg = dySum/totalBoids
    boid.dx += (dxAvg-boid.dx)*matchFactor
    boid.dy += (dyAvg-boid.dy)*matchFactor
  }
}

// Move away from other boids that are too close to avoid colliding
function avoidOthers(boid, list=boids, minDistance=20, avoidFactor=0.05) {
  let moveX = 0;
  let moveY = 0;
  for (let otherBoid of list) {
    if (otherBoid !== boid) {
      if (distance(boid, otherBoid) < minDistance) {
        moveX += boid.x - otherBoid.x;
        moveY += boid.y - otherBoid.y;
      }
    }
  }

  boid.dx += moveX * avoidFactor;
  boid.dy += moveY * avoidFactor;
}

// Speed will naturally vary in flocking behavior, but real animals can't go
// arbitrarily fast.
function setSpeed(boid, speedLimit=7) {

  const speed = Math.sqrt(boid.dx * boid.dx + boid.dy * boid.dy);
  boid.dx = (boid.dx / speed) * speedLimit;
  boid.dy = (boid.dy / speed) * speedLimit;
}

function adjustValue(a, b, c) {
  if (Math.abs(a - b) > c) {
    if (a > b) {
      b = a - c;
    } else {
      b = a + c;
    }
  }
  return b;
}

function limitTurning(boid, turnLimit=0.2) {
  boid.dx = adjustValue(boid.prevdx, boid.dx, turnLimit)
  boid.dy = adjustValue(boid.prevdy, boid.dy, turnLimit)
}

function eat(pred, threshold=10) {
  boids = boids.filter(function(boid) {
    return distance(boid, pred) > threshold;
  });
}

// draw the counter
function drawBoidCount(ctx) {
  ctx.font = "20px Arial";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Boids: " + boids.length, 10, 30);

  // draw the timer
  var currentTime = Date.now();
  var elapsedTime = currentTime - startTime;
  var seconds = Math.floor(elapsedTime / 1000);
  var minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  ctx.fillText("Time: " + minutes + ":" + (seconds < 10 ? "0" : "") + seconds, 10, 60);
}


const DRAW_TRAIL = true;

function drawBoid(ctx, boid) {
  const angle = Math.atan2(boid.dy, boid.dx);
  ctx.translate(boid.x, boid.y);
  ctx.rotate(angle);
  ctx.translate(-boid.x, -boid.y);
  ctx.fillStyle = "#558cf4";
  ctx.beginPath();
  ctx.moveTo(boid.x, boid.y);
  ctx.lineTo(boid.x - 15, boid.y + 5);
  ctx.lineTo(boid.x - 15, boid.y - 5);
  ctx.lineTo(boid.x, boid.y);
  ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (DRAW_TRAIL) {
    ctx.strokeStyle = "#558cf466";
    ctx.beginPath();
    ctx.moveTo(boid.history[0][0], boid.history[0][1]);
    for (const point of boid.history) {
      ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();
  }
}

function drawPred(ctx, pred) {
  const angle = Math.atan2(pred.dy, pred.dx);
  ctx.translate(pred.x, pred.y);
  ctx.rotate(angle);
  ctx.translate(-pred.x, -pred.y);
  ctx.fillStyle = "#f49755";
  ctx.beginPath();
  ctx.moveTo(pred.x, pred.y);
  ctx.lineTo(pred.x - 20, pred.y + 7.5);
  ctx.lineTo(pred.x - 20, pred.y - 7.5);
  ctx.lineTo(pred.x, pred.y);
  ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (DRAW_TRAIL) {
    ctx.strokeStyle = "#558cf466";
    ctx.beginPath();
    ctx.moveTo(pred.history[0][0], pred.history[0][1]);
    for (const point of pred.history) {
      ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();
  }
}

// Main animation loop
function animationLoop() {
  // Update each boid
  for (let boid of boids) {
    // Update the velocities according to each rule

    addNoise(boid);
    matchOrientation(boid);
    avoidOthers(boid);
    fleePredator(boid);
    keepWithinBounds(boid);
    setSpeed(boid);

    // Update the position based on the current velocity
    boid.x += boid.dx;
    boid.y += boid.dy;
    boid.history.push([boid.x, boid.y])
    boid.history = boid.history.slice(-50);
  }

  for (let pred of preds) {
    // Update the velocities according to each rule
    pred.prevdx = pred.dx;
    pred.prevdy = pred.dy;
    addNoise(pred);
    hunt(pred);
    avoidOthers(pred, preds, 100, 0.05);
    keepWithinBounds(pred);
    limitTurning(pred);
    eat(pred);
    setSpeed(pred, 5);

    // Update the position based on the current velocity
    pred.x += pred.dx;
    pred.y += pred.dy;
    pred.history.push([pred.x, pred.y])
    pred.history = pred.history.slice(-50);
  }

  // Clear the canvas and redraw all the boids in their current positions
  const ctx = document.getElementById("boids").getContext("2d");
  ctx.clearRect(0, 0, width, height);
  for (let boid of boids) {
    drawBoid(ctx, boid);
    drawBoidCount(ctx);
  }
  for (let pred of preds) {
    drawPred(ctx, pred);
  }

  // Schedule the next frame
  window.requestAnimationFrame(animationLoop);
}

window.onload = () => {
  // Make sure the canvas always fills the whole window
  window.addEventListener("resize", sizeCanvas, false);
  sizeCanvas();

  // Randomly distribute the boids to start
  initBoids();
  initPreds();

  // Schedule the main animation loop
  window.requestAnimationFrame(animationLoop);
};