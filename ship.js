class Ship {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.angle = 0;
        this.velocity = { x: 0, y: 0 };
        this.rotationSpeed = 0.11;
        this.acceleration = 0.1;
        this.maxSpeed = 6;
        this.color = color;
        this.isAccelerating = false;
        this.isDecelerating = false;
        this.shieldStrength = 600;
        this.deceleration = 0.2; 
        this.maxShieldStrength = 600;
        this.shieldRechargeRate = 0.2;
        this.shieldRadius = 20;
        this.shieldImpact = 0;
        this.isExploding = false;
        this.explosionRadius = 0;
        this.explosionDuration = 60;
        this.tiltAngle = 0;
        this.torpedoCount = 10;
        this.maxTorpedoCount = 5;
        this.torpedoReloadTime = 0;
        this.laserCooldown = 0;
        this.maxLaserCooldown = 60;
    }

    update() {
        if (this.isExploding) {
            this.explosionRadius += 2;
            this.explosionDuration--;
            return this.explosionDuration <= 0;
        }

        if (this.isAccelerating) {
            this.accelerate();
        }
        if (this.isDecelerating) {
            this.decelerate();
        }

        this.x += this.velocity.x;
        this.y += this.velocity.y;

        this.wrapPosition();

        this.shieldStrength = Math.min(this.shieldStrength + this.shieldRechargeRate, this.maxShieldStrength);

        if (this.shieldImpact > 0) {
            this.shieldImpact -= 0.05;
        }

        if (this.torpedoReloadTime > 0) {
            this.torpedoReloadTime--;
        }

        if (this.laserCooldown > 0) {
            this.laserCooldown--;
        }

        return false;
    }

    fireLaser() {
        if (this.laserCooldown > 0) return null;
    
        console.log('Laser fired by:', this.color);
        this.laserCooldown = this.maxLaserCooldown;
        return {
            startX: this.x,
            startY: this.y,
            angle: this.angle,
            duration: LASER_DURATION,
            source: this // Reference to the source ship
        };
    }


    wrapPosition(canvasWidth, canvasHeight) {
        // Wrap horizontally
        if (this.x < -this.radius) {
            this.x = canvasWidth + this.radius;
        } else if (this.x > canvasWidth + this.radius) {
            this.x = -this.radius;
        }

        // Wrap vertically
        if (this.y < -this.radius) {
            this.y = canvasHeight + this.radius;
        } else if (this.y > canvasHeight + this.radius) {
            this.y = -this.radius;
        }
    }
    accelerate() {
        const accelerationX = Math.cos(this.angle) * this.acceleration;
        const accelerationY = Math.sin(this.angle) * this.acceleration;
        this.velocity.x += accelerationX;
        this.velocity.y += accelerationY;
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (speed > this.maxSpeed) {
            const factor = this.maxSpeed / speed;
            this.velocity.x *= factor;
            this.velocity.y *= factor;
        }
    }

    decelerate() {
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (speed > 0) {
            const decelerationX = this.velocity.x / speed * this.deceleration;
            const decelerationY = this.velocity.y / speed * this.deceleration;
            this.velocity.x -= decelerationX;
            this.velocity.y -= decelerationY;
            if (Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2) < this.deceleration) {
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        }
    }


    rotate(direction) {
        this.angle += this.rotationSpeed * direction;
    }

    fireLaser() {
        if (this.laserCooldown > 0) return null;

        console.log('Laser fired by:', this.color);
        this.laserCooldown = this.maxLaserCooldown;
        return {
            startX: this.x,
            startY: this.y,
            angle: this.angle,
            duration: LASER_DURATION,
            source: this
        };
    }

    fireTorpedo() {
        if (this.torpedoCount <= 0 || this.torpedoReloadTime > 0) return null;

        console.log('Torpedo fired by:', this.color);
        this.torpedoCount--;
        this.torpedoReloadTime = TORPEDO_RELOAD_TIME;

        const speed = 4;
        return {
            x: this.x + Math.cos(this.angle) * this.radius,
            y: this.y + Math.sin(this.angle) * this.radius,
            vx: Math.cos(this.angle) * speed + this.velocity.x * 0.5,
            vy: Math.sin(this.angle) * speed + this.velocity.y * 0.5,
            life: 420,
            color: this.color,
            source: this
        };
    }

    handleCollision(damage, torpedo) {
        this.shieldStrength -= damage;
        this.shieldImpact = 1;

        // Add visual feedback like screen shake or flashing effect
        if (damage > 0) {
            document.body.classList.add('shake');
            setTimeout(() => {
                document.body.classList.remove('shake');
            }, 100);
        }

        if (this.shieldStrength <= 0) {
            this.isExploding = true;
            this.explosionRadius = 0;
            this.explosionDuration = 60;
            
            return true;
        }
        return false;
    }

    reset() {
        this.x = this.color === 'white' ? canvas.width / 4 : 3 * canvas.width / 4;
        this.y = canvas.height / 2;
        this.velocity = { x: 0, y: 0 };
        this.angle = 0;
        this.isExploding = false;
        this.shieldStrength = this.maxShieldStrength;
        this.torpedoCount = this.maxTorpedoCount;
        this.torpedoReloadTime = 0;
        this.laserCooldown = 0;
    }
}