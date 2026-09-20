<script>
    import loadingGif from './assets/loading.gif';
    import { Button } from '$lib/components/ui/button';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { Label } from '$lib/components/ui/label';
    import { Separator } from '$lib/components/ui/separator';
    import * as Alert from '$lib/components/ui/alert';
    import * as Tabs from '$lib/components/ui/tabs';
    import * as RadioGroup from '$lib/components/ui/radio-group';
    import * as Collapsible from '$lib/components/ui/collapsible';
    import * as Dialog from '$lib/components/ui/dialog';

    import PolyominoControl from '$lib/components/PolyominoControl.svelte';

    import { Polyomino, componentsByCategory } from './js/Polyomino.js';
    import { generatorSlots } from './js/generators.js';
    import SatSolverWorker from 'worker-loader!./js/SatSolverWorker.js';

    let localState = JSON.parse(localStorage.getItem('polyomino-solver-state')) || {
        savedPolyomino: [],
        size: 8,
        regionCoords: null,
    };

    // UI Data
	let polyominos = localState.savedPolyomino || [];
    // { name, category, color } per entry of `polyominos` (null for custom shapes)
    let polyominoInfo = polyominos.map((_, i) => localState.savedInfo?.[i] ?? null);
    let regionCoords = localState.regionCoords || [];
    let settings = {
        method: 'method-dlx',
        allowRotation: true,
        allowReflection: false,
    }
    let settingsOpen = false;
    // selectedGenerators[slot.id] = { generator, variant } (objects from generators.js)
    function restoreGenerators(saved = {}) {
        const result = { reactor: null, aux1: null, aux2: null };
        for (const slot of generatorSlots) {
            const generator = slot.options.find(g => g.id == saved[slot.id]?.generator);
            const variant = generator?.variants.find(v => v.id == saved[slot.id]?.variant);
            if (variant) result[slot.id] = { generator, variant };
        }
        return result;
    }
    let selectedGenerators = restoreGenerators(localState.generators);
    const cellTypeColors = { 1: '#22c55e', 2: '#3b82f6' }; // 1 = powered (green), 2 = protected (blue)

    // Turns the selected generator layouts into region cells (rows are listed top to
    // bottom, while y grows upwards) and the color of each of those cells.
    function computeRegion(selected, gridSize) {
        const coords = [];
        const tints = {};
        let rowOffset = 0;
        for (const slot of generatorSlots) {
            const layout = selected[slot.id]?.variant.layout || [];
            layout.forEach((row, r) => row.forEach((cell, c) => {
                const y = gridSize - 1 - (rowOffset + r);
                if (cell == 0 || c >= gridSize || y < 0) return;
                coords.push([ c, y ]);
                tints[`${ c },${ y }`] = cellTypeColors[cell];
            }));
            rowOffset += slot.rows;
        }
        return { coords, tints };
    }
    $: regionTints = computeRegion(selectedGenerators, regionCreateSize).tints;
    function applyGenerators() {
        regionCoords = computeRegion(selectedGenerators, regionCreateSize).coords;
    }
    let pickerSlot = null;
    let pickerOpen = false;
    function openPicker(slot) {
        pickerSlot = slot;
        pickerOpen = true;
    }
    function pickGenerator(generator) {
        const current = selectedGenerators[pickerSlot.id];
        // Keep the same MK when switching generator, if it exists
        const variant = generator.variants.find(v => v.id == current?.variant.id) || generator.variants[0];
        selectedGenerators[pickerSlot.id] = { generator, variant };
        applyGenerators();
    }
    function pickVariant(variant) {
        selectedGenerators[pickerSlot.id].variant = variant;
        applyGenerators();
        pickerOpen = false;
    }
    function describeSelection(selection) {
        return selection ? `${ selection.generator.name } ${ selection.variant.label }` : null;
    }
    let polyCreateSize = 7;
    let regionCreateSize = localState.size || 8;
    let selectedTab = 'components';
    $: largestPolySize = Math.max(2, ...polyominos.map(coords => new Polyomino(coords).getSize()));

    const regionCoordsSize = new Polyomino(regionCoords).getSize();
    regionCreateSize = Math.max(regionCreateSize, regionCoordsSize);

    $: canDecrementRegionSize = regionCoords.every(([ x, y ]) => x < regionCreateSize - 1 && y < regionCreateSize - 1);

    // Theme: dark by default, persisted separately from the solver state
    let darkMode = true;
    try { darkMode = localStorage.getItem('polyomino-solver-theme') !== 'light'; } catch (e) {}

    function applyTheme(dark) {
        document.documentElement.classList.toggle('dark', dark);
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        try { localStorage.setItem('polyomino-solver-theme', dark ? 'dark' : 'light'); } catch (e) {}
    }

    $: applyTheme(darkMode);

    let persistTimeout;
    function persistStateDebounced() {
        if (persistTimeout != null) clearTimeout(persistTimeout);
        persistTimeout = setTimeout(() => {
            localStorage.setItem('polyomino-solver-state', JSON.stringify({
                savedPolyomino: polyominos,
                savedInfo: polyominoInfo,
                size: regionCreateSize,
                regionCoords,
                generators: Object.fromEntries(Object.entries(selectedGenerators)
                    .filter(([ , sel ]) => sel)
                    .map(([ id, sel ]) => [ id, { generator: sel.generator.id, variant: sel.variant.id } ])),
            }));
        }, 1500);
    }

    $: polyominos, regionCreateSize, regionCoords, selectedGenerators, persistStateDebounced();

    // Technical state
    let currentProblem = { problemData: null, time: null, solutionCoords: null };

    function resetIfWorkComplete() {
        if (workComplete) currentProblem = {};
    }

    // When viewing the solution, any change to the settings should reset the UI.
    $: settings, resetIfWorkComplete();
    $: polyominos, resetIfWorkComplete();

    // Inferences based on currentProblem
    $: working = currentProblem.problemData != null && currentProblem.time == null;
    $: workComplete = currentProblem.time != null;
    $: foundSolution = currentProblem.solutionCoords != null;

    // Worker and worker status
    let worker = new SatSolverWorker();
    let workerBusy = false;
    worker.onmessage = handleWorkerMessage;

    $: if (settings.method == 'method-z3') {
        worker.postMessage('loadZ3');
        workerBusy = true;
    }

    let polyCreateCoords = [];
    function addCustomPolyomino() {
        // Normalize the coordinates first
        let p = new Polyomino(polyCreateCoords).normalize();
        polyominos = [ ...polyominos, p.coords ];
        polyominoInfo = [ ...polyominoInfo, null ];
    }

    function handleWorkerMessage(event) {
        if (event.data == 'z3Loaded') {
            return workerBusy = false;
        } else {
            let { solution, time } = event.data;
            // Update currentProblem based on worker results

            currentProblem.time = time;

            if (event.data.solution != null) {
                // Data for polyomino-control in 'display-multiple' mode; the
                // first coords represent the problem region, drawn in white.
                // The solver works on the region normalized to the origin; shift
                // everything back so it lines up with the user's original grid.
                const { dx, dy } = currentProblem.offset || { dx: 0, dy: 0 };
                currentProblem.solutionCoords = solution.map(x => x.coords.map(([ cx, cy ]) => [ cx + dx, cy + dy ]));
                // Component info of each placed piece (the region, first, has none)
                currentProblem.solutionInfo = solution.slice(1).map(x => polyominoInfo[x.pieceIndex] ?? null);
            }
            return workerBusy = false;
        }
    }

    function solve() {
        // The solving machinery normalizes the region (shifts it to the origin).
        // Remember the shift so the solution can be mapped back onto the grid.
        const dx = regionCoords.length ? Math.min(...regionCoords.map(c => c[0])) : 0;
        const dy = regionCoords.length ? Math.min(...regionCoords.map(c => c[1])) : 0;

        let problemData = {
            pieces: polyominos,
            region: regionCoords.map(([ x, y ]) => [ x - dx, y - dy ]),
            allowRotation: settings.allowRotation,
            allowReflection: settings.allowReflection,
        };

        let solveMethod = settings.method.split('-')[1];

        currentProblem = { problemData, offset: { dx, dy } };

        worker.postMessage({ type: solveMethod, problem: problemData });
        workerBusy = true;
    }
</script>

<header class="flex items-center justify-between border-b px-4 py-3">
    <span class="font-heading text-lg font-semibold">Jump Space Power Grid Solver</span>
    <div class="flex items-center gap-4">
        <Button variant="outline" role="switch" aria-checked={ darkMode } aria-label="Dark mode"
                title={ darkMode ? 'Switch to light mode' : 'Switch to dark mode' }
                onclick={() => darkMode = !darkMode }>{ darkMode ? '☾ Dark' : '☀ Light' }</Button>
        <a class="text-sm text-primary underline-offset-4 hover:underline" target="_blank" href="https://github.com/oussamaxx/jump-space-solver">View on Github</a>
    </div>
</header>

<main class="grid grid-cols-1 gap-6 p-4 md:grid-cols-2 xl:grid-cols-3">

    <section>
        <p class="mb-2 font-semibold">{ workComplete && foundSolution ? 'Solution' : 'Power Grid' } <span class="text-xs font-normal text-muted-foreground">(Select Reactor/Aux Gen)</span></p>
        <div class="flex items-stretch gap-2">
            <div class="flex w-28 shrink-0 flex-col gap-2 sm:w-36">
                {#each generatorSlots as slot (slot.id)}
                    <button type="button"
                            class="flex min-h-0 cursor-pointer flex-col items-start rounded-none border-2 p-2 text-left text-sm hover:bg-accent"
                            style="flex: {slot.rows} 1 0"
                            onclick={() => openPicker(slot) }>
                        <span class="font-semibold">{ slot.label }</span>
                        <span class="text-xs { selectedGenerators[slot.id] ? '' : 'text-muted-foreground' }">{ describeSelection(selectedGenerators[slot.id]) || 'Click to select' }</span>
                    </button>
                {/each}
            </div>
            <div class="min-w-0 flex-1">
                {#if (workComplete && foundSolution)}
                    <PolyominoControl
                            id="solution-display"
                            size={ regionCreateSize }
                            tints={ regionTints }
                            mode="display-multiple"
                            value={ currentProblem.solutionCoords || [] }
                            info={ currentProblem.solutionInfo || [] }
                    />
                {:else}
                    <PolyominoControl
                            id="region-create"
                            size={ regionCreateSize }
                            bind:value={ regionCoords }
                            tints={ regionTints }
                            mode="create-region"
                    />
                {/if}
            </div>
        </div>

        <div class="flex gap-2">
            <!--<Button variant="outline" class="size-button" disabled={ workComplete || !canDecrementRegionSize }
                    title="grid size down" onclick={() => regionCreateSize = Math.max(2, regionCreateSize - 1) }>⇲</Button>
            <Button variant="outline" class="size-button" disabled={ workComplete }
                    title="grid size up" onclick={() => regionCreateSize += 1}>⇱</Button>-->
            <Button variant="outline" class="size-button" disabled={ workComplete }
                    title="clear" onclick={() => { regionCoords = []; selectedGenerators = restoreGenerators(); }}>⎚</Button>
        </div>
    </section>

    <section>
        <p class="mb-2 font-semibold">Components to be fit <span class="text-xs font-normal text-muted-foreground">(click to remove)</span></p>
        <div class="border p-3">
            {#each polyominos as coords, index (coords) }
                <PolyominoControl
                        size={ largestPolySize }
                        mode="display"
                        class="tetromino"
                        value={ coords }
                        info={ polyominoInfo[index] }
                        onclick={ () => {
                        polyominos = polyominos.toSpliced(index, 1);
                        polyominoInfo = polyominoInfo.toSpliced(index, 1);
                    } }
                />
            {/each}
        </div>
    </section>

    <section>
        <p class="mb-2 font-semibold">Add components</p>

        <Tabs.Root bind:value={ selectedTab }>
            <Tabs.List class="w-full">
                <Tabs.Trigger value="components">Components</Tabs.Trigger>
                <Tabs.Trigger value="custom-shape">Custom shape</Tabs.Trigger>
            </Tabs.List>
        </Tabs.Root>

        <div class="mt-4" class:hidden={ selectedTab != 'custom-shape' }>
            <PolyominoControl id="poly-create" size={ polyCreateSize } bind:value={ polyCreateCoords } />
            <div class="flex items-center gap-2">
                <Button variant="outline" class="size-button" title="grid size down" onclick={() => polyCreateSize = Math.max(2, polyCreateSize - 1) }>⇲</Button>
                <Button variant="outline" class="size-button" title="grid size up" onclick={() => polyCreateSize += 1}>⇱</Button>
                <Button variant="outline" class="size-button" title="clear" onclick={() => polyCreateCoords = [] }>⎚</Button>
                <Button class="flex-1" onclick={ addCustomPolyomino }>Add</Button>
            </div>
        </div>
        <div class="mt-4 max-h-[70vh] overflow-y-auto pr-1" class:hidden={ selectedTab != 'components' }>
            {#each componentsByCategory as group}
                <div class="mb-5">
                    <div class="mb-1 flex items-center gap-2 px-2">
                        <span class="size-2.5 rounded-full" style="background: {group.color}"></span>
                        <h3 class="text-sm font-semibold">{ group.label }</h3>
                        <span class="ml-auto text-xs text-muted-foreground">{ group.components.length }</span>
                    </div>
                    <Separator />
                    <ul class="divide-y">
                        {#each group.components as comp}
                            <li>
                                <button
                                    type="button"
                                    class="flex h-[72px] w-full cursor-pointer items-center gap-3 px-2 text-left text-sm transition-colors hover:bg-accent"
                                    title="Add { comp.name }"
                                    onclick={ () => {
                                        polyominos = [ ...polyominos, [ ...comp.polyomino.coords ] ];
                                        polyominoInfo = [ ...polyominoInfo, { name: comp.name, category: comp.category, color: group.color } ];
                                    } }
                                >
                                    <span class="flex-1">{ comp.name }</span>
                                    <span class="flex h-full w-[100px] flex-none items-center justify-end">
                                    <span
                                        class="relative flex-none overflow-hidden"
                                        style="width: { comp.polyomino.getWidth() * 20 }px; height: { comp.polyomino.getHeight() * 20 }px"
                                    >
                                        <PolyominoControl
                                            size={ comp.polyomino.getSize() }
                                            mode="display"
                                            class="pointer-events-none absolute bottom-0 left-0"
                                            style="width: { comp.polyomino.getSize() * 20 }px; height: { comp.polyomino.getSize() * 20 }px"
                                            value={ comp.polyomino.coords }
                                            info={{ name: comp.name, category: comp.category, color: group.color }}
                                        />
                                    </span>
                                    </span>
                                </button>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/each}
        </div>
    </section>

    <section class="flex flex-col gap-4 md:col-span-2 xl:col-span-3">
        <Button variant="outline" onclick={() => settingsOpen = true }>⚙ Settings</Button>
        <Button
            class="w-full"
            variant={ workComplete ? 'outline' : 'default' }
            disabled={ workerBusy }
            onclick={ () => workComplete ? resetIfWorkComplete() : solve() }
        >{ workComplete ? 'Reset' : 'Solve' }</Button>
        {#if workerBusy}
            <img src={ loadingGif } alt="loading" class="mx-auto block">
        {/if}
        {#if workComplete}
            <Alert.Root id="solution-info" variant={ foundSolution ? 'default' : 'destructive' }>
                <Alert.Description>
                    {#if foundSolution} Found solution {:else} <strong>No solution</strong> {/if} in { (currentProblem.time / 1000).toFixed(3) } seconds.
                </Alert.Description>
            </Alert.Root>
        {/if}
    </section>

</main>

<Dialog.Root bind:open={ pickerOpen }>
    <Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-sm">
        <Dialog.Header>
            <Dialog.Title>{ pickerSlot ? pickerSlot.label : '' }</Dialog.Title>
        </Dialog.Header>
        <div class="flex flex-col gap-2">
            {#if pickerSlot}
                {#each pickerSlot.options as option (option.id)}
                    <Button variant={ selectedGenerators[pickerSlot.id]?.generator.id == option.id ? 'default' : 'outline' }
                            onclick={() => pickGenerator(option) }>{ option.name }</Button>
                {/each}
                {#if selectedGenerators[pickerSlot.id]}
                    <Separator />
                    <div class="flex gap-2">
                        {#each selectedGenerators[pickerSlot.id].generator.variants as variant (variant.id)}
                            <Button class="flex-1"
                                    variant={ selectedGenerators[pickerSlot.id].variant.id == variant.id ? 'default' : 'outline' }
                                    onclick={() => pickVariant(variant) }>{ variant.label }</Button>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={ settingsOpen }>
    <Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <Dialog.Header>
            <Dialog.Title>Settings</Dialog.Title>
        </Dialog.Header>
        <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
                <Checkbox id="allow-rotation" bind:checked={ settings.allowRotation } />
                <Label for="allow-rotation">Allow rotations</Label>
            </div>
            <div class="flex items-center gap-2">
                <Checkbox id="allow-reflection" bind:checked={ settings.allowReflection } />
                <Label for="allow-reflection">Allow reflections</Label>
            </div>
            <Separator />
            <RadioGroup.Root bind:value={ settings.method }>
                <div class="flex items-center gap-2">
                    <RadioGroup.Item value="method-dlx" id="method-dlx" />
                    <Label for="method-dlx">Algorithm X (Dancing Links)</Label>
                </div>
                <p class="text-xs text-muted-foreground">
                    Reduces to an <a class="underline" target="_blank" href="https://en.wikipedia.org/wiki/Exact_cover">exact cover problem</a> (but will find inexact solutions as well).
                </p>
                <Collapsible.Root>
                    <Collapsible.Trigger class="cursor-pointer text-sm">Legacy algorithms</Collapsible.Trigger>
                    <Collapsible.Content class="flex flex-col gap-3 pt-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <RadioGroup.Item value="method-sat" id="method-sat" />
                                <Label for="method-sat">SAT (JavaScript)</Label>
                            </div>
                            <p class="text-xs text-muted-foreground">
                                Reduces to <a class="underline" target="_blank" href="https://en.wikipedia.org/wiki/Boolean_satisfiability_problem">SAT</a>.
                                Will find <strong>partial (inexact)</strong> solutions, and is <strong>nondeterministic</strong>.
                                Uses a <a class="underline" target="_blank" href="https://www.npmjs.com/package/boolean-sat">JavaScript SAT solver</a>, and usually gives the best performance for small or easy problems.
                            </p>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <RadioGroup.Item value="method-z3" id="method-z3" />
                                <Label for="method-z3">SAT (Z3)</Label>
                            </div>
                            <p class="text-xs text-muted-foreground">
                                Reduces to <a class="underline" target="_blank" href="https://en.wikipedia.org/wiki/Boolean_satisfiability_problem">SAT</a>.
                                Will find <strong>partial (inexact)</strong> solutions, and is <strong>deterministic</strong>.
                                Solves SAT via a Webassembly build of the <a class="underline" href="https://github.com/Z3Prover/z3">Z3 Theorem Prover</a>, and gives <em>better</em> performance for larger problems.
                            </p>
                        </div>
                    </Collapsible.Content>
                </Collapsible.Root>
            </RadioGroup.Root>
        </div>
    </Dialog.Content>
</Dialog.Root>

<style>
    :global(#region-create), :global(#solution-display) {
    background: lightgray;
}

    :global(#poly-create), :global(#region-create), :global(#solution-display) {
    margin-bottom: 10px;
    width: 100%;
    aspect-ratio: 1;
    @media screen and (min-width: 1200px) {
        max-width: 32vw;
        margin-right: auto;
    }
}

:global(.size-button) {
    font-size: 1.5rem;
    transform: scaleX(-1);
}

:global(.tetromino) {
    width: 60px;
    height: 60px;
    display: inline-block;
    margin: 0 10px 15px 10px;
}
</style>
