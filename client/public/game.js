(function () {
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  const FOV = Math.PI / 3;
  const RAYS = 320;
  const MAX_DEPTH = 30;

  const PLAYER_SPEED = 0.48;
  const BASE_DT = 1 / 60;
  const MINIMAP_SIZE = 140;
  const MINIMAP_CELL = 2;

  // ---------------------------------------------------------------------------
  // ENEMY TYPES - Sprites por tipo (spriteSrc: caminho da imagem)
  // ---------------------------------------------------------------------------
  const enemyTypes = {
    zombie: { name: "Zombie", speed: 0.22, health: 1, attackCooldown: 60, damage: 1, attackRange: 0.85, color: "red", spawnChance: 0.6, spriteKey: "drone", spriteSrc: "enemy-drone.png" },
    runner: { name: "Runner", speed: 0.35, health: 1, attackCooldown: 80, damage: 1, attackRange: 0.75, color: "#FF6B00", spawnChance: 0.25, spriteKey: "drone", spriteSrc: "enemy-drone.png" },
    tank: { name: "Tank", speed: 0.1, health: 3, attackCooldown: 40, damage: 2, attackRange: 0.9, color: "darkred", spawnChance: 0.1, spriteKey: "drone", spriteSrc: "enemy-drone.png" },
    ranged: { name: "Ranged", speed: 0.18, health: 1, attackCooldown: 100, damage: 1, attackRange: 2.5, color: "#FF00FF", spawnChance: 0.05, spriteKey: "drone", spriteSrc: "enemy-drone.png" },
    mike: {
      name: "Mike",
      speed: 0.12,
      health: 5,
      attackCooldown: 90,
      damage: 999,
      attackRange: 0.95,
      color: "#22AA22",
      spawnChance: 0,
      spriteKey: "mike",
      spriteSrc: "mike.png",
      spriteSheet: {
        rows: 6,
        cols: 6,
        states: { idle: { row: 0, frames: 3 }, move: { row: 1, frames: 6 }, attack: { row: 2, frames: 5 }, damage: { row: 3, frames: 4 }, death: { row: 5, frames: 3 } },
        animFps: 12,
      },
    },
  };

  const SPRITE_SHEET = {
    rows: 5,
    cols: 6,
    states: { idle: { row: 0, frames: 4 }, move: { row: 1, frames: 6 }, attack: { row: 2, frames: 5 }, damage: { row: 3, frames: 2 }, death: { row: 4, frames: 6 } },
    animFps: 14,
  };

  const GUN_SPRITE = { cols: 6, rows: 2, frames: 5, animFps: 18 };

  const PLAYER_CHARACTER = {
    rows: 4,
    cols: 8,
    states: { walkFront: { row: 0, frames: 8 }, idleFront: { row: 1, frames: 3 }, walkRight: { row: 2, frames: 8 }, walkLeft: { row: 3, frames: 8 } },
    animFps: 10,
  };
  const GUN_FRAME_MAP = [
    { r: 0, c: 0 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 1, c: 2 },
    { r: 0, c: 0 },
  ];

  const spriteCache = {};
  const gunSpriteCache = { img: null, processed: null };
  const WALL_TEX = { img: null, tileSize: 32 };
  const FLOOR_TEX = { img: null };
  const SKY_TEX = { img: null };
  function getWallTexture() {
    if (!WALL_TEX.img) {
      const img = new Image();
      img.src = "wall-brick.png";
      WALL_TEX.img = img;
    }
    return WALL_TEX.img;
  }
  function getFloorTexture() {
    if (!FLOOR_TEX.img) {
      const img = new Image();
      img.src = "floor-stone.png";
      FLOOR_TEX.img = img;
    }
    return FLOOR_TEX.img;
  }
  function getSkyTexture() {
    if (!SKY_TEX.img) {
      const img = new Image();
      img.src = "sky-texture.png";
      SKY_TEX.img = img;
    }
    return SKY_TEX.img;
  }

  function removeGunBackground(img) {
    if (gunSpriteCache.processed) return gunSpriteCache.processed;
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const cx = c.getContext("2d");
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height);
      const corners = [0, (c.height - 1) * c.width * 4, (c.width - 1) * 4];
      let br = 255, bg = 255, bb = 255;
      for (const i of corners) {
        br = Math.min(br, d.data[i]);
        bg = Math.min(bg, d.data[i + 1]);
        bb = Math.min(bb, d.data[i + 2]);
      }
      const tol = 45;
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
        const match = Math.abs(r - br) < tol && Math.abs(g - bg) < tol && Math.abs(b - bb) < tol;
        const veryDark = r < 45 && g < 45 && b < 45;
        if (match || veryDark) d.data[i + 3] = 0;
      }
      cx.putImageData(d, 0, 0);
      gunSpriteCache.processed = c;
      return c;
    } catch (_) {
      return img;
    }
  }

  function getGunSprite() {
    if (!gunSpriteCache.img) {
      const img = new Image();
      img.src = "gun-pistol.png";
      gunSpriteCache.img = img;
      gunSpriteCache.processed = null;
    }
    return gunSpriteCache.img;
  }

  function getEnemySprite(typeData) {
    const key = typeData.spriteKey || "drone";
    if (!spriteCache[key]) {
      const img = new Image();
      img.src = typeData.spriteSrc || "enemy-drone.png";
      spriteCache[key] = img;
    }
    return spriteCache[key];
  }
  const ammoBoxSpriteCache = { img: null, processed: null };
  function getAmmoBoxSprite() {
    if (!ammoBoxSpriteCache.img) {
      const img = new Image();
      img.src = "ammo-box.png";
      ammoBoxSpriteCache.img = img;
    }
    return ammoBoxSpriteCache.img;
  }
  function getAmmoBoxSpriteProcessed() {
    const img = getAmmoBoxSprite();
    if (!img.complete || !img.naturalWidth) return img;
    if (ammoBoxSpriteCache.processed) return ammoBoxSpriteCache.processed;
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const cx = c.getContext("2d");
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height);
      const corners = [0, (c.height - 1) * c.width * 4, (c.width - 1) * 4];
      let br = 255, bg = 255, bb = 255;
      for (const i of corners) {
        br = Math.min(br, d.data[i]);
        bg = Math.min(bg, d.data[i + 1]);
        bb = Math.min(bb, d.data[i + 2]);
      }
      const tol = 50;
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
        const match = Math.abs(r - br) < tol && Math.abs(g - bg) < tol && Math.abs(b - bb) < tol;
        if (match) d.data[i + 3] = 0;
      }
      cx.putImageData(d, 0, 0);
      ammoBoxSpriteCache.processed = c;
      return c;
    } catch (_) {
      return img;
    }
  }

  const playerCharSpriteCache = { img: null, processed: null };
  function getPlayerCharacterSprite() {
    if (!playerCharSpriteCache.img) {
      const img = new Image();
      img.src = "player-character.png";
      playerCharSpriteCache.img = img;
    }
    return playerCharSpriteCache.img;
  }
  function getPlayerCharacterSpriteProcessed() {
    const img = getPlayerCharacterSprite();
    if (!img.complete || !img.naturalWidth) return img;
    if (playerCharSpriteCache.processed) return playerCharSpriteCache.processed;
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const cx = c.getContext("2d");
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height);
      const corners = [0, (c.height - 1) * c.width * 4, (c.width - 1) * 4];
      let br = 255, bg = 255, bb = 255;
      for (const i of corners) {
        br = Math.min(br, d.data[i]);
        bg = Math.min(bg, d.data[i + 1]);
        bb = Math.min(bb, d.data[i + 2]);
      }
      const tol = 45;
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
        const match = Math.abs(r - br) < tol && Math.abs(g - bg) < tol && Math.abs(b - bb) < tol;
        if (match) d.data[i + 3] = 0;
      }
      cx.putImageData(d, 0, 0);
      playerCharSpriteCache.processed = c;
      return c;
    } catch (_) {
      return img;
    }
  }

  const healthBoxSpriteCache = { img: null, processed: null };
  function getHealthBoxSprite() {
    if (!healthBoxSpriteCache.img) {
      const img = new Image();
      img.src = "health-box.png";
      healthBoxSpriteCache.img = img;
    }
    return healthBoxSpriteCache.img;
  }
  function getHealthBoxSpriteProcessed() {
    const img = getHealthBoxSprite();
    if (!img.complete || !img.naturalWidth) return img;
    if (healthBoxSpriteCache.processed) return healthBoxSpriteCache.processed;
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const cx = c.getContext("2d");
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height);
      const corners = [0, (c.height - 1) * c.width * 4, (c.width - 1) * 4];
      let br = 255, bg = 255, bb = 255;
      for (const i of corners) {
        br = Math.min(br, d.data[i]);
        bg = Math.min(bg, d.data[i + 1]);
        bb = Math.min(bb, d.data[i + 2]);
      }
      const tol = 55;
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
        const match = Math.abs(r - br) < tol && Math.abs(g - bg) < tol && Math.abs(b - bb) < tol;
        if (match) d.data[i + 3] = 0;
      }
      cx.putImageData(d, 0, 0);
      healthBoxSpriteCache.processed = c;
      return c;
    } catch (_) {
      return img;
    }
  }

  const difficultySettings = {
    easy: { enemySpeedMultiplier: 0.5, scoreMultiplier: 0.5, name: "EASY" },
    normal: { enemySpeedMultiplier: 1.0, scoreMultiplier: 1.0, name: "NORMAL" },
    hard: { enemySpeedMultiplier: 1.5, scoreMultiplier: 1.5, name: "HARD" },
    nightmare: { enemySpeedMultiplier: 2.0, scoreMultiplier: 2.0, name: "NIGHTMARE" },
  };

  // ---------------------------------------------------------------------------
  // MAP
  // ---------------------------------------------------------------------------
  function generateMap() {
    const width = 84;
    const height = 54;
    const map = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) row.push(1);
        else row.push(0);
      }
      map.push(row);
    }
    for (let y = 5; y < height - 5; y += 8) {
      for (let x = 5; x < width - 5; x += 10) {
        const roomSize = Math.random() > 0.5 ? 3 : 4;
        const roomType = Math.floor(Math.random() * 3);
        if (roomType === 0) {
          for (let ry = 0; ry < roomSize; ry++)
            for (let rx = 0; rx < roomSize; rx++)
              if (y + ry < height - 1 && x + rx < width - 1) map[y + ry][x + rx] = 1;
        } else if (roomType === 1) {
          for (let i = 0; i < roomSize + 2; i++) {
            if (y + i < height - 1) map[y + i][x] = 1;
            if (x + i < width - 1) map[y][x + i] = 1;
          }
        } else {
          for (let i = 0; i < roomSize; i++) {
            if (y + i < height - 1) map[y + i][x] = 1;
            if (x + i < width - 1) map[y][x + i] = 1;
          }
        }
      }
    }
    return map;
  }

  const map = generateMap();

  function isWall(x, y) {
    const row = Math.floor(y);
    const col = Math.floor(x);
    if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return true;
    return map[row][col] === 1;
  }

  // ---------------------------------------------------------------------------
  // PLAYER - Movimento com wall sliding (eixos X e Y independentes)
  // ---------------------------------------------------------------------------
  class Player {
    constructor() {
      this.x = 3;
      this.y = 3;
      this.angle = 0;
    }

    move(dt, keys, moveSpeedMult = 1) {
      const speed = PLAYER_SPEED * moveSpeedMult * dt;
      let newX = this.x;
      let newY = this.y;

      if (keys["w"] || keys["arrowup"]) {
        newX += Math.cos(this.angle) * speed;
        newY += Math.sin(this.angle) * speed;
      }
      if (keys["s"] || keys["arrowdown"]) {
        newX -= Math.cos(this.angle) * speed;
        newY -= Math.sin(this.angle) * speed;
      }
      if (keys["a"] || keys["arrowleft"]) {
        newX += Math.cos(this.angle - Math.PI / 2) * speed;
        newY += Math.sin(this.angle - Math.PI / 2) * speed;
      }
      if (keys["d"] || keys["arrowright"]) {
        newX += Math.cos(this.angle + Math.PI / 2) * speed;
        newY += Math.sin(this.angle + Math.PI / 2) * speed;
      }

      // Wall sliding: verificar X e Y de forma independente para deslizar na parede
      if (!isWall(newX, this.y)) this.x = newX;
      if (!isWall(this.x, newY)) this.y = newY;
    }
  }

  const ENEMY_STATE = { IDLE: 0, MOVING: 1, ATTACKING: 2, DAMAGE: 3, DEAD: 4 };
  const STATE_NAMES = ["idle", "move", "attack", "damage", "death"];

  // ---------------------------------------------------------------------------
  // ENEMY - Estados: parado, movimento, ataque, dano, morte (proporcional à dificuldade)
  // ---------------------------------------------------------------------------
  class Enemy {
    constructor(x, y, typeKey) {
      const type = enemyTypes[typeKey];
      this.x = x;
      this.y = y;
      this.type = typeKey;
      this.typeData = type;
      this.alive = true;
      this.health = type.health;
      this.attackCooldown = 0;
      this.state = ENEMY_STATE.IDLE;
      this.animFrame = 0;
      this.animTimer = 0;
      this.stateTimer = 0;
      this.idleChance = 0.15 + Math.random() * 0.2;
      this.moveChance = 0.85 + Math.random() * 0.15;
      this.stuckFrames = 0;
    }

    update(dt, player, currentDifficultySettings) {
      if (!this.alive) return null;
      if (this.state === ENEMY_STATE.DEAD) return null;

      const mult = currentDifficultySettings.enemySpeedMultiplier;
      const baseSpeed = this.typeData.speed * mult * (0.9 + Math.random() * 0.2);
      const speed = baseSpeed * dt * 60;

      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.stateTimer += dt;

      if (this.state === ENEMY_STATE.DAMAGE) {
        if (this.stateTimer > 0.25) {
          this.state = dist > this.typeData.attackRange ? ENEMY_STATE.MOVING : ENEMY_STATE.ATTACKING;
          this.stateTimer = 0;
        }
        return null;
      }

      if (this.state === ENEMY_STATE.ATTACKING) {
        const sheet = this.typeData.spriteSheet || SPRITE_SHEET;
        const atk = sheet.states.attack;
        if (this.animFrame >= atk.frames - 1 && this.stateTimer > 0.4) {
          this.attackCooldown = this.typeData.attackCooldown;
          this.state = ENEMY_STATE.MOVING;
          this.stateTimer = 0;
          if (dist < this.typeData.attackRange) return { damage: this.typeData.damage };
        }
        return null;
      }

      if (dist < this.typeData.attackRange && this.attackCooldown <= 0 && this.state !== ENEMY_STATE.IDLE) {
        this.state = ENEMY_STATE.ATTACKING;
        this.animFrame = 0;
        this.stateTimer = 0;
        return null;
      }

      if (this.attackCooldown > 0) this.attackCooldown -= dt * 60;

      if (this.state === ENEMY_STATE.IDLE) {
        if (Math.random() < this.moveChance * dt * 2 || dist < 8) {
          this.state = ENEMY_STATE.MOVING;
          this.stateTimer = 0;
        } else {
          return null;
        }
      }

      if (this.state === ENEMY_STATE.MOVING) {
        if (Math.random() < this.idleChance * dt * 0.5 && dist > 12) {
          this.state = ENEMY_STATE.IDLE;
          this.stateTimer = 0;
          return null;
        }
        if (dist > this.typeData.attackRange && dist > 0.01) {
          const invDist = 1 / dist;
          const nx = this.x + dx * invDist * speed;
          const ny = this.y + dy * invDist * speed;
          const movedX = !isWall(nx, this.y);
          const movedY = !isWall(this.x, ny);
          if (movedX) this.x = nx;
          if (movedY) this.y = ny;
          if (!movedX && !movedY) {
            this.stuckFrames = (this.stuckFrames || 0) + 1;
            if (this.stuckFrames > 3) {
              const invD = 1 / dist;
              const perpX = -dy * invD;
              const perpY = dx * invD;
              const slideSpeed = speed * 0.7;
              const alt1x = this.x + perpX * slideSpeed;
              const alt1y = this.y + perpY * slideSpeed;
              const alt2x = this.x - perpX * slideSpeed;
              const alt2y = this.y - perpY * slideSpeed;
              if (!isWall(alt1x, this.y)) { this.x = alt1x; this.stuckFrames = 0; }
              else if (!isWall(this.x, alt1y)) { this.y = alt1y; this.stuckFrames = 0; }
              else if (!isWall(alt2x, this.y)) { this.x = alt2x; this.stuckFrames = 0; }
              else if (!isWall(this.x, alt2y)) { this.y = alt2y; this.stuckFrames = 0; }
              else {
                const backX = this.x - dx * invD * slideSpeed;
                const backY = this.y - dy * invD * slideSpeed;
                if (!isWall(backX, this.y)) this.x = backX;
                if (!isWall(this.x, backY)) this.y = backY;
                this.stuckFrames = 0;
              }
            }
          } else {
            this.stuckFrames = 0;
          }
        }
      }
      return null;
    }

    takeDamage() {
      if (this.health <= 0) return;
      this.health--;
      this.state = ENEMY_STATE.DAMAGE;
      this.animFrame = 0;
      this.stateTimer = 0;
      if (this.health <= 0) {
        this.state = ENEMY_STATE.DEAD;
        this.animFrame = 0;
      }
    }

    advanceAnimation(dt) {
      const sheet = this.typeData.spriteSheet || SPRITE_SHEET;
      const s = STATE_NAMES[this.state];
      const cfg = sheet.states[s] || sheet.states.idle;
      this.animTimer += dt;
      if (this.animTimer > 1 / sheet.animFps) {
        this.animTimer = 0;
        if (this.state === ENEMY_STATE.DEAD) {
          if (this.animFrame < cfg.frames - 1) this.animFrame++;
          else this.alive = false;
        } else {
          this.animFrame = (this.animFrame + 1) % cfg.frames;
        }
      }
    }

    getSpriteFrame() {
      const sheet = this.typeData.spriteSheet || SPRITE_SHEET;
      const s = STATE_NAMES[this.state];
      const cfg = sheet.states[s] || sheet.states.idle;
      return { row: cfg.row, col: this.animFrame, frames: cfg.frames, sheet };
    }
  }

  // ---------------------------------------------------------------------------
  // RAYCASTER - Cast rays e retorna Z-buffer para ordenação de sprites
  // ---------------------------------------------------------------------------
  class Raycaster {
    constructor(player, mapRef) {
      this.player = player;
      this.mapRef = mapRef;
      this.depthBuffer = new Float32Array(RAYS);
    }

    castRays() {
      const tex = getWallTexture();
      const tw = tex.naturalWidth || 328;
      const th = tex.naturalHeight || 254;

      for (let i = 0; i < RAYS; i++) {
        const angle = this.player.angle - FOV / 2 + (i / RAYS) * FOV;
        let x = this.player.x;
        let y = this.player.y;
        const stepX = Math.cos(angle);
        const stepY = Math.sin(angle);
        const step = 0.05;
        let dist = 0;
        let hit = false;
        let wallX = 0;
        let side = 0;
        let mapX = 0, mapY = 0;

        while (!hit && dist < MAX_DEPTH) {
          dist += step;
          const prevX = x, prevY = y;
          x += stepX * step;
          y += stepY * step;
          if (isWall(x, y)) {
            hit = true;
            mapX = Math.floor(x);
            mapY = Math.floor(y);
            const prevMapX = Math.floor(prevX);
            const prevMapY = Math.floor(prevY);
            if (prevMapX !== mapX) {
              side = 0;
              wallX = y - mapY;
            } else {
              side = 1;
              wallX = x - mapX;
            }
            if ((side === 0 && stepX > 0) || (side === 1 && stepY < 0)) wallX = 1 - wallX;
          }
        }

        const perpDist = dist * Math.cos(angle - this.player.angle);
        this.depthBuffer[i] = perpDist;

        const wallHeight = HEIGHT / perpDist;
        const drawX = (i / RAYS) * WIDTH;
        const drawY = HEIGHT / 2 - wallHeight / 2;
        const stripW = Math.ceil(WIDTH / RAYS) + 1;

        if (tex.complete && tw > 0 && th > 0) {
          const srcX = Math.max(0, Math.min(Math.floor((wallX % 1) * tw), tw - 1));
          ctx.drawImage(tex, srcX, 0, 1, th, drawX, drawY, stripW, wallHeight);
        } else {
          const color = Math.max(0, Math.min(255, 255 - perpDist * 8));
          ctx.fillStyle = `rgb(${color},${color},${color})`;
          ctx.fillRect(drawX, drawY, stripW, wallHeight);
        }
      }
      return this.depthBuffer;
    }

    getDepthAtColumn(col) {
      const i = Math.floor((col / WIDTH) * RAYS);
      return this.depthBuffer[Math.max(0, Math.min(i, RAYS - 1))] ?? Infinity;
    }
  }

  // ---------------------------------------------------------------------------
  // GAME - Loop principal com delta time
  // ---------------------------------------------------------------------------
  class Game {
    constructor() {
      this.player = new Player();
      this.raycaster = new Raycaster(this.player, map);
      this.enemies = [];
      this.ammoBoxes = [];
      this.healthBoxes = [];
      this.otherPlayers = [];
      this.keys = {};

      this.ammo = 5;
      this.lives = 5;
      this.gameOver = false;
      this.enemiesKilled = 0;
      this.gunRecoil = 0;
      this.gunAnimFrame = 0;
      this.gunAnimTimer = 0;
      this.score = 0;
      this.gameStartTime = 0;
      this.gameDuration = 0;
      this.currentPhase = 1;
      this.phaseEnemiesKilled = 0;

      this.gameSettings = {
        mouseSensitivity: parseFloat(localStorage.getItem("mouseSensitivity")) || 0.002,
        moveSpeed: parseFloat(localStorage.getItem("moveSpeed")) || 1.0,
        volume: 0.5,
        difficulty: 1,
      };

      this.gameState = "playing";
      this.settingsOpen = false;
      this.username = localStorage.getItem("username") || "Player";
      this.selectedGameMode = localStorage.getItem("selectedGameMode") || "singleplayer";
      this.selectedDifficulty = localStorage.getItem("selectedDifficulty") || "normal";
      window.scoreSubmitted = false;

      this.currentDifficultySettings = difficultySettings[this.selectedDifficulty] || difficultySettings.normal;

      this.lastFrameTime = 0;

      if (this.selectedGameMode === "multiplayer") {
        this.spawnDemoOtherPlayer();
      }
    }

    spawnDemoOtherPlayer() {
      let x, y, valid;
      do {
        valid = true;
        x = Math.random() * (map[0].length - 8) + 4;
        y = Math.random() * (map.length - 8) + 4;
        if (isWall(x, y) || (Math.abs(x - this.player.x) < 8 && Math.abs(y - this.player.y) < 8)) valid = false;
      } while (!valid);
      this.otherPlayers.push({
        x, y, angle: Math.random() * Math.PI * 2, username: "Jogador 2",
        moving: false, animFrame: 0, animTimer: 0, moveTimer: 0,
      });
    }

    spawnEnemies() {
      this.enemies = [];
      this.ammoBoxes = [];
      this.healthBoxes = [];
      const count = 2 + this.currentPhase * 2;
      const normalTypes = Object.entries(enemyTypes).filter(([k, t]) => t.spawnChance > 0);
      const totalChance = normalTypes.reduce((s, [, t]) => s + t.spawnChance, 0);

      for (let i = 0; i < count; i++) {
        let x, y, valid;
        do {
          valid = true;
          x = Math.random() * (map[0].length - 4) + 2;
          y = Math.random() * (map.length - 4) + 2;
          if (isWall(x, y) || (Math.abs(x - this.player.x) < 5 && Math.abs(y - this.player.y) < 5)) valid = false;
        } while (!valid);

        let typeKey = "zombie";
        const rand = Math.random() * totalChance;
        let cumulative = 0;
        for (const [key, type] of normalTypes) {
          cumulative += type.spawnChance;
          if (rand < cumulative) {
            typeKey = key;
            break;
          }
        }
        this.enemies.push(new Enemy(x, y, typeKey));
      }

      // Mike: vilão principal, 1 por fase
      let mx, my, mValid;
      let attempts = 0;
      do {
        mValid = true;
        mx = Math.random() * (map[0].length - 4) + 2;
        my = Math.random() * (map.length - 4) + 2;
        if (isWall(mx, my) || (Math.abs(mx - this.player.x) < 6 && Math.abs(my - this.player.y) < 6)) mValid = false;
        if (++attempts > 50) break;
      } while (!mValid);
      if (mValid) this.enemies.push(new Enemy(mx, my, "mike"));

      // Caixas de munição: 2-3 por fase
      const ammoCount = 2 + Math.floor(Math.random() * 2);
      for (let a = 0; a < ammoCount; a++) {
        let ax, ay, aValid;
        let atAttempts = 0;
        do {
          aValid = true;
          ax = Math.random() * (map[0].length - 4) + 2;
          ay = Math.random() * (map.length - 4) + 2;
          if (isWall(ax, ay) || (Math.abs(ax - this.player.x) < 4 && Math.abs(ay - this.player.y) < 4)) aValid = false;
          for (const e of this.enemies) {
            if (Math.abs(ax - e.x) < 2 && Math.abs(ay - e.y) < 2) aValid = false;
          }
          for (const b of this.ammoBoxes) {
            if (Math.abs(ax - b.x) < 1.5 && Math.abs(ay - b.y) < 1.5) aValid = false;
          }
          if (++atAttempts > 30) break;
        } while (!aValid);
        if (aValid) this.ammoBoxes.push({ x: ax, y: ay });
      }

      // Caixas de vida: 1-2 por fase
      const healthCount = 1 + Math.floor(Math.random() * 2);
      for (let h = 0; h < healthCount; h++) {
        let hx, hy, hValid;
        let htAttempts = 0;
        do {
          hValid = true;
          hx = Math.random() * (map[0].length - 4) + 2;
          hy = Math.random() * (map.length - 4) + 2;
          if (isWall(hx, hy) || (Math.abs(hx - this.player.x) < 4 && Math.abs(hy - this.player.y) < 4)) hValid = false;
          for (const e of this.enemies) {
            if (Math.abs(hx - e.x) < 2 && Math.abs(hy - e.y) < 2) hValid = false;
          }
          for (const b of this.ammoBoxes) {
            if (Math.abs(hx - b.x) < 1.5 && Math.abs(hy - b.y) < 1.5) hValid = false;
          }
          for (const b of this.healthBoxes) {
            if (Math.abs(hx - b.x) < 1.5 && Math.abs(hy - b.y) < 1.5) hValid = false;
          }
          if (++htAttempts > 30) break;
        } while (!hValid);
        if (hValid) this.healthBoxes.push({ x: hx, y: hy });
      }
    }

    getPhaseColor() {
      const red = Math.min(255, 100 + this.currentPhase * 30);
      const green = Math.max(0, 150 - this.currentPhase * 20);
      const blue = Math.max(0, 150 - this.currentPhase * 20);
      return `rgb(${red},${green},${blue})`;
    }

    drawBackground() {
      const floorTex = getFloorTexture();
      const skyTex = getSkyTexture();

      if (floorTex.complete && floorTex.naturalWidth > 0 && floorTex.naturalHeight > 0) {
        ctx.fillStyle = ctx.createPattern(floorTex, "repeat");
        ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);
      } else {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);
      }
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);

      if (skyTex.complete && skyTex.naturalWidth > 0 && skyTex.naturalHeight > 0) {
        ctx.drawImage(skyTex, 0, 0, skyTex.naturalWidth, skyTex.naturalHeight, 0, 0, WIDTH, HEIGHT / 2);
      } else {
        ctx.fillStyle = this.getPhaseColor();
        ctx.fillRect(0, 0, WIDTH, HEIGHT / 2);
      }
    }

    drawAmmoBoxes(depthBuffer) {
      const sprite = getAmmoBoxSpriteProcessed();
      const imgW = sprite.width || sprite.naturalWidth || 0;
      const imgH = sprite.height || sprite.naturalHeight || 0;

      this.ammoBoxes.forEach((b) => {
        const dx = b.x - this.player.x;
        const dy = b.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - this.player.angle;

        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;

        if (Math.abs(angle) >= FOV) return;

        const screenX = (angle / FOV + 0.5) * WIDTH;
        const spriteHeight = HEIGHT / dist * 0.5;
        const spriteWidth = spriteHeight * (imgW / imgH);
        const left = screenX - spriteWidth / 2;
        const top = HEIGHT / 2 - spriteHeight / 2;

        const centerCol = Math.floor(screenX);
        const rayIdx = Math.min(RAYS - 1, Math.max(0, Math.floor((centerCol / WIDTH) * RAYS)));
        const wallDist = depthBuffer[rayIdx] ?? Infinity;
        if (dist < wallDist && imgW > 0 && imgH > 0) {
          ctx.drawImage(sprite, 0, 0, imgW, imgH, left, top, spriteWidth, spriteHeight);
        }
      });
    }

    drawOtherPlayers(depthBuffer, dt = 1 / 60) {
      if (this.otherPlayers.length === 0) return;
      const sprite = getPlayerCharacterSpriteProcessed();
      const imgW = sprite.width || sprite.naturalWidth || 0;
      const imgH = sprite.height || sprite.naturalHeight || 0;
      if (imgW <= 0 || imgH <= 0) return;

      const sheet = PLAYER_CHARACTER;
      const frameW = imgW / sheet.cols;
      const frameH = imgH / sheet.rows;

      this.otherPlayers.forEach((op) => {
        const dx = op.x - this.player.x;
        const dy = op.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - this.player.angle;

        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;

        if (Math.abs(angle) >= FOV) return;

        const angleToUs = Math.atan2(this.player.y - op.y, this.player.x - op.x);
        let rel = op.angle - angleToUs;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;

        let state, row, frames;
        if (Math.abs(rel) < Math.PI / 3) {
          state = op.moving ? "walkFront" : "idleFront";
        } else if (rel > 0) {
          state = "walkRight";
        } else {
          state = "walkLeft";
        }
        const cfg = sheet.states[state] || sheet.states.idleFront;
        row = cfg.row;
        frames = cfg.frames;
        const col = Math.floor(op.animFrame) % frames;

        const screenX = (angle / FOV + 0.5) * WIDTH;
        const spriteHeight = HEIGHT / dist * 0.7;
        const spriteWidth = spriteHeight * (frameW / frameH);
        const left = screenX - spriteWidth / 2;
        const top = HEIGHT / 2 - spriteHeight / 2;

        const centerCol = Math.floor(screenX);
        const rayIdx = Math.min(RAYS - 1, Math.max(0, Math.floor((centerCol / WIDTH) * RAYS)));
        const wallDist = depthBuffer[rayIdx] ?? Infinity;
        if (dist < wallDist) {
          ctx.drawImage(sprite, col * frameW, row * frameH, frameW, frameH, left, top, spriteWidth, spriteHeight);
        }
      });
    }

    updateOtherPlayers(dt) {
      this.otherPlayers.forEach((op) => {
        const angleToUs = Math.atan2(this.player.y - op.y, this.player.x - op.x);
        let rel = op.angle - angleToUs;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        const state = Math.abs(rel) < Math.PI / 3
          ? (op.moving ? "walkFront" : "idleFront")
          : (rel > 0 ? "walkRight" : "walkLeft");
        const cfg = PLAYER_CHARACTER.states[state] || PLAYER_CHARACTER.states.idleFront;

        op.animTimer += dt;
        if (op.animTimer > 1 / PLAYER_CHARACTER.animFps) {
          op.animTimer = 0;
          op.animFrame = (op.animFrame + 1) % cfg.frames;
        }
        op.moveTimer += dt;
        if (op.moveTimer > 2 + Math.random() * 2) {
          op.moveTimer = 0;
          op.moving = Math.random() < 0.6;
          if (op.moving) op.angle = Math.random() * Math.PI * 2;
        }
        if (op.moving) {
          const speed = 0.15 * dt;
          const nx = op.x + Math.cos(op.angle) * speed;
          const ny = op.y + Math.sin(op.angle) * speed;
          if (!isWall(nx, op.y)) op.x = nx;
          if (!isWall(op.x, ny)) op.y = ny;
        }
      });
    }

    drawHealthBoxes(depthBuffer) {
      const sprite = getHealthBoxSpriteProcessed();
      const imgW = sprite.width || sprite.naturalWidth || 0;
      const imgH = sprite.height || sprite.naturalHeight || 0;

      this.healthBoxes.forEach((b) => {
        const dx = b.x - this.player.x;
        const dy = b.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - this.player.angle;

        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;

        if (Math.abs(angle) >= FOV) return;

        const screenX = (angle / FOV + 0.5) * WIDTH;
        const spriteHeight = HEIGHT / dist * 0.45;
        const spriteWidth = spriteHeight * (imgW / imgH);
        const left = screenX - spriteWidth / 2;
        const top = HEIGHT / 2 - spriteHeight / 2;

        const centerCol = Math.floor(screenX);
        const rayIdx = Math.min(RAYS - 1, Math.max(0, Math.floor((centerCol / WIDTH) * RAYS)));
        const wallDist = depthBuffer[rayIdx] ?? Infinity;
        if (dist < wallDist && imgW > 0 && imgH > 0) {
          ctx.drawImage(sprite, 0, 0, imgW, imgH, left, top, spriteWidth, spriteHeight);
        }
      });
    }

    drawEnemies(depthBuffer, dt = 1 / 60) {
      this.enemies.forEach((e) => {
        if (!e.alive) return;

        const frameInfo = e.getSpriteFrame();
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - this.player.angle;

        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;

        if (Math.abs(angle) >= FOV) return;

        const screenX = (angle / FOV + 0.5) * WIDTH;
        const spriteHeight = HEIGHT / dist;
        const spriteWidth = spriteHeight * 0.6;
        const left = screenX - spriteWidth / 2;
        const top = HEIGHT / 2 - spriteHeight / 2;

        const sprite = getEnemySprite(e.typeData);
        const imgW = sprite.naturalWidth || 0;
        const imgH = sprite.naturalHeight || 0;
        const sheet = frameInfo.sheet || SPRITE_SHEET;

        if (sprite.complete && imgW > 0 && imgH > 0) {
          const frameW = imgW / sheet.cols;
          const frameH = imgH / sheet.rows;
          const sx = frameInfo.col * frameW;
          const sy = frameInfo.row * frameH;

          const centerCol = Math.floor(screenX);
          const rayIdx = Math.min(RAYS - 1, Math.max(0, Math.floor((centerCol / WIDTH) * RAYS)));
          const wallDist = depthBuffer[rayIdx] ?? Infinity;
          if (dist < wallDist) {
            ctx.drawImage(sprite, sx, sy, frameW, frameH, left, top, spriteWidth, spriteHeight);
          }
        } else {
          ctx.fillStyle = e.typeData.color;
          ctx.fillRect(left, top, spriteWidth, spriteHeight);
        }
      });
    }

    drawGun(dt) {
      const gunImg = getGunSprite();
      if (!gunImg.complete || !gunImg.naturalWidth) {
        ctx.fillStyle = "brown";
        ctx.fillRect(WIDTH / 2 - 10, HEIGHT - 150, 20, 40);
        return;
      }
      const sprite = removeGunBackground(gunImg);
      const imgW = sprite.width || sprite.naturalWidth;
      const imgH = sprite.height || sprite.naturalHeight;
      const frameW = imgW / GUN_SPRITE.cols;
      const frameH = imgH / GUN_SPRITE.rows;
      const idx = Math.min(this.gunAnimFrame, GUN_FRAME_MAP.length - 1);
      const f = GUN_FRAME_MAP[idx];
      const sx = f.c * frameW;
      const sy = f.r * frameH;
      const gunH = 280;
      const gunW = gunH * (frameW / frameH);
      const drawX = WIDTH / 2 - gunW / 2;
      const drawY = HEIGHT - gunH - 20;
      const recoilY = this.gunAnimFrame >= 2 && this.gunAnimFrame <= 4 ? 10 : 0;
      ctx.drawImage(sprite, sx, sy, frameW, frameH, drawX, drawY + recoilY, gunW, gunH);
    }

    drawHUD() {
      ctx.fillStyle = "white";
      ctx.font = "20px monospace";
      ctx.fillText("Ammo: " + this.ammo, 20, 30);
      ctx.fillText("Vida: " + this.lives + "/5", 20, 60);
      ctx.fillText("Difficulty: " + this.currentDifficultySettings.name, 20, 90);
      ctx.fillText("Phase: " + this.currentPhase, 20, 120);
      ctx.fillStyle = "white";
      ctx.fillText("+", WIDTH / 2 - 5, HEIGHT / 2 + 5);
      ctx.fillStyle = "yellow";
      ctx.textAlign = "right";
      ctx.fillText("Score: " + this.score, WIDTH - MINIMAP_SIZE - 30, 30);
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(this.username, WIDTH / 2, 40);
      ctx.textAlign = "left";
      this.drawMinimap();
    }

    drawMinimap() {
      const pad = 10;
      const mx = WIDTH - MINIMAP_SIZE - pad;
      const my = pad;
      const mapW = map[0].length;
      const mapH = map.length;
      const scale = MINIMAP_SIZE / Math.max(mapW, mapH);

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(mx - 2, my - 2, MINIMAP_SIZE + 4, MINIMAP_SIZE + 4);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(mx - 2, my - 2, MINIMAP_SIZE + 4, MINIMAP_SIZE + 4);

      for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
          if (map[y][x] === 1) {
            ctx.fillStyle = "rgba(80,80,80,0.9)";
            ctx.fillRect(mx + x * scale, my + y * scale, Math.ceil(scale) + 1, Math.ceil(scale) + 1);
          }
        }
      }

      this.enemies.forEach((e) => {
        if (!e.alive || e.state === ENEMY_STATE.DEAD) return;
        ctx.fillStyle = e.typeData.color;
        ctx.beginPath();
        ctx.arc(mx + e.x * scale, my + e.y * scale, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      this.ammoBoxes.forEach((b) => {
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(mx + b.x * scale, my + b.y * scale, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      this.healthBoxes.forEach((b) => {
        ctx.fillStyle = "#E53935";
        ctx.beginPath();
        ctx.arc(mx + b.x * scale, my + b.y * scale, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      if (this.selectedGameMode === "multiplayer") {
        this.otherPlayers.forEach((op) => {
          ctx.fillStyle = "#2196F3";
          ctx.beginPath();
          ctx.arc(mx + op.x * scale, my + op.y * scale, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.fillStyle = "lime";
      ctx.beginPath();
      const px = mx + this.player.x * scale;
      const py = my + this.player.y * scale;
      const dirLen = 4;
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "lime";
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(this.player.angle) * dirLen, py + Math.sin(this.player.angle) * dirLen);
      ctx.stroke();
    }

    drawSettingsOverlay() {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "white";
      ctx.font = "28px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CONFIGURAÇÕES (TAB para fechar)", WIDTH / 2, 80);

      const left = WIDTH / 2 - 200;
      let y = 140;
      ctx.textAlign = "left";
      ctx.font = "18px monospace";

      ctx.fillText("Sensibilidade do mouse: " + this.gameSettings.mouseSensitivity.toFixed(3), left, y);
      y += 35;
      ctx.fillText("Velocidade de movimento: " + this.gameSettings.moveSpeed.toFixed(1) + "x", left, y);
      y += 50;

      ctx.font = "14px monospace";
      ctx.fillStyle = "rgba(200,200,200,0.9)";
      ctx.fillText("Mouse: [ ] ou ← → | Movimento: , . ou ↓ ↑", left, y);
      y += 25;
      ctx.fillText("Enter ou Espaço - Fechar", left, y);
    }

    drawGameOver() {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "red";
      ctx.font = "60px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2);
      ctx.font = "30px sans-serif";
      ctx.fillText("Score: " + this.score, WIDTH / 2, HEIGHT / 2 + 50);
      ctx.fillText("PRESS ESC TO RETURN", WIDTH / 2, HEIGHT / 2 + 100);
      ctx.textAlign = "left";
      if (!window.scoreSubmitted) {
        window.scoreSubmitted = true;
        this.saveScore();
      }
    }

    async saveScore() {
      try {
        await fetch("/api/trpc/scores.save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            0: {
              json: {
                score: Math.floor(this.score),
                gameMode: this.selectedGameMode,
                enemiesKilled: this.enemiesKilled,
                timePlayedSeconds: Math.floor(this.gameDuration / 1000),
              },
            },
          }),
          credentials: "include",
        });
      } catch (e) {
        console.error(e);
      }
    }

    shoot() {
      if (this.ammo <= 0 || this.gameState !== "playing" || this.gameOver) return;
      this.ammo--;
      if (this.gunAnimFrame === 0) this.gunAnimFrame = 1;
      this.gunAnimTimer = 0;

      let closest = null;
      let minDist = 25;
      this.enemies.forEach((e) => {
        if (!e.alive) return;
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - this.player.angle;
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        if (Math.abs(angle) < 0.6 && dist < minDist && dist > 0.05) {
          minDist = dist;
          closest = e;
        }
      });

      if (closest) {
        const prevHealth = closest.health;
        closest.takeDamage();
        if (prevHealth > 0 && closest.health <= 0) {
          this.enemiesKilled++;
          this.phaseEnemiesKilled++;
        }
      }
    }

    gameLoop(timestamp = 0) {
      const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1) || BASE_DT;
      this.lastFrameTime = timestamp;

      this.drawBackground();
      const depthBuffer = this.raycaster.castRays();
      this.drawEnemies(depthBuffer, dt);
      this.drawAmmoBoxes(depthBuffer);
      this.drawHealthBoxes(depthBuffer);
      if (this.selectedGameMode === "multiplayer") {
        this.drawOtherPlayers(depthBuffer, dt);
      }
      this.drawGun(dt);
      this.drawHUD();

      if (this.gameState === "playing") {
        if (this.gameStartTime === 0) {
          this.gameStartTime = Date.now();
          this.spawnEnemies();
        }
        if (!this.gameOver) {
          this.gameDuration = Date.now() - this.gameStartTime;
          this.score = Math.floor(
            (this.enemiesKilled * 100 + this.gameDuration / 1000 * 10) * this.currentDifficultySettings.scoreMultiplier
          );
        }

        if (this.keys[" "] || this.keys["space"]) {
          this.shoot();
          this.keys[" "] = false;
          this.keys["space"] = false;
        }
        if (this.gunAnimFrame > 0) {
          this.gunAnimTimer += dt;
          if (this.gunAnimTimer > 1 / GUN_SPRITE.animFps) {
            this.gunAnimTimer = 0;
            this.gunAnimFrame++;
            if (this.gunAnimFrame >= GUN_SPRITE.frames) this.gunAnimFrame = 0;
          }
        }

        if (!this.settingsOpen && !this.gameOver) {
          this.player.move(dt, this.keys, this.gameSettings.moveSpeed);
        }

        for (let i = this.ammoBoxes.length - 1; i >= 0; i--) {
          const b = this.ammoBoxes[i];
          const dx = b.x - this.player.x;
          const dy = b.y - this.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1.5) {
            this.ammo += 5;
            this.ammoBoxes.splice(i, 1);
          }
        }
        for (let i = this.healthBoxes.length - 1; i >= 0; i--) {
          const b = this.healthBoxes[i];
          const dx = b.x - this.player.x;
          const dy = b.y - this.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1.5 && this.lives < 5) {
            this.lives = Math.min(5, this.lives + 2);
            this.healthBoxes.splice(i, 1);
          }
        }

        if (this.selectedGameMode === "multiplayer") {
          this.updateOtherPlayers(dt);
        }
        if (!this.gameOver) {
          this.enemies.forEach((e) => {
            e.advanceAnimation(dt);
            const result = e.update(dt, this.player, this.currentDifficultySettings);
            if (result) {
              this.lives -= result.damage;
              if (this.lives <= 0) this.gameOver = true;
            }
          });
        } else {
          this.enemies.forEach((e) => e.advanceAnimation(dt));
        }

        if (!this.gameOver && this.phaseEnemiesKilled >= 2 + this.currentPhase * 2) {
          this.currentPhase++;
          this.phaseEnemiesKilled = 0;
          this.spawnEnemies();
        }

        if (this.gameOver) this.drawGameOver();
        if (this.settingsOpen) this.drawSettingsOverlay();
      } else if (this.gameState === "paused") {
        if (this.selectedGameMode === "multiplayer") {
          this.enemies.forEach((e) => e.update(dt, this.player, this.currentDifficultySettings));
        }
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "white";
        ctx.font = "40px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2);
        ctx.font = "20px monospace";
        ctx.fillText("PRESS ESC TO RESUME", WIDTH / 2, HEIGHT / 2 + 40);
        ctx.textAlign = "left";
      }

      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  // ---------------------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------------------
  const game = new Game();

  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (e.key === "Tab") {
      e.preventDefault();
      if (game.gameState === "playing" && !game.gameOver) {
        game.settingsOpen = !game.settingsOpen;
        if (game.settingsOpen) document.exitPointerLock();
        else canvas.requestPointerLock();
      }
      return;
    }
    if (game.settingsOpen) {
      let changed = false;
      if (e.key === "[" || e.key === "arrowleft") { game.gameSettings.mouseSensitivity = Math.max(0.0005, game.gameSettings.mouseSensitivity - 0.0005); changed = true; }
      if (e.key === "]" || e.key === "arrowright") { game.gameSettings.mouseSensitivity = Math.min(0.01, game.gameSettings.mouseSensitivity + 0.0005); changed = true; }
      if (e.key === "," || e.key === "arrowdown") { game.gameSettings.moveSpeed = Math.max(0.3, game.gameSettings.moveSpeed - 0.1); changed = true; }
      if (e.key === "." || e.key === "arrowup") { game.gameSettings.moveSpeed = Math.min(3, game.gameSettings.moveSpeed + 0.1); changed = true; }
      if (changed) {
        localStorage.setItem("mouseSensitivity", game.gameSettings.mouseSensitivity.toString());
        localStorage.setItem("moveSpeed", game.gameSettings.moveSpeed.toString());
      }
      if (e.key === "Enter" || e.key === " ") { game.settingsOpen = false; canvas.requestPointerLock(); }
      return;
    }
    if (e.key === " " || e.key === "Spacebar") e.preventDefault();
    if (e.key) { game.keys[k] = true; if (k === " ") game.keys["space"] = true; }
    if (e.key === "Escape") {
      if (game.gameState === "playing") {
        game.gameState = "paused";
        document.exitPointerLock();
      } else if (game.gameState === "paused") {
        game.gameState = "playing";
        canvas.requestPointerLock();
      } else if (game.gameOver) {
        window.location.href = "/menu";
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    const k = e.key ? e.key.toLowerCase() : null;
    if (k === " " || k === "spacebar") e.preventDefault();
    if (k) { game.keys[k] = false; if (k === " ") game.keys["space"] = false; }
  });

  canvas.addEventListener("click", () => canvas.requestPointerLock());

  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas && game.gameState === "playing" && !game.settingsOpen) {
      game.player.angle += e.movementX * game.gameSettings.mouseSensitivity;
    }
  });

  game.gameLoop();
})();
