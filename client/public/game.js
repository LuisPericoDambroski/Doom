const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const WIDTH = canvas.width
const HEIGHT = canvas.height

const FOV = Math.PI / 3
const RAYS = 320
const MAX_DEPTH = 30

const PLAYER_SPEED = 0.08
const ENEMY_SPEED = 0.02

let ammo = 10
let lives = 3
let gameOver = false
let enemiesKilled = 0
let maxEnemiesPerRoom = 10

let gunRecoil = 0

const enemySprite = new Image()
enemySprite.src = "mike.jpg"

let map = [

[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,1,1,1,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,1],
[1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
[1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
[1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
[1,0,0,0,0,0,1,1,1,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,1,1,1,0,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0,0,0,1],
[1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,1,1,0,1],
[1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
[1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
[1,0,0,1,1,1,0,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,1,1,1,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]



]

const player = {

x:3,
y:3,
angle:0

}

const keys = {}

document.addEventListener("keydown",e=>keys[e.key.toLowerCase()] = true)
document.addEventListener("keyup",e=>keys[e.key.toLowerCase()] = false)

canvas.addEventListener("click",()=>canvas.requestPointerLock())

document.addEventListener("mousemove",(e)=>{

if(document.pointerLockElement === canvas){

player.angle += e.movementX * 0.002

}

})

function isWall(x,y){

let row = Math.floor(y)
let col = Math.floor(x)

if(row < 0 || row >= map.length || col < 0 || col >= map[0].length){
return true
}

return map[row][col] !== 0

}

function movePlayer(){

let nx = player.x
let ny = player.y

if(keys["w"]){

nx += Math.cos(player.angle) * PLAYER_SPEED
ny += Math.sin(player.angle) * PLAYER_SPEED

}

if(keys["s"]){

nx -= Math.cos(player.angle) * PLAYER_SPEED
ny -= Math.sin(player.angle) * PLAYER_SPEED

}

if(keys["a"]){

nx += Math.cos(player.angle - Math.PI/2) * PLAYER_SPEED
ny += Math.sin(player.angle - Math.PI/2) * PLAYER_SPEED

}

if(keys["d"]){

nx += Math.cos(player.angle + Math.PI/2) * PLAYER_SPEED
ny += Math.sin(player.angle + Math.PI/2) * PLAYER_SPEED

}

if(!isWall(nx,player.y)) player.x = nx
if(!isWall(player.x,ny)) player.y = ny

}

function castRays(){

for(let i=0;i<RAYS;i++){

let rayAngle = player.angle - FOV/2 + FOV * i / RAYS

let sin = Math.sin(rayAngle)
let cos = Math.cos(rayAngle)

for(let depth=0;depth<MAX_DEPTH;depth+=0.05){

let x = player.x + cos * depth
let y = player.y + sin * depth

if(isWall(x,y)){

let wallHeight = HEIGHT / depth

ctx.fillStyle = "#777"

ctx.fillRect(

i * (WIDTH/RAYS),
HEIGHT/2 - wallHeight/2,
WIDTH/RAYS + 1,
wallHeight

)

break

}

}

}

}

let enemies = []

function spawnEnemies(n){

enemies = []

for(let i=0;i<n;i++){

let x, y, valid = false

while(!valid){
x = 1 + Math.random() * (map[0].length - 2)
y = 1 + Math.random() * (map.length - 2)
if(!isWall(x, y)){
valid = true
}
}

enemies.push({
x: x,
y: y,
alive:true,
hasAttacked:false,
attackCooldown:0
})

}

}

function spawnEnemy(){

let aliveCount = enemies.filter(e=>e.alive).length
if(aliveCount >= maxEnemiesPerRoom) return

let x, y, valid = false

while(!valid){
x = 1 + Math.random() * (map[0].length - 2)
y = 1 + Math.random() * (map.length - 2)
if(!isWall(x, y)){
valid = true
}
}

enemies.push({
x: x,
y: y,
alive: true,
hasAttacked: false,
attackCooldown: 0
})

}

setInterval(spawnEnemy,2000)

function updateEnemies(){

enemies.forEach(e=>{

if(!e.alive) return

let dx = player.x - e.x
let dy = player.y - e.y

let dist = Math.sqrt(dx*dx + dy*dy)

if(dist > 0.2){

let stepX = dx/dist * ENEMY_SPEED
let stepY = dy/dist * ENEMY_SPEED

let nx = e.x + stepX
let ny = e.y + stepY

if(!isWall(nx,e.y)) e.x = nx
if(!isWall(e.x,ny)) e.y = ny

}

if(e.attackCooldown > 0){
e.attackCooldown--
}

if(dist < 0.5 && e.attackCooldown <= 0){

lives--
e.hasAttacked = true
e.attackCooldown = 60

if(lives <= 0){
gameOver = true
}

}

})

}

function drawEnemies(){

enemies.forEach(e=>{

if(!e.alive) return

let dx = e.x - player.x
let dy = e.y - player.y

let dist = Math.sqrt(dx*dx + dy*dy)

let angle = Math.atan2(dy,dx) - player.angle

while(angle > Math.PI) angle -= Math.PI*2
while(angle < -Math.PI) angle += Math.PI*2

if(Math.abs(angle) < FOV/2){

let size = HEIGHT / dist
let screenX = (angle + FOV/2) / FOV * WIDTH

ctx.drawImage(

enemySprite,
screenX - size/1.8,
HEIGHT/1.8 - size/1.8,
size,
size

)

}

})

}

let ammoItems = []

function spawnAmmo(){

let x = 1 + Math.random()*7
let y = 1 + Math.random()*7

if(!isWall(x,y)){

ammoItems.push({x,y})

}

}

setInterval(spawnAmmo,6000)

function drawAmmo(){

ctx.fillStyle = "yellow"

ammoItems.forEach((item,i)=>{

let dx = item.x - player.x
let dy = item.y - player.y

let dist = Math.sqrt(dx*dx + dy*dy)

if(dist < 0.5){

ammo += 10
ammoItems.splice(i,1)
return

}

let angle = Math.atan2(dy,dx) - player.angle

if(Math.abs(angle) < FOV/2){

let size = HEIGHT/dist
let screenX = (angle+FOV/2)/FOV*WIDTH

ctx.fillRect(

screenX-size/2,
HEIGHT/2-size/2,
size,
size

)

}

})

}

canvas.addEventListener("mousedown",shoot)

function shoot(){

if(gameOver) return
if(ammo <= 0) return

ammo--
gunRecoil = 8

let shotEnemy = false

enemies.forEach(e=>{

if(!e.alive) return

let dx = e.x-player.x
let dy = e.y-player.y

let angle = Math.atan2(dy,dx) - player.angle

while(angle > Math.PI) angle -= Math.PI*2
while(angle < -Math.PI) angle += Math.PI*2

if(Math.abs(angle) < 0.1 && !shotEnemy){

e.alive = false
shotEnemy = true
enemiesKilled++

if(enemiesKilled >= maxEnemiesPerRoom){

setTimeout(()=>{

newRoom()

},500)

}

}

})

}


function drawGun(){

if(gunRecoil>0) gunRecoil--

ctx.fillStyle = "gray"

ctx.fillRect(

WIDTH/2 - 50,
HEIGHT - 120 + gunRecoil,
100,
100

)

ctx.fillStyle="black"

ctx.fillRect(

WIDTH/2 - 10,
HEIGHT - 150 + gunRecoil,
20,
40

)

}

function drawHUD(){

ctx.fillStyle="white"
ctx.font="20px monospace"

ctx.fillText("Ammo: "+ammo,20,30)
ctx.fillText("Lives: "+lives,20,60)

ctx.fillText("+",WIDTH/2-5,HEIGHT/2+5)

}

function drawGameOver(){

ctx.fillStyle="black"
ctx.fillRect(0,0,WIDTH,HEIGHT)

ctx.fillStyle="red"
ctx.font="60px sans-serif"

ctx.fillText("GAME OVER",WIDTH/2-180,HEIGHT/2)

}

function drawBackground(){

ctx.fillStyle="#333"
ctx.fillRect(0,0,WIDTH,HEIGHT/2)

ctx.fillStyle="#111"
ctx.fillRect(0,HEIGHT/2,WIDTH,HEIGHT/2)

}

function drawMiniMap(){

let scale = 10
let mapWidth = map[0].length * scale
let mapHeight = map.length * scale
let mapX = WIDTH - mapWidth - 10
let mapY = 10

for(let y=0;y<map.length;y++){
for(let x=0;x<map[0].length;x++){

if(map[y][x]===1) ctx.fillStyle="white"
else ctx.fillStyle="black"

ctx.fillRect(mapX + x*scale, mapY + y*scale, scale, scale)

}
}

ctx.fillStyle="green"
ctx.fillRect(mapX + player.x*scale, mapY + player.y*scale, scale, scale)

enemies.forEach(e=>{
if(e.alive){
ctx.fillStyle="red"
ctx.fillRect(mapX + e.x*scale, mapY + e.y*scale, scale, scale)
}
})

}

function gameLoop(){

movePlayer()

drawBackground()

castRays()

drawEnemies()

drawAmmo()

updateEnemies()

drawGun()

drawHUD()

drawMiniMap()

if(gameOver){

drawGameOver()
return

}

requestAnimationFrame(gameLoop)

}

gameLoop()