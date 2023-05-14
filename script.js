import * as THREE from "three";

const myScore = document.querySelector(".score");
const endMenu = document.querySelector(".end-menu");

const scene = new THREE.Scene();

const distance = 500;
const camera = new THREE.OrthographicCamera(
  window.innerWidth / -2,
  window.innerWidth / 2,
  window.innerHeight / 2,
  window.innerHeight / -2,
  0.1,
  10000
);

let isDead = false;

camera.rotation.x = 0.9;
camera.rotation.y = 0.35;
camera.rotation.z = 0.2;

const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance;
const initialCameraPositionX =
  Math.tan(camera.rotation.y) *
  Math.sqrt(distance ** 2 + initialCameraPositionY ** 2);
camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = distance;

const zoom = 2;

const playerSize = 15;

const positionWidth = 42;
const columns = 17;
const boardWidth = positionWidth * columns;

const stepTime = 200;

let lanes;
let currentLane;
let currentColumn;

let previousTimestamp;
let startMoving;
let moves;
let stepStartTimestamp;

const carFrontTexture = new Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
const carBackTexture = new Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
const carRightSideTexture = new Texture(110, 40, [
  { x: 10, y: 0, w: 50, h: 30 },
  { x: 70, y: 0, w: 30, h: 30 },
]);
const carLeftSideTexture = new Texture(110, 40, [
  { x: 10, y: 10, w: 50, h: 30 },
  { x: 70, y: 10, w: 30, h: 30 },
]);

const truckFrontTexture = new Texture(30, 30, [{ x: 15, y: 0, w: 10, h: 30 }]);
const truckRightSideTexture = new Texture(25, 30, [
  { x: 0, y: 15, w: 10, h: 10 },
]);
const truckLeftSideTexture = new Texture(25, 30, [
  { x: 0, y: 5, w: 10, h: 10 },
]);

const generateLanes = () =>
  [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((index) => {
      const lane = new Lane(index);
      lane.mesh.position.y = index * positionWidth * zoom;
      scene.add(lane.mesh);
      return lane;
    })
    .filter((lane) => lane.index >= 0);

const addLane = () => {
  const index = lanes.length;
  const lane = new Lane(index);
  lane.mesh.position.y = index * positionWidth * zoom;
  scene.add(lane.mesh);
  lanes.push(lane);
};

const player = new Player();
scene.add(player);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.target = player;
scene.add(dirLight);

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

const backLight = new THREE.DirectionalLight(0x000000, 0.4);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight);

const laneTypes = ["car", "truck", "forest"];
const laneSpeeds = [2, 2.5, 3, 3.5];
const carColors = [0x3234a8, 0x7932a8, 0xa86b32];
const threeHeights = [15, 20, 40, 55, 75];
const truckCargos = [80, 90];

const initaliseValues = () => {
  lanes = generateLanes();

  currentLane = 0;
  currentColumn = Math.floor(columns / 2);

  previousTimestamp = null;

  startMoving = false;
  moves = [];
  stepStartTimestamp;

  player.position.x = 0;
  player.position.y = 0;

  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;

  dirLight.position.x = initialDirLightPositionX;
  dirLight.position.y = initialDirLightPositionY;
};

initaliseValues();

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

function Texture(width, height, rects) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(0,0,0,0.6)";
  rects.forEach((rect) => {
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
  return new THREE.CanvasTexture(canvas);
}

function Wheel() {
  const wheel = new THREE.Mesh(
    new THREE.BoxGeometry(12 * zoom, 33 * zoom, 12 * zoom),
    new THREE.MeshLambertMaterial({ color: 0x212121, flatShading: true })
  );
  wheel.position.z = 6 * zoom;
  return wheel;
}

function Car() {
  const car = new THREE.Group();
  const color = carColors[Math.floor(Math.random() * carColors.length)];

  const main = new THREE.Mesh(
    new THREE.BoxGeometry(50 * zoom, 30 * zoom, 15 * zoom),
    new THREE.MeshPhongMaterial({ color, flatShading: true })
  );
  main.position.z = 12 * zoom;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(36 * zoom, 25 * zoom, 10 * zoom),
    [
      new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        flatShading: true,
        map: carBackTexture,
      }),
      new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        flatShading: true,
        map: carFrontTexture,
      }),
      new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        flatShading: true,
        map: carRightSideTexture,
      }),
      new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        flatShading: true,
        map: carLeftSideTexture,
      }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }), // bottom
    ]
  );
  cabin.position.x = 6 * zoom;
  cabin.position.z = 25.5 * zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -18 * zoom;
  car.add(frontWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 18 * zoom;
  car.add(backWheel);

  car.castShadow = true;
  car.receiveShadow = false;

  return car;
}

function Truck() {
  const truck = new THREE.Group();
  const color = carColors[Math.floor(Math.random() * carColors.length)];

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(100 * zoom, 25 * zoom, 5 * zoom),
    new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  base.position.z = 10 * zoom;
  truck.add(base);
  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(
      truckCargos[Math.floor(Math.random() * truckCargos.length)] * zoom,
      35 * zoom,
      40 * zoom
    ),
    new THREE.MeshPhongMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  cargo.position.x = 15 * zoom;
  cargo.position.z = 30 * zoom;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(25 * zoom, 30 * zoom, 30 * zoom),
    [
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // back
      new THREE.MeshPhongMaterial({
        color,
        flatShading: true,
        map: truckFrontTexture,
      }),
      new THREE.MeshPhongMaterial({
        color,
        flatShading: true,
        map: truckRightSideTexture,
      }),
      new THREE.MeshPhongMaterial({
        color,
        flatShading: true,
        map: truckLeftSideTexture,
      }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // bottom
    ]
  );
  cabin.position.x = -40 * zoom;
  cabin.position.z = 20 * zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -38 * zoom;
  truck.add(frontWheel);

  const middleWheel = new Wheel();
  middleWheel.position.x = -10 * zoom;
  truck.add(middleWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 30 * zoom;
  truck.add(backWheel);

  return truck;
}

function Three() {
  const three = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(15 * zoom, 15 * zoom, 20 * zoom),
    new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
  );
  trunk.position.z = 10 * zoom;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  three.add(trunk);

  const height = threeHeights[Math.floor(Math.random() * threeHeights.length)];

  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(30 * zoom, 30 * zoom, height * zoom),
    new THREE.MeshLambertMaterial({ color: 0x079900, flatShading: true })
  );
  crown.position.z = (height / 2 + 20) * zoom;
  crown.castShadow = true;
  crown.receiveShadow = false;
  three.add(crown);

  return three;
}

function Log() {
  const three = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(80 * zoom, 15 * zoom, 20 * zoom),
    new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
  );
  trunk.position.z = 10 * zoom;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  three.add(trunk);
  return three;
}

function Player() {
  const player = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(playerSize * zoom, playerSize * zoom, 15 * zoom),
    new THREE.MeshPhongMaterial({ color: 0xff6ead, flatShading: true })
  ); //SCHIMBAa box gemoetry to playersize*0.8*zoom, playerSize * zoom, 10 * zoom
  body.position.z = 10 * zoom;
  body.castShadow = true;
  body.receiveShadow = true;
  player.add(body);

  /* DECOMENTEAZA CAND MERG ANIMATIILE
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(playerSize * zoom, playerSize * zoom, 15 * zoom),
    new THREE.MeshPhongMaterial({ color: 0xff6ead, flatShading: true })
  );
  head.position.y = 5 * zoom;
  head.position.z = 20 * zoom;
  head.castShadow = true;
  player.add(head);

  const leg1 = new THREE.Mesh(
    new THREE.BoxGeometry(
      playerSize * 0.2 * zoom,
      playerSize * 0.2 * zoom,
      15 * zoom
    ),
    new THREE.MeshPhongMaterial({ color: 0xff6ead, flatShading: true })
  );
  leg1.position.x = 2 * zoom;
  leg1.position.y = -2 * zoom;
  leg1.castShadow = true;
  player.add(leg1);

  const leg2 = new THREE.Mesh(
    new THREE.BoxGeometry(
      playerSize * 0.2 * zoom,
      playerSize * 0.2 * zoom,
      15 * zoom
    ),
    new THREE.MeshPhongMaterial({ color: 0xff6ead, flatShading: true })
  );
  leg2.position.x = -2 * zoom;
  leg2.position.y = -2 * zoom;
  leg2.castShadow = true;
  player.add(leg2);

  const leg3 = new THREE.Mesh(
    new THREE.BoxGeometry(
      playerSize * 0.2 * zoom,
      playerSize * 0.2 * zoom,
      15 * zoom
    ),
    new THREE.MeshPhongMaterial({ color: 0xff6ead, flatShading: true })
  );
  leg3.position.x = 2 * zoom;
  leg3.position.y = 2 * zoom;
  leg3.castShadow = true;
  player.add(leg3);*/

  return player;
}

function Road() {
  const road = new THREE.Group();

  const createSection = (color) =>
    new THREE.Mesh(
      new THREE.PlaneGeometry(boardWidth * zoom, positionWidth * zoom),
      new THREE.MeshPhongMaterial({ color })
    );

  const middle = createSection(0x4e4f52);
  middle.receiveShadow = true;
  road.add(middle);

  const left = createSection(0x333333);
  left.position.x = -boardWidth * zoom;
  road.add(left);

  const right = createSection(0x333333);
  right.position.x = boardWidth * zoom;
  road.add(right);

  return road;
}

function Grass() {
  const grass = new THREE.Group();

  const createSection = (color) =>
    new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
      new THREE.MeshPhongMaterial({ color })
    );

  const middle = createSection(0x399603);
  middle.receiveShadow = true;
  grass.add(middle);

  const left = createSection(0x34590c);
  left.position.x = -boardWidth * zoom;
  grass.add(left);

  const right = createSection(0x34590c);
  right.position.x = boardWidth * zoom;
  grass.add(right);

  grass.position.z = 1.5 * zoom;
  return grass;
}

function Water() {
  const water = new THREE.Group();

  const createSection = (color) =>
    new THREE.Mesh(
      new THREE.BoxGeometry(
        boardWidth * zoom,
        positionWidth * zoom,
        0.5 * zoom
      ),
      new THREE.MeshPhongMaterial({ color })
    );

  const middle = createSection(0x55baf4);
  middle.receiveShadow = true;
  water.add(middle);

  const left = createSection(0x467ac8);
  left.position.x = -boardWidth * zoom;
  water.add(left);

  const right = createSection(0x467ac8);
  right.position.x = boardWidth * zoom;
  water.add(right);

  water.position.z = 1.5 * zoom;
  return water;
}

function Lane(index) {
  this.index = index;
  this.type =
    index <= 0
      ? "field"
      : laneTypes[Math.floor(Math.random() * laneTypes.length)];

  switch (this.type) {
    case "field": {
      this.type = "field";
      this.mesh = new Grass();
      break;
    }
    case "forest": {
      this.mesh = new Grass();

      this.occupiedPositions = new Set();
      this.threes = [1, 2, 3, 4].map(() => {
        const three = new Three();
        let position;
        do {
          position = Math.floor(Math.random() * columns);
        } while (this.occupiedPositions.has(position));
        this.occupiedPositions.add(position);
        three.position.x =
          (position * positionWidth + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2;
        this.mesh.add(three);
        return three;
      });
      break;
    }
    case "water": {
      this.mesh = new Water();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.logs = [1, 2, 3].map(() => {
        const log = new Log();
        let position;
        do {
          position = Math.floor((Math.random() * columns) / 2);
        } while (occupiedPositions.has(position));
        occupiedPositions.add(position);
        log.position.x =
          (position * positionWidth * 2 + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2;
        if (!this.direction) log.rotation.z = Math.PI;
        this.mesh.add(log);
        return log;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
    case "car": {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1, 2, 3].map(() => {
        const vechicle = new Car();
        let position;
        do {
          position = Math.floor((Math.random() * columns) / 2);
        } while (occupiedPositions.has(position));
        occupiedPositions.add(position);
        vechicle.position.x =
          (position * positionWidth * 2 + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2;
        if (!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
    case "truck": {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1, 2].map(() => {
        const vechicle = new Truck();
        let position;
        do {
          position = Math.floor((Math.random() * columns) / 3);
        } while (occupiedPositions.has(position));
        occupiedPositions.add(position);
        vechicle.position.x =
          (position * positionWidth * 3 + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2;
        if (!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
  }
}

document.querySelector(".retry-button").addEventListener("click", () => {
  lanes.forEach((lane) => scene.remove(lane.mesh));
  initaliseValues();
  endMenu.classList.add("no-display");
});

document
  .getElementById("up-button")
  .addEventListener("click", () => move("forward"));

document
  .getElementById("down-button")
  .addEventListener("click", () => move("backward"));

document
  .getElementById("left-button")
  .addEventListener("click", () => move("left"));

document
  .getElementById("right-button")
  .addEventListener("click", () => move("right"));

window.addEventListener("keydown", (event) => {
  if (event.keyCode == "38") {
    // up arrow
    move("forward");
  } else if (event.keyCode == "40") {
    // down arrow
    move("backward");
  } else if (event.keyCode == "37") {
    // left arrow
    move("left");
  } else if (event.keyCode == "39") {
    // right arrow
    move("right");
  }
});

function move(direction) {
  if (!isDead) {
    const finalPositions = moves.reduce(
      (position, move) => {
        if (move === "forward")
          return { lane: position.lane + 1, column: position.column };
        if (move === "backward")
          return { lane: position.lane - 1, column: position.column };
        if (move === "left")
          return { lane: position.lane, column: position.column - 1 };
        if (move === "right")
          return { lane: position.lane, column: position.column + 1 };
      },
      { lane: currentLane, column: currentColumn }
    );

    if (direction === "forward") {
      if (
        (lanes[finalPositions.lane + 1].type === "forest" &&
          lanes[finalPositions.lane + 1].occupiedPositions.has(
            finalPositions.column
          )) ||
        (lanes[finalPositions.lane + 1].type === "water" &&
          !lanes[finalPositions.lane + 1].occupiedPositions.has(
            finalPositions.column
          ))
      )
        return;
      if (!stepStartTimestamp) startMoving = true;
      addLane();
    } else if (direction === "backward") {
      if (finalPositions.lane === 0) return;
      if (
        lanes[finalPositions.lane - 1].type === "forest" &&
        lanes[finalPositions.lane - 1].occupiedPositions.has(
          finalPositions.column
        )
      )
        return;
      if (!stepStartTimestamp) startMoving = true;
    } else if (direction === "left") {
      if (finalPositions.column === 0) return;
      if (
        lanes[finalPositions.lane].type === "forest" &&
        lanes[finalPositions.lane].occupiedPositions.has(
          finalPositions.column - 1
        )
      )
        return;
      if (!stepStartTimestamp) startMoving = true;
    } else if (direction === "right") {
      if (finalPositions.column === columns - 1) return;
      if (
        lanes[finalPositions.lane].type === "forest" &&
        lanes[finalPositions.lane].occupiedPositions.has(
          finalPositions.column + 1
        )
      )
        return;
      if (!stepStartTimestamp) startMoving = true;
    }
    moves.push(direction);
  }
}

function animate(timestamp) {
  requestAnimationFrame(animate);

  if (!previousTimestamp) previousTimestamp = timestamp;
  const delta = timestamp - previousTimestamp;
  previousTimestamp = timestamp;

  lanes.forEach((lane) => {
    if (lane.type === "car" || lane.type === "truck" || lane.type == "water") {
      const aBitBeforeTheBeginingOfLane =
        (-boardWidth * zoom) / 2 - positionWidth * 2 * zoom;
      const aBitAfterTheEndOFLane =
        (boardWidth * zoom) / 2 + positionWidth * 2 * zoom;
      lane.vechicles.forEach((vechicle) => {
        if (lane.direction) {
          vechicle.position.x =
            vechicle.position.x < aBitBeforeTheBeginingOfLane
              ? aBitAfterTheEndOFLane
              : (vechicle.position.x -= (lane.speed / 16) * delta);
        } else {
          vechicle.position.x =
            vechicle.position.x > aBitAfterTheEndOFLane
              ? aBitBeforeTheBeginingOfLane
              : (vechicle.position.x += (lane.speed / 16) * delta);
        }
      });
    }
  });

  if (startMoving) {
    stepStartTimestamp = timestamp;
    startMoving = false;
  }

  if (stepStartTimestamp) {
    const moveDeltaTime = timestamp - stepStartTimestamp;
    const moveDeltaDistance =
      Math.min(moveDeltaTime / stepTime, 1) * positionWidth * zoom;
    const jumpDeltaDistance =
      Math.sin(Math.min(moveDeltaTime / stepTime, 1) * Math.PI) * 8 * zoom;
    switch (moves[0]) {
      case "forward": {
        const positionY =
          currentLane * positionWidth * zoom + moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        player.position.y = positionY;

        player.position.z = jumpDeltaDistance;
        break;
      }
      case "backward": {
        const positionY =
          currentLane * positionWidth * zoom - moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        player.position.y = positionY;

        player.position.z = jumpDeltaDistance;
        break;
      }
      case "left": {
        const positionX =
          (currentColumn * positionWidth + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2 -
          moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        player.position.x = positionX;
        player.position.z = jumpDeltaDistance;
        break;
      }
      case "right": {
        const positionX =
          (currentColumn * positionWidth + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2 +
          moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        player.position.x = positionX;

        player.position.z = jumpDeltaDistance;
        break;
      }
    }
    if (moveDeltaTime > stepTime) {
      switch (moves[0]) {
        case "forward": {
          currentLane++;
          myScore.innerHTML = currentLane;
          break;
        }
        case "backward": {
          currentLane--;
          myScore.innerHTML = currentLane;
          break;
        }
        case "left": {
          currentColumn--;
          break;
        }
        case "right": {
          currentColumn++;
          break;
        }
      }
      moves.shift();
      stepStartTimestamp = moves.length === 0 ? null : timestamp;
    }
  }

  // Coliziune pe lane, in caz de coliziune open lose menu
  if (
    lanes[currentLane].type === "car" ||
    lanes[currentLane].type === "truck"
  ) {
    const playerMinX = player.position.x - (playerSize * zoom) / 2;
    const playerMaxX = player.position.x + (playerSize * zoom) / 2;
    const vechicleLength = { car: 60, truck: 105 }[lanes[currentLane].type];
    lanes[currentLane].vechicles.forEach((vechicle) => {
      const carMinX = vechicle.position.x - (vechicleLength * zoom) / 2;
      const carMaxX = vechicle.position.x + (vechicleLength * zoom) / 2;
      if (playerMaxX > carMinX && playerMinX < carMaxX) {
        isDead = true;
        document.querySelector(".final-score").innerHTML = myScore.innerHTML;
        endMenu.classList.remove("no-display");
      }
    });
  }
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
