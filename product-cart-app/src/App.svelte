<script>
  import { tick } from "svelte";
  import Product from "./Product.svelte";
  import App from "../../svelte-hello/src/App.svelte";
  import Button from "../../meetup-app/src/UI/Button.svelte";
  import ContactCard from "../../svelte-hello/src/ContactCard.svelte";
  import Modal from "./Modal.svelte";

  let products = [
    {
      id: "p1",
      title: "Harry Potter",
      price: 9.99,
    },
    {
      id: "p2",
      title: "Game of thrones",
      price: 19.99,
    },
    {
      id: "p3",
      title: "The Lord of the Rings",
      price: 29.99,
    },
  ];

  let showModal = false;
  let closeable = false;

  let text = "I want to transform this text!";

  function addToCart(event) {
    console.log(event);
  }

  function deleteProduct(event) {
    console.log(event);
  }

  function transform(event) {
    if (event.which !== 9) {
      return; // tab key
    }
    event.preventDefault();
    const selectionStart = event.target.selectionStart;
    const selectionEnd = event.target.selectionEnd;
    const value = event.target.value;

    text =
      value.slice(0, selectionStart) +
      value.slice(selectionStart, selectionEnd).toUpperCase() +
      value.slice(selectionEnd);

    tick().then(() => {
      event.target.selectionStart = selectionStart;
      event.target.selectionEnd = selectionEnd;
    });
  }
</script>

{#each products as product}
  <Product
    {...product}
    on:add-to-cart={addToCart}
    on:delete-product={deleteProduct} />
{/each}

<button on:click={() => (showModal = true)}>Show Modal</button>

{#if showModal}
  <Modal
    on:cancel={() => (showModal = false)}
    on:close={() => (showModal = false)}
    let:didAgree={closeable}>
    <h1 slot="header">Hello Modal</h1>
    <div>This is Modal content</div>
    <button
      slot="footer"
      on:click={() => (showModal = false)}
      disabled={!closeable}>
      Confirm
    </button>
  </Modal>
{/if}

<textarea
  name="test123"
  id="test123"
  rows={3}
  value={text}
  on:keydown={transform} />
