// 1. DOM Elements
const lyricTimeline = [
    { time: 26, text: "Gravedigger digging his grave" },
    { time: 28, text: "Whole body shaking, he fading away" },
    { time: 30, text: "Summonin' thunderin' brimstone and rain" },
    { time: 32, text: "Awaken the dark from a watery grave" },
    { time: 34, text: "Thalassaphobic, my soul is en-caged" },
    { time: 37, text: "All of these chains are compulsing my rage" },
    { time: 39, text: "Think I'm insane but they know that I'm crazed" },
    { time: 41, text: "HOW THE F*** YOU GON' STOP A FREIGHT TRAIN?!" },
    { time: 43, text: "Dragons, they slither, they crawl from the sea" },
    { time: 45, text: "Watching them coming, they looking for me" },
    { time: 47, text: "Lurk in the shadows, they out for my dreams" },
    { time: 49, text: "As soon as I close my eyes, that's all I see" },
    { time: 51, text: "Blood in the ocean, is black, I can smell it" },
    { time: 53, text: "Something that came from the darkness it fell in" },
    { time: 56, text: "Swimming with sharks, thinking I should just tell 'em" },
    { time: 59, text: "Go ahead, eat me, my flesh, I should sell it" },
    { time: 60, text: "I think I been here before" },
    { time: 61, text: "That's the crazy thing" },
    { time: 62, text: "Black water void" },
    { time: 63, text: "What they gave to me "},
    { time: 64, text: "Why do I feel like the dark one was saving me" },
    { time: 66, text: "It told me 'I was the one' who was made for thee" }, 
    { time: 69, text: "Blood in the water is coming in droves" },
    { time: 71, text: "My arms and legs ain't my own" },
    { time: 73, text: "In all of my thoughts in the past, I had known" },
    { time: 75, text: "Had started to show me the light in the glow" },
    { time: 77, text: "The darkness upon me is crawling to me" },
    { time: 79, text: "I'm telling you, I can-I can-I can-hear it" },
];

const lyricElement = document.getElementById('lyric-overlay');
const audio = document.getElementById('track');
const canvas = document.getElementById('fx');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const splash = document.getElementById('splash');

// 2. Audio Engine
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const source = audioCtx.createMediaElementSource(audio);
const analyser = audioCtx.createAnalyser();
source.connect(analyser);
analyser.connect(audioCtx.destination);
analyser.fftSize = 256; 
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// 3. Variables
let particles = [];
let hasHitWater = false;
let playerY = 0;
let depth = 0;
let currentSpeed = 0; // Start at 0
const screenCenter = window.innerHeight / 2;
const waterLine = window.innerHeight * 0.5;
let cracks = [];
let crackIntensity = 0;
let isShattered = false;
let lurkerX = -500;
let lurkerAlpha = 0;
let lurkerZ = -1; // -1 for behind, 1 for in front
let heartTimer = 0;
let sigilAlpha = 0;
let isEnding = false;
let isInitialized = false;
let glitchIntensity = 0;
let watchingEyes = [];
let eyeWaveTimer = 0;
let observers = [];


startBtn.addEventListener('click', () => {
    splash.style.opacity = '0';
    setTimeout(() => splash.style.display = 'none', 2000);

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    audio.volume = 0.3;

    isInitialized = true;
});


function spawnSplash() {
    for(let i = 0; i < 30; i++) {
        particles.push({
            x: canvas.width / 2,
            y: waterLine,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 1) * 10,
            life: 1.0,
            type: 'splash'
        });
    }
}

function handleParticles() {
    if (hasHitWater && Math.random() > 0.6) {
        particles.push({
            x: Math.random() * canvas.width,
            y: canvas.height + 20,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -1 - (currentSpeed * 2),
            life: 1.0,
            type: 'dust'
        });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        if(p.type === 'splash' || p.type === 'shard') {
            p.vy += 0.15; 
            p.life -= 0.02;
        } else {
            p.life -= 0.004;
        }

        // --- FIX: Logic must be inside the loop ---
        if (p.type === 'shard') {
            ctx.fillStyle = `rgba(0, 255, 100, ${p.life})`;
        } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        }

        if (p.type === 'dust') {
            ctx.fillRect(p.x, p.y, 1, 1);
        } else {
            ctx.fillRect(p.x, p.y, 3, 3);
        }
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// --- CRACK HANDLER (Moved outside for cleaner code) ---
function handleCracks(bass) {
    let spawnChance = 0.99 - (depth / 200000);
    // 1. Spawn logic
    if (hasHitWater && Math.random() > spawnChance) {
        spawnCrack();
    }

    cracks.forEach((c) => {
        // 2. Flicker logic
        let flicker = (bass / 255) * 1.0;
        c.opacity = Math.max(flicker, c.opacity - 0.02);

        // 3. Draw logic
        ctx.beginPath();
        // FIX: Changed square bracket to curly brace
        ctx.strokeStyle = `rgba(0, 255, 100, ${c.opacity})`; 
        ctx.shadowBlur = 10 * c.opacity;
        ctx.shadowColor = "rgba(0, 255, 100, 1)";
        ctx.lineWidth = c.width;
        ctx.lineJoin = "miter";

        ctx.moveTo(c.points[0].x, c.points[0].y);
        for (let i = 1; i < c.points.length; i++) {
            // FIX: Removed the extra 'o' in points
            ctx.lineTo(c.points[i].x, c.points[i].y); 
        }
        ctx.stroke();
    });
    ctx.shadowBlur = 0;

    if(cracks.length > 50) cracks.shift();
}


function drawLurker(speed, bass) {
    lurkerX += 0.8 + (speed * 0.2); 
    
    if (lurkerX > canvas.width + 1500) {
        lurkerX = -1200;
        lurkerZ = Math.random() > 0.5 ? 1 : -1; 
    }

    let targetAlpha = (bass / 255) * 0.25; 
    lurkerAlpha += (targetAlpha - lurkerAlpha) * 0.03;

    ctx.save();
    
    const creatureColor = `rgba(20, 10, 45, ${lurkerAlpha})`;
    ctx.strokeStyle = creatureColor; 
    ctx.lineCap = "round";
    ctx.shadowBlur = 60;
    ctx.shadowColor = "black";

    // --- DRAW BODY ---
    ctx.beginPath();
    ctx.lineWidth = 280; 
    let headX = lurkerX;
    let headY = 400 + (Math.sin(lurkerX * 0.0015) * 200);
    
    ctx.moveTo(headX, headY);
    for (let i = 0; i < 1800; i += 100) {
        let bodyWave = Math.sin((lurkerX + i) * 0.0012) * 200;
        let fleshWave = Math.sin((lurkerX + i) * 0.005) * 30;
        ctx.lineTo(lurkerX - i, 400 + bodyWave + fleshWave);
    }
    ctx.stroke();

    // --- THE SPLIT JAW (THE TUSKS) ---
    let jawOpen = (bass / 255) * 120; 

    ctx.lineWidth = 50;
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.quadraticCurveTo(headX + 150, headY - 80 - jawOpen, headX + 250, headY - jawOpen);
    ctx.moveTo(headX, headY);
    ctx.quadraticCurveTo(headX + 150, headY + 80 + jawOpen, headX + 250, headY + jawOpen);
    ctx.stroke();

    // Small Pale Eye Glow
    ctx.fillStyle = `rgba(200, 200, 255, ${lurkerAlpha * 2})`;
    ctx.beginPath();
    ctx.arc(headX + 20, headY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawSigils(bass) {
    //1. Timing and heartbeat logic
    let timeRemaining = audio.duration - audio.currentTime;
    let lifePercent = Math.max(0, timeRemaining / audio.duration); // 1.0 at start, 0 at end

    //Heart slows as song ends
    let heartRate = 0.01 + (lifePercent * 0.04);
    heartTimer += heartRate;

    //2. The heartbeat pulse
    //sharp spike followed by rest
    let pulse = Math.pow(Math.sin(heartTimer), 6);

    //3. Trigger & Alpha
    if (bass > 100) sigilAlpha = 0.8;
    sigilAlpha -= 0.02;

    //total visibility
    let finalAlpha = Math.max(sigilAlpha, pulse * 0.4) * lifePercent;

    if (finalAlpha > 0) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        ctx.rotate(audio.currentTime * 0.05);

        //Ritual red, gets darker/faded as song goes
        ctx.strokeStyle = `rgba(150, 0, 0, ${finalAlpha})`;
        ctx.shadowBlur = 20 * pulse //Glow pulses as heartbeat
        ctx.shadowColor = "red";
        ctx.lineWidth = 1.5 + (pulse * 4) + (bass / 50);

        ctx.beginPath();
        const points = 7;
        const radius = 180;

        for (let i = 0; i <= points * 3; i++) {
            let angle = (i * (Math.PI * 2) * 3) / points;
            let x = Math.cos(angle) * (radius + (pulse * 5));
            let y = Math.sin(angle) * (radius + (pulse * 5));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -40, 60, Math.PI * 0.2, Math.PI * 0.8);
        ctx.arc(0, 40, 60, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();

        let eyeSlitWidth = (bass / 60);
        ctx.fillStyle = `rgba(150, 0, 0, ${finalAlpha})`;
        ctx.beginPath();
        ctx.moveTo(0, -90);
        ctx.quadraticCurveTo(eyeSlitWidth, 0, 0, 90);
        ctx.quadraticCurveTo(-eyeSlitWidth, 0, 0, -90);
        ctx.fill();

        ctx.restore();
    } 
    
}

//Spawn silhoutte occasionally
function handleObservers() {
    if (hasHitWater && isShattered && Math.random() > 0.998 && observers.length < 2) {
        observers.push({
            x: Math.random() > 0.5 ? -500 : canvas.width + 500,
            y: Math.random() * canvas.height,
            width: 400 + Math.random() * 600,
            height: 800 + Math.random() * 1000,
            speed: 0.2 + Math.random() * 0.3,
            dir: Math.random() > 0.5 ? 1 : -1,
            opacity: 0
        });
    }


    //Draw and update observers
    observers.forEach((obs, index) => {
        obs.x += obs.speed * obs.dir;

        //Fade in and out as they move
        if (obs.x > 0 && obs.x < canvas.width) {
            obs.opacity = Math.min(obs.opacity + 0.005, 0.15);
        }

        ctx.save();
        ctx.globalAlpha = obs.opacity;
        ctx.filter = "blur(50px)";
        ctx.fillStyle = "#0a0510";

        ctx.beginPath();
        ctx.ellipse(obs.x, obs.y, obs.width, obs.height, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if(obs.x > canvas.width + 1000 || obs.x < -1000) observers.splice(index, 1);
    });
}

function handleEyes() {
    eyeWaveTimer++;
    // Only spawn after shatter (26s mark) and every 10 seconds
    if(hasHitWater && isShattered && eyeWaveTimer >= 600) {
        for(let i = 0; i < 4; i++) {
            watchingEyes.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 100,
                size: 15 + Math.random() * 20,
                life: 1.0
            });
        }
        eyeWaveTimer = 0;
    }
    
    for (let i = watchingEyes.length - 1; i >= 0; i--) {
        let e = watchingEyes[i];
        e.y -= currentSpeed;

        ctx.save();
        // FIXED: Added missing comma in rgba
        ctx.fillStyle = `rgba(200, 0, 0, ${e.life})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = "red";

        drawEyeShape(e.x - (e.size * 1.5), e.y, e.size);
        // FIXED: Changed 15 back to 1.5
        drawEyeShape(e.x + (e.size * 1.5), e.y, e.size);

        ctx.restore();

        if (e.y < -100) watchingEyes.splice(i, 1);
    }
}

function loop() {
    // 1. THE TOTAL WIPE
    ctx.globalCompositeOperation = "source-over";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "black"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let targetSpeed = 0;
    let bass = 0;

    if (!isInitialized) {
        requestAnimationFrame(loop);
        return;
    }

    if (audio.duration - audio.currentTime < 5 && !isEnding) {
        isEnding = true;
    }

    // 2. WORLD OFFSET
    let worldOffset = hasHitWater ? -depth : 0;

    // 3. DRAW THE SURFACE
    if (worldOffset > -waterLine - 100) { 
        ctx.save();
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, worldOffset, canvas.width, waterLine);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, worldOffset, canvas.width / 2.5, waterLine);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 255, 0.8)"; 
        ctx.lineWidth = 4;
        ctx.moveTo(0, waterLine + worldOffset);
        ctx.lineTo(canvas.width, waterLine + worldOffset);
        ctx.stroke();
        ctx.restore();
    }

    // 4. MOVEMENT LOGIC
    if (!hasHitWater) {
        targetSpeed = 10; 
        playerY += targetSpeed;

        if (playerY >= waterLine) { 
            hasHitWater = true;
            audio.play();
            spawnSplash();
        }
    } else {
        analyser.getByteFrequencyData(dataArray);
        bass = dataArray[2];
        
        targetSpeed = 0.5 + (bass / 150);
        currentSpeed += (targetSpeed - currentSpeed) * 0.1;

        if (isEnding) {
            playerY += 2;
        } else if (playerY < screenCenter) {
            playerY += currentSpeed;
        } else {
            playerY = screenCenter;
            depth += currentSpeed; 
        }
    } // FIXED: Added this closing brace to end the 'else' correctly

    // 5. FX TIMING
    let isGlitching = false;
    let glitchIntensity = 0;
    if ((audio.currentTime >= 40 && audio.currentTime <= 42) || 
        (audio.currentTime >= 43.5 && audio.currentTime <= 44)) {
        isGlitching = true;
        glitchIntensity = 5 + (bass / 50);
    }

    handleParticles();
    handleObservers();
    handleEyes();

    // 6. Draw Lurker (Behind)
    if(hasHitWater && isShattered && lurkerZ === -1) {
        drawLurker(currentSpeed, bass);
    }

    // 7. Render Player
    if (isGlitching) {
        ctx.save();
        ctx.translate(glitchIntensity, 0);
        ctx.filter = "drop-shadow(0 0 5px red)";
        drawPlayer(playerY);
        ctx.restore();
        
        ctx.save();
        ctx.translate(-glitchIntensity, 0);
        ctx.filter = "drop-shadow(0 0 5px cyan)";
        drawPlayer(playerY);
        ctx.restore();
        
        drawStatic(); 
    }

    drawPlayer(playerY);

    // 8. Draw Lurker (In Front)
    if (hasHitWater && isShattered && lurkerZ === 1) {
        drawLurker(currentSpeed, bass);
    }
    
    if (!isShattered) {
        handleCracks(bass);
    }

    // 9. UI & Sigils
    if(hasHitWater) {
        ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
        ctx.font = "14px Courier New";
        ctx.fillText(`DEPTH: ${Math.floor(depth)}m`, 20, canvas.height - 30);
    }

    if (audio.currentTime >= 26 && !isShattered) {
        shatterCracks();
    }

    if (hasHitWater && isShattered) {
        drawSigils(bass);
    }

    if (hasHitWater) {
        let currentLyric = "";
        let currentTime = audio.currentTime;

        for (let i = 0; i < lyricTimeline.length; i++) {
            if (currentTime >= lyricTimeline[i].time) {
                if (i === lyricTimeline.length - 1 || currentTime < lyricTimeline[i + 1].time) {
                    if (currentTime - lyricTimeline[i].time < 4.5) {
                        currentLyric = lyricTimeline[i].text;
                    }
                }
            }
        }
        if (lyricElement && lyricElement.innerText !== currentLyric) {
            lyricElement.innerText = currentLyric;
            lyricElement.style.opacity = currentLyric === "" ? "0" : "1";
        }
    }

    requestAnimationFrame(loop);
}

function drawPlayer(y) {
    let fadeOut = 1.0;

    if (y > canvas.height - 100) {
        fadeOut = (canvas.height - y) / 100;
    }

    ctx.save();
    ctx.globalAlpha = fadeOut;
    ctx.translate(canvas.width / 2, y);
    const twitch = Math.sin(Date.now() * 0.01) * 2;
    ctx.fillStyle = "white";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "white";
    ctx.fillRect(-5, 0, 10, 30);
    ctx.beginPath();
    ctx.arc(0, -10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-15 + twitch, 5, 10, 5);
    ctx.fillRect(5 - twitch, 5, 10, 5);
    ctx.fillRect(-5, 30, 4, 15 + twitch);
    ctx.fillRect(1, 30, 4, 15 - twitch);
    ctx.restore();
}

audio.addEventListener('play', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
});

function spawnCrack() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = Math.random() * canvas.width; y = 0; }
    else if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height; }
    else { x = 0; y = Math.random() * canvas.height; }

    const points = [{x: x, y: y}];
    let curX = x;
    let curY = y;
    
    // Determine direction toward the center
    let angle = Math.atan2(canvas.height/2 - y, canvas.width/2 - x);
    
    const segments = 8 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < segments; i++) {
        // Add "jaggedness" by jittering the angle
        let jitter = (Math.random() - 0.5) * 1.5; 
        let dist = 30 + Math.random() * 60;
        
        curX += Math.cos(angle + jitter) * dist;
        curY += Math.sin(angle + jitter) * dist;
        
        points.push({x: curX, y: curY});
    }

    cracks.push({
        points: points,
        opacity: 0,
        // Cracks get wider as the depth increases
        width: (1 + Math.random() * 2) + (depth / 10000) 
    });
}


function shatterCracks() {
    isShattered = true;
    cracks.forEach(c => {
        c.points.forEach(p => {
            for(let i = 0; i < 3; i++) {
                particles.push({
                    x: p.x,
                    y: p.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: 2 + Math.random() * 5,
                    life: 1.0,
                    type: 'shard'
                });
            }
        });
    });
    cracks = []; // Wipe the cracks
}

function drawStatic() {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
    for (let i = 0; i < 5; i++) {
        let h = Math.random() * 10;
        let y = Math.random() * canvas.height;
        ctx.fillRect(0, y, canvas.width, h);
    }
    ctx.restore();
}

function drawEyeShape(x, y, size) {
    ctx.beginPath();

    ctx.moveTo(x - size, y);
    ctx.quadraticCurveTo(x, y - (size * 0.6), x + size, y);

    ctx.quadraticCurveTo(x, y + (size * 0.6), x - size, y);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.fillRect(x - 1, y - (size * 0.3), 2, size * 0.6);
}


requestAnimationFrame(loop);

audio.addEventListener('ended', () => {
    const credits = document.getElementById('credits');
    canvas.style.transition = "opacity 3s";
    canvas.style.opacity = "0";

    // Show the credits during the final silence
    credits.style.opacity = "1";
    credits.style.transition = "opacity 2s";

    setTimeout(() => {
        console.log("Severing Link...");
        if (window.electronAPI) {
            window.electronAPI.closeApp();
        } else {
            window.close();
        }
    }, 6000); // Give them 6 seconds to read the credits
});


//DEVELOPER backdoors

window.addEventListener('keydown', (e) => {
    //manual quit
    if (e.key.toLowerCase() === 'q') {
        console.log("Dev-Quit Triggered");
        if (window.electronAPI) {
            window.electronAPI.closeApp();
        } else {
            window.close();
        }
    }

    //time warp
    if (e.key.toLowerCase() === 's') {
        console.log("Warping to finale...");

        audio.currentTime = 135;

        //ensure updated flags
        if (!hasHitWater) hasHitWater = true;
        if (!isShattered) shatterCracks();
    }

    //speed up descent
    if (e.key.toLowerCase() === 'f') {
        depth += 1000;
        console.log("Simulating Deep Pressure...");
    }
});
