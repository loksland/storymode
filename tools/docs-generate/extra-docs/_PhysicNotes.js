
/** @class _PhysicsNotes
  * @hideconstructor
  * @example

-------------------
Collision Filtering 
-------------------

Docs: {@link https://brm.io/matter-js/docs/classes/Body.html#method_collisionFilter}
Demo source: {@link https://github.com/liabru/matter-js/blob/master/examples/collisionFiltering.js}

**collisionFilter.group**
- If objects have  *same negative* group - the collision *will not occur* and `category/mask` rules *will not* be used.
- If objects have  *same positive* group - the collision *will occur* and `category/mask` rules *will not* be used.
- If objects have *different group* values (or both 0, which is default) - `category/mask` rules *will* be used.
- See `Body.nextGroup(negative);` to create a unique group id

**collisionFilter.category**

Categories must be a power of 2 from 2^0 (1) to 2^31 ():
``` js 
const catDefault = 0x0001; // 2^0 = 1
const catA = 0x0002; // 2^1 = 2
const catB = 0x0004; // 2^2 = 4
const catC = 0x0008; // 2^3 = 8
const catD = 0x0010; // 2^4 = 16
const catE = 0x0020; // 2^5 = 32
const catF = 0x0040; // 2^6 = 64
const catG = 0x0080; // 2^7 = 128
const catH = 0x0100; // 2^8 = 256
const catH = 0x0200; // 2^9 = 512
// etc ...
const catZ = 0x80000000; // 2^31 = 2147483648
```

**collisionFilter.mask**

A bit mask that specifies the collision categories this body may collide with.

Each body also defines a collision *bitmask*, given by *collisionFilter.mask* which specifies the categories it collides with (the value is the bitwise AND value of all these categories).

Using the `category/mask` rules, two bodies A and B collide if each includes the others category in its mask, i.e. (categoryA & maskB) !== 0 and (categoryB & maskA) !== 0 are both true.

Example:
```js
collisionFilter: {
    mask: defaultCategory | redCategory // this body will only collide with the walls and the red bodies
}
```

Phaser utility function:s
```js
setCollidesWith: function (categories)
{
    var flags = 0;

    if (!Array.isArray(categories))
    {
        flags = categories;
    }
    else
    {
        for (var i = 0; i < categories.length; i++)
        {
            flags |= categories[i];
        }
    }

    this.body.collisionFilter.mask = flags;

    return this;
},
```
Source: {@link https://github.com/photonstorm/phaser/blob/v3.51.0/src/physics/matter-js/components/Collision.js}

-------------------
Collision Callbacks 
-------------------

See: {@link https://github.com/liabru/matter-js/blob/master/examples/sensors.js}

Listening for collisions is Engine wide. See discussion here: https://github.com/liabru/matter-js/issues/65

**collisionStart**
Provides a list of all pairs that have started to collide in the current tick (if any).

**collisionActive**
Provides a list of all pairs that are colliding in the current tick (if any).

**collisionEnd**
Provides a list of all pairs that have finished colliding in the current tick (if any).

--------
Sleeping 
--------

Tells the engine to stop updating and collision checking bodies that have come to rest.

This is a big performance boost if you have a lot of bodies in collision at rest (e.g. a stack of boxes). Sleeping bodies are woken up when a non-sleeping body collides with them. The downside is that the result not always exactly the same as if they were not sleeping, but it's usually good enough.

{@link https://github.com/liabru/matter-js/issues/354}
*/
    