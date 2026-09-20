<script>
    // Unique per instance so the bevel filter ids of several grids don't clash
    const uid = Math.random().toString(36).slice(2, 8);

    let {
        // One of: 'create', 'create-region', 'display', or 'display-multiple'
        mode = 'create',
        // The (square) integer size of the grid
        size = 4,
        // The polyomino as a list of [x, y] coordinates. In 'display-multiple'
        // mode, a list of such polyominos whose first entry is the region.
        value = $bindable([]),
        // Optional { "x,y": cssColor } overriding the color of region cells
        tints = {},
        // Component info { name, category, color } shown in a tooltip on hover. In
        // 'display-multiple' mode, a list aligned with the pieces (after the region).
        info = null,
        onchange = undefined,
        class: className = '',
        ...rest
    } = $props();

    const editable = $derived(mode.startsWith('create'));

    // The first polyomino is treated as the region; imitate it with an empty one otherwise
    const polys = $derived(mode == 'display-multiple' ? value : [ [], value ]);

    // Index in `polys` of the region, whose cells may be tinted
    const regionIndex = $derived(mode == 'display-multiple' ? 0 : mode == 'create-region' ? 1 : -1);

    // Pieces are drawn as circuit plates (lines and dots joining their cells)
    const isPiece = index => mode == 'display-multiple' ? index > 0 : mode != 'create-region' && index == 1;
    const powered = $derived(mode == 'display-multiple');

    // Map "x,y" -> { classes, style, links } of the last polyomino covering that cell
    // Game-style power grid: every cell is a metal tile, region cells are tinted glass
    const gridLook = $derived(mode == 'display-multiple' || mode == 'create-region');

    const cellInfo = $derived.by(() => {
        const map = new Map();
        polys.forEach((p, index) => {
            const piece = isPiece(index);
            const keys = new Set(p.map(([ x, y ]) => `${ x },${ y }`));
            for (const [ x, y ] of p) {
                const key = `${ x },${ y }`;
                const tint = index == regionIndex ? tints[key] : map.get(key)?.tint;
                map.set(key, {
                    tint,
                    info: mode == 'display-multiple' ? (index > 0 ? info?.[index - 1] : null) : mode == 'display' ? info : null,
                    classes: `active ${ piece ? 'piece' : gridLook ? 'region' : 'white' }`,
                    style: tint ? `--tint: ${ tint }` : '',
                    links: piece ? {
                        top: keys.has(`${ x },${ y + 1 }`),
                        bottom: keys.has(`${ x },${ y - 1 }`),
                        left: keys.has(`${ x - 1 },${ y }`),
                        right: keys.has(`${ x + 1 },${ y }`),
                    } : null,
                });
            }
        });
        return map;
    });

    // Cells of every piece with their links to neighbouring cells of the same piece
    const pieceCells = $derived(polys.flatMap((p, index) => {
        if (!isPiece(index)) return [];
        const keys = new Set(p.map(([ x, y ]) => `${ x },${ y }`));
        const color = (mode == 'display-multiple' ? info?.[index - 1] : mode == 'display' ? info : null)?.color;
        return p.map(([ x, y ]) => ({
            x, y: size - 1 - y, color,
            top: keys.has(`${ x },${ y + 1 }`),
            bottom: keys.has(`${ x },${ y - 1 }`),
            left: keys.has(`${ x - 1 },${ y }`),
            right: keys.has(`${ x + 1 },${ y }`),
        }));
    }));

    const cells = $derived(Array.from({ length: size * size }, (_, n) => [ Math.floor(n / size), n % size ]));

    let pointerDown = false;

    function toggle(tx, ty) {
        const loc = value.findIndex(([ x, y ]) => x == tx && y == ty);
        value = loc >= 0 ? value.filter((_, i) => i != loc) : [ ...value, [ tx, ty ] ];
        onchange?.(value);
    }

    function onPointerDown(e, x, y) {
        e.preventDefault();
        pointerDown = true;
        toggle(x, y);
        // Allow pointerenter to fire on other cells during a touch drag
        e.target.releasePointerCapture(e.pointerId);
    }

    function onPointerEnter(e, x, y) {
        e.preventDefault();
        if (pointerDown) toggle(x, y);
    }

    function stopDrawing() {
        pointerDown = false;
    }

    // Hover tooltip, positioned at the pointer
    let tip = $state(null);

    function showTip(e, key) {
        const cellTip = cellInfo.get(key)?.info;
        tip = cellTip ? { ...cellTip, x: e.clientX, y: e.clientY } : null;
    }
</script>

<svelte:window onpointerup={ stopDrawing } onpointercancel={ stopDrawing } />

<div {...rest} class="polyomino-control {className}">
    <div class="grid-container {mode}" class:grid-look={ gridLook }
         style="grid-template: repeat({size}, 1fr) / repeat({size}, 1fr)">
        {#each cells as [ x, y ] (`${ x },${ y }`)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="cell {gridLook ? 'tile ' : ''}{cellInfo.get(`${ x },${ y }`)?.classes ?? ''}"
                 style="grid-column: {x + 1}; grid-row: {size - y}; {cellInfo.get(`${ x },${ y }`)?.style ?? ''}"
                 onpointerdown={ editable ? e => onPointerDown(e, x, y) : null }
                 onpointerenter={ editable ? e => onPointerEnter(e, x, y) : e => showTip(e, `${ x },${ y }`) }
                 onpointermove={ editable ? null : e => showTip(e, `${ x },${ y }`) }
                 onpointerleave={ editable ? null : () => tip = null }
            >
            </div>
        {/each}
        <!-- Pieces are drawn as one shape each: rects are stroked first, then filled, so only the outer outline shows -->
        <svg class="pieces" viewBox="0 0 {size} {size}" preserveAspectRatio="none">
    {#snippet shape(dx, dy, m)}
        {#each pieceCells as c}
            <rect x={ c.x + 0.12 + m + dx } y={ c.y + 0.12 + m + dy } width={ 0.76 - 2 * m } height={ 0.76 - 2 * m } rx="0.08" />
            {#if c.right}<rect x={ c.x + 0.5 + dx } y={ c.y + 0.12 + m + dy } width="1" height={ 0.76 - 2 * m } />{/if}
            {#if c.bottom}<rect x={ c.x + 0.12 + m + dx } y={ c.y + 0.5 + dy } width={ 0.76 - 2 * m } height="1" />{/if}
        {/each}
    {/snippet}
            <clipPath id="clip-{uid}"><g>{@render shape(0, 0, 0)}</g></clipPath>
            <!-- Bevel: dark base, light top-left edge (shifted copy clipped to the shape), flat body inset on top -->
            <g class="plate-outline">{@render shape(0, 0, 0)}</g>
            <g class="plate-base">{@render shape(0, 0, 0)}</g>
            <g class="plate-light" clip-path="url(#clip-{uid})">{@render shape(-0.035, -0.035, 0)}</g>
            <g class="plate-body">{@render shape(0, 0, 0.035)}</g>
            {#each pieceCells as c}
                {@const n = [ c.top, c.bottom, c.left, c.right ].filter(Boolean).length}
                <g class="circuit" class:powered style={ c.color ? `--line: ${ c.color }` : '' }>
                    {#if c.top}<line x1={ c.x + 0.5 } y1={ c.y + 0.5 } x2={ c.x + 0.5 } y2={ c.y } />{/if}
                    {#if c.bottom}<line x1={ c.x + 0.5 } y1={ c.y + 0.5 } x2={ c.x + 0.5 } y2={ c.y + 1 } />{/if}
                    {#if c.left}<line x1={ c.x + 0.5 } y1={ c.y + 0.5 } x2={ c.x } y2={ c.y + 0.5 } />{/if}
                    {#if c.right}<line x1={ c.x + 0.5 } y1={ c.y + 0.5 } x2={ c.x + 1 } y2={ c.y + 0.5 } />{/if}
                    {#if n != 2 || (c.top || c.bottom) && (c.left || c.right)}
                        <circle cx={ c.x + 0.5 } cy={ c.y + 0.5 } r={ n == 0 ? 0.15 : 0.12 } />
                    {/if}
                </g>
            {/each}
        </svg>
    </div>
</div>

{#if tip}
    <div class="tip" style="left: {tip.x + 14}px; top: {tip.y + 14}px">
        <span class="swatch" style="background: {tip.color}"></span>
        <div>
            <div class="tip-name">{ tip.name }</div>
            <div class="tip-category">{ tip.category }</div>
        </div>
    </div>
{/if}

<style>
    .tip {
        position: fixed;
        z-index: 50;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border: 1px solid #64748b;
        border-radius: 6px;
        background: #0f172a;
        color: #f8fafc;
        font-size: 12px;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .swatch {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex: none;
    }
    .tip-name { font-weight: 600; }
    .tip-category { opacity: 0.7; }

    .polyomino-control {
        touch-action: none;
        user-select: none;
    }
    .grid-container {
        position: relative;
        display: grid;
        width: 100%;
        height: 100%;
        outline: 2px solid black;
        grid-gap: 2px;
    }
    .grid-container.grid-look {
        outline: none;
        grid-gap: 1px;
        background: #0a0a0c;
    }
    .grid-container.display, .grid-container.display-multiple {
        outline: none;
    }

    .cell {
        outline: 2px solid black;
    }

    .cell.active.white { background-color: white }

    /* Metal floor tile with a bolt, like the in-game power grid */
    .cell.tile {
        position: relative;
        outline: none !important;
        border-radius: 3px;
        border: 1px solid #0a0a0c;
        background:
            radial-gradient(circle at 50% 50%, #17171a 0 9%, #55565c 10% 14%, #1b1b1f 15% 22%, transparent 23%),
            linear-gradient(145deg, #34353b, #1f2023);
        box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.6);
    }
    /* Translucent green/blue glass over the tile */
    .cell.tile.region, .cell.tile.piece {
        --tint: #22c55e;
        border-color: color-mix(in srgb, var(--tint) 90%, white 10%);
        background:
            radial-gradient(circle at 50% 50%, transparent 0 9%, color-mix(in srgb, var(--tint) 60%, white) 10% 13%, transparent 14%),
            linear-gradient(color-mix(in srgb, var(--tint) 55%, transparent), color-mix(in srgb, var(--tint) 55%, transparent)),
            linear-gradient(145deg, #34353b, #1f2023);
        box-shadow: inset 0 0 8px color-mix(in srgb, var(--tint) 70%, transparent);
    }
    /* A component: a metal block that leaves the tinted tile visible at its unlinked edges */
    .cell.tile.piece {
        background:
            linear-gradient(color-mix(in srgb, var(--tint) 55%, transparent), color-mix(in srgb, var(--tint) 55%, transparent)),
            linear-gradient(145deg, #34353b, #1f2023);
    }
    .pieces {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
    .plate-outline rect { fill: #2a2b30; stroke: #2a2b30; stroke-width: 0.045; }
    .plate-base rect { fill: #3d3e44; }
    .plate-light rect { fill: #b4b6be; }
    .plate-body rect { fill: #6f717a; }
    .circuit line {
        stroke: var(--line, #f3e3c3);
        stroke-width: 0.09;
        stroke-linecap: round;
        filter: drop-shadow(0.01px 0.02px 0.015px rgba(0, 0, 0, 0.7));
    }
    .circuit circle { fill: var(--line, #f3e3c3); }

    .grid-container.display .cell {
        outline: none;
    }

    .grid-container.display .cell.active, .grid-container.display-multiple .cell.active {
        outline: 2px solid black;
    }

    .grid-container.create-region .cell, .grid-container.display-multiple .cell {
        outline: none;
    }

    .grid-container.create-region .cell.active {
        outline: 2px solid black;
    }

    /* Plain grids (custom shape drawing) would be black on black in dark mode */
    :global(.dark) .grid-container:not(.grid-look) {
        outline-color: #71717a;
    }
    :global(.dark) .grid-container:not(.grid-look) .cell {
        outline-color: #71717a;
    }
    :global(.dark) .grid-container:not(.grid-look) .cell.active.white {
        background-color: #e4e4e7;
    }
</style>
