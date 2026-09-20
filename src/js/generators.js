// Layout cells: 0 = empty, 1 = powered, 2 = protected.
// Rows are listed top to bottom; a reactor spans 4 rows, an aux generator 2.
export const reactors = [
    {
        id: 'split-reactor',
        name: 'Split Reactor',
        variants: [
            {
                id: 'mk-i',
                label: 'MK I',
                layout: [
                    [1, 1, 0, 0, 0, 0, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                ],
            },
            {
                id: 'mk-ii',
                label: 'MK II',
                layout: [
                    [1, 1, 0, 0, 0, 0, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [2, 1, 1, 0, 0, 1, 1, 2],
                    [2, 1, 1, 0, 0, 1, 1, 2],
                ],
            },
            {
                id: 'mk-iii',
                label: 'MK III',
                layout: [
                    [1, 1, 0, 0, 0, 0, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [2, 2, 1, 0, 0, 1, 2, 2],
                    [2, 2, 1, 0, 0, 1, 2, 2],
                ],
            },
        ],
    },
    {
        id: 'solid-state-reactor',
        name: 'Solid State Reactor',
        variants: [
            {
                id: 'mk-i',
                label: 'MK I',
                layout: [
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                ],
            },
            {
                id: 'mk-ii',
                label: 'MK II',
                layout: [
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                ],
            },
            {
                id: 'mk-iii',
                label: 'MK III',
                layout: [
                    [0, 0, 2, 2, 2, 2, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                ],
            },
        ],
    },
    {
        id: 'materia-scatter-reactor',
        name: 'Materia Scatter Reactor',
        variants: [
            {
                id: 'mk-i',
                label: 'MK I',
                layout: [
                    [1, 1, 1, 1, 1, 1, 1, 1],
                    [0, 1, 0, 1, 1, 0, 1, 0],
                    [1, 1, 1, 1, 1, 1, 1, 1],
                    [2, 0, 2, 0, 0, 2, 0, 2],
                ],
            },
            {
                id: 'mk-ii',
                label: 'MK II',
                layout: [
                    [1, 1, 1, 1, 1, 1, 1, 1],
                    [0, 1, 0, 1, 1, 0, 1, 0],
                    [1, 2, 2, 1, 1, 2, 2, 1],
                    [2, 0, 2, 0, 0, 2, 0, 2],
                ],
            },
            {
                id: 'mk-iii',
                label: 'MK III',
                layout: [
                    [1, 1, 1, 1, 1, 1, 1, 1],
                    [0, 2, 0, 1, 1, 0, 2, 0],
                    [2, 2, 2, 2, 2, 2, 2, 2],
                    [2, 0, 2, 0, 0, 2, 0, 2],
                ],
            },
        ],
    },
    {
        id: 'null-wave-reactor',
        name: 'Null Wave Reactor',
        variants: [
            {
                id: 'mk-i',
                label: 'MK I',
                layout: [
                    [1, 1, 0, 0, 0, 0, 1, 1],
                    [1, 1, 1, 0, 0, 1, 1, 1],
                    [0, 2, 2, 1, 1, 2, 2, 0],
                    [0, 0, 2, 1, 1, 2, 0, 0],
                ],
            },
            {
                id: 'mk-ii',
                label: 'MK II',
                layout: [
                    [2, 1, 0, 0, 0, 0, 1, 2],
                    [2, 1, 1, 0, 0, 1, 1, 2],
                    [0, 2, 2, 1, 1, 2, 2, 0],
                    [0, 0, 2, 1, 1, 2, 0, 0],
                ],
            },
            {
                id: 'mk-iii',
                label: 'MK III',
                layout: [
                    [2, 2, 0, 0, 0, 0, 2, 2],
                    [2, 2, 1, 0, 0, 1, 2, 2],
                    [0, 2, 2, 1, 1, 2, 2, 0],
                    [0, 0, 2, 1, 1, 2, 0, 0],
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
                id: 'mk-i',
                label: 'MK I',
                layout: [
                    [0, 1, 1, 1, 1, 1, 1, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                ],
            },
            {
                id: 'mk-ii',
                label: 'MK II',
                layout: [
                    [1, 1, 1, 1, 1, 1, 1, 1],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                ],
            },
            {
                id: 'mk-iii',
                label: 'MK III',
                layout: [
                    [1, 1, 1, 1, 1, 1, 1, 1],
                    [1, 0, 0, 0, 0, 0, 0, 1],
                ],
            },
        ],
    },
    {
        id: 'null-tension-generator',
        name: 'Null Tension Generator',
        variants: [
            {
                id: 'mk-i',
                label: 'MK I',
                layout: [
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 1, 1, 1, 1, 0, 0],
                ],
            },
            {
                id: 'mk-ii',
                label: 'MK II',
                layout: [
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 2, 1, 1, 2, 0, 0],
                ],
            },
            {
                id: 'mk-iii',
                label: 'MK III',
                layout: [
                    [0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 0, 2, 2, 2, 2, 0, 0],
                ],
            },
        ],
    },
    {
        id: 'materia-shift-generator',
        name: 'Materia Shift Generator',
        variants: [
            {
                id: 'mk-i',
                label: 'MK I',
                layout: [
                    [0, 1, 1, 0, 0, 1, 1, 0],
                    [0, 1, 1, 0, 0, 1, 1, 0],
                ],
            },
            {
                id: 'mk-ii',
                label: 'MK II',
                layout: [
                    [0, 1, 2, 0, 0, 2, 1, 0],
                    [0, 2, 1, 0, 0, 1, 2, 0],
                ],
            },
            {
                id: 'mk-iii',
                label: 'MK III',
                layout: [
                    [0, 1, 2, 0, 0, 2, 1, 0],
                    [0, 2, 2, 0, 0, 2, 2, 0],
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
