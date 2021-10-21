var canvas;
var gl;

var program;

var near = 1;
var far = 100;

// Size of the viewport in viewing coordinates
var left = -6.0;
var right = 6.0;
var ytop = 6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0);
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0);

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(0.4, 0.4, 0.4, 1.0);
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

var bubbles = [];
var bubblesBurst = [];
var burstTime = TIME + 2;

function setColor(c) {
  ambientProduct = mult(lightAmbient, c);
  diffuseProduct = mult(lightDiffuse, c);
  specularProduct = mult(lightSpecular, materialSpecular);

  gl.uniform4fv(gl.getUniformLocation(program,
    "ambientProduct"), flatten(ambientProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "diffuseProduct"), flatten(diffuseProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "specularProduct"), flatten(specularProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "lightPosition"), flatten(lightPosition));
  gl.uniform1f(gl.getUniformLocation(program,
    "shininess"), materialShininess);
}

window.onload = function init() {

  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.5, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);


  setColor(materialDiffuse);

  Cube.init(program);
  Cylinder.init(9, program);
  Cone.init(9, program);
  Sphere.init(36, program);


  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");


  gl.uniform4fv(gl.getUniformLocation(program,
    "ambientProduct"), flatten(ambientProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "diffuseProduct"), flatten(diffuseProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "specularProduct"), flatten(specularProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "lightPosition"), flatten(lightPosition));
  gl.uniform1f(gl.getUniformLocation(program,
    "shininess"), materialShininess);


  document.getElementById("animToggleButton").onclick = function() {
    if (animFlag) {
      animFlag = false;
    } else {
      animFlag = true;
      resetTimerFlag = true;
      window.requestAnimFrame(render);
    }
    console.log(animFlag);

    controller = new CameraController(canvas);
    controller.onchange = function(xRot, yRot) {
      RX = xRot;
      RY = yRot;
      window.requestAnimFrame(render);
    };
  };

  render();
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
  modelViewMatrix = mult(viewMatrix, modelMatrix);
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  normalMatrix = inverseTranspose(modelViewMatrix);
  gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix));
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  setMV();

}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
function drawCube() {
  setMV();
  Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
function drawSphere() {
  setMV();
  Sphere.draw();
}
// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
function drawCylinder() {
  setMV();
  Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
function drawCone() {
  setMV();
  Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x, y, z) {
  modelMatrix = mult(modelMatrix, translate([x, y, z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta, x, y, z) {
  modelMatrix = mult(modelMatrix, rotate(theta, [x, y, z]));
}

// Post multiples the modeling  matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx, sy, sz) {
  modelMatrix = mult(modelMatrix, scale(sx, sy, sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
  modelMatrix = MS.pop();
}

// pushes the current modeling Matrix in the stack MS
function gPush() {
  MS.push(modelMatrix);
}

// puts the given matrix at the top of the stack MS
function gPut(m) {
  MS.push(m);
}

function render() {

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  eye = vec3(0, 0, 10);
  MS = []; // Initialize modeling matrix stack

  // initialize the modeling matrix to identity
  modelMatrix = mat4();

  // set the camera matrix
  viewMatrix = lookAt(eye, at, up);

  // set the projection matrix
  projectionMatrix = ortho(left, right, bottom, ytop, near, far);

  // Rotations from the sliders
  gRotate(RZ, 0, 0, 1);
  gRotate(RY, 0, 1, 0);
  gRotate(RX, 1, 0, 0);


  // set all the matrices
  setAllMatrices();

  var curTime;
  if (animFlag) {
    curTime = (new Date()).getTime() / 1000;
    if (resetTimerFlag) {
      prevTime = curTime;
      resetTimerFlag = false;
    }
    TIME = TIME + curTime - prevTime;
    prevTime = curTime;
  }

  // Start from Origin
  gTranslate(0, 0, 0);

  // Ground box
  gPush(); {
    gTranslate(0, -5, 0);
    setColor(vec4(0.0, 0.0, 0.0, 0.0));
    gScale(6, 1, 6)
    drawCube();
  }
  gPop();

  // 2 rocks (1 big, 1 small)
  gPush(); {
    gTranslate(0, -3, 0);
    setColor(vec4(0.5, 0.5, 0.5, 0.0));
    drawSphere();
    gPush(); {
      gTranslate(-1.5, -0.5, 0);
      gScale(0.5, 0.5, 0.5)
      drawSphere();
    }
    gPop();

    // Create and move fish
    fish();
  }
  gPop();

  // seaweed 1
  gPush(); {
    gTranslate(0, -1.6, 0);
    gPush(); {
      gScale(0.2, 0.4, 0.4);
      setColor(vec4(0.0, 1.0, 0.0, 0.0));
      drawSphere();
    }
    gPop();
    for (var i = 0; i < 9; i++) {
      gTranslate(0, 0.775, 0);
      gRotate(0.35 * 120 * Math.cos(TIME + i) / 3.14159, 0, 0, 1);
      gPush(); {
        gScale(0.2, 0.4, 0.4);
        setColor(vec4(0.0, 1.0, 0.0, 0.0));
        drawSphere();
      }
      gPop();
    }
  }
  gPop();

  // seaweed 2
  gPush(); {
    gTranslate(-1.1, -2.8, 0);
    gPush(); {
      gScale(0.2, 0.4, 0.4);
      setColor(vec4(0.0, 1.0, 0.0, 0.0));
      drawSphere();
    }
    gPop();
    for (var i = 0; i < 9; i++) {
      gTranslate(0, 0.775, 0);
      gRotate(0.35 * 120 * Math.cos(TIME + i) / 3.14159, 0, 0, 1);
      gPush(); {
        gScale(0.2, 0.4, 0.4);
        setColor(vec4(0.0, 1.0, 0.0, 0.0));
        drawSphere();
      }
      gPop();
    }
  }
  gPop();

  // seaweed 3
  gPush(); {
    gTranslate(1.1, -2.8, 0);
    gPush(); {
      gScale(0.2, 0.4, 0.4);
      setColor(vec4(0.0, 1.0, 0.0, 0.0));
      drawSphere();
    }
    gPop();
    for (var i = 0; i < 9; i++) {
      gTranslate(0, 0.775, 0);
      gRotate(0.35 * 120 * Math.cos(TIME + i) / 3.14159, 0, 0, 1);
      gPush(); {
        gScale(0.2, 0.4, 0.4);
        setColor(vec4(0.0, 1.0, 0.0, 0.0));
        drawSphere();
      }
      gPop();
    }
  }
  gPop();

  humanCharacter();

  if (animFlag)
    window.requestAnimFrame(render);
}

// Make and move the Human Character
function humanCharacter() {
  // Human Character
  gPush(); {

    // X and Y movement of character
    gTranslate(4.0 + 0.5 * Math.cos(0.5 * TIME), 3.0 * 1.25 + 0.5 * Math.cos(0.5 * TIME), 0);
    // Rotate whole character
    gRotate(-45 / 3.14159, 0, 1, 0.);

    // Head
    gPush(); {
      gScale(0.5, 0.5, 0.5);
      setColor(vec4(0.5, 0.0, 0.5, 0.0));
      drawSphere();
    }
    gPop();

    var createBubbles = false;

    gPush(); {
      gTranslate(0, 0, 1);
      // Bubbles
      var numBubblesCreate = (Math.floor(Math.random() * (5 - 4 + 1) + 4))
      var bubbleDelay = 1;
      for (var i = 0; i < 3; i++) {
        if (bubbles.length < 3 && Math.floor(TIME) != 0 && animFlag == true) {
          bubbles[i] = [0, 0, 0, Math.floor(TIME) + i * 4, numBubblesCreate, Math.floor(TIME) + i * 1]; // Every 4 seconds new bubble
          console.log(bubbles[i])
        } else if (bubbles.length != 0 && Math.floor(TIME) == bubbles[i][3] && Math.floor(TIME) != 0 && animFlag == true) {
          bubbles[i] = [0, 0, 0, Math.floor(TIME) + 12, numBubblesCreate, Math.floor(TIME) + 1]; // Every 12 seconds overwrite old bubble with new bubble
          console.log(bubbles[i])

        }
      }

      // Bubble Burst of 4-5
      for (var i = 0; i < bubbles.length; i++) {
        if (Math.floor(TIME) == bubbles[i][5] - 1 && Math.floor(TIME) != 0 && animFlag == true) {
          for (var j = 0; j < bubbles[i][4]; j++) {
            if (burstTime - TIME < 0) {
              bubblesBurst.push([bubbles[i][0], bubbles[i][1], bubbles[i][2]]);
              burstTime = TIME + 0.3;
            }
          }
        }
      }

      // Draw Bubbles
      if (bubbles.length != 0 && bubblesBurst.length != 0) {
        for (var j = 0; j < bubblesBurst.length; j++) {
          bubblesBurst[j][1] = bubblesBurst[j][1] + 0.015; // Move straight up with time
          drawBubbles(bubblesBurst[j][0], bubblesBurst[j][1], bubblesBurst[j][2]);
        }
      }

    }
    gPop();


    // Body
    gTranslate(0, -1.75, 0);
    gPush(); {
      gScale(0.75, 1.25, 0.75);
      setColor(vec4(0.5, 0.0, 0.5, 0.0));
      drawCube();
    }
    gPop();

    // Legs
    gPush(); {
      gTranslate(0, -1.85, 0);
      gPush(); {
        gTranslate(-0.25, 0, 0);
        // Left Leg kicking motion
        gRotate(90 * Math.cos(TIME) / 3.14159, 1, 0, 0);

        // Left top leg
        gPush(); {
          gRotate(45 / 3.14159, 1, 0, 0);
          gPush(); {
            gScale(0.15, 0.75, 0.15);
            setColor(vec4(0.5, 0.0, 0.5, 0.0));
            drawCube();
          }
          gPop();
        }
        gPop();

        // Left bottom leg
        gPush(); {
          gTranslate(0, -0.75, -0.90);
          gRotate(270 / 3.14159, 1, 0, 0);
          gRotate(20 * Math.cos(TIME) / 3.14159, 1, 0, 0);
          gPush(); {
            gScale(0.15, 0.75, 0.15);
            setColor(vec4(0.5, 0.0, 0.5, 0.0));
            drawCube();
          }
          gPop();
        }
        gPop();

        // Left foot
        gPush(); {
          gTranslate(0, -1.0, -1.65);
          gPush(); {
            gScale(0.15, 0.5, 0.05);
            setColor(vec4(0.5, 0.0, 0.5, 0.0));
            drawCube();
          }
          gPop();
        }
        gPop();
      }
      gPop();

      // Right leg
      gPush(); {
        gTranslate(0.25, 0, 0);
        // Right Leg kicking motion
        gRotate(-90 * Math.cos(TIME) / 3.14159, 1, 0, 0);
        // Right top leg
        gPush(); {
          gRotate(45 / 3.14159, 1, 0, 0);
          gPush(); {
            gScale(0.15, 0.75, 0.15);
            setColor(vec4(0.5, 0.0, 0.5, 0.0));
            drawCube();
          }
          gPop();
        }
        gPop();

        // Right bottom leg
        gPush(); {
          gTranslate(0, -0.75, -0.90)
          gRotate(270 / 3.14159, 1, 0, 0);
          gRotate(-20 * Math.cos(TIME) / 3.14159, 1, 0, 0);
          gPush(); {
            gScale(0.15, 0.75, 0.15);
            setColor(vec4(0.5, 0.0, 0.5, 0.0));
            drawCube();
          }
          gPop();
        }
        gPop();

        // Right foot
        gPush(); {
          gTranslate(0, -1.0, -1.65);
          gPush(); {
            gScale(0.15, 0.5, 0.05);
            setColor(vec4(0.5, 0.0, 0.5, 0.0));
            drawCube();
          }
          gPop();
        }
        gPop();
      }
      gPop();
    }
    gPop();
  }
  gPop();
}

// Draw bubbles at x, y, z coordinates
function drawBubbles(x, y, z) {
  gPush(); {
    gTranslate(x, y, z);
    gRotate((Math.cos(TIME) * 360) / 3.14159, 1, 1, 1); // Oscillate with time
    gScale(0.2, 0.2, 0.2);
    setColor(vec4(1.0, 1.0, 1.0, 1.0));
    drawSphere()
  }
  gPop();
}

// Draw and move fish
function fish() {
  // Fish
  gPush(); {
    // Fish Movement
    // Moves tangent to rocks
    gTranslate(-5 * Math.sin(TIME), 0.5 * Math.sin(TIME) + 0.5, 5 * Math.cos(TIME));
    gRotate(-120 * TIME / 3.14159 * 1.5, 0, 1, 0);
    // Body
    gPush(); {
      gTranslate(1, 0, 0);
      gRotate(90, 0, 1, 0);
      gScale(1, 0.75, 2.5);
      setColor(vec4(1, 0.0, 0.0, 0.0));
      drawCone();
    }
    gPop();
    // Head
    gPush(); {
      gTranslate(-0.5, 0, 0);
      gRotate(270, 0, 1, 0);
      gScale(1, 0.75, 0.5);
      setColor(vec4(0.82, 0.82, 0.82, 0.0));
      drawCone();
    }
    gPop();
    // Tail
    gPush(); {
      gTranslate(2.5, 0, 0);
      // Tail Movement
      gRotate(90 / 3.14159 * Math.cos(TIME * 5), 0, 1, 0);
      // Tail Bottom
      gPush(); {
        gTranslate(0, -0.25, 0);
        gRotate(90, 0, 1, 0);
        gRotate(45, 1, 0, 0);
        gScale(0.15, 0.15, 0.75);
        setColor(vec4(1, 0.0, 0.0, 0.0));
        drawCone();
      }
      gPop();
      // Tail Top
      gPush(); {
        gTranslate(0.25, 0.5, 0);
        gRotate(90, 0, 1, 0);
        gRotate(-45, 1, 0, 0);
        gScale(0.15, 0.15, 1.5);
        setColor(vec4(1, 0.0, 0.0, 0.0));
        drawCone();
      }
      gPop();
    }
    gPop();
    // left eye
    gPush(); {
      gTranslate(-0.65, 0.25, 0.35);
      gPush(); {
        gScale(0.25, 0.25, 0.25);
        setColor(vec4(1.0, 1.0, 1.0, 0.0));
        drawSphere();
      }
      gPop();
      gPush(); {
        gTranslate(-0.15, 0.0, 0.0);
        gScale(0.15, 0.15, 0.15);
        setColor(vec4(0.0, 0.0, 0.0, 0.0));
        drawSphere();
      }
      gPop();
    }
    gPop();
    // right eye
    gPush(); {
      gTranslate(-0.65, 0.25, -0.35);
      gPush(); {
        gScale(0.25, 0.25, 0.25);
        setColor(vec4(1.0, 1.0, 1.0, 0.0));
        drawSphere();
      }
      gPop();
      gPush(); {
        gTranslate(-0.15, 0.0, 0.0);
        gScale(0.15, 0.15, 0.15);
        setColor(vec4(0.0, 0.0, 0.0, 0.0));
        drawSphere();
      }
      gPop();
    }
    gPop();
  }
  gPop();
}

// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
//   var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
function CameraController(element) {
  var controller = this;
  this.onchange = null;
  this.xRot = 0;
  this.yRot = 0;
  this.scaleFactor = 3.0;
  this.dragging = false;
  this.curX = 0;
  this.curY = 0;

  // Assign a mouse down handler to the HTML element.
  element.onmousedown = function(ev) {
    controller.dragging = true;
    controller.curX = ev.clientX;
    controller.curY = ev.clientY;
  };

  // Assign a mouse up handler to the HTML element.
  element.onmouseup = function(ev) {
    controller.dragging = false;
  };

  // Assign a mouse move handler to the HTML element.
  element.onmousemove = function(ev) {
    if (controller.dragging) {
      // Determine how far we have moved since the last mouse move
      // event.
      var curX = ev.clientX;
      var curY = ev.clientY;
      var deltaX = (controller.curX - curX) / controller.scaleFactor;
      var deltaY = (controller.curY - curY) / controller.scaleFactor;
      controller.curX = curX;
      controller.curY = curY;
      // Update the X and Y rotation angles based on the mouse motion.
      controller.yRot = (controller.yRot + deltaX) % 360;
      controller.xRot = (controller.xRot + deltaY);
      // Clamp the X rotation to prevent the camera from going upside
      // down.
      if (controller.xRot < -90) {
        controller.xRot = -90;
      } else if (controller.xRot > 90) {
        controller.xRot = 90;
      }
      // Send the onchange event to any listener.
      if (controller.onchange != null) {
        controller.onchange(controller.xRot, controller.yRot);
      }
    }
  };
}
