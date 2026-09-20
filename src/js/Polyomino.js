const _rotations = [
    ([x,y]) => [x,y],   // 0
    ([x,y]) => [-y,x],  // 90
    ([x,y]) => [-x,-y], // 180
    ([x,y]) => [y,-x]   // 270
];

const _reflect = ([x,y]) => [-x, y];

const _getx = ([x, _]) => x;
const _gety = ([_, y]) => y;

const _compare = ([x1, y1], [x2, y2]) => x1 == x2 && y1 == y2;

export class Polyomino {

    constructor(coords) {
        this.coords = coords;
    }

    clone() {
        return new Polyomino(this.coords);
    }

    // Return an translated version with smallest possible non-negative coordinates
    // and coordinates sorted by ascending x then ascending y
    normalize() {
        let smallestX = Math.min(...this.coords.map(_getx));
        let smallestY = Math.min(...this.coords.map(_gety));
        let p = this.translate(-smallestX, -smallestY);
        let coords = p.coords.toSorted(([ x1, y1 ], [ x2, y2 ]) => (x1 - x2) != 0 ? (x1 - x2) : (y1 - y2));
        return new Polyomino(coords);
    }

    // Strict comparison; i.e. the coordinates are identical as lists.
    equals(p) {
        return (this.coords.length == p.coords.length) && this.coords.every((c, i) => _compare(c, p.coords[i]));
    }

    isEmpty() {
        return this.coords.length == 0;
    }

    // Rotates n*90 degrees counter-clockwise
    rotate(n) {
        let angle = n % 4;
        return new Polyomino(this.coords.map(_rotations[angle]));
    }

    reflect() {
        return new Polyomino(this.coords.map(_reflect));
    }

    translate(dx, dy) {
        let t = ([x, y]) => [x + dx, y + dy];
        return new Polyomino(this.coords.map(t));
    }

    isDisjointFrom(other) {
        for (let mine of this.coords) {
            for (let theirs of other.coords) {
                if (mine[0] == theirs[0] && mine[1] == theirs[1]) return false;
            }
        }
        return true;
    }

    getWidth() {
        let xs = this.coords.map(_getx);
        return Math.max(...xs) - Math.min(...xs) + 1;
    }

    getHeight() {
        let ys = this.coords.map(_gety);
        return Math.max(...ys) - Math.min(...ys) + 1;
    }

    getSize() {
        return Math.max(this.getWidth(), this.getHeight());
    }

    getLargestX() {
        return Math.max(...this.coords.map(_getx));
    }

    getLargestY() {
        return Math.max(...this.coords.map(_gety));
    }

    containsCoordinate(c) {
        return this.coords.some(([x, y]) => x == c[0] && y == c[1]);
    }

}

// Build a Polyomino from a grid of 0/1 rows (column = x). The first row is the top, so y is flipped (y grows upwards).
const fromGrid = (rows) => new Polyomino(rows.flatMap((row, r) => row.flatMap((v, x) => v ? [[x, rows.length - 1 - r]] : [])));

// Build a Polyomino from a list of {r, c} cells (r = 0 is the top row).
const fromCells = (cells) => {
    const maxR = Math.max(...cells.map(({ r }) => r));
    return new Polyomino(cells.map(({ r, c }) => [c, maxR - r]));
};

export const componentCategories = {
    'Sensor': { label: 'Sensor', color: '#38bdf8' },
    'Pilot Canon': { label: 'Pilot Canon', color: '#f97316' },
    'Multi Turret System': { label: 'Multi Turret System', color: '#ef4444' },
    'Special Weapon': { label: 'Special Weapon', color: '#a855f7' },
    'Engine': { label: 'Engine', color: '#eab308' },
    'Jump Drive': { label: 'Jump Drive', color: '#22c55e' },
};

const component = (name, category, polyomino) => ({ name, category, polyomino });

export const components = [
    component('Sector Scanner', 'Sensor', fromGrid([[1, 1]])),
    component('Supply Uplink Unit', 'Sensor', fromCells([{r:0,c:1},{r:0,c:2},{r:1,c:0},{r:1,c:1}])),
    component('Vector Targeting Module', 'Sensor', fromGrid([[1, 1, 1], [1, 0, 0]])),

    component('Fragment Cannon MK I', 'Pilot Canon', fromGrid([[1, 1, 1]])),
    component('Fragment Cannon MK II/III', 'Pilot Canon', fromCells([{r:0,c:0},{r:0,c:1},{r:0,c:2},{r:1,c:1}])),
    component('Rapid Pulse Cannon', 'Pilot Canon', fromGrid([[1, 1, 1], [1, 1, 1]])),
    component('Disruptor Lasers MK I/II', 'Pilot Canon', fromCells([{r:0,c:0},{r:0,c:1},{r:1,c:0}])),
    component('Disruptor Lasers MK III', 'Pilot Canon', fromGrid([[1, 1]])),
    component('Bolt Accelerator', 'Pilot Canon', fromCells([{r:0,c:1},{r:0,c:0},{r:0,c:2},{r:1,c:0},{r:1,c:2}])),

    component('Assault Turrets', 'Multi Turret System', fromGrid([[1, 1, 1], [1, 0, 0]])),
    component('Gatling Turrets', 'Multi Turret System', fromCells([{r:0,c:0},{r:0,c:1},{r:0,c:2},{r:1,c:0},{r:1,c:1},{r:1,c:2},{r:2,c:0}])),
    component('Mining Lasers MK I/II', 'Multi Turret System', fromCells([{r:0,c:0},{r:0,c:1},{r:1,c:0}])),
    component('Mining Lasers MK III', 'Multi Turret System', fromGrid([[1, 1]])),
    component('Flak Launcher Turrets', 'Multi Turret System', fromGrid([[1, 1, 1, 1], [1, 0, 0, 1]])),

    component('Lance Railgun', 'Special Weapon', fromGrid([[1, 1, 1], [1, 0, 1], [1, 0, 1]])),
    component('Missile Launcher', 'Special Weapon', fromGrid([[1, 1, 1], [1, 1, 1], [1, 1, 1]])),
    component('Burst Shield', 'Special Weapon', fromGrid([[1, 1], [1, 1]])),
    component('Targeting Module', 'Special Weapon', fromGrid([[1, 1]])),

    component('Drift Phase Engine', 'Engine', fromGrid([[1, 1, 1]])),
    component('Mass Ejector Engine', 'Engine', fromGrid([[1, 1, 1]])),
    component('Nitro Pulse Engine', 'Engine', fromGrid([[1, 1, 1, 1]])),
    component('Microplasma Engine', 'Engine', fromGrid([[1]])),

    component('Jump Drive', 'Jump Drive', fromCells([{r:0,c:0},{r:0,c:1},{r:1,c:0}])),
];

export const componentsByCategory = Object.keys(componentCategories).map(category => ({
    category,
    ...componentCategories[category],
    components: components.filter(c => c.category == category),
}));
