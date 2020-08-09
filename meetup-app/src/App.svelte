<script>
  import MeetupGrid from "./Meetups/MeetupGrid.svelte";
  import Header from "./UI/Header.svelte";
  import TextInput from "./UI/TextInput.svelte";
  import Button from "./UI/Button.svelte";

  let meetups = [
    {
      id: "id1",
      title: "I want to swim",
      subtitle: "Swim 1000m in x minutes",
      description: "This is a goal in my life",
      imageUrl: "",
      address: "HCM HCM",
      contactEmail: "test1@test.com",
    },
    {
      id: "id2",
      title: "I want to practice MMA",
      subtitle: "It is fun to do it",
      description: "This is a goal in my life 2",
      imageUrl: "",
      address: "Lien Phong center?",
      contactEmail: "test2@test.com",
    },
  ];

  let title = "";
  let subtitle = "";
  let description = "";
  let imageUrl = "";
  let address = "";
  let email = "";

  function addMeetup() {
    const newMeetup = {
      id: Math.random().toString(),
      title,
      subtitle,
      description,
      contactEmail: email,
      imageUrl,
      address,
    };

    meetups = [...meetups, newMeetup];
  }
</script>

<style>
  main {
    margin-top: 5rem;
  }

  form {
    width: 30rem;
    max-width: 90%;
    margin: auto;
  }
</style>

<Header />

<main>
  <form on:submit|preventDefault={addMeetup}>
    <TextInput
      type="text"
      controlType="input"
      value={title}
      label="Title"
      id="title"
      on:input={(event) => (title = event.target.value)} />
    <TextInput
      type="text"
      controlType="input"
      value={subtitle}
      label="Subtitle"
      id="subtitle"
      on:input={(event) => (subtitle = event.target.value)} />
    <TextInput
      type="text"
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

    <Button type="submit" caption="Save" />
  </form>
  <MeetupGrid {meetups} />
</main>
