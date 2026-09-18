<script>
	import { cn } from "$lib/utils.js";
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="field-label"
	class={cn("gap-2 group-data-[disabled=true]/field:opacity-50 leading-normal font-semibold uppercase in-data-[slot=field-label]:font-semibold text-xs flex w-fit items-center", className)}
	{...restProps}
>
	{@render children?.()}
</div>