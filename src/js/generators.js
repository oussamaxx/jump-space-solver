// Layout cells: 0 = empty, 1 = powered, 2 = protected.
// Rows are listed top to bottom; a reactor spans 4 rows, an aux generator 2.
// Each variant is one "reactor capacity" upgrade level. Standard parts go up to 2;
// capacity 3 only exists on rares ("Superior" in game).
export const reactors = [
    {
        id: 'split-reactor',
        name: 'Split Reactor',
        variants: [
            {
                id: 'capacity-0',
                capacity: 0,
                layout: [
                    [1, 0, 0, 0, 0, 0, 0, 1],
                    [1, 0, 0, 0, 0, 0, 0, 1],
                    [1, 1, 0, 0, 0, 0, 1, 1],
                    [1, 1, 0, 0, 0, 0, 1, 1],
                ],
            },
            {
                id: 'capacity-1',
                capacity: 1,
                layout: [
                    [1, 0, 0, 0, 0, 0, 0, 1],
                    [1, 1, 0, 0, 0, 0, 1, 1],
                    [1, 1, 0, 0, 0, 0, 1, 1],
                    [1, 1, 0, 0, 0, 0, 1, 1],
                ],
            },
            {
                id: 'capacity-2',
                capacity: 2,
                layout: [
                    [1, 0, 0, 0, 0, 0, 0, 1],
                    [1, 1, 0, 0, 0, 0, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                ],
            },
            {
                id: 'capacity-3',
                capacity: 3,
                rare: true,
                layout: [
                    [1, 0, 0, 0, 0, 0, 0, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [1, 1, 1, 1, 1, 1, 1, 1],
                ],
            },
        ],
    },
    {
        id: 'solid-state-reactor',
        name: 'Solid State Reactor',
        variants: [
            {
                id: 'capacity-0',
                capacity: 0,
                layout: [
                    [0, 0, 0, 1, 1, 0, 0, 0],
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                ],
            },
            {
                id: 'capacity-1',
                capacity: 1,
                layout: [
                    [0, 0, 0, 1, 1, 0, 0, 0],
                    [0, 0, 1, 2, 2, 1, 0, 0],
                    [0, 1, 2, 2, 2, 2, 1, 0],
                    [0, 1, 2, 2, 2, 2, 1, 0],
                ],
            },
            {
                id: 'capacity-2',
                capacity: 2,
                layout: [
                    [0, 0, 0, 2, 2, 0, 0, 0],
                    [0, 0, 1, 2, 2, 1, 0, 0],
                    [0, 2, 2, 2, 2, 2, 2, 0],
                    [0, 2, 2, 2, 2, 2, 2, 0],
                ],
            },
            {
                id: 'capacity-3',
                capacity: 3,
                rare: true,
                layout: [
                    [0, 0, 2, 2, 2, 2, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                    [0, 2, 2, 2, 2, 2, 2, 0],
                    [0, 2, 2, 2, 2, 2, 2, 0],
                ],
            },
        ],
    },
    {
        id: 'materia-scatter-reactor',
        name: 'Materia Scatter Reactor',
        variants: [
            {
                id: 'capacity-0',
                capacity: 0,
                layout: [
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [0, 1, 1, 0, 0, 1, 1, 0],
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                ],
            },
            {
                id: 'capacity-1',
                capacity: 1,
                layout: [
                    [1, 1, 1, 1, 1, 1, 1, 1],
                    [0, 1, 1, 0, 0, 1, 1, 0],
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                ],
            },
            {
                id: 'capacity-2',
                capacity: 2,
                layout: [
                    [1, 1, 1, 1, 1, 1, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 0, 1, 1, 0, 0, 0],
                ],
            },
            {
                id: 'capacity-3',
                capacity: 3,
                rare: true,
                layout: [
                    [1, 1, 1, 1, 1, 1, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [1, 0, 1, 1, 1, 1, 0, 1],
                    [0, 0, 0, 1, 1, 0, 0, 0],
                ],
            },
        ],
    },
    {
        id: 'null-wave-reactor',
        name: 'Null Wave Reactor',
        variants: [
            {
                id: 'capacity-0',
                capacity: 0,
                layout: [
                    [0, 1, 0, 0, 0, 0, 1, 0],
                    [0, 1, 1, 0, 0, 1, 1, 0],
                    [0, 2, 2, 1, 1, 2, 2, 0],
                    [0, 0, 2, 1, 1, 2, 0, 0],
                ],
            },
            {
                id: 'capacity-1',
                capacity: 1,
                layout: [
                    [0, 1, 0, 0, 0, 0, 1, 0],
                    [0, 1, 1, 1, 1, 1, 1, 0],
                    [0, 2, 2, 1, 1, 2, 2, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                ],
            },
            {
                id: 'capacity-2',
                capacity: 2,
                layout: [
                    [0, 1, 0, 0, 0, 0, 1, 0],
                    [0, 1, 1, 1, 1, 1, 1, 0],
                    [1, 2, 2, 1, 1, 2, 2, 1],
                    [0, 1, 2, 2, 2, 2, 1, 0],
                ],
            },
            {
                id: 'capacity-3',
                capacity: 3,
                rare: true,
                layout: [
                    [0, 1, 0, 0, 0, 0, 1, 0],
                    [1, 2, 1, 1, 1, 1, 2, 1],
                    [1, 2, 2, 1, 1, 2, 2, 1],
                    [0, 2, 2, 2, 2, 2, 2, 0],
                ],
            },
        ],
    },
];

export const auxGenerators = [
    {
        id: 'bio-fission-generator',
        name: 'Bio Fission Generator',
        variants: [
            {
                id: 'capacity-0',
                capacity: 0,
                layout: [
                    [0, 1, 1, 0, 0, 1, 1, 0],
                    [0, 1, 0, 0, 0, 0, 1, 0],
                ],
            },
            {
                id: 'capacity-1',
                capacity: 1,
                layout: [
                    [0, 1, 1, 1, 1, 1, 1, 0],
                    [0, 1, 0, 0, 0, 0, 1, 0],
                ],
            },
            {
                id: 'capacity-2',
                capacity: 2,
                layout: [
                    [1, 1, 1, 2, 2, 1, 1, 1],
                    [0, 1, 0, 0, 0, 0, 1, 0],
                ],
            },
            {
                id: 'capacity-3',
                capacity: 3,
                rare: true,
                layout: [
                    [1, 2, 1, 2, 2, 1, 2, 1],
                    [0, 1, 0, 1, 1, 0, 1, 0],
                ],
            },
        ],
    },
    {
        id: 'null-tension-generator',
        name: 'Null Tension Generator',
        variants: [
            {
                id: 'capacity-0',
                capacity: 0,
                layout: [
                    [0, 0, 1, 0, 0, 1, 0, 0],
                    [0, 0, 1, 1, 1, 1, 0, 0],
                ],
            },
            {
                id: 'capacity-1',
                capacity: 1,
                layout: [
                    [0, 1, 1, 0, 0, 1, 1, 0],
                    [0, 0, 2, 1, 1, 2, 0, 0],
                ],
            },
            {
                id: 'capacity-2',
                capacity: 2,
                layout: [
                    [0, 1, 2, 0, 0, 1, 1, 0],
                    [0, 1, 2, 2, 2, 2, 1, 0],
                ],
            },
            {
                id: 'capacity-3',
                capacity: 3,
                rare: true,
                layout: [
                    [0, 2, 2, 0, 0, 2, 2, 0],
                    [0, 2, 2, 1, 1, 2, 2, 0],
                ],
            },
        ],
    },
    {
        id: 'materia-shift-generator',
        name: 'Materia Shift Generator',
        variants: [
            {
                id: 'capacity-0',
                capacity: 0,
                layout: [
                    [0, 1, 0, 0, 0, 0, 1, 0],
                    [0, 1, 0, 1, 1, 0, 1, 0],
                ],
            },
            {
                id: 'capacity-1',
                capacity: 1,
                layout: [
                    [0, 1, 0, 0, 0, 0, 1, 0],
                    [0, 1, 1, 1, 1, 1, 1, 0],
                ],
            },
            {
                id: 'capacity-2',
                capacity: 2,
                layout: [
                    [0, 1, 0, 0, 0, 0, 1, 0],
                    [1, 1, 1, 1, 1, 1, 1, 1],
                ],
            },
            {
                id: 'capacity-3',
                capacity: 3,
                rare: true,
                layout: [
                    [0, 1, 0, 1, 1, 0, 1, 0],
                    [1, 2, 1, 2, 2, 1, 2, 1],
                ],
            },
        ],
    },
];

export const generatorSlots = [
    { id: 'reactor', label: 'Reactor', rows: 4, options: reactors },
    { id: 'aux1', label: 'Aux generator 1', rows: 2, options: auxGenerators },
    { id: 'aux2', label: 'Aux generator 2', rows: 2, options: auxGenerators },
];
