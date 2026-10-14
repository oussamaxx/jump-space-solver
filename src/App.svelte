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
    import * as AlertDialog from '$lib/components/ui/alert-dialog';

    import PolyominoControl from '$lib/components/PolyominoControl.svelte';

    import { Polyomino, componentCategories, componentsByCategory } from './js/Polyomino.js';
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
        maxSolutions: 3,
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
        // Changing a generator invalidates the displayed solution, so confirm before resetting the view.
        resetIfWorkComplete(true, () => {
            pickerSlot = slot;
            pickerOpen = true;
        });
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
                customComponents,
                size: regionCreateSize,
                regionCoords,
                generators: Object.fromEntries(Object.entries(selectedGenerators)
                    .filter(([ , sel ]) => sel)
                    .map(([ id, sel ]) => [ id, { generator: sel.generator.id, variant: sel.variant.id } ])),
            }));
        }, 1500);
    }

    $: polyominos, regionCreateSize, regionCoords, selectedGenerators, customComponents, persistStateDebounced();

    // Technical state
    let currentProblem = { problemData: null, time: null, solutionCoords: null };

    let resetConfirmOpen = false;
    let onResetConfirmed = null;

    // With `confirmFirst`, asks the user before clearing the solution and only then runs `onDone`.
    function resetIfWorkComplete(confirmFirst = false, onDone = null) {
        if (!workComplete) { onDone?.(); return; }
        if (confirmFirst) {
            onResetConfirmed = onDone;
            resetConfirmOpen = true;
            return;
        }
        currentProblem = {};
        onDone?.();
    }

    function confirmReset() {
        currentProblem = {};
        resetConfirmOpen = false;
        const cb = onResetConfirmed;
        onResetConfirmed = null;
        cb?.();
    }

    // When viewing the solution, any change to the settings should reset the UI.
    $: settings, resetIfWorkComplete();
    $: polyominos, resetIfWorkComplete();

    // Inferences based on currentProblem
    $: working = currentProblem.problemData != null && currentProblem.time == null;
    $: workComplete = currentProblem.time != null;
    $: foundSolution = (currentProblem.solutions?.length ?? 0) > 0;
    $: currentSolution = foundSolution ? currentProblem.solutions[currentProblem.solutionIndex] : null;

    function showSolution(delta) {
        const count = currentProblem.solutions.length;
        currentProblem.solutionIndex = (currentProblem.solutionIndex + delta + count) % count;
        currentProblem = currentProblem;
    }

    // Worker and worker status
    let worker = new SatSolverWorker();
    let workerBusy = false;
    worker.onmessage = handleWorkerMessage;

    $: if (settings.method == 'method-z3') {
        worker.postMessage('loadZ3');
        workerBusy = true;
    }

    let polyCreateCoords = [];
    // User-drawn components, saved alongside the built-in catalogue: { name, category, coords }
    let customComponents = localState.customComponents || [];
    let customDialogOpen = false;
    let customName = '';
    let customCategory = Object.keys(componentCategories)[0];
    let customError = '';
    // Normalized shape being drawn, shown in the "new custom component" dialog
    $: customPreview = polyCreateCoords.length ? new Polyomino(polyCreateCoords).normalize() : null;

    // Built-in catalogue with the custom components appended to their category
    $: catalogue = componentsByCategory.map(group => ({
        ...group,
        components: [
            ...group.components,
            ...customComponents
                .map((c, customIndex) => ({ name: c.name, category: c.category, custom: true, customIndex, polyomino: new Polyomino(c.coords) }))
                .filter(c => c.category == group.category),
        ],
    }));

    // Search box on the Components tab: matches component names (or the category label), case-insensitive
    let componentSearch = '';
    $: searchTerm = componentSearch.trim().toLowerCase();
    $: filteredCatalogue = !searchTerm ? catalogue : catalogue
        .map(group => group.label.toLowerCase().includes(searchTerm) ? group : {
            ...group,
            components: group.components.filter(c => c.name.toLowerCase().includes(searchTerm)),
        })
        .filter(group => group.components.length);

    function componentInfo(comp) {
        const info = { name: comp.name, category: comp.category, color: componentCategories[comp.category]?.color };
        if (comp.custom) info.custom = true;
        return info;
    }

    function addComponent(comp) {
        polyominos = [ ...polyominos, [ ...comp.polyomino.coords ] ];
        polyominoInfo = [ ...polyominoInfo, componentInfo(comp) ];
    }

    function openCustomDialog() {
        customName = '';
        customError = '';
        customDialogOpen = true;
    }

    function saveCustomComponent() {
        const name = customName.trim();
        if (!polyCreateCoords.length) return customError = 'Draw a shape first.';
        if (!name) return customError = 'Enter a name.';
        // Normalize the coordinates first
        const coords = new Polyomino(polyCreateCoords).normalize().coords;
        const comp = { name, category: customCategory, coords };
        customComponents = [ ...customComponents, comp ];
        addComponent({ ...comp, custom: true, polyomino: new Polyomino(coords) });
        customDialogOpen = false;
        polyCreateCoords = [];
        selectedTab = 'components';
    }

    function removeCustomComponent(comp) {
        customComponents = customComponents.toSpliced(comp.customIndex, 1);
    }

    function handleWorkerMessage(event) {
        if (event.data == 'z3Loaded') {
            return workerBusy = false;
        } else {
            let { solutions, partial, time } = event.data;
            // No exact fit: the worker sends its best partial placement instead
            currentProblem.partial = partial ? { unplaced: partial.unplaced, cellsPlaced: partial.cellsPlaced } : null;
            if (partial) solutions = [ partial.solution ];
            // Update currentProblem based on worker results

            currentProblem.time = time;

            // The solver works on the region normalized to the origin; shift
            // everything back so it lines up with the user's original grid.
            const { dx, dy } = currentProblem.offset || { dx: 0, dy: 0 };
            currentProblem.solutions = solutions.map(solution => ({
                // Data for polyomino-control in 'display-multiple' mode; the
                // first coords represent the problem region, drawn in white.
                coords: solution.map(x => x.coords.map(([ cx, cy ]) => [ cx + dx, cy + dy ])),
                // Component info of each placed piece (the region, first, has none)
                info: solution.slice(1).map(x => polyominoInfo[x.pieceIndex] ?? null),
            }));
            currentProblem.solutionIndex = 0;
            return workerBusy = false;
        }
    }

    // Problems found by the last Solve click (blocks solving until fixed)
    let validationErrors = [];
    let validationOpen = false;

    function validateProblem() {
        const errors = [];
        // One reactor or aux generator is enough (a hand-drawn region also counts)
        if (!regionCoords.length) {
            errors.push('No reactor or aux generator selected: select at least one in the Power Grid section.');
        }
        if (!polyominos.length) errors.push('No components selected: add at least one component.');
        return errors;
    }

    function solve() {
        validationErrors = validateProblem();
        if (validationErrors.length) {
            validationOpen = true;
            return;
        }

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

        worker.postMessage({ type: solveMethod, problem: problemData, maxSolutions: Math.max(1, settings.maxSolutions | 0) });
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
                            value={ currentSolution?.coords || [] }
                            info={ currentSolution?.info || [] }
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
                <Button class="flex-1" disabled={ !polyCreateCoords.length } onclick={ openCustomDialog }>Add…</Button>
            </div>
        </div>
        <div class="relative mt-4" class:hidden={ selectedTab != 'components' }>
            <input type="text" placeholder="Search components…" aria-label="Search components"
                   class="h-8 w-full border bg-transparent px-2 pr-8 text-sm"
                   bind:value={ componentSearch }
                   onkeydown={ e => e.key == 'Escape' && (componentSearch = '') } />
            {#if componentSearch}
                <button type="button" title="Clear search"
                        class="absolute right-0 top-0 flex h-8 w-8 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
                        onclick={ () => componentSearch = '' }>✕</button>
            {/if}
        </div>
        <div class="mt-3 max-h-[70vh] overflow-y-auto pr-1" class:hidden={ selectedTab != 'components' }>
            {#if !filteredCatalogue.length}
                <p class="px-2 py-4 text-sm text-muted-foreground">No components match “{ componentSearch.trim() }”.</p>
            {/if}
            {#each filteredCatalogue as group}
                <div class="mb-5">
                    <div class="mb-1 flex items-center gap-2 px-2">
                        <span class="size-2.5 rounded-full" style="background: {group.color}"></span>
                        <h3 class="text-sm font-semibold">{ group.label }</h3>
                        <span class="ml-auto text-xs text-muted-foreground">{ group.components.length }</span>
                    </div>
                    <Separator />
                    <ul class="divide-y">
                        {#each group.components as comp}
                            <li class="group/item relative">
                                <button
                                    type="button"
                                    class="flex h-[72px] w-full cursor-pointer items-center gap-3 px-2 text-left text-sm transition-colors hover:bg-accent"
                                    title="Add { comp.name }"
                                    onclick={ () => addComponent(comp) }
                                >
                                    <span class="flex flex-1 items-center gap-2">
                                        { comp.name }
                                        {#if comp.custom}
                                            <span class="border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Custom</span>
                                        {/if}
                                    </span>
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
                                            info={ componentInfo(comp) }
                                        />
                                    </span>
                                    </span>
                                    {#if comp.custom}<span class="w-6 flex-none"></span>{/if}
                                </button>
                                {#if comp.custom}
                                    <button
                                        type="button"
                                        class="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer px-1.5 text-muted-foreground hover:text-destructive"
                                        title="Delete { comp.name }"
                                        aria-label="Delete { comp.name }"
                                        onclick={ () => removeCustomComponent(comp) }
                                    >✕</button>
                                {/if}
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
            onclick={ () => workComplete ? resetIfWorkComplete(true) : solve() }
        >{ workComplete ? 'Reset' : 'Solve' }</Button>
        {#if workerBusy}
            <img src={ loadingGif } alt="loading" class="mx-auto block">
        {/if}
        {#if workComplete && foundSolution && currentProblem.solutions.length > 1}
            <div class="flex items-center justify-center gap-4">
                <Button variant="outline" aria-label="Previous solution" onclick={() => showSolution(-1) }>‹ Prev</Button>
                <span class="text-sm">Solution { currentProblem.solutionIndex + 1 } / { currentProblem.solutions.length }</span>
                <Button variant="outline" aria-label="Next solution" onclick={() => showSolution(1) }>Next ›</Button>
            </div>
        {/if}
        {#if workComplete}
            <Alert.Root id="solution-info" variant={ foundSolution && !currentProblem.partial ? 'default' : 'destructive' }>
                <Alert.Description>
                    {#if currentProblem.partial}
                        <strong>No complete solution.</strong> Showing the best fit: { polyominos.length - currentProblem.partial.unplaced.length } of { polyominos.length } components placed
                        ({ currentProblem.partial.cellsPlaced } cells)
                        {#if currentProblem.partial.unplaced.length}
                            — not placed: { currentProblem.partial.unplaced.map(i => polyominoInfo[i]?.name ?? `custom shape #${ i + 1 }`).join(', ') }
                        {/if}
                    {:else if foundSolution} Found { currentProblem.solutions.length } { currentProblem.solutions.length == 1 ? 'solution' : 'solutions' } {:else} <strong>No solution</strong> {/if} in { (currentProblem.time / 1000).toFixed(3) } seconds.
                </Alert.Description>
            </Alert.Root>
        {/if}
    </section>

</main>

<AlertDialog.Root bind:open={ validationOpen }>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Can't solve yet</AlertDialog.Title>
            <AlertDialog.Description>
                {#each validationErrors as message}<div>{ message }</div>{/each}
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Action onclick={ () => validationOpen = false }>OK</AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={ resetConfirmOpen }>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Discard current solution?</AlertDialog.Title>
            <AlertDialog.Description>
                Continuing will reset the solution view and return to the editor.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action onclick={ confirmReset }>Reset</AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

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

<Dialog.Root bind:open={ customDialogOpen }>
    <Dialog.Content class="sm:max-w-sm">
        <Dialog.Header>
            <Dialog.Title>New custom component</Dialog.Title>
        </Dialog.Header>
        <form class="flex flex-col gap-4" onsubmit={ e => { e.preventDefault(); saveCustomComponent(); } }>
            {#if customPreview}
                <div class="flex justify-center border p-3">
                    <span
                        class="relative flex-none overflow-hidden"
                        style="width: { customPreview.getWidth() * 24 }px; height: { customPreview.getHeight() * 24 }px"
                    >
                        <PolyominoControl
                            size={ customPreview.getSize() }
                            mode="display"
                            class="pointer-events-none absolute bottom-0 left-0"
                            style="width: { customPreview.getSize() * 24 }px; height: { customPreview.getSize() * 24 }px"
                            value={ customPreview.coords }
                            info={ componentInfo({ name: customName.trim() || 'New component', category: customCategory, custom: true }) }
                        />
                    </span>
                </div>
            {/if}
            <div class="flex flex-col gap-2">
                <Label for="custom-name">Name</Label>
                <!-- svelte-ignore a11y_autofocus -->
                <input id="custom-name" type="text" autofocus maxlength="60"
                       class="h-8 border bg-transparent px-2 text-sm"
                       bind:value={ customName } />
            </div>
            <div class="flex flex-col gap-2">
                <Label for="custom-category">Category</Label>
                <select id="custom-category" class="h-8 border bg-background px-2 text-sm" bind:value={ customCategory }>
                    {#each Object.entries(componentCategories) as [ id, category ]}
                        <option value={ id }>{ category.label }</option>
                    {/each}
                </select>
            </div>
            {#if customError}<p class="text-sm text-destructive">{ customError }</p>{/if}
            <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" onclick={ () => customDialogOpen = false }>Cancel</Button>
                <Button type="submit">Save</Button>
            </div>
        </form>
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
            <div class="flex items-center gap-2">
                <Label for="max-solutions">Number of solutions</Label>
                <input id="max-solutions" type="number" min="1" max="50" step="1"
                       class="h-8 w-20 border bg-transparent px-2 text-sm"
                       bind:value={ settings.maxSolutions }
                       onchange={() => settings.maxSolutions = Math.min(50, Math.max(1, Math.round(settings.maxSolutions) || 1)) } />
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
