const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerTorpedoCountElement = document.getElementById('playerTorpedoCount');
const aiTorpedoCountElement = document.getElementById('aiTorpedoCount');
const playerShieldBarFill = document.getElementById('playerShieldBarFill');
const aiShieldBarFill = document.getElementById('aiShieldBarFill');

canvas.width = 800;
canvas.height = 600;

const LASER_RANGE = 400; // Doubled from 200
const LASER_DURATION = 30; // Increased from 10 for a longer-lasting effect
const LASER_DAMAGE = 2; // Increased from 5 for stronger impact
const TORPEDO_RELOAD_TIME = 180; // 3 seconds at 60 FPS
const GALAXY_COUNT = 1;




const player = new Ship(canvas.width / 4, canvas.height / 2, 'white');
const aiShip = new Ship(
    Math.random() * canvas.width,  // Random x-coordinate
    Math.random() * canvas.height, // Random y-coordinate
    'red'
);
// Slow down AI significantly
aiShip.rotationSpeed *= 0.3;
aiShip.acceleration *= 0.3;
aiShip.maxSpeed *= 0.8;

const ai = new AIPlayer(aiShip, player);

const torpedoes = [];
const lasers = [];
// Add these constants at the top of the file
const STAR_COUNT = 200;


// Add these new arrays
const stars = [];

// Add these new functions

function createStarfield() {
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5,
            alpha: Math.random()
        });
    }
}
const ARMS_PER_GALAXY = 10;
const STARS_PER_ARM = 20    ;

function createGalaxies() {
    galaxies = [];
    for (let i = 0; i < GALAXY_COUNT; i++) {
        const centerX = Math.random() * canvas.width;
        const centerY = Math.random() * canvas.height;
        const radius = Math.random() * 100 + 80;
        const rotation = Math.random() * Math.PI * 2;
        const tilt = Math.random() * 0.5 + 0.2;
        const armShape = 0.3 + Math.random() * 0.2;

        const stars = [];

        // Create central bulge and spiral arms
        for (let arm = 0; arm < ARMS_PER_GALAXY; arm++) {
            for (let j = 0; j < STARS_PER_ARM; j++) {
                const distance = (j / STARS_PER_ARM) * radius;
                const armAngle = (arm / ARMS_PER_GALAXY) * Math.PI * 2;
                const angle = armAngle + armShape * Math.log(distance / radius + 1) + (Math.random() - 0.5) * 0.2;
                const height = (Math.random() - 0.5) * radius * 0.1 * (1 - distance / radius);
                
                // Calculate base brightness based on distance from center
                const baseBrightness = Math.max(0, 1 - (distance / radius) ** 1.5);
                
                stars.push({
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    z: height,
                    brightness: baseBrightness * (0.3 + Math.random() * 0.7),
                    radius: Math.random() * 1.5 + 0.5
                });
            }
        }

        galaxies.push({
            x: centerX,
            y: centerY,
            radius: radius,
            rotation: rotation,
            tilt: tilt,
            stars: stars
        });
    }
}

function drawGalaxies() {
    ctx.save();
    for (const galaxy of galaxies) {
        ctx.translate(galaxy.x, galaxy.y);
        ctx.rotate(galaxy.rotation);
        
        galaxy.stars.sort((a, b) => b.z - a.z);

        for (const star of galaxy.stars) {
            const scale = 2 / (2 + star.z / (galaxy.radius * 0.5));
            const x = star.x * scale;
            const y = star.y * scale * galaxy.tilt;
            
            const distanceFromCenter = Math.sqrt(star.x * star.x + star.y * star.y) / galaxy.radius;
            
            // Enhance color grading based on distance
            const r = 255 - distanceFromCenter * 30;
            const g = 200 - distanceFromCenter * 100;
            const b = 255 - distanceFromCenter * 50;
            
            // Enhance alpha calculation for more pronounced fading
            const fadeStart = 0.4; // Start fading at 70% of radius
            const fadeAlpha = distanceFromCenter > fadeStart 
                ? Math.max(0, 1 - (distanceFromCenter - fadeStart) / (1 - fadeStart))
                : 1;
            const alpha = star.brightness * fadeAlpha * scale * (1 - Math.abs(star.z) / (galaxy.radius * 0.1));

            ctx.beginPath();
            ctx.arc(x, y, star.radius * scale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fill();
        }

        // Enhance central glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, galaxy.radius * 0.2);
        gradient.addColorStop(0.5, 'rgba(255, 240, 200, 0.1)');
        gradient.addColorStop(0, 'rgba(255, 240, 200, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(-galaxy.radius, -galaxy.radius * galaxy.tilt, galaxy.radius * 2, galaxy.radius * 2 * galaxy.tilt);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
}


function drawLaserReloadIndicator(ship, x, y, width, height) {
    const reloadProgress = 1 - (ship.laserCooldown / ship.maxLaserCooldown);
    ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = ship.color === 'white' ? 'rgba(255, 255, 0, 0.7)' : 'rgba(255, 100, 0, 0.7)';
    ctx.fillRect(x, y, width * reloadProgress, height);
}

function drawStarfield() {
    ctx.save();
    for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
    }
    ctx.restore();
}

let gameOver = false;

function drawExplosion(ship) {
    ctx.save();
    ctx.translate(ship.x, ship.y);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ship.explosionRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, ship.explosionRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();

    console.log(`Drawing explosion for ${ship === player ? 'Player' : 'AI'} ship. Radius: ${ship.explosionRadius}, Duration left: ${ship.explosionDuration}`);
}



function startShipExplosion(ship) {
    ship.isExploding = true;
    ship.explosionDuration = 60; // Set this to control explosion duration
    ship.explosionRadius = 0;
    console.log(`${ship === player ? 'Player' : 'AI'} ship started exploding`);
}


function updateShip(ship) {
    if (ship.isExploding) {
        ship.explosionDuration--;
        ship.explosionRadius += 2; // Increase explosion radius
        if (ship.explosionDuration <= 0) {
            endGame(ship === player ? 'AI' : 'Player');
        }
    } else {
        if (ship.update()) {
            startShipExplosion(ship);
        }
    }
    wrapPosition(ship);
}

function update() {
    if (gameOver) return;

    updateShip(player);
    updateShip(aiShip);

    if (!player.isExploding && !aiShip.isExploding) {
        const aiAction = ai.update(torpedoes);
        if (aiAction) {
            if (aiAction.vx !== undefined) {
                torpedoes.push(aiAction);
            } else {
                lasers.push(aiAction);
            }
        }

        updateProjectiles();
    }

    updateUI();
}



function updateProjectiles() {
    for (let i = torpedoes.length - 1; i >= 0; i--) {
        const torpedo = torpedoes[i];
        torpedo.life--;
        if (torpedo.life <= 0) {
            torpedoes.splice(i, 1);
        } else {
            torpedo.x += torpedo.vx;
            torpedo.y += torpedo.vy;
            wrapPosition(torpedo);

            if (checkTorpedoCollision(torpedo, player)) {
                torpedoes.splice(i, 1); // Remove torpedo on impact
            } else if (checkTorpedoCollision(torpedo, aiShip)) {
                torpedoes.splice(i, 1); // Remove torpedo on impact
            }
        }
    }

    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.duration--;
        if (laser.duration <= 0) {
            lasers.splice(i, 1);
        } else {
            const target = laser.source === player ? aiShip : player;
            if (checkLaserCollision(laser, target)) {
                // Laser hit the target
                console.log(`Laser hit ${target === player ? 'player' : 'AI'}`);
                lasers.splice(i, 1); // Remove the laser after hitting
            }
        }
    }
}

// Add this new function
function drawTorpedoReloadIndicator(ship, x, y, width, height) {
    const reloadProgress = 1 - (ship.torpedoReloadTime / TORPEDO_RELOAD_TIME);
    ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = ship.color === 'white' ? 'rgba(0, 255, 255, 0.7)' : 'rgba(255, 100, 100, 0.7)';
    ctx.fillRect(x, y, width * reloadProgress, height);
}
function checkTorpedoCollision(torpedo, ship) {
    if (torpedo.source === ship) return false;

    const dx = torpedo.x - ship.x;
    const dy = torpedo.y - ship.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const expandedCollisionDistance = ship.radius + 20; // Increase collision distance by additional buffer

    if (distance < expandedCollisionDistance) {
        ship.handleCollision(300, torpedo); // Pass the torpedo to handleCollision
        return true; // Indicate collision occurred
    }
    return false;
}

function wrapPosition(object) {
    object.x = (object.x + canvas.width) % canvas.width;
    object.y = (object.y + canvas.height) % canvas.height;
}

function updateUI() {
    updateShieldBar(player, playerShieldBarFill);
    updateShieldBar(aiShip, aiShieldBarFill);
    updateTorpedoCount(player, playerTorpedoCountElement);
    updateTorpedoCount(aiShip, aiTorpedoCountElement);
}

function updateTorpedoCount(ship, element) {
    element.textContent = ship.torpedoCount;
}

function updateShieldBar(ship, barElement) {
    const percentage = (ship.shieldStrength / ship.maxShieldStrength) * 100;
    barElement.style.width = `${percentage}%`;
}

function endGame(winner) {
    gameOver = true;
    showGameOverScreen(winner);
}

function showGameOverScreen(winner) {
    const gameOverScreen = document.getElementById('gameOverScreen');
    gameOverScreen.style.display = 'block';
    gameOverScreen.innerHTML = `
 _____   ___  ___  ___ _____   _____  _   _ ___________ 
|  __ \\ / _ \\ |  \\/  ||  ___| |  _  || | | |  ___| ___ \\
| |  \\// /_\\ \\| .  . || |__   | | | || | | | |__ | |_/ /
| | __ |  _  || |\\/| ||  __|  | | | || | | |  __||    / 
| |_\\ \\| | | || |  | || |___  \\ \\_/ /\\ \\_/ / |___| |\\ \\ 
 \\____/\\_| |_/\\_|  |_/\\____/   \\___/  \\___/\\____/\\_| \\_|
                                                        
            ${winner} Wins!
        Hit Space to Restart`;
}

function resetGame() {
    player.reset();
    aiShip.reset();
    torpedoes.length = 0;
    lasers.length = 0;
    gameOver = false;
    document.getElementById('gameOverScreen').style.display = 'none';
    gameLoop(); // Restart the game loop
}

function drawFlame(ship, x, angle, length, width) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.rotate(angle);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, -length, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 0, 1)');
    gradient.addColorStop(0.6, 'rgba(255, 150, 0, 1)');
    gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

    // Flame shape
    ctx.beginPath();
    ctx.moveTo(0, 0);
    
    // Animated flame effect
    const time = Date.now() / 200;
    const waveAmplitude = width / 4;
    
    for (let i = 0; i <= length; i++) {
        const waveX = -i;
        const waveY = Math.sin(i / 2 + time) * waveAmplitude * (1 - i / length);
        ctx.lineTo(waveX, waveY);
    }
    
    for (let i = length; i >= 0; i--) {
        const waveX = -i;
        const waveY = Math.sin(i / 2 + time + Math.PI) * waveAmplitude * (1 - i / length);
        ctx.lineTo(waveX, waveY);
    }

    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
}
function checkLaserCollision(laser, ship) {
    const dx = ship.x - laser.startX;
    const dy = ship.y - laser.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= LASER_RANGE) {
        const angleDiff = Math.abs(Math.atan2(dy, dx) - laser.angle);
        const normalizedAngleDiff = angleDiff > Math.PI ? 2 * Math.PI - angleDiff : angleDiff;
        
        if (normalizedAngleDiff < 0.1) {
            // Check if the laser intersects with the ship's hitbox
            const hitboxRadius = ship.radius; // Adjust this value as needed
            const laserEndX = laser.startX + Math.cos(laser.angle) * LASER_RANGE;
            const laserEndY = laser.startY + Math.sin(laser.angle) * LASER_RANGE;
            
            const closestPoint = closestPointOnLine(
                laser.startX, laser.startY, laserEndX, laserEndY,
                ship.x, ship.y
            );
            
            const distanceToClosestPoint = Math.sqrt(
                (closestPoint.x - ship.x) ** 2 + (closestPoint.y - ship.y) ** 2
            );
            
            if (distanceToClosestPoint <= hitboxRadius) {
                return ship.handleCollision(LASER_DAMAGE);
            }
        }
    }
    return false;
}

function closestPointOnLine(x1, y1, x2, y2, px, py) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const mag = Math.sqrt(dx * dx + dy * dy);
    const u = ((px - x1) * dx + (py - y1) * dy) / (mag * mag);
    
    if (u < 0) return {x: x1, y: y1};
    if (u > 1) return {x: x2, y: y2};
    
    return {
        x: x1 + u * dx,
        y: y1 + u * dy
    };
}

function drawShip(ship) {
    if (ship.isExploding) {
        drawExplosion(ship);
    } else {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        // Draw ship body
        ctx.beginPath();
        ctx.moveTo(ship.radius, 0);
        ctx.lineTo(-ship.radius, -ship.radius);
        ctx.lineTo(-ship.radius, ship.radius);
        ctx.closePath();
        ctx.strokeStyle = ship.color;
        ctx.stroke();

        // Draw shield if it has strength
        if (ship.shieldStrength > 0 && ship.shieldImpact > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, ship.shieldRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${ship.shieldImpact})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw flames if applicable
        if (ship.isAccelerating) {
            drawFlame(ship, -ship.radius, 0, 25, 10);
        }
        if (ship.isDecelerating) {
            drawFlame(ship, ship.radius, Math.PI / 2, 15, 5);
            drawFlame(ship, ship.radius, -Math.PI / 2, 15, 5);
        }

        ctx.restore();
    }
}


function drawFlame(ship, x, angle, length, width) {
    ctx.save(); // Save the canvas state
    ctx.translate(x, 0);
    ctx.rotate(angle);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, -length, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 0, 1)');
    gradient.addColorStop(0.6, 'rgba(255, 150, 0, 1)');
    gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

    // Flame shape
    ctx.beginPath();
    ctx.moveTo(0, 0);
    
    // Animated flame effect
    const time = Date.now() / 200;
    const waveAmplitude = width / 4;
    
    for (let i = 0; i <= length; i++) {
        const waveX = -i;
        const waveY = Math.sin(i / 2 + time) * waveAmplitude * (1 - i / length);
        ctx.lineTo(waveX, waveY);
    }
    
    for (let i = length; i >= 0; i--) {
        const waveX = -i;
        const waveY = Math.sin(i / 2 + time + Math.PI) * waveAmplitude * (1 - i / length);
        ctx.lineTo(waveX, waveY);
    }

    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore(); // Restore the canvas state
}
function drawTorpedoes() {
    for (const torpedo of torpedoes) {
        if (!isFinite(torpedo.x) || !isFinite(torpedo.y)) {
            console.warn('Invalid torpedo position:', torpedo);
            continue;
        }

        const maxSpeed = 6;
        const minSize = 4;
        const maxSize = 8;

        const speed = Math.sqrt(torpedo.vx ** 2 + torpedo.vy ** 2);
        const size = maxSize - (speed / maxSpeed) * (maxSize - minSize);

        const pulse = Math.sin(Date.now() / 150) * 0.2 + 0.8;

        try {
            // Determine color based on source
            const baseColor = torpedo.source === player ? 'rgb(0, 100, 255)' : 'rgb(255, 50, 50)';
            const glowColor = torpedo.source === player ? 'rgba(0, 200, 255, 0.3)' : 'rgba(255, 100, 100, 0.3)';

            // Create a more intense gradient for the body
            const bodyGradient = ctx.createRadialGradient(
                torpedo.x, torpedo.y, 0,
                torpedo.x, torpedo.y, size * 2 * pulse
            );
            bodyGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            bodyGradient.addColorStop(0.3, baseColor);
            bodyGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.6)');
            bodyGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            // Draw the main body of the torpedo
            ctx.beginPath();
            ctx.arc(torpedo.x, torpedo.y, size * pulse, 0, Math.PI * 2);
            ctx.fillStyle = bodyGradient;
            ctx.fill();

            // Add a glowing effect
            ctx.beginPath();
            ctx.arc(torpedo.x, torpedo.y, size * 2 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = glowColor;
            ctx.fill();

            // Draw menacing spikes with gradients
            const spikeCount = 12;
            const maxSpikeLength = size * 2.5;
            const minSpikeLength = size * 0.5;

            for (let i = 0; i < spikeCount; i++) {
                const angle = (i * Math.PI * 2) / spikeCount + Date.now() / 1000;
                const spikePulse = Math.sin(Date.now() / 100 + i) * 2 + 0.1;
                const spikeLength = minSpikeLength + (maxSpikeLength - minSpikeLength) * spikePulse;

                const x1 = torpedo.x + Math.cos(angle) * size;
                const y1 = torpedo.y + Math.sin(angle) * size;
                const x2 = torpedo.x + Math.cos(angle) * (size + spikeLength);
                const y2 = torpedo.y + Math.sin(angle) * (size + spikeLength);

                const spikeGradient = ctx.createLinearGradient(x1, y1, x2, y2);
                spikeGradient.addColorStop(0, baseColor);
                spikeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = spikeGradient;
                ctx.stroke();
            }

            // Add a trailing effect with gradient
            const trailLength = 20;
            const trailGradient = ctx.createLinearGradient(
                torpedo.x - torpedo.vx * trailLength, 
                torpedo.y - torpedo.vy * trailLength,
                torpedo.x, torpedo.y
            );
            trailGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            trailGradient.addColorStop(1, glowColor);

            ctx.beginPath();
            ctx.moveTo(torpedo.x - torpedo.vx * trailLength, torpedo.y - torpedo.vy * trailLength);
            ctx.lineTo(torpedo.x, torpedo.y);
            ctx.strokeStyle = trailGradient;
            ctx.stroke();

        } catch (error) {
            console.error('Error drawing torpedo:', error);
        }
    }
}
function drawLasers() {
    for (const laser of lasers) {
        ctx.save();  // Save the context state before transformations

        const endX = laser.startX + Math.cos(laser.angle) * LASER_RANGE;
        const endY = laser.startY + Math.sin(laser.angle) * LASER_RANGE;

        // Check for non-finite values
        if (!isFinite(laser.startX) || !isFinite(laser.startY) || !isFinite(endX) || !isFinite(endY)) {
            console.error('Non-finite values detected in drawLasers:', { startX: laser.startX, startY: laser.startY, endX, endY });
            ctx.restore();
            continue;  // Skip this laser and move to the next one
        }

        const flicker = Math.random() * 0.9; // Stronger flickering effect
        let gradient;
        try {
            gradient = ctx.createLinearGradient(
                laser.startX, laser.startY,
                endX, endY
            );

            gradient.addColorStop(0, `rgba(255, 0, 0, ${laser.duration / LASER_DURATION * flicker})`);
            gradient.addColorStop(0.5, `rgba(255, 200, 0, ${laser.duration / LASER_DURATION * flicker})`);
            gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);

            ctx.beginPath();
            ctx.moveTo(laser.startX, laser.startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2 * flicker; // Adjust line width to enhance flickering effect
            ctx.stroke();

            // Add a more pronounced glow effect
            ctx.beginPath();
            ctx.moveTo(laser.startX, laser.startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = `rgba(255, 100, 100, ${laser.duration / LASER_DURATION * 0.6 * flicker})`;
            ctx.lineWidth = 5 * flicker; // Adjust line width to enhance flickering effect
            ctx.stroke();
        } catch (error) {
            console.error('Error in drawLasers:', error);
        }

        ctx.restore();  // Restore the context state after transformations
    }
}

function gameLoop() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGalaxies();
    drawStarfield();

    update();
    updateLasers();
    drawTorpedoes();
    drawLasers();
    drawShip(player);
    drawShip(aiShip);

    drawTorpedoReloadIndicator(player, 10, 10, 100, 10);
    drawTorpedoReloadIndicator(aiShip, canvas.width - 110, 10, 100, 10);

    drawLaserReloadIndicator(player, 10, 30, 100, 10);
    drawLaserReloadIndicator(aiShip, canvas.width - 110, 30, 100, 10);

    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

function updateLasers() {
    for (const laser of lasers) {
        laser.startX = laser.source.x;
        laser.startY = laser.source.y;
    }
}
// Start the game loop
createStarfield();
createGalaxies();

document.addEventListener('keydown', (event) => {
    if (gameOver) {
        if (event.key === ' ') {
            resetGame();
        }
        return;
    }


    switch(event.key) {
        case 'ArrowUp':
            player.isAccelerating = true;
            break;
        case 'ArrowDown':
            player.isDecelerating = true;
            break;
        case 'ArrowLeft':
            player.rotate(-1);
            break;
        case 'ArrowRight':
            player.rotate(1);
            break;
        case ' ':
            const torpedo = player.fireTorpedo();
            if (torpedo) torpedoes.push(torpedo);
            break;
        case 'Shift':
            const laser = player.fireLaser();
            if (laser) lasers.push(laser);
            break;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowUp') {
        player.isAccelerating = false;
    }
    if (event.key === 'ArrowDown') {
        player.isDecelerating = false;
    }
});
// Start the game
gameLoop();