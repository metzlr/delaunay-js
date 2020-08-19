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

  const numCircles = { x: 8, y: 8 };

  const circleSpeedRange = [0.2, 0.4];
  const circleRadius = 6;
  //const ballColors = ["#ff0000"];
  const circleColor = "#B5B0FB66";

  const drawEdges = false;
  const lineColor = "#ff0000";
  const lineWidth = 1;

  const triangleBaseColor = { h: 244, s: 94, l: 68 };
  const triangleColorRangeL = [-10, 5];
  //const triangleColors = ["#4f49bd", "#6c63fa", "#867ff4"];

  let circles = [];
  let idCounter = 0;

  let points = [];
  let delaunay = undefined;

  // Setup scene
  canvasFunctions.resizeCanvas(canvas);

  // Setup color breakpoints for triangles based on height
  // const colorSectionSize = canvas.height / triangleColors.length;
  // const colorBreakpoints = [];
  // for (let i = 0; i < triangleColors.length; i++) {
  //   colorBreakpoints.push(colorSectionSize * i);
  // }

  createCircles();

  requestAnimationFrame(render);

  function createCircles() {
    const dx = canvas.width / (numCircles.x + 1);
    const dy = canvas.height / (numCircles.y + 1);
    // Create border of stationary points
    const offset = 2;
    for (let i = 0; i < numCircles.x + 2; i++) {
      const posTop = { x: i * dx, y: -offset };
      const posBottom = { x: i * dx, y: canvas.height + offset };
      const circleTop = new Circle({
        id: idCounter,
        color: circleColor,
        radius: circleRadius,
        position: posTop,
        staticObject: true,
        visible: false,
      });
      idCounter++;
      const circleBottom = new Circle({
        id: idCounter,
        color: circleColor,
        radius: circleRadius,
        position: posBottom,
        staticObject: true,
        visible: false,
      });
      idCounter++;

      circles.push(circleTop);
      circles.push(circleBottom);
    }
    for (let i = 1; i < numCircles.y; i++) {
      const posLeft = { x: -offset, y: i * dy };
      const posRight = { x: canvas.width + offset, y: i * dy };
      const circleLeft = new Circle({
        id: idCounter,
        color: circleColor,
        radius: circleRadius,
        position: posLeft,
        staticObject: true,
        visible: false,
      });
      idCounter++;
      const circleRight = new Circle({
        id: idCounter,
        color: circleColor,
        radius: circleRadius,
        position: posRight,
        staticObject: true,
        visible: false,
      });
      idCounter++;

      circles.push(circleLeft);
      circles.push(circleRight);
    }
    for (let i = 1; i < numCircles.y; i++) {
      for (let j = 1; j <= numCircles.x; j++) {
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

        const circle = new Circle({
          id: idCounter,
          color: circleColor, //ballColors[Math.floor(Math.random() * ballColors.length)],
          radius: circleRadius,
          position: pos,
          velocity: { x: velocityX, y: velocityY },
          staticObject: false,
          visible: true,
        });

        idCounter++;
        circles.push(circle);
      }
    }
  }

  function drawLine(ctx, p1, p2) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function drawTriangles(ctx, vertices, triangles, drawEdges) {
    triangles.forEach((triangle) => {
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
      // let color = triangleColors[0];
      // for (let i = 1; i < colorBreakpoints.length; i++) {
      //   if (midpoint.y >= colorBreakpoints[i]) {
      //     color = triangleColors[i];
      //   } else {
      //     break;
      //   }
      // }
      //ctx.fillStyle = `hsl(${triangleBaseColor.h}, ${triangleBaseColor.s}%, ${lightness}%)`;
      ctx.fillStyle = `hsl(${triangleBaseColor.h},${triangleBaseColor.s}%,${lightness}%)`;
      ctx.fill();

      ctx.strokeStyle = drawEdges ? circleColor : ctx.fillStyle;
      ctx.lineTo(v1.x, v1.y);

      ctx.lineWidth = lineWidth;
      ctx.stroke();
    });
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

  function update() {
    points = [];
    circles.forEach((item) => {
      item.update(canvas);
      points.push(item.position);
    });

    delaunay = new Delaunay(points, ctx);
  }

  function draw() {
    const delaunayData = delaunay.getTriangleData();
    drawTriangles(
      ctx,
      delaunayData.vertices,
      delaunayData.triangles,
      drawEdges
    );

    circles.forEach((item, index) => {
      item.draw(ctx);
    });
  }

  function render() {
    // Resize canvas
    //canvasFunctions.resizeCanvas(canvas);
    // Clear canvas
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    update();
    draw();

    requestAnimationFrame(render);
  }
})();
