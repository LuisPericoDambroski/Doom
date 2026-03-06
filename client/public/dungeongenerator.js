function generateDungeon(width, height){

let map = Array.from({length:height}, ()=>Array(width).fill(1))

// Criar interior vazio (excluindo bordas)
for(let y=1; y<height-1; y++){
for(let x=1; x<width-1; x++){
map[y][x] = 0
}
}

let rooms = []
let roomCount = 4 + Math.floor(Math.random()*4)

for(let i=0;i<roomCount;i++){

let w = 3 + Math.floor(Math.random()*4)
let h = 3 + Math.floor(Math.random()*4)

let x = 2 + Math.floor(Math.random()*(width-w-4))
let y = 2 + Math.floor(Math.random()*(height-h-4))

let room = {x,y,w,h}
rooms.push(room)

for(let ry=y; ry<y+h; ry++){
for(let rx=x; rx<x+w; rx++){
map[ry][rx] = 1
}
}

}

// Conectar as salas com corredores
for(let i=1;i<rooms.length;i++){

let r1 = rooms[i-1]
let r2 = rooms[i]

let x1 = Math.floor(r1.x + r1.w/2)
let y1 = Math.floor(r1.y + r1.h/2)

let x2 = Math.floor(r2.x + r2.w/2)
let y2 = Math.floor(r2.y + r2.h/2)

// Corredor horizontal
for(let x=Math.min(x1,x2); x<=Math.max(x1,x2); x++){
if(x >= 1 && x < width-1 && y1 >= 1 && y1 < height-1){
map[y1][x] = 0
}
}

// Corredor vertical
for(let y=Math.min(y1,y2); y<=Math.max(y1,y2); y++){
if(x2 >= 1 && x2 < width-1 && y >= 1 && y < height-1){
map[y][x2] = 0
}
}

}

// Garantir que as bordas sejam sempre 1
for(let x=0; x<width; x++){
map[0][x] = 1
map[height-1][x] = 1
}

for(let y=0; y<height; y++){
map[y][0] = 1
map[y][width-1] = 1
}

return map

}


function newRoom(){

map = generateDungeon(28,18)
enemiesKilled = 0
ammoItems = []

player.x = 3
player.y = 3
player.angle = 0

spawnEnemies(3 + Math.floor(Math.random()*4))

}
