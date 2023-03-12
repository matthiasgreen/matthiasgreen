// Size of canvas. These get updated to fill the whole browser.
let width = 150;
let height = 150;

const startTime = Date.now();
const numPrey = 150;
const numPreds = 5;
const margin = 200;
const DRAW_TRAIL = true;

var preds = [];
var preys = [];
var foods = [];

// Helper functions

// Adjusts value of b so that the difference between a and b is smaller than c
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

// 2D vector object that comes with a few handy methods
class Vector2 { 
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Vector2(this.x, this.y);
  }

  add(other) {
    this.x += other.x;
    this.y += other.y;
  }

  subtract(other) {
    this.x -= other.x;
    this.y -= other.y;
  }

  multiply(scalar) {
    this.x *= scalar;
    this.y *= scalar;
  }
  
  divide(scalar) {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    } else {
      this.x = 0;
      this.y = 0;
    }
  }

  get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const mag = this.magnitude;
    if (mag !== 0) {
      this.x /= mag;
      this.y /= mag;
    }
  }

  get angle() {
    return Math.atan2(this.y, this.x);
  }

  distance(other) {
    return Math.sqrt(
      (this.x - other.x) ** 2 +
      (this.y - other.y) ** 2,
    );
  }

}

class Food {
  constructor(x, y) {
    this.pos = new Vector2(x, y);
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'green';
    ctx.fill();
  }
}

class Boid {
  constructor() {
    this.pos = new Vector2(Math.random() * width-margin, Math.random() * height-margin);
    this.speed = new Vector2(Math.random() * 10 - 5, Math.random() * 10 - 5);
    this.prevspeed = this.speed.clone();
    this.speedLimit = 10;
    this.turnLimit = 1;
    this.history = [];
  }

  // Constrain a boid to within the window. If it gets too close to an edge,
  // nudge it back in and reverse its direction.
  keepWithinBounds() {
    const margin = 100;
    const turnFactor = 1.5;

    if (this.pos.x < margin) {
      this.speed.x += turnFactor;
    }
    if (this.pos.x > width - margin) {
      this.speed.x -= turnFactor
    }
    if (this.pos.y < margin) {
      this.speed.y += turnFactor;
    }
    if (this.pos.y > height - margin) {
      this.speed.y -= turnFactor;
    }
  }

  addNoise() {
    const noiseFactor = 0.3;
    this.speed.x += (Math.random()-0.5) * noiseFactor;
    this.speed.y += (Math.random()-0.5) * noiseFactor;
  }

  // Move away from other boids of same type that are too close to avoid colliding
  avoidOthers() {
    let moveX = 0;
    let moveY = 0;
    let list = [];
    let minDistance=0;
    let avoidFactor=0;

    // Probably not the best way of doing this
    if (this instanceof Prey){
      list = preys;
      minDistance=20;
      avoidFactor=0.05;
    } else {
      list = preds;
      minDistance=100;
      avoidFactor=0.05;
    }

    for (let otherBoid of list) {
      if (otherBoid !== this && this.distance(otherBoid) < minDistance) {
        moveX += this.pos.x - otherBoid.pos.x;
        moveY += this.pos.y - otherBoid.pos.y;
      }
    }

    this.speed.x += moveX * avoidFactor;
    this.speed.y += moveY * avoidFactor;
  }

  // Speed is constant in this simulation (makes limiting turning and other stuff simpler)
  setSpeed() {
    const speed = this.speed.magnitude;
    this.speed.x = (this.speed.x / speed) * this.speedLimit;
    this.speed.y = (this.speed.y / speed) * this.speedLimit;
  }

  //probably not correct, to be redone
  limitTurning() {
    this.speed.x = adjustValue(this.prevspeed.x, this.speed.x, this.turnLimit)
    this.speed.y = adjustValue(this.prevspeed.y, this.speed.y, this.turnLimit)
  }

  updatePosition() {
    this.pos.x += this.speed.x;
    this.pos.y += this.speed.y;
    this.history.push([this.pos.x, this.pos.y])
    this.history = this.history.slice(-50);
  }

  distance(other) {
    return this.pos.distance(other.pos);
  }

}

class Prey extends Boid {
  constructor() {
    super();
    this.speedLimit = 7;
    this.turnLimit = 1;
  }

  fleePredator() {
    const fleeFactor = 0.03;
    const fleeRadius = 100;
    let moveX = 0;
    let moveY = 0;
    for (let pred of preds) {
      if (this.distance(pred)<fleeRadius) {
        moveX += this.pos.x - pred.pos.x;
        moveY += this.pos.y - pred.pos.y;
      }
    }
    this.speed.x += moveX * fleeFactor;
    this.speed.y += moveY * fleeFactor;
  }

  matchOrientation() {
    const matchFactor = 0.3
    const radius = 100
    let dxSum = 0
    let dySum = 0
    let totalBoids = 0
    for (let otherBoid of preys) {
      if (otherBoid !== this && this.distance(otherBoid)<radius) {
        dxSum += otherBoid.speed.x
        dySum += otherBoid.speed.y
        totalBoids += 1
      }
    }
    if (totalBoids) {
      let dxAvg = dxSum/totalBoids
      let dyAvg = dySum/totalBoids
      this.speed.x += (dxAvg-this.speed.x)*matchFactor
      this.speed.y += (dyAvg-this.speed.y)*matchFactor
    }
  }

  searchFood() {
    const searchRange = 200;
    const searchFactor = 0.01;
    let closestFood = null;
    let closestDist = searchRange;
    for (let food of foods) {
      let dist = this.distance(food);
      if (dist < closestDist) {
        closestFood = food;
        closestDist = dist;
      }
    }
    //move towards food
    if (closestFood) {
      this.speed.x += (closestFood.pos.x - this.pos.x) * searchFactor;
      this.speed.y += (closestFood.pos.y - this.pos.y) * searchFactor;
    }
  }

  eat() {
    const eatDistance = 10;
    var oldFoodCount = foods.length;
    var a = this;
    foods = foods.filter(function(food) {
      return (a.distance(food) > eatDistance);
    });
    for (var i = 0; i<oldFoodCount-foods.length; i += 1) {
      //spawn new prey
      preys[preys.length] = new Prey();
      preys[preys.length-1].pos.x = this.pos.x;
      preys[preys.length-1].pos.y = this.pos.y;
      preys[preys.length-1].speed.x = this.speed.x;
      preys[preys.length-1].speed.y = this.speed.y;
      preys[preys.length-1].prevspeed.x = this.prevspeed.x;
      preys[preys.length-1].prevspeed.y = this.prevspeed.y;
    }
  }

  draw(ctx) {
    const angle = this.speed.angle;
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(angle);
    ctx.translate(-this.pos.x, -this.pos.y);
    ctx.fillStyle = "#558cf4";
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x - 15, this.pos.y + 5);
    ctx.lineTo(this.pos.x - 15, this.pos.y - 5);
    ctx.lineTo(this.pos.x, this.pos.y);
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  
    if (DRAW_TRAIL) {
      ctx.strokeStyle = "#558cf466";
      ctx.beginPath();
      ctx.moveTo(this.history[0][0], this.history[0][1]);
      for (const point of this.history) {
        ctx.lineTo(point[0], point[1]);
      }
      ctx.stroke();
    }
  }

  move() {
    this.prevspeed.x = this.speed.x;
    this.prevspeed.y = this.speed.y;
    this.addNoise();
    this.matchOrientation();
    this.avoidOthers();
    this.fleePredator();
    this.keepWithinBounds();
    this.searchFood();
    this.limitTurning();
    this.setSpeed();
    this.eat();
  }

}

class Pred extends Boid {
  constructor() {
    super();
    this.speedLimit = 5;
    this.turnLimit = 0.3;
  }

  hunt() {
    const centeringFactor = 0.1; // adjust velocity by this %
    const range = 200;
  
    let centerX = 0;
    let centerY = 0;
    let numNeighbors = 0;
  
    for (let prey of preys) {
      if (this.distance(prey) < range) {
        centerX += prey.pos.x;
        centerY += prey.pos.y;
        numNeighbors += 1;
      }
    }
  
    if (numNeighbors) {
      centerX = centerX / numNeighbors;
      centerY = centerY / numNeighbors;
  
      this.speed.x += (centerX - this.pos.x) * centeringFactor;
      this.speed.y += (centerY - this.pos.y) * centeringFactor;
    }
  }

  eat() {
    const eatThreshold = 10
    let a = this;
    preys = preys.filter(function(prey) {
      return (a.distance(prey) > eatThreshold);
    });
    
  }

  draw(ctx) {
    const angle = this.speed.angle;
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(angle);
    ctx.translate(-this.pos.x, -this.pos.y);
    ctx.fillStyle = "#f49755";
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x - 20, this.pos.y + 7.5);
    ctx.lineTo(this.pos.x - 20, this.pos.y - 7.5);
    ctx.lineTo(this.pos.x, this.pos.y);
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  
    if (DRAW_TRAIL) {
      ctx.strokeStyle = "#558cf466";
      ctx.beginPath();
      ctx.moveTo(this.history[0][0], this.history[0][1]);
      for (const point of this.history) {
        ctx.lineTo(point[0], point[1]);
      }
      ctx.stroke();
    }
  }

  move() {
    this.prevspeed.x = this.speed.x;
    this.prevspeed.y = this.speed.y;
    this.addNoise();
    this.hunt();
    this.avoidOthers();
    this.keepWithinBounds();
    this.limitTurning();
    this.eat();
    this.setSpeed();
  }

}

function initBoids() {
  for (var i = 0; i < numPrey; i += 1) {
    preys[preys.length] = new Prey();
  }
  for (var i = 0; i < numPreds; i += 1) {
    preds[preds.length] = new Pred();
  }
}

// draw the counter
function drawPreyCount(ctx) {
  ctx.font = "20px Arial";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Prey remaining: " + preys.length, 10, 30);

  // draw the timer
  var currentTime = Date.now();
  var elapsedTime = currentTime - startTime;
  var seconds = Math.floor(elapsedTime / 1000);
  var minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  ctx.fillText("Time: " + minutes + ":" + (seconds < 10 ? "0" : "") + seconds, 10, 60);
}

// Main animation loop
function animationLoop() {
  // Update each boid
  for (let prey of preys) {
    // Update the velocities according to each rule
    prey.move();

    // Update the position based on the current velocity
    prey.updatePosition();
  }
  for (let pred of preds) {
    // Update the velocities according to each rule
    pred.move();

    // Update the position based on the current velocity
    pred.updatePosition();
  }

  // Clear the canvas and redraw all the boids in their current positions
  const ctx = document.getElementById("boids").getContext("2d");
  ctx.clearRect(0, 0, width, height);

  drawPreyCount(ctx);
  for (let prey of preys) {
    prey.draw(ctx);
  }
  for (let pred of preds) {
    pred.draw(ctx);
  }
  for (let food of foods) {
    food.draw(ctx);
  }

  // Schedule the next frame
  window.requestAnimationFrame(animationLoop);
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

window.onload = () => {
  // Make sure the canvas always fills the whole window
  window.addEventListener("resize", sizeCanvas, false);
  sizeCanvas();

  // Randomly distribute the boids to start
  initBoids();

  // Schedule the main animation loop
  window.requestAnimationFrame(animationLoop);
};