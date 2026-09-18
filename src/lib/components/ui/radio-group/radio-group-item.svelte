<script>
	import { RadioGroup as RadioGroupPrimitive } from "bits-ui";
	import RiCircleLine from 'remixicon-svelte/icons/circle-line';
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	} = $props();
</script>

<RadioGroupPrimitive.Item
	bind:ref
	data-slot="radio-group-item"
	class={cn(
		"border-input bg-transparent data-checked:border-foreground aria-invalid:aria-checked:border-foreground aria-invalid:border-destructive focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:aria-invalid:border-destructive/50 flex size-4.5 rounded-full border focus-visible:ring-2 aria-invalid:ring-2 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input group-has-[:focus-visible]/field-label:data-checked:border-foreground group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		<div data-slot="radio-group-indicator" class="flex size-4.5 items-center justify-center">
			{#if checked}
				<RiCircleLine class="bg-foreground absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
			{/if}
		</div>
	{/snippet}
</RadioGroupPrimitive.Item>