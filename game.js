window.requestAnimFrame = (function() {
    return window.requestAnimationFrame      ||
        window.webkitRequestAnimationFrame   ||
        window.mozRequestAnimationFrame      ||
        window.oRequestAnimationFrame        ||
        window.msRequestAnimationFrame       ||
        function(callback, element) {
            window.setTimeout(callback, 1000/60);
        };
})();

function goodmod(x, n) {
     return ((x%n)+n)%n;
}

let won = false;

let sfx = {
};

let objs = [];

let tiles;
let characterImg;

let bgColor = '34,31,49';

let tileSize = 16;
let drawScale = 4;
let canvasW = 640;
let canvasH = 448;

let levelW = canvasW / tileSize / drawScale;
let levelH = canvasH / tileSize / drawScale;

let levelNumber = 1;

let level = levels[0];

let framestep = 1000/60;

let canvas;

let prevObjs = [];

let ID = {
    empty: 0,
    dirt: 1,
    ice: 2,
    metal: 3,
    box: 4,
    selector: 5,
    gem_hidden: 6,
    gem: 7,
    gem_small: 8,
    selector_line: 9,
    cloud: 10,
    sand: 11,
    crumble: 12,
    sparkle: 13,
    love1: 14,
    love2: 15,
};

let selectable = {};
selectable[ID.empty] = 1;
selectable[ID.dirt] = 1;
selectable[ID.ice] = 1;
selectable[ID.metal] = 1;
selectable[ID.box] = 1;
selectable[ID.gem_hidden] = 1;
selectable[ID.gem] = 1;
selectable[ID.gem_small] = 1;
selectable[ID.cloud] = 1;
selectable[ID.sand] = 1;
selectable[ID.crumble] = 1;

let solid = {};
solid[ID.empty] = 0;
solid[ID.dirt] = 1;
solid[ID.ice] = 1;
solid[ID.metal] = 1;
solid[ID.box] = 1;
solid[ID.gem_hidden] = 0;
solid[ID.gem] = 0;
solid[ID.gem_small] = 0;
solid[ID.cloud] = 0;
solid[ID.sand] = 1;
solid[ID.crumble] = 1;

let destructible = {};
destructible[ID.empty] = 0;
destructible[ID.dirt] = 1;
destructible[ID.ice] = 1;
destructible[ID.metal] = 0;
destructible[ID.box] = 0;
destructible[ID.gem_hidden] = 0;
destructible[ID.gem] = 0;
destructible[ID.gem_small] = 0;
destructible[ID.cloud] = 0;
destructible[ID.sand] = 1;
destructible[ID.crumble] = 1;

let pushable = {};
pushable[ID.empty] = 0;
pushable[ID.dirt] = 0;
pushable[ID.ice] = 0;
pushable[ID.metal] = 0;
pushable[ID.box] = 1;
pushable[ID.gem_hidden] = 0;
pushable[ID.gem] = 0;
pushable[ID.gem_small] = 0;
pushable[ID.cloud] = 0;
pushable[ID.sand] = 0;
pushable[ID.crumble] = 0;

let gravitybound = {};
gravitybound[ID.empty] = 0;
gravitybound[ID.dirt] = 0;
gravitybound[ID.ice] = 0;
gravitybound[ID.metal] = 0;
gravitybound[ID.box] = 1;
gravitybound[ID.gem_hidden] = 0;
gravitybound[ID.gem] = 1;
gravitybound[ID.gem_small] = 1;
gravitybound[ID.cloud] = 0;
gravitybound[ID.sand] = 1;
gravitybound[ID.crumble] = 0;

let stopfall = {};
stopfall[ID.empty] = 0;
stopfall[ID.dirt] = 1;
stopfall[ID.ice] = 1;
stopfall[ID.metal] = 1;
stopfall[ID.box] = 1;
stopfall[ID.gem_hidden] = 0;
stopfall[ID.gem] = 0;
stopfall[ID.gem_small] = 0;
stopfall[ID.cloud] = 1;
stopfall[ID.sand] = 1;
stopfall[ID.crumble] = 1;

let crumbles = {};
crumbles[ID.empty] = 0;
crumbles[ID.dirt] = 0;
crumbles[ID.ice] = 0;
crumbles[ID.metal] = 0;
crumbles[ID.box] = 0;
crumbles[ID.gem_hidden] = 0;
crumbles[ID.gem] = 0;
crumbles[ID.gem_small] = 0;
crumbles[ID.cloud] = 0;
crumbles[ID.sand] = 0;
crumbles[ID.crumble] = 1;

let charAnims = {
    stand: { frameLength: 500, frames: [0, 1] },
    hit_down: { frameLength: 100, frames: [2, 3, 4] },
    hit_right: { frameLength: 100, frames: [5, 6, 7] },
    hit_left: { frameLength: 100, frames: [8, 9, 10] },
    jump_right: { frameLength: 80, frames: [11, 24, 12, 13, 14] },
    jump_left: { frameLength: 80, frames: [17, 24, 18, 19, 20] },
    jump_up_right: { frameLength: 80, frames: [23, 24, 25, 26, 27] },
    jump_up_left: { frameLength: 80, frames: [30, 31, 32, 33, 34] },
    jump_up: { frameLength: 80, frames: [41, 42, 43, 44, 45] },
    fall: { frameLength: 80, frames: [37, 38] },
    land: { frameLength: 80, frames: [39, 40] },
};

const DESTROY_LENGTH = 450;

let destruction = [];

function finishDestroying(destr) {
    if (destructible[tileAt(destr.x, destr.y)]) {
        level[destr.y * levelW + destr.x] = 0;
    }
    checkGravity();

    /* remove us from the destruction list */
    destruction = destruction.filter(d => d != destr);

    if (!stopfall[tileAt(character.x, character.y + 1)]) {
        gameState = State.FALL;
        character.anim = 'fall';
        character.animFrameIndex = 0;
        character.frameTime = 0;
        cancelAnim = true;
    }

    if (destruction.length == 0 && gameState == State.DESTROY) {
        gameState = State.STAND;
    }
}

const PUSH_LENGTH = 300;

let push = {
    pushing: false,
    timer: 0,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    targetObj: null,
};

function finishPushing() {
    push.pushing = false;
    push.timer = 0;
    level[push.targetY * levelW + push.targetX] = push.targetObj.id;
    objs = objs.filter(o => o != push.targetObj);
    gameState = State.STAND;
    checkGravity();
    updateSelector();
}

const GRAVITY_LENGTH = 100;

let gravity = {
    gravitying: false,
    timer: 0,
    objs: [],
}

function checkGravity() {
    for (let y = levelH - 2; y >= 0; y--) {
        for (let x = 0; x < levelW; x++) {
            if (gravitybound[tileAt(x, y)] && !stopfall[tileAt(x, y + 1)]) {
                fallObj = {
                    x: x,
                    y: y,
                    targetX: x,
                    targetY: y + 1,
                    id: tileAt(x, y),
                };
                level[y * levelW + x] = 0;
                gravity.objs.push(fallObj);
                objs.push(fallObj);
                gravity.gravitying = true;
                gameState = State.GRAVITY;
            }
        }
    }
}

let variants = [];

function finishGravity() {
    gravity.gravitying = false;
    gravity.timer = 0;
    for (let go of gravity.objs) {
        level[go.targetY * levelW + go.targetX] = go.id
        objs = objs.filter(o => o != go);
    }
    gravity.objs = [];
    gameState = State.STAND;
    checkGravity();
    updateSelector();
}

// state:
// STAND: waiting for input
// MOVE: moving
// FALL: falling down
// DESTROY: we finished our animation but still destroying a block
// PUSH: similar but pushing a block
// GRAVITY: things are falling down
let State = { STAND: 0, MOVE: 1, FALL: 2, DESTROY: 3, PUSH: 4, GRAVITY: 5, };

let gameState;

ready(function() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;

    tiles = new Image();
    characterImg = new Image();

    tiles.onload = function() {
        initialize();
    }
    tiles.src = 'tiles.png';
    characterImg.src = 'slime.png'
});

function initialize() {
    levelNumber = 1;
    loadLevel();

    loop();
}

let keepGoing = true;
let lastFrameTime;
let timedelta = 0;
function loop(timestamp) {
    if (timestamp == undefined) {
        timestamp = 0;
        lastFrameTime = timestamp;
    }
    timedelta += timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    while (timedelta >= framestep) {
        update(framestep);
        timedelta -= framestep;
    }
    draw();

    if (keepGoing) {
        requestAnimFrame(loop);
    }
}

let mouseX = 0;
let mouseY = 0;

function clearSelector() {
    objs = objs.filter(o => o.id != ID.selector && o.id != ID.selector_line);
}

function updateSelector() {
    let selectorX = Math.floor(mouseX / drawScale / tileSize);
    let selectorY = Math.floor(mouseY / drawScale / tileSize);

    // remove current selector if any and add new one if in bounds of canvas
    clearSelector();
    if (gameState == State.STAND) {
        if (selectorX >= 0 && selectorX < levelW && selectorY >= 0 && selectorY < levelH) {
            if (checkMove(selectorX, selectorY)) {
                objs.push({ id: ID.selector, x: selectorX, y: selectorY});

                if (selectorX < character.x - 1 && selectorY == character.y) {
                    for (let x = selectorX + 1; x < character.x; x++) {
                        objs.push({ id: ID.selector_line, x: x, y: selectorY });
                    }
                }

                if (selectorX > character.x + 1 && selectorY == character.y) {
                    for (let x = selectorX - 1; x > character.x; x--) {
                        objs.push({ id: ID.selector_line, x: x, y: selectorY });
                    }
                }
            }
        }
    }
}

document.onmousemove = function(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    updateSelector();
}

function tileAt(x, y) {
    // in this game, the outside is impassable/indestructible
    if (x < 0 || x >= levelW || y < 0 || y >= levelH) {
        return ID.metal;
    }
    return level[y * levelW + x];
}

document.onmousedown = function(e) {
    let findSelector = objs.filter(o => o.id == ID.selector);

    if (findSelector.length > 0) {
        /* If we have a thing selected, set that as our target location */
        character.ultimateTargetX = findSelector[0].x;
        character.ultimateTargetY = findSelector[0].y;

        character.targetX = character.ultimateTargetX;
        character.targetY = character.ultimateTargetY;
        if (Math.abs(character.ultimateTargetX - character.x) > 1) {
            if (character.ultimateTargetX < character.x) {
                character.targetX = character.x - 1;
            } else {
                character.targetX = character.x + 1;
            }
        }

        /* figure out which animation to play */
        if (character.targetY == character.y) {
            if (character.targetX == character.x - 1) {
                if (!solid[tileAt(character.targetX, character.targetY)]) {
                    character.anim = 'jump_left';
                } else {
                    character.anim = 'hit_left';
                }
            } else if (character.targetX == character.x + 1) {
                if (!solid[tileAt(character.targetX, character.targetY)]) {
                    character.anim = 'jump_right';
                } else {
                    character.anim = 'hit_right';
                }
            }
        } else if (character.targetY == character.y - 1) {
            if (character.targetX == character.x) {
                character.anim = 'jump_up';
            } else if (character.targetX == character.x - 1) {
                character.anim = 'jump_up_left';
            } else if (character.targetX == character.x + 1) {
                character.anim = 'jump_up_right';
            }
        } else if (character.targetY == character.y + 1) {
            if (character.targetX == character.x) {
                if (!stopfall[tileAt(character.targetX, character.targetY)]) {
                    character.anim = 'fall';
                } else {
                    character.anim = 'hit_down';
                }
            } else if (character.targetX == character.x - 1) {
                character.anim = 'jump_left';
            } else if (character.targetX == character.x + 1) {
                character.anim = 'jump_right';
            }
        }
        character.animFrameIndex = 0;
        character.frameTime = 0;
        cancelAnim = true;

        /* Now remove selector */
        clearSelector();
        gameState = State.MOVE;

        startMove();
    }
}

function onMovedToSquare() {
    let tile = tileAt(character.x, character.y);
    if (tile == ID.gem_small || tile == ID.gem) {
        level[character.y * levelW + character.x] = ID.empty;

        objs.push({
            id: ID.sparkle,
            x: character.x,
            y: character.y,
            animates: true,
            frame: 0,
            frameTime: 0,
            frameLength: 100,
            diesAfterAnimation: true,
        });

        if (tile == ID.gem_small) {
            console.log("hi");
            let smallGemsLeft = level.filter(t => t == ID.gem_small).length;
            if (smallGemsLeft == 0) {
                for (let i = 0; i < level.length; i++) {
                    if (level[i] == ID.gem_hidden) {
                        level[i] = ID.gem;
                        variants.push({
                            x: i % levelW,
                            y: Math.floor(i / levelW),
                            timer: 0,
                            length: 400,
                        });
                    }
                }
            }
        }

        if (tile == ID.gem) {
            objs.push({
                id: ID.love1,
                x: character.x,
                y: character.y - 1,
                animates: true,
                frame: 0,
                frameTime: 0,
                frameLength: 400,
                diesAfterAnimation: false,
            });
            objs.push({
                id: ID.love2,
                x: character.x,
                y: character.y,
                animates: true,
                frame: 0,
                frameTime: 0,
                frameLength: 400,
                diesAfterAnimation: false,
            });
        }
    }
}

function startMove() {
    if (character.targetX != character.x || character.targetY != character.targetY) {
        if (crumbles[tileAt(character.x, character.y + 1)]) {
            destruction.push({
                timer: 0,
                x: character.x,
                y: character.y + 1,
            });
        }
    }
}

let cancelAnim = false;

function characterAnimFinished() {
    if (character.anim == 'jump_left') {
        character.x -= 1;
        onMovedToSquare();
    } else if (character.anim == 'jump_right') {
        character.x += 1;
        onMovedToSquare();
    } else if (character.anim == 'jump_up') {
        character.y -= 1;
        onMovedToSquare();
    } else if (character.anim == 'jump_up_left') {
        character.x -= 1;
        character.y -= 1;
        onMovedToSquare();
    } else if (character.anim == 'jump_up_right') {
        character.x += 1;
        character.y -= 1;
        onMovedToSquare();
    } else if (character.anim == 'fall') {
        character.y += 1;
        onMovedToSquare();
    }

    if (stopfall[tileAt(character.x, character.y + 1)]) {
        if (character.anim == 'jump_left' && character.ultimateTargetX < character.x) {
            character.targetX = character.x - 1;
            if (!solid[tileAt(character.targetX, character.targetY)]) {
                character.anim = 'jump_left';
            } else {
                character.anim = 'hit_left';
            }
            cancelAnim = true;
        } else if (character.anim == 'jump_right' && character.ultimateTargetX > character.x) {
            character.targetX = character.x + 1;
            if (!solid[tileAt(character.targetX, character.targetY)]) {
                character.anim = 'jump_right';
            } else {
                character.anim = 'hit_right';
            }
            cancelAnim = true;
        } else if (character.anim != 'land' && !character.anim.startsWith('hit_')) {
            /* If we fell down, do the 'landing' animation */
            character.anim = 'land';
            gameState = State.MOVE;
            cancelAnim = true;
        } else {
            character.anim = 'stand';
            cancelAnim = false;
            if (gravity.gravitying) {
                gameState = State.GRAVITY;
            } else if (push.pushing) {
                gameState = State.PUSH;
            } else if (destruction.length > 0) {
                gameState = State.DESTROY;
            } else {
                gameState = State.STAND;
            }
        }
    } else {
        character.anim = 'fall';
        gameState = State.FALL;
        cancelAnim = true;
    }
    character.animFrameIndex = 0;
    updateSelector();
    startMove();
}

function win() {
}

function advanceLevel() {
    levelNumber ++;
    loadLevel();
}

function loadLevel() {
    if (levelNumber > levels.length) {
        win();
    } else {
        prevObjs = [];
        objs = [];
        level = levels[levelNumber - 1];

        let charPos = level.indexOf(-1);
        level[charPos] = 0;
        character.x = charPos % levelW;
        character.y = Math.floor(charPos / levelW);

        gameState = State.STAND;
        checkGravity();
    }
}

let moveFraction = 0;

let charAnimSize = {
    w: 48,
    h: 48,
    offsetX: 16,
    offsetY: 16,
}

let character = {
    x: 3,
    y: 4,
    frame: 0,
    frameTime: 0,
    animFrameIndex: 0,
    anim: 'stand',
}

function checkMove(x, y) {
    if (y == character.y) {
       if (x == character.x + 1 || x == character.x - 1) {
           return selectable[tileAt(x, y)];
       }

       if (x < character.x) {
           for (let check_x = x + 1; check_x < character.x; check_x++) {
               if (!stopfall[tileAt(check_x, y + 1)] || solid[tileAt(check_x, y)]) {
                   return false;
               }
           }
           return true;
       }

       if (x > character.x) {
           for (let check_x = x - 1; check_x > character.x; check_x--) {
               if (!stopfall[tileAt(check_x, y + 1)] || solid[tileAt(check_x, y)]) {
                   return false;
               }
           }
           return true;
       }
    }

    if (y == character.y + 1) {
        if (x == character.x) {
            return selectable[tileAt(x, y)];
        } else if (x == character.x - 1 || x == character.x + 1) {
            return !stopfall[tileAt(x, y)] && !solid[tileAt(x, y - 1)];
        }
    }

    if (y == character.y - 1) {
        if (x == character.x) {
            if (stopfall[tileAt(x, character.y)]
                    && !solid[tileAt(x, y)]) {
                return true;
            }
        } else if (x == character.x - 1 || x == character.x + 1) {
            if (!solid[tileAt(character.x, character.y - 1)]
                    && stopfall[tileAt(x, character.y)]
                    && !solid[tileAt(x, y)]) {
                return selectable[tileAt(x, y)];
            }
        }
    }

    return false;
}

function reset() {
    gameState = State.STAND;
}

const OBJ_ANIM_FRAME_LENGTH = 100;
const OBJ_FRAMES = 4;

function update(delta) {
    let remove_deleted_obj = false;
    for (let o of objs) {
        if (o.animates) {
            o.frameTime += delta;
            while (o.frameTime > o.frameLength) {
                o.frameTime = goodmod(o.frameTime, o.frameLength);
                o.frame ++;
                while (o.frame >= OBJ_FRAMES) {
                    if (o.diesAfterAnimation) {
                        o.frame = 0;
                        o.del = true;
                        remove_deleted_obj = true;
                    } else {
                        o.frame = goodmod(o.frame, OBJ_FRAMES);
                    }
                }
            }
        }
    }
    if (remove_deleted_obj) {
        objs = objs.filter(o => !o.del);
    }

    let remove_deleted_variant = false;
    for (let v of variants) {
        v.timer += delta;
        if (v.timer > v.length) {
            v.del = true;
            remove_deleted_variant = true;
        }
    }
    if (remove_deleted_variant) {
        variants = variants.filter(v => !v.del);
    }

    character.frameTime += delta;
    while (character.frameTime > charAnims[character.anim].frameLength) {
        character.frameTime = goodmod(character.frameTime, charAnims[character.anim].frameLength);
        character.animFrameIndex ++;
        if (character.anim.startsWith("hit_") && character.animFrameIndex == 1) {
            if (pushable[tileAt(character.targetX, character.targetY)]) {
                push.pushing = true;
                push.timer = 0;
                push.x = character.targetX;
                push.y = character.targetY;
                push.targetX = character.targetX;
                push.targetY = character.targetY;

                if (character.anim == "hit_left" && !solid[tileAt(character.targetX - 1, character.targetY)]) {
                    push.targetX = character.targetX - 1;
                    push.targetY = character.targetY;
                }

                if (character.anim == "hit_right" && !solid[tileAt(character.targetX + 1, character.targetY)]) {
                    push.targetX = character.targetX + 1;
                    push.targetY = character.targetY;
                }

                if (push.targetX != push.x) {
                    push.targetObj = {
                        x: push.x,
                        y: push.y,
                        targetX: push.targetX,
                        targetY: push.targetY,
                        id: tileAt(push.x, push.y),
                    };
                    level[push.y * levelW + push.x] = 0;
                    objs.push(push.targetObj);
                }
            } else {
                destruction.push({
                    timer: 0,
                    x: character.targetX,
                    y: character.targetY,
                });
            }
        }

        if (character.animFrameIndex >= charAnims[character.anim].frames.length) {
            if (cancelAnim) {
                character.animFrameIndex = charAnims[character.anim].frames.length - 1;
                characterAnimFinished();
            } else {
                character.animFrameIndex = goodmod(character.animFrameIndex, charAnims[character.anim].frames.length);
            }
        }
    }

    if (destruction.length > 0) {
        for (let d of destruction) {
            d.timer += delta;
            if (d.timer > DESTROY_LENGTH) {
                finishDestroying(d);
            }
        }
    }

    if (push.pushing) {
        push.timer += delta;
        push.targetObj.moveFraction = push.timer / PUSH_LENGTH;
        if (push.timer > PUSH_LENGTH) {
            finishPushing();
        }
    }

    if (gravity.gravitying) {
        gravity.timer += delta;
        for (let go of gravity.objs) {
            go.moveFraction = gravity.timer / GRAVITY_LENGTH;
            if (gravity.timer > GRAVITY_LENGTH) {
                finishGravity();
            }
        }
    }
}

function draw() {
    ctx.save();
    ctx.scale(drawScale, drawScale);
    ctx.translate(1, 1);

    ctx.fillStyle = 'rgb(' + bgColor + ')';
    ctx.beginPath();
    ctx.rect(-1, -1, levelW * tileSize + 1, levelH * tileSize + 1);
    ctx.fill();

    for (let i in level) {
        let elem_y = Math.floor(i / levelW);
        let elem_x = i % levelW;
        let variant = 0;
        for (let d of destruction) {
            if (i == d.y * levelW + d.x) {
                variant = Math.floor(d.timer / DESTROY_LENGTH * 4);
            }
        }

        for (let v of variants) {
            if (i == v.y * levelW + v.x) {
                variant = Math.floor(v.timer / v.length * 4);
            }
        }

        if (level[i]) {
            ctx.drawImage(tiles,
                    level[i] * tileSize, variant * tileSize, tileSize, tileSize,
                    elem_x * tileSize, elem_y * tileSize, tileSize, tileSize);
        }
    }

    let charFrame = charAnims[character.anim].frames[character.animFrameIndex];
    ctx.drawImage(characterImg,
        0, charFrame * charAnimSize.h, charAnimSize.w, charAnimSize.h,
        character.x * tileSize - charAnimSize.offsetX, character.y * tileSize - charAnimSize.offsetY,
        charAnimSize.w, charAnimSize.h);

    for (let i in objs) {
        if (objs[i].moveFraction) {
            let mf = objs[i].moveFraction;
            ctx.drawImage(tiles,
                    objs[i].id * tileSize, (objs[i].frame || 0) * tileSize, tileSize, tileSize,
                    // divide and round for pixel-y movement
                    Math.round((objs[i].x * (1 - mf) + objs[i].targetX * mf) * tileSize),
                    Math.round((objs[i].y * (1 - mf) + objs[i].targetY * mf) * tileSize),
                    tileSize, tileSize);
        } else {
            ctx.drawImage(tiles,
                    objs[i].id * tileSize, (objs[i].frame || 0) * tileSize, tileSize, tileSize,
                    // divide and round for pixel-y movement
                    objs[i].x * tileSize, objs[i].y * tileSize, tileSize, tileSize);
        }
    }

    ctx.restore();
}
