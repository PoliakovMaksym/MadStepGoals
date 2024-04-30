// General widget events documentation link:
// https://dev.streamelements.com/docs/widgets/6707a030af0b9-custom-widget-events

// Different "global" variables will be stored in this object
// and used across different functions within this file.
const GlobalVariables = {};

// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------

/**
 * Util functions ----- Start
 */

// Returns a random number between 0 and provided max value
const randomInteger = max => Math.floor(Math.random() * (max + 1));

// Converts this string pattern -> "[amount1|description1][amount2|description2]"
// into this array -> [{id:1,amount:amount1,description:description1},{id:2,amount:amount2,description:description2}]
const goalsListParser = goalsString => {
  // Split the input goals string into individual reward sections
  const rewardSections = goalsString.match(/\[\d+\|[^[\]]+]/g);

  // Empty or unparseable string = no goals
  if (!rewardSections) return [];

  // Define an array to store the parsed rewards
  const rewardsArray = [];

  // Iterate over each reward section
  rewardSections.forEach((section, index) => {
    // Parse the amount and description from the section
    const [, amountString, description] = section.match(/\[(\d+)\|(.+)]/);

    // Construct the reward object
    const reward = {
      id: index + 1,
      amount: parseInt(amountString),
      description: description.trim(),
    };

    // Add the reward object to the array
    rewardsArray.push(reward);
  });

  return rewardsArray;
};

/**
 * Util functions ----- End
 */

// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------

/**
 * The Wild Tori ----- Start
 */

// Releases the Wild Tori handler
function releaseTheWildTori() {
  if (GlobalVariables.WildTori) {
    // Create a clone of the Wild Tori
    const WildToriClone = GlobalVariables.WildTori.cloneNode(true);

    // Clear the clone id to not conflict with the original Wild Tori
    WildToriClone.id = '';

    // The clone will inherit the full transparency from the original Wild Tori,
    // but just in case we set it again
    WildToriClone.opacity = 0;

    // Get RootContainerElement dimensions to know where the clone can appear
    const { width, height } = GlobalVariables.RootContainerElement.getBoundingClientRect();

    // Set the random position
    WildToriClone.style.top = `${randomInteger(height)}px`;
    WildToriClone.style.left = `${randomInteger(width)}px`;

    // Shift the clone to be positioned around its center point
    // instead of the top left corner and set random rotation for fun
    WildToriClone.style.transform = `translate(-50%, -50%) rotate(${randomInteger(360)}deg)`;

    // Add the clone to the page
    GlobalVariables.RootContainerElement.appendChild(WildToriClone);

    // Start the animation
    WildToriClone.classList.add('animate');

    // Remove the clone from the page after the animation is done.
    //    5 seconds is the animation duration in CSS
    //    + 1 second just in case
    this.setTimeout(WildToriClone.remove, 1000 * (5 + 1));
  }
}

// React on the chat message with Wild Tori release
const releaseTheWildToriOnChatMessage = chatMessage => {
  // Check if the message contains the target emote
  const isTargetEmotePresentInTheMessage = Boolean(
    chatMessage.emotes.find(
      ({ name, id }) =>
        // just in case test not only by emote name, but also by emote ID
        name === 'torine1Smug' && id === 'emotesv2_ed080e8bc77c431d83dd5e9b6dd6742d',
    ),
  );

  // Release the Wild Tori if the message contains the target emote
  if (isTargetEmotePresentInTheMessage) releaseTheWildTori();
};

/**
 * The Wild Tori ----- End
 */

// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------

/**
 * Goals renderer ----- Start
 */

// -------------------------------------------------------------------------------------------------
// The problem
// -------------------------------------------------------------------------------------------------
// Example:
//    You have 20 goals total. Each goal has a height of 50px. The list has a height of 550px. The
//    gap between goal records is 10px. How many goal records will be visible? After the
//    calculation, the answer is 9.3333333 or in other words, 9 fully visible and +1 not fully
//    visible. Yes, the widget user can calculate it and adjust the height of the widget, so there
// will be no "not fully visible" goal records at all, but why?
// -------------------------------------------------------------------------------------------------
// The solution
// -------------------------------------------------------------------------------------------------
// We will use the gap between goal records from the widget as a "minimum gap" and increase to make
// sure there are no "not fully visible" goal records.
// -------------------------------------------------------------------------------------------------
const adjustTheGapBetweenGoalRecords = () => {
  // Height of the list where the goals will be rendered
  const goalsListHeight = GlobalVariables.GoalsListElement.getBoundingClientRect().height;
  // Height of the goal record and gap value from the widget fields
  const { goalRecordHeight, goalsListGap: minimumGap } = GlobalVariables.widgetFields;

  // Calculate how many fully visible goals can fit into the list
  const amountOfGoalsThatCanFit = Math.trunc(
    // Add a minimum gap to the list height, so we don't end up with an extra gap
    // after the last fully visible goal record after all the calculations.
    // If this happens, the "spacing" on top of the list
    // will be visually smaller than on the bottom of the list.
    (goalsListHeight + minimumGap) / (goalRecordHeight + minimumGap),
  );

  // Store this amount for later use
  GlobalVariables.amountOfGoalsThatFitsInTheGoalsList = amountOfGoalsThatCanFit;

  // Calculate the "optimal" or "adjusted" gap, so we have zero "not fully visible" goals
  const optimalGap =
    (goalsListHeight - amountOfGoalsThatCanFit * goalRecordHeight) / (amountOfGoalsThatCanFit - 1);

  // Only overwrite the original gap with the adjusted one if it is actually bigger
  if (optimalGap > minimumGap) {
    GlobalVariables.GoalsListElement.style.gap = `${optimalGap}px`;
  }
};

// Parse goals information from the widget and render the
// initial list of goals without any special effects
const renderGoals = () => {
  const { goalsList, widgetFields, GoalsListElement } = GlobalVariables;

  goalsList.forEach(goal => {
    // Create goal element
    const goalElement = document.createElement('div');

    // Configure created goal element
    goalElement.id = `goal-${goal.id}`;
    goalElement.className = 'goal';
    goalElement.dataset.amount = goal.amount;

    goalElement.innerHTML = `
        <span class="goal-amount">${goal.amount}</span>
        <span class="goal-type-label">${widgetFields.goalTypeLabel}</span>
        <span class="goal-reward-description">${goal.description}</span>
        <span class="progress"></span>
    `;

    if (widgetFields.goalStatusIcon) {
      goalElement.innerHTML += `<img class="completed-icon" src="${widgetFields.goalStatusIcon}">`;
    }

    // Add a created goal element to the list of goals
    GoalsListElement.appendChild(goalElement);
  });
};

// Update the state of all the goals on the screen
// according to the current state of the stream
const updateRenderedGoals = currentProgress => {
  let currentGoalInProgressFound = false;

  // Go through each goal
  Array.from(document.getElementsByClassName('goal')).forEach(goal => {
    // Grab goal's amount
    const goalAmount = parseInt(goal.getAttribute('data-amount'));

    // Remove marks related to goals in progress.
    // The correct goal will be marked as "in progress" when we find it.
    goal.classList.remove('in-progress');
    goal.style.removeProperty('background');

    // The goal is completed
    if (goalAmount <= currentProgress) {
      // If the goal is not already marked as "completed," that means it was just completed.
      // In this case, we add a little animation for a short period of time.
      if (!goal.classList.contains('completed')) {
        goal.classList.add('animate');
        setTimeout(() => goal.classList.remove('animate'), 1000 * 2);
      }

      // Mark goal as "completed"
      goal.classList.add('completed');
    }
    // The goal is not completed
    else {
      // Just in case, remove marks related to completed goals
      goal.classList.remove('completed');
      goal.classList.remove('goal-complete-animation');

      // We haven't found the first "in progress" goal yet
      if (!currentGoalInProgressFound) {
        // Save the fact that we found the goal that is currently in progress
        currentGoalInProgressFound = true;

        const { widgetFields } = GlobalVariables;

        // Mark goal as "in progress"
        goal.classList.remove('completed');
        goal.classList.add('in-progress');
        goal.style.background = `linear-gradient(to right, ${widgetFields.goalRecordInProgressBackgroundColor} ${(100 * currentProgress) / goalAmount}%, ${widgetFields.goalRecordBackgroundColor} 0px)`;

        // Display current progress in the "in progress" goal
        goal.getElementsByClassName('progress')[0].innerHTML = `${currentProgress}/${goalAmount}`;
      }
    }
  });
};

/**
 * Goals renderer ----- End
 */

// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------

/**
 * StreamElements events handlers ----- Start
 */

// Do something when the widget is first loaded.
// Docs: https://dev.streamelements.com/docs/widgets/6707a030af0b9-custom-widget-events#on-widget-load
window.addEventListener('onWidgetLoad', widgetLoadEventObject => {
  // Find important elements on the page and store them for later use
  GlobalVariables.RootContainerElement = document.querySelector('#root');
  GlobalVariables.GoalsListElement = document.querySelector('#goals-list');
  GlobalVariables.WildTori = document.querySelector('#wild-tori');

  // Copy widget fields for later use
  GlobalVariables.widgetFields = widgetLoadEventObject.detail.fieldData;
  // Add some custom shortcuts to certain widget fields
  const [goalMainType, goalSubType] = GlobalVariables.widgetFields.goalType.split('---');
  GlobalVariables.goalMainType = goalMainType;
  GlobalVariables.goalSubType = goalSubType;

  // Parse the goal list to something we can work with in code
  GlobalVariables.goalsList = goalsListParser(GlobalVariables.widgetFields.goalsList);

  // Prepare the goal list CSS so rendered goals look prettier
  adjustTheGapBetweenGoalRecords();

  // Render all the goals on the screen
  renderGoals();

  // Get current progress from the stream session and update goals accordingly
  const progress = widgetLoadEventObject.detail.session.data[goalMainType][goalSubType];

  GlobalVariables.currentProgress = progress;
  updateRenderedGoals(progress);

  // Automatically release the Wild Tori every 30 minutes
  setInterval(releaseTheWildTori, 1000 * 60 * 30);
});

// Do something when the widget receives the event (follower, sub, host, tip, raid, message, etc.).
// Docs: https://dev.streamelements.com/docs/widgets/6707a030af0b9-custom-widget-events#on-event
window.addEventListener('onEventReceived', eventReceivedEventObject => {
  // On message in the chat
  if (eventReceivedEventObject.detail.listener === 'message') {
    // Grab the message data
    const chatMessage = eventReceivedEventObject.detail.event.data;

    releaseTheWildToriOnChatMessage(chatMessage);
  }
});

// Do something when stream session data is updated (new tip/cheer/follower).
// Docs: https://dev.streamelements.com/docs/widgets/6707a030af0b9-custom-widget-events#on-session-update
window.addEventListener('onSessionUpdate', sessionUpdateEventObject => {
  // Get updated progress from the stream session and update goals accordingly
  const { goalMainType, goalSubType } = GlobalVariables;
  const newProgress = sessionUpdateEventObject.detail.session[goalMainType][goalSubType];

  // Update goals only if progress was actually changed
  if (GlobalVariables.currentProgress !== newProgress) {
    GlobalVariables.currentProgress = newProgress;
    updateRenderedGoals(newProgress);
  }
});

/**
 * StreamElements events handlers ----- End
 */
