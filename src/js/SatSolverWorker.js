// Web Worker

import solveSat from 'boolean-sat';
import parseSexp from 's-expression';
import { solutionGenerator } from 'dlxlib';
import PolyominoProblem from './PolyominoProblem';
import { Polyomino } from './Polyomino';

self.z3Ready = false;
self.z3SolverOutputLines = [];
self.z3Solver = null;

// Fallback when no exact fit exists: finds the placement covering the most cells
// (depth-first branch and bound, time limited) so the UI can show a best effort.
function findBestPartial(polyProblem, timeLimitMs = 4000) {
    const region = polyProblem.region;
    const cellIndex = new Map(region.coords.map(([ x, y ], i) => [ x + ',' + y, i ]));
    const order = polyProblem.pieces.map((p, i) => i).sort((a, b) => polyProblem.pieces[b].coords.length - polyProblem.pieces[a].coords.length);
    const configs = order.map(i => Array.from(polyProblem._generateAllPossibleConfigurations(polyProblem.pieces[i]))
        .map(c => ({ poly: c, cells: c.coords.map(([ x, y ]) => cellIndex.get(x + ',' + y)) })));
    const sizes = order.map(i => polyProblem.pieces[i].coords.length);
    const sameAsPrev = order.map((pi, k) => k > 0 && JSON.stringify(polyProblem.pieces[pi].coords) == JSON.stringify(polyProblem.pieces[order[k - 1]].coords));
    const remaining = new Array(order.length + 1).fill(0);
    for (let k = order.length - 1; k >= 0; k --) remaining[k] = remaining[k + 1] + sizes[k];

    const used = new Uint8Array(region.coords.length);
    const chosen = new Array(order.length).fill(null);
    let best = -1, bestChosen = [];
    const deadline = performance.now() + timeLimitMs;
    let steps = 0, stop = false;

    function dfs(k, covered) {
        if (stop) return;
        if (covered > best) { best = covered; bestChosen = chosen.slice(); }
        if (k == order.length || covered + remaining[k] <= best) return;
        if ((++steps & 1023) == 0 && performance.now() > deadline) { stop = true; return; }

        // Identical pieces: only skip a copy if the previous copy was skipped too (avoids permutations)
        const prevSkipped = sameAsPrev[k] && chosen[k - 1] == null;
        if (!prevSkipped) {
            for (const config of configs[k]) {
                if (config.cells.some(c => used[c])) continue;
                config.cells.forEach(c => used[c] = 1);
                chosen[k] = config;
                dfs(k + 1, covered + sizes[k]);
                config.cells.forEach(c => used[c] = 0);
                chosen[k] = null;
                if (best == remaining[0]) return;
            }
        }
        dfs(k + 1, covered);
    }
    dfs(0, 0);

    const placed = [];
    const unplaced = [];
    bestChosen.forEach((config, k) => {
        if (config) {
            const poly = new Polyomino(config.poly.coords);
            poly.pieceIndex = order[k];
            placed.push(poly);
        } else {
            unplaced.push(order[k]);
        }
    });
    return { solution: [ region, ...placed ], unplaced: unplaced.sort((a, b) => a - b), cellsPlaced: Math.max(best, 0) };
}

function reply(polyProblem, solutions, startTime) {
    const message = { solutions, time: 0 };
    if (solutions.length == 0) message.partial = findBestPartial(polyProblem);
    message.time = performance.now() - startTime;
    self.postMessage(message);
}

self.onmessage = function(event) {

    if (event.data == 'loadZ3') {
        // Do nothing if it's already loaded
        if (self.z3Ready) return self.postMessage('z3Loaded');

        self.importScripts('z3w.js');

        self.z3Solver = Z3({
            ENVIRONMENT: 'WORKER',
            onRuntimeInitialized: () => {
                self.z3Ready = true;
                self.postMessage('z3Loaded');
            },
            print: message => self.z3SolverOutputLines.push(message),
        });
        return;
    }

    let { type, problem, maxSolutions = 1 } = event.data;
    let polyProblem = new PolyominoProblem(
        problem.pieces.map(coords => new Polyomino(coords)),
        new Polyomino(problem.region),
        problem.allowRotation,
        problem.allowReflection
    );

    const totalPieceCoords = polyProblem.pieces.reduce((sum, p) => sum + p.coords.length, 0);
    const totalRegionCoords = polyProblem.region.coords.length;
    if (totalPieceCoords > totalRegionCoords) {
        // Trivially non-solvable as an exact fit; show the best partial fit instead
        const start = performance.now();
        return self.postMessage({ solutions: [], partial: findBestPartial(polyProblem), time: performance.now() - start });
    }

    let startTime = performance.now();

    if (type == 'sat') {

        let { convertedProblem, interpreter } = polyProblem.convertToSAT();

        let { numVars, clauseList } = convertedProblem;
        let satSolution = solveSat(numVars, clauseList);
        let solution = satSolution == false ? null : [ polyProblem.region, ...interpreter(satSolution) ];

        reply(polyProblem, solution ? [ solution ] : [], startTime);

    } else if (type == 'z3') {

        if (!self.z3Ready) throw new Error('Z3 solver is still loading...');

        let { convertedProblem, interpreter } = polyProblem.convertToZ3();

        let { inputFile } = convertedProblem;

        self.z3Solver.FS.writeFile('input.smt2', inputFile, { encoding: 'utf-8' });
        self.z3Solver.callMain(['-smt2', 'input.smt2']);

        if (self.z3SolverOutputLines[0] == 'unsat') {
            reply(polyProblem, [], startTime);
        } else {
            let model = self.z3SolverOutputLines.slice(1).join(' ');
            let parsed = parseSexp(model);
            let solution = [ polyProblem.region, ...interpreter(parsed) ];

            self.postMessage({ solutions: [ solution ], time: performance.now() - startTime });

            self.z3SolverOutputLines = [];
        }

    } else if (type == 'dlx') {

        let { convertedProblem, interpreter } = polyProblem.convertToDlx();

        let { matrix } = convertedProblem;

        // Interchangeable pieces make many raw solutions look identical, so
        // skip those and only keep visually distinct placements.
        const solutions = [];
        const seen = new Set();
        const maxCandidates = 10000;
        let candidates = 0;
        for (let rawSolution of solutionGenerator(matrix)) {
            let placed = interpreter(rawSolution.map(i => matrix[i]));
            let key = placed
                .map(p => JSON.stringify(polyProblem.pieces[p.pieceIndex].coords) + '@' + JSON.stringify([ ...p.coords ].sort((a, b) => a[0] - b[0] || a[1] - b[1])))
                .sort()
                .join('|');
            if (!seen.has(key)) {
                seen.add(key);
                solutions.push([ polyProblem.region, ...placed ]);
                if (solutions.length >= maxSolutions) break;
            }
            if (++candidates >= maxCandidates) break;
        }

        reply(polyProblem, solutions, startTime);

    }

};
