<script>
  import Button from "./../UI/Button.svelte";
  import TextInput from "./../UI/TextInput.svelte";
  import { createEventDispatcher } from "svelte";
  import Modal from "../UI/Modal.svelte";
  import { isEmpty, isValidEmail } from "../helpers/validation";

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

  $: titleValid = !isEmpty(title);
  $: subtitleValid = !isEmpty(subtitle);
  $: addressValid = !isEmpty(address);
  $: descriptionValid = !isEmpty(description);
  $: imageUrlValid = !isEmpty(imageUrl);
  $: emailValid = isValidEmail(email);
  $: formIsValid =
    titleValid &&
    subtitleValid &&
    addressValid &&
    descriptionValid &&
    imageUrlValid &&
    emailValid;
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
      label="Title"
      id="title"
      valid={titleValid}
      validityMessage="Please enter a valid title"
      value={title}
      on:input={(event) => (title = event.target.value)} />
    <TextInput
      controlType="input"
      label="Subtitle"
      id="subtitle"
      valid={subtitleValid}
      validityMessage="Please enter a valid subtitle"
      value={subtitle}
      on:input={(event) => (subtitle = event.target.value)} />
    <TextInput
      controlType="input"
      label="Image URL"
      id="imageUrl"
      valid={imageUrlValid}
      validityMessage="Please enter a valid image url."
      value={imageUrl}
      on:input={(event) => (imageUrl = event.target.value)} />
    <TextInput
      type="email"
      controlType="input"
      label="Email"
      id="email"
      valid={emailValid}
      validityMessage="Please enter a valid email."
      value={email}
      on:input={(event) => (email = event.target.value)} />
    <TextInput
      controlType="textarea"
      rows={3}
      label="Description"
      id="description"
      valid={descriptionValid}
      validityMessage="Please enter a valid description."
      value={description}
      on:input={(event) => (description = event.target.value)} />
  </form>
  <div slot="footer">
    <Button type="button" mode="outline" on:click={cancel}>Cancel</Button>
    <Button type="button" on:click={submitForm} disabled={!formIsValid}>
      Save
    </Button>
  </div>
</Modal>
