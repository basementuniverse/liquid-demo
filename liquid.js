const liquid = canvas => {
    const X = 0,    Y = 1,  Z = 2;
    const VX = 3,   VY = 4, VZ = 5;
    const R = 0,    G = 1,  B = 2;
    const GRID_SIZE = 10;
    const GRID_BUFFER = 2;
    const MIN_CELL_SIZE = 50;
    const RANDOMIZATION = 0.8;
    const Z_OFFSET = 10;
    const LIGHT_DIRECTION = [1, 1, 0];
    const BASE_COLOUR = [47, 64, 80];
    const SHADOW_COLOUR = [31, 37, 43];
    const LIGHT_COLOUR = [36, 185, 159];
    const SPREAD = 0.6;
    const DAMPING = 0.1;
    const FRICTION = 0.999;
    const WAVE_COUNT = 20;
    const WAVE_AMOUNT = 0.5;
    const MOUSE_AMOUNT = 1.1;
    const FREQUENCY = 2;
    const PHASE = 5;

    // Get a 2d context for the canvas
    const context = canvas.getContext('2d');
    
    let width = 0;
    let height = 0;
    let cellSize = 0;
    let points = [];
    let triangles = [];
    let elapsedTime = 0;

    // Handle mouse input
    const hammer = new Hammer.Manager(canvas, { recognizers: [
        [Hammer.Pan]
    ] });
    const mouse = {
        position: [0, 0],
        down: false
    };
    hammer.on('panstart', () => { mouse.down = true; });
    hammer.on('panend', () => { mouse.down = false; });
    hammer.on('pan', e => {
        mouse.position[X] = e.center.x;
        mouse.position[Y] = e.center.y;
    });

    // Handle window resize
    function resize() {
        canvas.width = width = canvas.clientWidth;
        canvas.height = height = canvas.clientHeight;
        draw(context);
    }
    window.onresize = resize;
    resize();

    // Wave generator
    class WaveGenerator {
        // n = 0;
        // wavesX = [];
        // wavesY = [];
        
        constructor(n) {
            this.n = n;
            this.wavesX = [];
            this.wavesY = [];
            for (let i = 0; i < n; i++) {
                this.wavesX.push({
                    frequency: (Math.random() * 2 - 1) * FREQUENCY,
                    phase: (Math.random() * 2 - 1) * PHASE
                });
                this.wavesY.push({
                    frequency: (Math.random() * 2 - 1) * FREQUENCY,
                    phase: (Math.random() * 2 - 1) * PHASE
                });
            }
        }

        sample(t, x, y) {
            let result = 0, a = 1 / this.n;
            for (let i = 0; i < this.n; i++) {
                result += (
                    Math.sin(t * this.wavesX[i].frequency + x + this.wavesX[i].phase) +
                    Math.cos(t * this.wavesY[i].frequency + y + this.wavesY[i].phase)
                ) * a;
            }
            return result * WAVE_AMOUNT;
        }
    }
    const waveGenerator = new WaveGenerator(WAVE_COUNT);

    // Initialise the simulation
    function initialise() {

        // Create a grid of randomly offset centroids
        const size = GRID_SIZE + GRID_BUFFER * 2;
        let offsetX, offsetY;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                offsetX = (Math.random() - 0.5) * RANDOMIZATION;
                offsetY = (Math.random() - 0.5) * RANDOMIZATION;
                points.push([x + 0.5 + offsetX, y + 0.5 + offsetY]);
            }
        }

        // Generate delaunay triangulation for these points
        const d = new Delaunator(points.flat());
        triangles = d.triangles;

        // Give each point a z offset and a velocity
        for (let point of points) {
            point.push(Z_OFFSET, 0, 0, 0);
        }
    }

    // Handle user input
    function handleInput() {
        if (mouse.down) {
            const gx = Math.floor(mouse.position[X] / cellSize) + GRID_BUFFER;
            const gy = Math.floor(mouse.position[Y] / cellSize) + GRID_BUFFER;
            const p = points[index(gx, gy)];
            const m = [
                mouse.position[X] / cellSize + GRID_BUFFER,
                mouse.position[Y] / cellSize + GRID_BUFFER
            ];
            const d = clamp(1 - len(sub([m[X], m[Y], 0], [p[X], p[Y], 0])), 0, 1);
            p[Z] += MOUSE_AMOUNT * d;
        }
    }

    // Update the simulation
    function update(dt) {
        elapsedTime += dt;
        const size = GRID_SIZE + GRID_BUFFER * 2;
        let point, d, a;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                point = points[index(x, y)];

                // Waves
                point[Z] += waveGenerator.sample(elapsedTime, x, y);

                // Spread
                a = (averageAdjacent(x, y) - point[Z]) * SPREAD;
                point[Z] += a;
                
                // Spring
                d = mul(sub([point[X], point[Y], Z_OFFSET], point), DAMPING);
                point[VX] += d[X];
                point[VY] += d[Y];
                point[VZ] += d[Z];
                point[VX] *= FRICTION;
                point[VY] *= FRICTION;
                point[VZ] *= FRICTION;
                point[X] += point[VX];
                point[Y] += point[VY];
                point[Z] += point[VZ];
            }
        }
    }

    // Render the simulation
    function draw(context) {
        context.save();
        context.fillStyle = rgb(BASE_COLOUR[R], BASE_COLOUR[G], BASE_COLOUR[B]);
        context.fillRect(0, 0, width, height);

        // Scale and translate the canvas
        cellSize = Math.max(Math.max(width, height) / GRID_SIZE, MIN_CELL_SIZE);
        context.scale(cellSize, cellSize);
        context.translate(-GRID_BUFFER, -GRID_BUFFER);

        // Render each triangle
        let p1, p2, p3, d, colour;
        for (let i = 0; i < triangles.length; i += 3) {

            // Transform the triangle vertices using a perspective transform
            p1 = project(points[triangles[i    ]]);
            p2 = project(points[triangles[i + 1]]);
            p3 = project(points[triangles[i + 2]]);

            // Calculate dot product of light direction and surface normal
            d = dot(
                norm(LIGHT_DIRECTION),
                norm(cross(
                    sub(points[triangles[i + 1]], points[triangles[i]]),
                    sub(points[triangles[i + 2]], points[triangles[i]])
                ))
            );

            // Blend shadow / light / base colours to get the surface colour
            if (d < 0) {
                colour = rgb(
                    lerp(BASE_COLOUR[R], SHADOW_COLOUR[R], Math.abs(d)),
                    lerp(BASE_COLOUR[G], SHADOW_COLOUR[G], Math.abs(d)),
                    lerp(BASE_COLOUR[B], SHADOW_COLOUR[B], Math.abs(d))
                );
            } else {
                colour = rgb(
                    lerp(BASE_COLOUR[R], LIGHT_COLOUR[R], d),
                    lerp(BASE_COLOUR[G], LIGHT_COLOUR[G], d),
                    lerp(BASE_COLOUR[B], LIGHT_COLOUR[B], d)
                );
            }

            // Render the triangle
            drawTriangle(context, p1, p2, p3, colour);
        }

        // context.fillStyle = 'white';
        // for (let i = 0; i < points.length; i++) {
        //     context.fillRect(points[i][X], points[i][Y], 1 / cellSize, 1 / cellSize);
        // }

        context.restore();
    }

    // Render a triangle
    function drawTriangle(context, p1, p2, p3, colour) {
        context.fillStyle = colour;
        context.beginPath();
        context.moveTo(p1[X], p1[Y]);
        context.lineTo(p2[X], p2[Y]);
        context.lineTo(p3[X], p3[Y]);
        context.closePath();
        context.fill();
    }

    // Transform a 3d point onto a 2d plane using a perspective projection
    function project(v) {
        const size = Math.floor(GRID_SIZE / 2 + GRID_BUFFER);
        const x = v[X] - size;
        const y = v[Y] - size;
        const r = Z_OFFSET / v[Z];
        return [r * x + size, r * y + size];
    }

    // Get average z position of adjacent points
    function averageAdjacent(x, y) {
        const tl    = (points[index(x - 1, y - 1)] || [0, 0, Z_OFFSET])[Z];
        const t     = (points[index(x    , y - 1)] || [0, 0, Z_OFFSET])[Z];
        const tr    = (points[index(x + 1, y - 1)] || [0, 0, Z_OFFSET])[Z];
        const l     = (points[index(x - 1, y    )] || [0, 0, Z_OFFSET])[Z];
        const r     = (points[index(x + 1, y    )] || [0, 0, Z_OFFSET])[Z];
        const bl    = (points[index(x - 1, y + 1)] || [0, 0, Z_OFFSET])[Z];
        const b     = (points[index(x    , y + 1)] || [0, 0, Z_OFFSET])[Z];
        const br    = (points[index(x + 1, y + 1)] || [0, 0, Z_OFFSET])[Z];
        return (tl + t + tr + l + r + bl + b + br) / 8;
    }

    // Get an array index from a 2d position
    function index(x, y) {
        return y * (GRID_SIZE + GRID_BUFFER * 2) + x;
    }

    // Calculate the cross product of 2 3d vectors
    // Used when calculating the surface normal of a triangle
    function cross(v1, v2) {
        return [
            v1[Y] * v2[Z] - v1[Z] * v2[Y],
            v1[Z] * v2[X] - v1[X] * v2[Z],
            v1[X] * v2[Y] - v1[Y] * v2[X]
        ];
    }

    // Calculate the dot product of 2 3d vectors
    function dot(v1, v2) {
        return v1[X] * v2[X] + v1[Y] * v2[Y] + v1[Z] * v2[Z];
    }

    // Calculate the length of a 3d vector
    function len(v) {
        return Math.sqrt(v[X] * v[X] + v[Y] * v[Y] + v[Z] * v[Z]);
    }

    // Subtract 2 3d vectors
    function sub(v1, v2) {
        return [v1[X] - v2[X], v1[Y] - v2[Y], v1[Z] - v2[Z]];
    }

    // Scale a 3d vector
    function mul(v, s) {
        return [v[X] * s, v[Y] * s, v[Z] * s];
    }

    // Normalise a 3d vector
    function norm(v) {
        const l = len(v);
        if (l != 0) {
            return [
                v[X] / l,
                v[Y] / l,
                v[Z] / l
            ];
        }
        return v;
    }

    // Linear interpolation from a to b
    function lerp(a, b, i) {
        return (1 - i) * a + i * b;
    }

    // Clamp a value between min and max
    function clamp(a, min, max) {
        return Math.min(Math.max(a, min), max);
    }

    // Generate an rgb colour string from values
    function rgb(r, g, b) {
        return 'rgb(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ')';
    }

    // Start the render loop
    function loop() {
        handleInput();
        update(1 / 60);
        draw(context);
        window.requestAnimationFrame(loop);
    }
    initialise();
    loop();
};
