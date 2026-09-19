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

    import { Polyomino, tetrominos } from './js/Polyomino.js';
    import { generatorSlots } from './js/generators.js';
    import SatSolverWorker from 'worker-loader!./js/SatSolverWorker.js';

    let localState = JSON.parse(localStorage.getItem('polyomino-solver-state')) || {
        savedPolyomino: [],
        size: 8,
        regionCoords: null,
    };

    // UI Data
	let polyominos = localState.savedPolyomino || [];
    let regionCoords = localState.regionCoords || [];
    let settings = {
        method: 'method-dlx',
        allowRotation: true,
        allowReflection: false,
    }
    let settingsOpen = false;
    let selectedGenerators = { reactor: null, aux1: null, aux2: null };
    let pickerSlot = null;
    let pickerOpen = false;
    function openPicker(slot) {
        pickerSlot = slot;
        pickerOpen = true;
    }
    function pickGenerator(name) {
        selectedGenerators[pickerSlot.id] = name;
        pickerOpen = false;
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
                size: regionCreateSize,
                regionCoords,
            }));
        }, 1500);
    }

    $: polyominos, regionCreateSize, regionCoords, persistStateDebounced();

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

    let polyCreateEl;
    function addCustomPolyomino() {
        // Normalize the coordinates first
        let p = new Polyomino(polyCreateEl.value).normalize();
        polyominos = [ ...polyominos, p.coords ];
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
                currentProblem.solutionCoords = solution.map(x => x.coords);
            }
            return workerBusy = false;
        }
    }

    // Makeshift two-way binding on create-region control
    let regionCreateEl = null;
    $: if (regionCreateEl != null && regionCreateEl.value != regionCoords) {
        regionCreateEl.value = regionCoords;
    }

    function solve() {
        // The solving machinery will normalize the region coordinates, shifting
        // it as close to the origin as possible. Do this on the user's region
        // coordinates now, to avoid a perceived incongruity upon reset.
        regionCoords = new Polyomino(regionCoords).normalize().coords;

        let problemData = {
            pieces: polyominos,
            region: regionCoords,
            allowRotation: settings.allowRotation,
            allowReflection: settings.allowReflection,
        };

        let solveMethod = settings.method.split('-')[1];

        currentProblem = { problemData };

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
                            on:click={() => openPicker(slot) }>
                        <span class="font-semibold">{ slot.label }</span>
                        <span class="text-xs { selectedGenerators[slot.id] ? '' : 'text-muted-foreground' }">{ selectedGenerators[slot.id] || 'Click to select' }</span>
                    </button>
                {/each}
            </div>
            <div class="min-w-0 flex-1">
                {#if (workComplete && foundSolution)}
                    <polyomino-control
                            id="solution-display"
                            size={ regionCreateSize }
                            mode="display-multiple"
                            value={ currentProblem.solutionCoords || [] }
                    ></polyomino-control>
                {:else}
                    <polyomino-control
                            id="region-create"
                            bind:this={ regionCreateEl }
                            size={ regionCreateSize }
                            on:change={ e => regionCoords = e.target.value }
                            mode="create-region"
                    ></polyomino-control>
                {/if}
            </div>
        </div>

        <div class="flex gap-2">
            <!--<Button variant="outline" class="size-button" disabled={ workComplete || !canDecrementRegionSize }
                    title="grid size down" onclick={() => regionCreateSize = Math.max(2, regionCreateSize - 1) }>⇲</Button>
            <Button variant="outline" class="size-button" disabled={ workComplete }
                    title="grid size up" onclick={() => regionCreateSize += 1}>⇱</Button>-->
            <Button variant="outline" class="size-button" disabled={ workComplete }
                    title="clear" onclick={() => regionCoords = []}>⎚</Button>
        </div>
    </section>

    <section>
        <p class="mb-2 font-semibold">Components to be fit <span class="text-xs font-normal text-muted-foreground">(click to remove)</span></p>
        <div class="border p-3">
            {#each polyominos as coords, index (coords) }
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <polyomino-control
                        size={ largestPolySize }
                        mode="display"
                        class="tetromino"
                        value={ coords }
                        on:click={ e => {
                        polyominos = polyominos.toSpliced(index, 1);
                    } }
                ></polyomino-control>
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
            <polyomino-control id="poly-create" bind:this={ polyCreateEl } size={ polyCreateSize }></polyomino-control>
            <div class="flex items-center gap-2">
                <Button variant="outline" class="size-button" title="grid size down" onclick={() => polyCreateSize = Math.max(2, polyCreateSize - 1) }>⇲</Button>
                <Button variant="outline" class="size-button" title="grid size up" onclick={() => polyCreateSize += 1}>⇱</Button>
                <Button variant="outline" class="size-button" title="clear" onclick={() => polyCreateEl.value = [] }>⎚</Button>
                <Button class="flex-1" onclick={ addCustomPolyomino }>Add</Button>
            </div>
        </div>
        <div class="mt-4" class:hidden={ selectedTab != 'components' }>
            {#each Object.entries(tetrominos) as [ name, tetromino ]}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <polyomino-control
                    size="4"
                    mode="display"
                    class="tetromino"
                    value={ tetromino.coords }
                    on:click={ e => {
                        polyominos = [ ...polyominos, [ ...e.target.value ] ];
                    } }
                ></polyomino-control>
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
                {#each pickerSlot.options as option}
                    <Button variant={ selectedGenerators[pickerSlot.id] == option ? 'default' : 'outline' }
                            onclick={() => pickGenerator(option) }>{ option }</Button>
                {/each}
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
#poly-create {
    --cell-color: cyan;
}

#region-create, #solution-display {
    background: lightgray;
}

#poly-create, #region-create, #solution-display {
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

.tetromino {
    width: 60px;
    height: 60px;
    display: inline-block;
    margin: 0 10px 15px 10px;
    --cell-color: lightgreen;
}

.tetromino:hover {
    --cell-color: lightblue;
}
</style>
