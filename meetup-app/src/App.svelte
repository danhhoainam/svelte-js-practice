<script>
  import EditMeetup from "./Meetups/EditMeetup.svelte";
  import MeetupGrid from "./Meetups/MeetupGrid.svelte";
  import Header from "./UI/Header.svelte";
  import TextInput from "./UI/TextInput.svelte";
  import Button from "./UI/Button.svelte";

  let editMode = null;

  let meetups = [
    {
      id: "id1",
      title: "I want to swim",
      subtitle: "Swim 1000m in x minutes",
      description: "This is a goal in my life",
      imageUrl: "",
      address: "HCM HCM",
      contactEmail: "test1@test.com",
      isFavorite: false,
    },
    {
      id: "id2",
      title: "I want to practice MMA",
      subtitle: "It is fun to do it",
      description: "This is a goal in my life 2",
      imageUrl: "",
      address: "Lien Phong center?",
      contactEmail: "test2@test.com",
      isFavorite: false,
    },
  ];

  function addMeetup(event) {
    const {
      title,
      subtitle,
      description,
      email,
      imageUrl,
      address,
      isFavorite,
    } = event.detail;

    const newMeetup = {
      id: Math.random().toString(),
      title,
      subtitle,
      description,
      contactEmail: email,
      imageUrl,
      address,
      isFavorite,
    };

    meetups = [...meetups, newMeetup];
    editMode = null;
  }

  function toggleFavorite(event) {
    const id = event.detail;
    const updatedMeetup = { ...meetups.find((item) => item.id === id) };
    updatedMeetup.isFavorite = !updatedMeetup.isFavorite;

    const meetupIndex = meetups.findIndex((item) => item.id === id);
    const updatedMeetups = [...meetups];
    updatedMeetups[meetupIndex] = updatedMeetup;

    meetups = updatedMeetups;
  }

  function cancelEdit() {
    editMode = null;
  }
</script>

<style>
  main {
    margin-top: 5rem;
  }

  .meetup-controls {
    margin: 1rem;
  }
</style>

<Header />

<main>
  <div class="meetup-controls" />
  <Button on:click={() => (editMode = 'add')}>New Meetup</Button>
  {#if editMode === 'add'}
    <EditMeetup on:save={addMeetup} on:cancel={cancelEdit} />
  {/if}
  <MeetupGrid {meetups} on:toggle-favorite={toggleFavorite} />
</main>
