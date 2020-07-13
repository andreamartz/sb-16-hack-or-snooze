$(async function () {
  /******************************************
   * CACHED SELECTORS AND GLOBAL VARIABLES
   ******************************************/

  // cache some selectors we'll be using quite a bit
  const $nav = $("nav");
  const $storiesContainer = $(".stories-container");
  const $allStoriesList = $("#all-stories-list");
  const $favoritedStories = $("#favorited-stories");
  const $filteredStories = $("#filtered-stories");
  const $submitForm = $("#submit-form");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $userProfile = $("#user-profile");
  const $ownStories = $("#own-stories");
  const $navAll = $("#nav-all");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-my-stories");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");

  // global storyList variable (an (array of stories))
  // each story contains seven properties: author, createdAt, storyId, title, updatedAt, url, and username
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /************************************
   * EVENT HANDLERS FOR NAV LINKS
   ************************************/

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Clicking Logout
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event handler for clicking on "Hack or Snooze"
   */

  $nav.on("click", $navAll, async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * Event handler for clicking on username nav link
   */
  // $navUserProfile.on("click", function () {});

  /**
   * Event handler for clicking on submit
   * Displays the submit story form
   */
  $navSubmit.on("click", function () {
    if (currentUser) {
      hideElements();
      $allStoriesList.show();
      // display the submit story form
      $submitForm.slideToggle();
    }
  });

  /**
   * Event handler for clicking on favorites
   */
  $navFavorites.on("click", function () {
    // empty the stories list displayed
    hideElements();
    if (currentUser) {
      generateFavorites();
      $favoritedStories.show();
    }
  });

  /**
   * Event handler for clicking on my stories
   */
  $navMyStories.on("click", function () {
    hideElements();
    if (currentUser) {
      generateMyStories();
      $ownStories.show();
    }
  });

  /****************************************
   * EVENT HANDLERS FOR FORM SUBMISSIONS
   ****************************************/

  /**
   * Event handler for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the User.create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event handler for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event handler for submitting a story
   */
  $submitForm.on("submit", async function (evt) {
    // prevent page refresh
    evt.preventDefault();
    // get title, author, and url from the form & create newStory
    const title = $("#title").val();
    const author = $("#author").val();
    const url = $("#url").val();
    // get the hostname and username
    const hostname = getHostName(url);
    const username = currentUser.username;
    //
    let newStory = { title, author, url };
    // POST a new story to the api & save the returned story object
    newStory = await storyList.addStory(currentUser, newStory);
    // generate markup for the new story
    const storyMarkup = generateStoryHTML(newStory);
    $allStoriesList.prepend(storyMarkup);
    // hide form and reset it
    $submitForm.slideToggle();
    $submitForm.trigger("reset");
  });

  /**********************************************
   * OTHER EVENT HANDLERS
   **********************************************/

  /**
   * Event handler for clicking on star icon to favorite or unfavorite a story
   */
  $storiesContainer.on("click", ".fa-star", async function (evt) {
    const $target = $(evt.target);
    // get storyId for the clicked story
    const $storyId = $target.closest("li").attr("id");
    // story is a favorite; unfavorite it
    if ($target.hasClass("fas")) {
      await currentUser.removeFavorite($storyId);
      $target.removeClass("fas").addClass("far");

      // story is NOT a favorite; favorite it
    } else {
      await currentUser.addFavorite($storyId);
      $target.removeClass("far").addClass("fas");
    }
  });

  /**
   * Event handler for clicking on trash can icon to delete story
   */
  $storiesContainer.on("click", ".fa-trash-alt", async function (evt) {
    const $target = $(evt.target);
    console.log($target);
    // get storyId for the clicked story
    const $storyId = $target.closest("li").attr("id");
    console.log($storyId);
    // remove the story from the API
    await storyList.removeStory(currentUser, $storyId);
    // regenerate the story list
    await generateStories();
    // hide everything
    hideElements();
    // then show all stories
    $allStoriesList.show();
  });

  /**********************************************
   * RENDERING FUNCTIONS
   **********************************************/

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      generateUserProfile();
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    // get a user profile
    generateUserProfile();
  }

  /**
   * Build a user profile and render username in nav and user info in profile area
   */

  function generateUserProfile() {
    // Populate the user information in profile section
    $("#profile-name").append(`${currentUser.name}`);
    $("#profile-username").append(`${currentUser.username}`);
    $("#profile-account-date").append(`${currentUser.createdAt.slice(0, 10)}`);

    // Display user's name in nav welcome area
    $navUserProfile.append(`${currentUser.username}`);
  }

  /**
   * A rendering function to build the favorites list
   */
  function generateFavorites() {
    // empty out the list
    $favoritedStories.empty();
    //
    if (currentUser.favorites.length === 0) {
      $favoritedStories.append("<p>No favorites added!</p>");
    } else {
      for (let story of currentUser.favorites) {
        // render each story in the list
        const storyHTML = generateStoryHTML(story, false);
        $favoritedStories.append(storyHTML);
      }
    }
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
  function generateMyStories() {
    $ownStories.empty();
    // User has no stories
    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<p>No stories added by user yet!</p>");
      // User has stories
    } else {
      for (let story of currentUser.ownStories) {
        const storyHTML = generateStoryHTML(story, true);
        $ownStories.append(storyHTML);
      }
    }
  }

  /* Hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredStories,
      $ownStories,
      $userProfile,
      $favoritedStories,
      $loginForm,
      $createAccountForm,
    ];
    console.log("Hidden elementsArr ", elementsArr);
    elementsArr.forEach(($elem) => $elem.hide());
  }

  /* Show navigation links for a logged in user */

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $userProfile.hide();
    $("#main-nav-links, #user-profile").toggleClass("hidden");
    $navLogOut.show();
    $navWelcome.show();
  }

  /*************************************
   * HELPER FUNCTIONS
   *************************************/

  /**
   * A function to render HTML for an individual Story instance
   * - story: a story object
   * - displayTrashCan: a boolean argument
   */

  function generateStoryHTML(story, displayTrashCan) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far";

    // render a trash can when displayTrashCan is true
    let trashIcon = displayTrashCan
      ? `<span class="trash-can">
          <i class="fas fa-trash-alt"></i>
        </span>`
      : "";

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${trashIcon}
        <span>
          <i class="${starType} fa-star"></i>
        </span>
        <a class="story-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="story-author">by ${story.author}</small>
        <small class="story-hostname ${hostName}">(${hostName})</small>
        <small class="story-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /**
   * Determines whether a story is in the currentUser's favorites
   * Returns a boolean
   * - story: a story object
   */

  function isFavorite(story) {
    // start with an empty set of favorite story ids
    let favoriteStoryIds = new Set();

    if (currentUser) {
      favoriteStoryIds = new Set(
        currentUser.favorites.map((story) => story.storyId)
      );
    }
    isFave = favoriteStoryIds.has(story.storyId);
    // return true or false
    return isFave;
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }

  /*******************************
   * TEMPORARY CODE
   *******************************/

  console.log("currentUser: ", currentUser);
  console.log("storyList: ", storyList);
});
