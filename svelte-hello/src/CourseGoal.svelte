<script>
    export let courseGoal;

    $: shouldHighlight = courseGoal && courseGoal.includes('!');
</script>

<style>
    .highlight {
        color: red;
    }
</style>

<h1 class:highlight={shouldHighlight}>
    {courseGoal}
</h1>
