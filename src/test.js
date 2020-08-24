const test = (function () {
  const testPoints = [
    { x: 100, y: 100 },
    { x: 175, y: 150 },
    { x: 200, y: 300 },
    { x: 400, y: 50 },
    { x: 500, y: 750 },
    { x: 100, y: 700 },
    { x: 300, y: 100 },
    { x: 50, y: 900 },
    { x: 800, y: 50 },
    { x: 150, y: 100 },
  ];
  const canvas = document.getElementById("main-canvas");
  const ctx = canvas.getContext("2d");
  resizeCanvas(canvas);

  const delaunay = new Delaunay(testPoints, ctx);
  const data = delaunay.getTriangleData();
  console.log(data);
  console.log(data.vertices);
  drawTriangles(ctx, data.vertices, data.triangles);
  drawPoints(ctx, testPoints);
  delaunay.debugDraw(ctx);
  //debugDrawDelaunay(ctx, delaunay);

  function drawPoints(ctx, points) {
    const color = "#ff0000";
    const radius = 5;
    points.forEach((item) => {
      ctx.beginPath();
      ctx.arc(item.x, item.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  function drawTriangles(ctx, vertices, triangles) {
    console.log(triangles);
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
      ctx.fillStyle = "orange";
      ctx.fill();
    });
  }

  function resizeCanvas(canvas) {
    var realToCSSPixels = window.devicePixelRatio;
    // Lookup the size the browser is displaying the canvas in CSS pixels
    // and compute a size needed to make our drawingbuffer match it in
    // device pixels.
    var displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels);
    var displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels);

    // Check if the canvas is not the same size.
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      // Make the canvas the same size
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
  }
})();
