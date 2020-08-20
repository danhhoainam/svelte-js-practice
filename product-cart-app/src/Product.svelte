<script>
  import { createEventDispatcher } from "svelte";

  export let title;
  export let price;
  export let bestseller = false;

  const dispatch = createEventDispatcher();

  function addToCart() {
    dispatch("add-to-cart", { title });
  }

  function deleteProduct() {
    dispatch("delete-product", { title });
  }
</script>

<article>
  <h1>{title}</h1>
  <h2>${price}</h2>
  {#if bestseller}
    <p>best seller</p>
  {/if}
  <button on:click={addToCart}>Add to cart</button>
  <button on:click={deleteProduct}>Delete</button>
</article>
