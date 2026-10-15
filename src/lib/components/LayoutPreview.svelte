<script>
    // Small read-only rendering of a generator layout (rows top to bottom, 0 = empty).
    let { layout = [], colors = {}, cell = 8, class: className = '' } = $props();

    const cols = $derived(Math.max(0, ...layout.map(row => row.length)));
</script>

<div class="inline-grid gap-px { className }"
     style="grid-template-columns: repeat({ cols }, { cell }px); grid-auto-rows: { cell }px"
     aria-hidden="true">
    {#each layout as row}
        {#each row as value}
            <div class={ value == 0 ? 'bg-muted-foreground/20' : '' }
                 style={ value == 0 ? null : `background-color: ${ colors[value] }` }></div>
        {/each}
    {/each}
</div>
