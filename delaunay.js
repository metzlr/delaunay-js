function pointInCircle(a, b, c, p) {
  const dx = a.x - p.x;
  const dy = a.y - p.y;
  const ex = b.x - p.x;
  const ey = b.y - p.y;
  const fx = c.x - p.x;
  const fy = c.y - p.y;

  const ap = dx * dx + dy * dy;
  const bp = ex * ex + ey * ey;
  const cp = fx * fx + fy * fy;

  return (
    dx * (ey * cp - bp * fy) -
      dy * (ex * cp - bp * fx) +
      ap * (ex * fy - ey * fx) <
    0
  );
}

function sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

function pointInTriangle(pt, v1, v2, v3) {
  const d1 = sign(pt, v1, v2);
  const d2 = sign(pt, v2, v3);
  const d3 = sign(pt, v3, v1);

  const has_neg = d1 < 0 || d2 < 0 || d3 < 0;
  const has_pos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(has_neg && has_pos);
}

/* 
  Directed Acylic Graph

  Used to find what triangle a point is within
*/
class Node {
  constructor(key, vertices) {
    this.key = key;
    this.vertices = vertices;
    this.children = [];
  }

  addChild(node) {
    this.children.push(node);
  }
}

class TriangleGraph {
  constructor(key, vertices) {
    this.nodes = new Map();
    this.nodes.set(key, new Node(key, vertices));
  }

  addNode(parentKeys, key, vertices) {
    if (parentKeys.length == 0) return false;
    let newNode = undefined;
    parentKeys.forEach((parentKey) => {
      const parentNode = this.nodes.get(parentKey);
      if (parentNode) {
        if (newNode == undefined) {
          newNode = new Node(key, vertices);
          this.nodes.set(key, newNode);
        }
        parentNode.addChild(newNode);
      }
    });
    return true;
  }

  getValues() {
    return this.nodes.values();
  }

  size() {
    return this.nodes.size;
  }
}

class Vertex {
  constructor(pos, incEdge, id) {
    this.pos = pos;
    this.incEdge = incEdge;
    this.id = id;
  }
}

class HalfEdge {
  constructor({ origin, twin, incFace, next, prev }) {
    this.origin = origin;
    this.twin = twin;
    this.incFace = incFace;
    this.next = next;
    this.prev = prev;
  }
}

class Face {
  constructor(incEdge, graphKey) {
    this.incEdge = incEdge;
    this.graphKey = graphKey;
  }
}

class Delaunay {
  constructor(points, debugCtx) {
    this.points = points;
    this.debugCtx = debugCtx;

    this.vertices = [];
    this.halfEdges = [];
    this.faces = []; // Contains index of a half-edge belonging to that face

    // Create triangle base triangle that "encapsulates" all points

    // First initialize empty structure
    // const tempPositions = [
    //   { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY },
    //   { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY },
    //   { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
    // ];
    const FAR_AWAY = 10000;
    const tempPositions = [
      { x: -FAR_AWAY, y: -FAR_AWAY },
      { x: 500, y: FAR_AWAY },
      { x: FAR_AWAY, y: -FAR_AWAY },
    ];
    for (let i = 0; i < 3; i++) {
      //this.vertices.push(new Vertex(`p${i}`, undefined));
      this.vertices.push(
        new Vertex(tempPositions[i], undefined, this.vertices.length)
      );
    }
    for (let i = 0; i < 6; i++) {
      this.halfEdges.push(
        new HalfEdge({
          origin: undefined,
          twin: undefined,
          incFace: undefined,
          next: undefined,
          prev: undefined,
        })
      );
    }
    this.faces.push(new Face(this.halfEdges[0], 0));
    this.triangleGraph = new TriangleGraph(0, tempPositions);

    // Now fill in proper values
    this.vertices[0].incEdge = this.halfEdges[0];
    this.vertices[1].incEdge = this.halfEdges[1];
    this.vertices[2].incEdge = this.halfEdges[2];

    this.halfEdges[0].origin = this.vertices[0];
    this.halfEdges[0].twin = this.halfEdges[3];
    this.halfEdges[0].incFace = this.faces[0];
    this.halfEdges[0].next = this.halfEdges[1];
    this.halfEdges[0].prev = this.halfEdges[2];

    this.halfEdges[1].origin = this.vertices[1];
    this.halfEdges[1].twin = this.halfEdges[4];
    this.halfEdges[1].incFace = this.faces[0];
    this.halfEdges[1].next = this.halfEdges[2];
    this.halfEdges[1].prev = this.halfEdges[0];

    this.halfEdges[2].origin = this.vertices[2];
    this.halfEdges[2].twin = this.halfEdges[5];
    this.halfEdges[2].incFace = this.faces[0];
    this.halfEdges[2].next = this.halfEdges[0];
    this.halfEdges[2].prev = this.halfEdges[1];

    this.halfEdges[3].origin = this.vertices[1];
    this.halfEdges[3].twin = this.halfEdges[0];
    this.halfEdges[3].incFace = null;
    this.halfEdges[3].next = this.halfEdges[4];
    this.halfEdges[3].prev = this.halfEdges[5];

    this.halfEdges[4].origin = this.vertices[2];
    this.halfEdges[4].twin = this.halfEdges[1];
    this.halfEdges[4].incFace = null;
    this.halfEdges[4].next = this.halfEdges[5];
    this.halfEdges[4].prev = this.halfEdges[3];

    this.halfEdges[5].origin = this.vertices[0];
    this.halfEdges[5].twin = this.halfEdges[2];
    this.halfEdges[5].incFace = null;
    this.halfEdges[5].next = this.halfEdges[3];
    this.halfEdges[5].prev = this.halfEdges[4];

    this.triangulate();
  }

  triangulate() {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const triangle = this.containingTriangle(point);

      /* Need case for when point lies on edge of triangle? */

      const [newVertex, affectedEdges] = this.splitTriangle(point, triangle);

      affectedEdges.forEach((edge) => {
        this.legalizeEdge(newVertex, edge);
      });

      //this.debugDraw(this.debugCtx);
    }
    //this.getTriangleData();
  }

  splitTriangle(point, triangle) {
    // First create new vertex from point
    const newVertex = new Vertex(point, undefined, this.vertices.length);

    // Next create half-edges
    let newHalfEdges = [];
    for (let i = 0; i < 6; i++) {
      let leftEdge = i % 2 == 0 ? true : false;
      newHalfEdges.push(
        new HalfEdge({
          origin: leftEdge ? newVertex : undefined,
          twin: undefined, //this.halfEdges.length + ((i - 1) % 6),
          incFace: undefined,
          next: undefined,
          prev: undefined,
        })
      );
    }
    // Assign half-edge twins
    for (let i = 0; i < 3; i++) {
      const e1 = newHalfEdges[i * 2];
      const e2 = i == 0 ? newHalfEdges[5] : newHalfEdges[i * 2 - 1];
      e1.twin = e2;
      e2.twin = e1;
    }

    // Now create each new face and re-assign relevant next/prev edges
    const outerFaceEdges = this.getFaceHalfEdges(triangle);
    let newFaces = [];
    for (let i = 0; i < 3; i++) {
      let e1 = outerFaceEdges[i];
      let e2 = newHalfEdges[i * 2 + 1];
      let e3 = newHalfEdges[i * 2];
      const newFace = new Face(e3, this.faces.length + i);

      e2.origin = e1.next.origin;

      e1.next = e2;
      e1.prev = e3;
      e1.incFace = newFace;
      e2.next = e3;
      e2.prev = e1;
      e2.incFace = newFace;
      e3.next = e1;
      e3.prev = e2;
      e3.incFace = newFace;

      newFaces.push(newFace);
      //const vertices = [e1.origin.pos, e2.origin.pos, e3.origin.pos];
      const vertices = [e1.origin.id, e2.origin.id, e3.origin.id];
      if (
        !this.triangleGraph.addNode(
          [triangle.graphKey],
          newFace.graphKey,
          vertices
        )
      ) {
        console.error("Error adding face to triangle graph:", newFace);
      }
    }

    // Point vertex to first new half-edge
    newVertex.incEdge = newHalfEdges[0];

    // Add new items
    this.vertices.push(newVertex);
    this.halfEdges = this.halfEdges.concat(newHalfEdges);
    this.faces = this.faces.concat(newFaces);

    return [newVertex, outerFaceEdges];

    // Debug print new faces
    // for (let i = 0; i < 3; i++) {
    //   this.printFace(newFaces[i]);
    // }
  }

  legalizeEdge(newVertex, edge) {
    const face = edge.incFace;
    const adjacentFace = edge.twin.incFace;
    if (adjacentFace == null) {
      return;
    } else {
      // Check if edge needs to be flipped
      const testPoint = edge.twin.prev.origin.pos;
      if (
        pointInCircle(
          newVertex.pos,
          edge.origin.pos,
          edge.twin.origin.pos,
          testPoint
        )
      ) {
        const incFaceEdge1 = edge.twin.prev;
        const incFaceEdge2 = edge.twin.next;
        const faceEdge1 = edge.next;
        const faceEdge2 = edge.prev;

        // Flip edge
        edge.next = incFaceEdge1;
        edge.prev = faceEdge1;
        edge.twin.next = faceEdge2;
        edge.twin.prev = incFaceEdge2;
        edge.origin = faceEdge2.origin;
        edge.twin.origin = incFaceEdge1.origin;

        // Correct Edges
        incFaceEdge1.prev = edge;
        incFaceEdge1.next = faceEdge1;
        faceEdge1.prev = incFaceEdge1;
        faceEdge1.next = edge;

        faceEdge2.prev = edge.twin;
        faceEdge2.next = incFaceEdge2;
        incFaceEdge2.prev = faceEdge2;
        incFaceEdge2.next = edge.twin;

        // Create two new faces
        const newFaces = [
          new Face(faceEdge2, this.faces.length),
          new Face(faceEdge1, this.faces.length + 1),
        ];
        edge.twin.incFace = newFaces[0];
        faceEdge2.incFace = newFaces[0];
        incFaceEdge2.incFace = newFaces[0];
        edge.incFace = newFaces[1];
        incFaceEdge1.incFace = newFaces[1];
        faceEdge1.incFace = newFaces[1];

        for (const newFace of newFaces) {
          const [v1, v2, v3] = this.getFaceVertices(newFace);
          if (
            !this.triangleGraph.addNode(
              [face.graphKey, adjacentFace.graphKey],
              newFace.graphKey,
              [v1.id, v2.id, v3.id]
              //[v1.pos, v2.pos, v3.pos]
            )
          ) {
            console.error("Error adding face to triangle graph:", newFace);
          }
          this.faces.push(newFace);
        }

        // Since edge flip could have affected triangles next to original adjacent triangle, check them
        this.legalizeEdge(newVertex, incFaceEdge1);
        this.legalizeEdge(newVertex, incFaceEdge2);
      }
    }
  }

  containingTriangle(point) {
    let currentNode = this.triangleGraph.nodes.get(0);
    let safety = 0;
    while (currentNode.children.length > 0) {
      let foundChild = false;
      for (const child of currentNode.children) {
        //const vertices = child.vertices;
        const vertices = [
          this.vertices[child.vertices[0]].pos,
          this.vertices[child.vertices[1]].pos,
          this.vertices[child.vertices[2]].pos,
        ];
        if (pointInTriangle(point, vertices[0], vertices[1], vertices[2])) {
          currentNode = child;
          foundChild = true;
          break;
        }
      }
      if (!foundChild) {
        console.error("Uh oh. Triangle had children but none matched.", point);
      }

      safety++;
      if (safety > 10000) {
        console.error("Infinite loop here");
        break;
      }
    }
    return this.faces[currentNode.key];
  }

  getFaceHalfEdges(face) {
    let edges = [face.incEdge];
    let edge = edges[0];

    let safety = 0;
    while (edge.next.origin != edges[0].origin) {
      edges.push(edge.next);
      edge = edge.next;

      safety++;
      if (safety > 10000) {
        console.error("Infinite loop here");
        break;
      }
    }
    return edges;
  }

  getFaceVertices(face) {
    let edge = face.incEdge;
    let vertices = [edge.origin];

    let safety = 0;
    while (edge.next.origin != vertices[0]) {
      edge = edge.next;
      vertices.push(edge.origin);

      safety++;
      if (safety > 10000) {
        throw new Error("Infinite loop here");
      }
    }
    return vertices;
  }

  printFace(face) {
    const edges = this.getFaceHalfEdges(face);
    console.log("FACE INDEX:", face);
    for (let i = 0; i < edges.length; i++) {
      console.log(edges[i].origin.pos, "TO", edges[i].twin.origin.pos);
      console.log(edges[i]);
    }
  }

  getTriangleData() {
    //let vertices = this.vertices.slice(3, this.vertices.length);
    let vertices = [];
    for (let i = 3; i < this.vertices.length; i++) {
      vertices.push(this.vertices[i].pos);
    }
    let triangles = [];
    const triangleIterator = this.triangleGraph.getValues();
    for (let i = 0; i < this.triangleGraph.size(); i++) {
      const triangle = triangleIterator.next().value;
      if (triangle.children.length != 0) continue;
      const [v1, v2, v3] = triangle.vertices;
      if (v1 < 3 || v2 < 3 || v3 < 3) continue;
      triangles.push([v1 - 3, v2 - 3, v3 - 3]);
    }
    return { vertices: vertices, triangles: triangles };
  }

  debugDraw(ctx) {
    // // Clear canvas
    // ctx.fillStyle = "#f0f0f0";
    // ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const face of this.faces) {
      const edges = this.getFaceHalfEdges(face);
      for (const edge of edges) {
        ctx.beginPath();
        let v1 = [edge.origin.pos.x, edge.origin.pos.y];
        let v2 = [edge.twin.origin.pos.x, edge.twin.origin.pos.y];
        let p1 = [ctx.canvas.width * -5, ctx.canvas.height * -5];
        let p2 = [ctx.canvas.width * 5, ctx.canvas.height * -5];
        let p3 = [ctx.canvas.width / 2, ctx.canvas.height * 5];
        if (typeof edge.origin.pos === "string") {
          if (edge.origin.pos === "p0") {
            v1 = p1;
          } else if (edge.origin.pos === "p1") {
            v1 = p2;
          } else {
            v1 = p3;
          }
        }
        if (typeof edge.twin.origin.pos === "string") {
          if (edge.twin.origin.pos === "p0") {
            v2 = p1;
          } else if (edge.twin.origin.pos === "p1") {
            v2 = p2;
          } else {
            v2 = p3;
          }
        }
        // console.log(v1, "TO", v2);
        // console.log(edge, edge.twin);
        ctx.moveTo(v1[0], v1[1]);
        ctx.lineTo(v2[0], v2[1]);
        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
}
