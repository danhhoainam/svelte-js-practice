<script>
  import CustomInput from "./CustomInput.svelte";
  import Toggle from "./Toggle.svelte";
  import { isValidEmail } from "./validation";

  let val = "";
  let selectedOption;
  let price = 0;
  let agreed;
  let favColor;
  let gradeType = [];
  let singleFavColor = "red";
  let username = "";
  let customInput;
  let enteredEmail = "";
  let formIsValid = false;

  $: if (isValidEmail(enteredEmail)) {
    formIsValid = true;
  } else {
    formIsValid = false;
  }

  $: console.log(val);
  $: console.log(selectedOption);
  $: console.log(price);
  $: console.log(agreed);
  $: console.log(favColor);
  $: console.log(gradeType);
  $: console.log(singleFavColor);
  $: console.log(customInput);

  function setValue(event) {
    val = event.target.value;
  }

  function saveDate(event) {
    // console.log(document.querySelector("#username").value);
    console.log(username.value);
    customInput.empty();
  }
</script>

<style>
  .invalid {
    border: 1px solid red;
  }
</style>

<!-- <input type="text" value={val} on:input={setValue} /> -->
<CustomInput bind:val bind:this={customInput} />
<Toggle bind:chosenOption={selectedOption} />
<input type="number" bind:value={price} />

<label>
  <input type="checkbox" bind:checked={agreed} />
  Agree?
</label>

<hr />

<label>
  <input type="radio" name="color" value="red" bind:group={favColor} />
  Red
</label>
<label>
  <input type="radio" name="color" value="green" bind:group={favColor} />
  Green
</label>
<label>
  <input type="radio" name="color" value="blue" bind:group={favColor} />
  Blue
</label>

<hr />

<label>
  <input type="checkbox" name="grade" value="good" bind:group={gradeType} />
  Good
</label>
<label>
  <input type="checkbox" name="grade" value="bad" bind:group={gradeType} />
  Bad
</label>
<label>
  <input type="checkbox" name="grade" value="average" bind:group={gradeType} />
  Average
</label>

<hr />

<select bind:value={singleFavColor}>
  <option value="green">Green</option>
  <option value="red">Red</option>
  <option value="blue">Blue</option>
</select>

<hr />

<input type="text" id="username" bind:this={username} />
<button on:click={saveDate}>Save</button>

<hr />

<form on:submit|preventDefault>
  <input
    type="email"
    bind:value={enteredEmail}
    class={isValidEmail(enteredEmail) ? '' : 'invalid'} />
  <button type="submit" disabled={!formIsValid}>Save</button>
</form>
