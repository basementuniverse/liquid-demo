# liquid-demo
An ambient header background animation.

See https://liquidcrm.uk for a live demo.

## How it works

First, we generate a randomised grid of 2d points. We perform a Delaunay triangulation on these points, then each point is given a z-coordinate. We now have a mesh in 3d-space made up of slightly-randomised triangles.

Each vertex has a velocity and we use this to do a basic spring simulation, where each vertex also responds to neighbouring vertices. There is a random waveform generator that perturbs the vertices towards/away from the camera. Mouse input is also used to perturb the vertices.

We compare the surface normal of each triangle with a light direction to calculate how that triangle should be shaded.

## Parameters

```
GRID_SIZE = 10; // will generate a grid of n*n triangles
                // the grid is scaled according to max(width, height), so the grid will always fill the canvas
GRID_BUFFER = 2;  // amount of buffer area off each edge of the screen, otherwise we would get gaps at the edge
MIN_CELL_SIZE = 50; // minimum grid cell size, so it doesn't get too small
RANDOMIZATION = 0.8;  // 0...1, the amount of grid randomisation. Set to 0 for a perfectly uniform grid
                      // (with 0 randomisation, every triangle will be an identical right triangle)
Z_OFFSET = 10;  // z coord for each triangle vertex, ie. how 'far' from the screen the triangles are
LIGHT_DIRECTION = [1, 1, 0];  // light direction, doesn't need to be normalised
                              // alter the z coord to change the light intensity (positive to increase, negative to decrease)
BASE_COLOUR = [47, 64, 80]; // each triangle has this base colour
SHADOW_COLOUR = [31, 37, 43]; // triangles facing away from the light direction will be shaded using this colour
LIGHT_COLOUR = [36, 185, 159];  // triangles facing towards the light direction will be shaded using this colour
SPREAD = 0.6; // how much each triangle vertex responds to it's nearest neighbours
DAMPING = 0.1;  // how strong the spring connection is between each vertex
FRICTION = 0.999; // spring friction, 1 means the springs will oscillate forever, lower values mean they oscillate for longer
WAVE_COUNT = 20;  // how many random waves to generate and overlay
WAVE_AMOUNT = 0.5;  // the waveforms move triangle vertices towards/away from the camera by this much
MOUSE_AMOUNT = 0.7; // clicking/dragging with the mouse moves the triangle vertices toward/away from the camera by this much
FREQUENCY = 2;  // maximum wave frequency
PHASE = 5;  // maximum wave phase offset
```

## Notes

To get this working on mobile devices, use Babel to convert it for es2015. Also, to support touch events, include a library like Hammer.JS and replace the mouse input code (lines ~34...43) with the following:

```
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
```

_Note: I have added hammer input and a minified/babel-compiled version (liquid.min.js). Enjoy :)_
