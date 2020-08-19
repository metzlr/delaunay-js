class Circle {
  constructor({
    id,
    color,
    radius,
    position,
    velocity,
    staticObject,
    visible,
  }) {
    this.id = id;
    this.color = color;
    this.radius = radius;
    this.position = position;
    this.velocity = velocity;
    this.staticObject = staticObject;
    this.visible = visible;
  }

  update(canvas) {
    if (this.staticObject) return;

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    if (
      this.position.x - this.radius < 0 ||
      this.position.x + this.radius > canvas.width
    ) {
      this.velocity.x *= -1;
    }
    if (
      this.position.y - this.radius < 0 ||
      this.position.y + this.radius > canvas.height
    ) {
      this.velocity.y *= -1;
    }
  }

  draw(ctx) {
    if (!this.visible) return;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

const main = (function () {
  const canvas = document.getElementById("main-canvas");
  const ctx = canvas.getContext("2d");

  window.onresize = () => {
    init();
    update();
  };

  // Constants
  const fps = 60;
  const circleColor = "#B5B0FB66";
  const drawEdges = false;
  const lineColor = "#B5B0FB66";
  const lineWidth = 1;
  const triangleBaseColor = { h: 244, s: 94, l: 68 };
  const triangleColorRangeL = [-10, 5];

  // Non-constants
  let numCircles,
    circleSpeedRange,
    circleRadius,
    circles,
    idCounter,
    points,
    delaunay,
    delaunayData;

  // Setup scene
  function init() {
    canvasFunctions.resizeCanvas(canvas);

    numCircles = {
      x: Math.floor(canvas.width / 200),
      y: Math.floor(canvas.height / 200),
    };

    circleSpeedRange = [0.6, 0.9];
    circleRadius = Math.min(0.007 * canvas.width, 7);
    circles = [];
    idCounter = 0;

    points = [];
    delaunay = undefined;

    createCircles();
  }

  init();
  // Initialize update loop. Locked to specific FPS
  let circlesUpdated = false;
  setInterval(update, 1000 / fps);

  requestAnimationFrame(render);

  function update() {
    points = [];
    for (let i = 0; i < circles.length; i++) {
      circles[i].update(canvas);
      points.push(circles[i].position);
    }
    delaunay = new Delaunay(points, ctx);
    circlesUpdated = true;
  }

  function draw() {
    if (!circlesUpdated) return;
    circlesUpdated = false;
    // Clear canvas
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const delaunayData = delaunay.getTriangleData();
    drawTriangles(
      ctx,
      delaunayData.vertices,
      delaunayData.triangles,
      drawEdges
    );

    for (let i = 0; i < circles.length; i++) {
      circles[i].draw(ctx);
    }
  }

  function render() {
    draw();

    requestAnimationFrame(render);
  }

  function createCircles() {
    circles = [];
    const dx = canvas.width / (numCircles.x + 1);
    const dy = canvas.height / (numCircles.y + 1);

    // Create grid of circles
    const offset = 2;
    for (let i = 0; i <= numCircles.y + 1; i++) {
      for (let j = 0; j <= numCircles.x + 1; j++) {
        const pos = { x: j * dx, y: i * dy };
        const direction = [1, -1];
        const velocityX =
          (Math.random() * (circleSpeedRange[1] - circleSpeedRange[0]) +
            circleSpeedRange[0]) *
          direction[Math.floor(Math.random() * 2)];
        const velocityY =
          (Math.random() * (circleSpeedRange[1] - circleSpeedRange[0]) +
            circleSpeedRange[0]) *
          direction[Math.floor(Math.random() * 2)];
        const edgeCircle =
          i === 0 || j === 0 || j === numCircles.x + 1 || i === numCircles.y + 1
            ? true
            : false;
        const circle = new Circle({
          id: idCounter,
          color: circleColor,
          radius: circleRadius,
          position: pos,
          velocity: { x: velocityX, y: velocityY },
          staticObject: edgeCircle ? true : false,
          visible: edgeCircle ? false : true,
        });

        idCounter++;
        circles.push(circle);
      }
    }
  }

  function drawTriangles(ctx, vertices, triangles, drawEdges) {
    for (let i = 0; i < triangles.length; i++) {
      const triangle = triangles[i];
      const [v1, v2, v3] = [
        vertices[triangle[0]],
        vertices[triangle[1]],
        vertices[triangle[2]],
      ];
      ctx.beginPath();
      ctx.moveTo(v1.x, v1.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.lineTo(v3.x, v3.y);
      const heightRatio = getTriangleMidpoint([v1, v2, v3]).y / canvas.height;
      const lightness =
        triangleBaseColor.l +
        (heightRatio * (triangleColorRangeL[1] - triangleColorRangeL[0]) +
          triangleColorRangeL[0]);
      ctx.fillStyle = `hsl(${triangleBaseColor.h},${triangleBaseColor.s}%,${lightness}%)`;
      ctx.fill();

      ctx.strokeStyle = drawEdges ? circleColor : ctx.fillStyle;
      ctx.lineTo(v1.x, v1.y);

      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }
  function getTriangleMidpoint(vertices) {
    let min = { x: undefined, y: undefined };
    let max = { x: undefined, y: undefined };

    for (let i = 0; i < vertices.length; i++) {
      if (vertices[i].x < min.x || min.x === undefined) {
        min.x = vertices[i].x;
      }
      if (vertices[i].x > max.x || max.x === undefined) {
        max.x = vertices[i].x;
      }
      if (vertices[i].y < min.y || min.y === undefined) {
        min.y = vertices[i].y;
      }
      if (vertices[i].y > max.y || max.y === undefined) {
        max.y = vertices[i].y;
      }
    }
    return { x: (max.x - min.x) / 2 + min.x, y: (max.y - min.y) / 2 + min.y };
  }
})();
