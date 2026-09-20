<script>
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
    const cellInfo = $derived.by(() => {
        const map = new Map();
        polys.forEach((p, index) => {
            const piece = isPiece(index);
            const keys = new Set(p.map(([ x, y ]) => `${ x },${ y }`));
            for (const [ x, y ] of p) {
                const key = `${ x },${ y }`;
                const tint = index == regionIndex ? tints[key] : null;
                map.set(key, {
                    info: mode == 'display-multiple' ? (index > 0 ? info?.[index - 1] : null) : mode == 'display' ? info : null,
                    classes: `active ${ piece ? 'piece' : 'white' }`,
                    style: tint ? `background-color: ${ tint }` : '',
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
    <div class="grid-container {mode}"
         style="grid-template: repeat({size}, 1fr) / repeat({size}, 1fr)">
        {#each cells as [ x, y ] (`${ x },${ y }`)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="cell {cellInfo.get(`${ x },${ y }`)?.classes ?? ''}"
                 style="grid-column: {x + 1}; grid-row: {size - y}; {cellInfo.get(`${ x },${ y }`)?.style ?? ''}"
                 onpointerdown={ editable ? e => onPointerDown(e, x, y) : null }
                 onpointerenter={ editable ? e => onPointerEnter(e, x, y) : e => showTip(e, `${ x },${ y }`) }
                 onpointermove={ editable ? null : e => showTip(e, `${ x },${ y }`) }
                 onpointerleave={ editable ? null : () => tip = null }
            >
                {#if cellInfo.get(`${ x },${ y }`)?.links}
                    {@const l = cellInfo.get(`${ x },${ y }`).links}
                    {@const n = [ l.top, l.bottom, l.left, l.right ].filter(Boolean).length}
                    <svg class="circuit" class:powered viewBox="0 0 100 100">
                        {#if l.top}<line x1="50" y1="50" x2="50" y2="0" />{/if}
                        {#if l.bottom}<line x1="50" y1="50" x2="50" y2="100" />{/if}
                        {#if l.left}<line x1="50" y1="50" x2="0" y2="50" />{/if}
                        {#if l.right}<line x1="50" y1="50" x2="100" y2="50" />{/if}
                        {#if n != 2 || (l.top || l.bottom) && (l.left || l.right)}
                            <circle cx="50" cy="50" r={ n == 0 ? 15 : 12 } />
                        {/if}
                    </svg>
                {/if}
            </div>
        {/each}
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
        display: grid;
        width: 100%;
        height: 100%;
        outline: 2px solid black;
        grid-gap: 2px;
    }
    .grid-container.display, .grid-container.display-multiple {
        outline: none;
    }

    .cell {
        outline: 2px solid black;
    }

    .cell.active.white { background-color: white }

    .cell.active.piece {
        position: relative;
        background-color: #475569;
        border: 1px solid #64748b;
        border-radius: 4px;
        box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.5);
        outline: none !important;
    }
    .circuit {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
    .circuit line {
        stroke: #f87171;
        stroke-width: 8px;
        stroke-linecap: round;
        filter: drop-shadow(0 0 1px #991b1b);
    }
    .circuit circle {
        fill: #f87171;
        filter: drop-shadow(0 0 1px #991b1b);
    }
    .circuit.powered line { stroke: #4ade80; filter: drop-shadow(0 0 4px #22c55e); }
    .circuit.powered circle { fill: #4ade80; filter: drop-shadow(0 0 4px #22c55e); }

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
</style>
