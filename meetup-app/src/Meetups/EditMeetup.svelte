<script>
  import Button from "./../UI/Button.svelte";
  import TextInput from "./../UI/TextInput.svelte";
  import { createEventDispatcher } from "svelte";
  import Modal from "../UI/Modal.svelte";

  let title = "";
  let subtitle = "";
  let description = "";
  let imageUrl = "";
  let address = "";
  let email = "";
  let isFavorite = false;

  const dispatch = createEventDispatcher();

  function submitForm() {
    dispatch("save", {
      title,
      subtitle,
      description,
      contactEmail: email,
      imageUrl,
      address,
    });
  }

  function cancel() {
    dispatch("cancel");
  }
</script>

<style>
  form {
    width: 100%;
  }
</style>

<Modal title="Edit Meetup" on:cancel>
  <form on:submit|preventDefault={submitForm}>
    <TextInput
      controlType="input"
      value={title}
      label="Title"
      id="title"
      on:input={(event) => (title = event.target.value)} />
    <TextInput
      controlType="input"
      value={subtitle}
      label="Subtitle"
      id="subtitle"
      on:input={(event) => (subtitle = event.target.value)} />
    <TextInput
      controlType="input"
      value={imageUrl}
      label="Image URL"
      id="imageUrl"
      on:input={(event) => (imageUrl = event.target.value)} />
    <TextInput
      type="email"
      controlType="input"
      value={email}
      label="Email"
      id="email"
      on:input={(event) => (address = event.target.value)} />
    <TextInput
      controlType="textarea"
      rows={3}
      value={description}
      label="Description"
      id="description"
      on:input={(event) => (description = event.target.value)} />
  </form>
  <div slot="footer">
    <Button type="button" mode="outline" on:click={cancel}>Cancel</Button>
    <Button type="button" on:click={submitForm}>Save</Button>
  </div>
</Modal>
