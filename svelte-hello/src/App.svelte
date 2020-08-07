<script>
  // import CourseGoal from './CourseGoal.svelte';
  import ContactCard from "./ContactCard.svelte";

  let name = "NamNDH";
  let age = 33;
  let description = "";
  let title = "";
  let image = "";
  // let courseGoal = ""
  let done = false;
  let formState = "empty";
  let createdContacts = [];
  let passwords = [];
  let currentPassword = "";
  let passwordValidation = [];

  $: uppercaseName = name.toUpperCase();

  $: passwordValidation =
    currentPassword.trim().length < 5
      ? ["Too short", false]
      : currentPassword.trim().length > 10
      ? ["Too long", false]
      : [currentPassword.trim(), true];

  function incrementAge() {
    age += 1;
  }

  function changeName() {
    name = "namndh";
  }

  function nameInput(event) {
    name = event.target.value;
  }

  function addPassword() {
    const [message, validation] = passwordValidation;
    if (validation) {
      passwords = [...passwords, currentPassword];
      currentPassword = "";
    }
  }

  function deletePassword(index) {
    passwords = passwords.filter((pw, i) => pw && i !== index);
  }

  function addContact() {
    if (
      name.trim().length == 0 ||
      title.trim().length == 0 ||
      image.trim().length == 0 ||
      description.trim().length == 0
    ) {
      formState == "invalid";
      return;
    }

    const createdContact = {
      id: Math.random(),
      name,
      title,
      image,
      description,
    };
    createdContacts = [...createdContacts, createdContact];
    formState == "done";
  }

  function deleteFirst() {
    createdContacts = createdContacts.slice(1);
  }

  function deleteLast() {
    createdContacts = createdContacts.slice(0, -1);
  }
</script>

<style>
  #form {
    width: 30rem;
    max-width: 100%;
  }

  #form1 {
    width: 30rem;
    max-width: 100%;
  }
</style>

<div id="form1">
  <div class="form-control">
    <label for="password">Password</label>
    <input type="text" bind:value={currentPassword} id="currentPassword" />
    <p>{passwordValidation.length && passwordValidation[0]}</p>
    <button on:click={addPassword}>Add Password</button>
    <ul>
      {#each passwords as pw, i (pw)}
        <li on:click={() => deletePassword(i)}>{pw}</li>
      {/each}
    </ul>
  </div>
</div>

<div id="form">
  <div class="form-control">
    <label for="userName">User Name</label>
    <input type="text" bind:value={name} id="userName" />
  </div>
  <div class="form-control">
    <label for="jobTitle">Job Title</label>
    <input type="text" bind:value={title} id="jobTitle" />
  </div>
  <div class="form-control">
    <label for="image">Image URL</label>
    <input type="text" bind:value={image} id="image" />
  </div>
  <div class="form-control">
    <label for="desc">Description</label>
    <textarea rows={3} bind:value={description} id="desc" />
  </div>
</div>

<button on:click={addContact}>Add Contact</button>
<button on:click={deleteFirst}>Delete First</button>
<button on:click={deleteLast}>Delete Last</button>

{#if formState === 'invalid'}
  <p>Invalid input.</p>
{:else}
  <p>Please enter some data and hit the button!</p>
{/if}

{#each createdContacts as contact, i (contact.id)}
  <h2># {i + 1}</h2>
  <ContactCard
    userName={contact.name}
    jobTitle={contact.title}
    description={contact.description}
    userImage={contact.image} />
{:else}
  <p>Please start adding some contacts!!!</p>
{/each}

<!-- <input type="text" bind:value={courseGoal} />
	<CourseGoal {courseGoal} /> -->
