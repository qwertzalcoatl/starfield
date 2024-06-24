class AIPlayer {
    constructor(ship, targetShip) {
        this.ship = ship;
        this.targetShip = targetShip;
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.state = 'pursue';
        this.lastStateChange = 0;
        this.optimalDistance = 250;
        this.evadeDirectionChangeInterval = 1000;
        this.lastEvadeDirectionChange = 0;
        this.evadeAngle = 0;
        this.lastKnownGoodPosition = { x: ship.x, y: ship.y };
        this.lastTorpedoFireTime = 0;
        this.torpedoCooldown = 1000;
        this.torpedoSpeed = 6;
        this.minFireDistance = 100;
        this.maxFireDistance = 400; // Can be adjusted based on game balance
        this.firingProbability = 0.1;
    }

    update(torpedoes) {
        const now = Date.now();
        
        if (now - this.lastStateChange > 2000) {
            this.updateState();
            this.lastStateChange = now;
        }

        this.ship.isAccelerating = false;
        this.ship.isDecelerating = false;
        
        switch (this.state) {
            case 'pursue':
                this.pursue();
                break;
            case 'evade':
                this.evade(now);
                break;
            case 'attack':
                this.attack();
                break;
            case 'flank':
                this.flank();
                break;
            case 'turnToPlayer':
                this.turnToPlayer();
                break;
        }
        
        const firedProjectile = this.checkIfFiringIsPossible();
        if (firedProjectile) {
            console.log('AI fired a projectile:', firedProjectile);
            return firedProjectile;
        }

        return null;
    }

    updateState() {
        const distanceToPlayer = this.getDistanceToPlayer();
        const shieldPercentage = this.ship.shieldStrength / this.ship.maxShieldStrength;
        
        console.log('AI State Update:', {
            currentState: this.state,
            distance: distanceToPlayer,
            shield: shieldPercentage
        });

        if (shieldPercentage < 0.3) {
            this.state = 'evade'; // This is where we change to evade
        } else if (distanceToPlayer > this.optimalDistance) {
            this.state = 'pursue';
        } else {
            this.state = 'attack';
        }
    }

    pursue() {
        console.log('AI Pursuing');
        const angle = this.getAngleToPlayer();
        this.adjustAngle(angle);

        const distanceToPlayer = this.getDistanceToPlayer();

        if (distanceToPlayer > this.optimalDistance) {
            this.ship.isAccelerating = true;
        } else {
            this.ship.isDecelerating = true;
        }
    }
    evade(now) {
        console.log('AI Evading');
        
        // Always accelerate at maximum speed during evasion
        this.ship.isAccelerating = true;

        // Change direction at regular intervals
        if (now - this.lastEvadeDirectionChange > this.evadeDirectionChangeInterval) {
            // Instead of a completely random angle, let's base it on the current angle
            const randomOffset = (Math.random() - 0.5) * Math.PI; // Random angle between -PI/2 and PI/2
            this.evadeAngle = (this.ship.angle + randomOffset + 2 * Math.PI) % (2 * Math.PI);
            this.lastEvadeDirectionChange = now;
            console.log('New evade angle:', this.evadeAngle);
        }

        // Gradually adjust the ship's angle towards the evasion angle
        const angleDiff = this.evadeAngle - this.ship.angle;
        const normalizedAngleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
        const angleStep = Math.sign(normalizedAngleDiff) * Math.min(Math.abs(normalizedAngleDiff), this.ship.rotationSpeed);
        this.ship.angle = (this.ship.angle + angleStep + 2 * Math.PI) % (2 * Math.PI);

        // Update position based on the new angle
        const speed = this.ship.isAccelerating ? this.ship.maxSpeed : 0;
        const newX = this.ship.x + Math.cos(this.ship.angle) * speed;
        const newY = this.ship.y + Math.sin(this.ship.angle) * speed;

        // Check if the new position is valid before updating
        if (isFinite(newX) && isFinite(newY)) {
            this.ship.x = newX;
            this.ship.y = newY;
            this.lastKnownGoodPosition = { x: newX, y: newY };
        } else {
            console.error('Invalid position calculated:', { x: newX, y: newY });
            // Revert to last known good position
            this.ship.x = this.lastKnownGoodPosition.x;
            this.ship.y = this.lastKnownGoodPosition.y;
        }

        // Ensure the ship stays within bounds
        this.wrapPosition(this.ship);

        // Check if we should exit evasion state
        if (this.ship.shieldStrength / this.ship.maxShieldStrength > 0.5) {
            this.state = 'pursue'; // Or any other appropriate state
            console.log('Exiting evade state');
        }

        console.log('AI Ship position after evade:', this.ship.x, this.ship.y);
    }

    attack() {
        console.log('AI Attacking');
        const angle = this.getAngleToPlayer();
        this.adjustAngle(angle);
        this.ship.isDecelerating = true; // Slow down for a more precise attack
    }

    flank() {
        console.log('AI Flanking');
        const angleToPlayer = this.getAngleToPlayer();
        const flankAngle = angleToPlayer + Math.PI / 2; // Move to the side of the player
        this.adjustAngle(flankAngle);

        const distanceToPlayer = this.getDistanceToPlayer();
        if (distanceToPlayer > this.optimalDistance) {
            this.ship.isAccelerating = true;
        } else {
            this.ship.isDecelerating = true;
        }
    }

    turnToPlayer() {
        console.log('AI Turning to Player');
        const angleToPlayer = this.getAngleToPlayer();
        this.adjustAngle(angleToPlayer);
    }

    checkIfFiringIsPossible() {
        const now = Date.now();
        const distanceToPlayer = this.getAdjustedDistanceToPlayer();
    
        if (now - this.lastTorpedoFireTime > this.torpedoCooldown &&
            distanceToPlayer >= this.minFireDistance &&
            distanceToPlayer <= this.maxFireDistance &&
            Math.random() < this.firingProbability) {
            
            const interceptPoint = this.calculateInterceptPoint();
            const angleToIntercept = this.getAdjustedAngleToPlayer();
            const angleDiff = Math.abs(angleToIntercept - this.ship.angle);
            
            if (angleDiff < Math.PI / 6 || angleDiff > Math.PI * 11 / 6) { // Within 30 degrees
                console.log('AI attempting to fire torpedo at intercept point', interceptPoint);
                const torpedo = this.ship.fireTorpedo(angleToIntercept);
                if (torpedo) {
                    console.log('AI successfully fired torpedo');
                    this.lastTorpedoFireTime = now;
                    return torpedo;
                }
            }
        }
    
    
        if (distanceToPlayer < this.optimalDistance ) {
            if (Math.random() < 1) {
                console.log('AI Firing Laser');
                const laser = this.ship.fireLaser();
                if (laser) lasers.push(laser); // Ensure laser is added to the array
            }
        } 
    }

    predictTargetPosition(time) {
        // Simply predict the position without worrying about wrapping
        return {
            x: this.targetShip.x + this.targetShip.velocity.x * time,
            y: this.targetShip.y + this.targetShip.velocity.y * time
        };
    }

    calculateInterceptPoint() {
        const maxIterations = 10;
        const convergenceThreshold = 1;
        let timeToIntercept = this.getInitialTimeEstimate();

        for (let i = 0; i < maxIterations; i++) {
            const predictedPosition = this.predictTargetPosition(timeToIntercept);
            const distance = this.getAdjustedDistance(this.ship.x, this.ship.y, predictedPosition.x, predictedPosition.y);
            const newTimeToIntercept = distance / this.torpedoSpeed;

            if (Math.abs(newTimeToIntercept - timeToIntercept) < convergenceThreshold) {
                break;
            }

            timeToIntercept = newTimeToIntercept;
        }

        return this.predictTargetPosition(timeToIntercept);
    }

    getInitialTimeEstimate() {
        const distance = this.getAdjustedDistanceToPlayer();
        return distance / this.torpedoSpeed;
    }

    getAdjustedDistance(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        
        const adjustedDx = Math.min(dx, this.canvasWidth - dx);
        const adjustedDy = Math.min(dy, this.canvasHeight - dy);

        return Math.sqrt(adjustedDx * adjustedDx + adjustedDy * adjustedDy);
    }

    getAdjustedDistanceToPlayer() {
        return this.getAdjustedDistance(this.ship.x, this.ship.y, this.targetShip.x, this.targetShip.y);
    }

    getAdjustedAngleToPlayer() {
        const dx = this.targetShip.x - this.ship.x;
        const dy = this.targetShip.y - this.ship.y;
        
        let adjustedDx = dx;
        let adjustedDy = dy;

        if (Math.abs(dx) > this.canvasWidth / 2) {
            adjustedDx = dx > 0 ? dx - this.canvasWidth : dx + this.canvasWidth;
        }
        if (Math.abs(dy) > this.canvasHeight / 2) {
            adjustedDy = dy > 0 ? dy - this.canvasHeight : dy + this.canvasHeight;
        }

        return Math.atan2(adjustedDy, adjustedDx);
    }


    isPlayerAimingAtAI() {
        const angleToAI = this.getAngleToPlayer();
        const playerAngle = this.targetShip.angle;
        const angleDiff = Math.abs(angleToAI - playerAngle);
        return angleDiff < 0.3 || angleDiff > (2 * Math.PI - 0.3); // within 0.3 radians (about 17 degrees)
    }

    getDistanceToPlayer() {
        const dx = this.targetShip.x - this.ship.x;
        const dy = this.targetShip.y - this.ship.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getAngleToPlayer() {
        const dx = this.targetShip.x - this.ship.x;
        const dy = this.targetShip.y - this.ship.y;
        return Math.atan2(dy, dx);
    }

    adjustAngle(targetAngle) {
        let angleDiff = targetAngle - this.ship.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        this.ship.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.ship.rotationSpeed);
    }

    wrapPosition(object) {
        object.x = (object.x + canvas.width) % canvas.width;
        object.y = (object.y + canvas.height) % canvas.height;
    }


    isUnderHeavyFire() {
        // Simple random check to simulate heavy fire
        return Math.random() < 0.1;
    }

    findNearestTorpedo(torpedoes) {
        return torpedoes.reduce((nearest, torpedo) => {
            if (torpedo.source === this.ship) return nearest;
            const distance = Math.sqrt(
                (torpedo.x - this.ship.x) ** 2 + 
                (torpedo.y - this.ship.y) ** 2
            );
            return (!nearest || distance < nearest.distance) 
                ? { torpedo, distance } 
                : nearest;
        }, null);
    }

    calculateEvasionAngle(nearestTorpedo) {
        const torpedoAngle = Math.atan2(
            nearestTorpedo.torpedo.vy,
            nearestTorpedo.vx
        );
        // Evade perpendicular to the torpedo's path
        return torpedoAngle + Math.PI / 2;
    }
}