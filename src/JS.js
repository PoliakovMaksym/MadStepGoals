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
const goalsListParser = inputString => {
  // Split the input goals string into individual reward sections
  const parsedInputString = inputString.match(/\[\d+\|[^[\]]+]/g);

  // Empty or unparseable string = no goals
  if (!parsedInputString) return [];

  // This will store the final list of goals that we can work with in the code
  const result = [];

  // Iterate over each parsed goal
  parsedInputString.forEach((section, index) => {
    // Parse the amount and description from the section
    const [, amountString, description] = section.match(/\[(\d+)\|(.+)]/);

    // Construct and add the goal object to the array
    result.push({
      id: index + 1,
      amount: parseInt(amountString),
      description: description.trim(),
    });
  });

  return result;
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
    // but just in case we set it again.
    WildToriClone.opacity = 0;

    // Get RootContainerElement dimensions to know where the clone can appear
    const { width, height } = GlobalVariables.RootContainerElement.getBoundingClientRect();

    // Set the random position
    WildToriClone.style.top = `${randomInteger(height)}px`;
    WildToriClone.style.left = `${randomInteger(width)}px`;

    // Shift the clone to be positioned around its center point
    // instead of the top left corner and set random rotation for fun.
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
//    gap between each goal is 10px. How many goals will be visible? After the calculation, the
//    answer is 9.3333333 or in other words, 9 fully visible and plus 1 not fully visible. The
//    widget users can calculate it themselves and adjust the height of the widget, so there will be
//    no "not fully visible" goal records at all, but why do it manually everytime?
// -------------------------------------------------------------------------------------------------
// The solution
// -------------------------------------------------------------------------------------------------
// We will use the gap between goals from the widget as a "minimum gap" and, if needed,
// increase it to make sure there are no "not fully visible" goals.
// -------------------------------------------------------------------------------------------------
const adjustTheGapBetweenGoals = () => {
  // Height of the list where the goals will be rendered
  const goalsListHeight = GlobalVariables.GoalsListElement.getBoundingClientRect().height;
  // Height of the goal and gap value from the widget fields
  const { goalRecordHeight, goalsListGap: minimumGap } = GlobalVariables.widgetFields;

  // Calculate how many fully visible goals can fit into the list
  const amountOfGoalsThatCanFit = Math.trunc(
    // Add a minimum gap to the list height, so we don't end up with an extra gap
    // after the last fully visible goal after all the calculations.
    // If this happens, the "spacing" on top of the list
    // will be visually smaller than on the bottom of the list.
    (goalsListHeight + minimumGap) / (goalRecordHeight + minimumGap),
  );

  // Calculate the "optimal" or "adjusted" gap, so we have zero "not fully visible" goals
  const optimalGap =
    (goalsListHeight - amountOfGoalsThatCanFit * goalRecordHeight) / (amountOfGoalsThatCanFit - 1);

  // Only overwrite the original gap with the adjusted one
  // if it is actually bigger and allowed by the widget user
  const finalGap =
    GlobalVariables.widgetFields.goalListGapAdjustment && optimalGap > minimumGap
      ? optimalGap
      : minimumGap;

  GlobalVariables.GoalsListElement.style.gap = `${finalGap}px`;

  // Store some calculated values for later use
  GlobalVariables.amountOfGoalsThatFitsInTheGoalsList = amountOfGoalsThatCanFit;
  GlobalVariables.goalsFinalGap = finalGap;
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
const updateRenderedGoals = (currentProgress, initialRenderUpdate) => {
  let goalInProgressPosition = 0;

  // Go through each goal that is not marked as "hidden" already.
  // Goals marked as "hidden" were completed some time ago and don't need to be handled.
  const allNotHiddenGoals = Array.from(document.querySelectorAll('.goal:not(.hidden)'));
  allNotHiddenGoals.forEach((goal, index) => {
    // Grab goal's amount
    const goalAmount = parseInt(goal.getAttribute('data-amount'));

    // Remove marks related to goal in progress.
    // The correct goal will be marked as "in progress" when we find it.
    goal.classList.remove('in-progress');
    goal.style.removeProperty('background');

    // The goal is completed
    if (goalAmount <= currentProgress) {
      // If the goal is not already marked as "completed," that means it was just completed.
      // In this case, we add a little animation unless this is a very first render update.
      if (!goal.classList.contains('completed') && !initialRenderUpdate) {
        goal.classList.add('animate');
      }

      // Mark goal as "completed"
      goal.classList.add('completed');
    }
    // The goal is not completed
    else {
      // We haven't found the first "in progress" goal yet
      if (!goalInProgressPosition) {
        // Save the position of the found goal that is currently in progress
        goalInProgressPosition = index + 1;

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

  // Right after all the animations, check if goals should be moved outside the page,
  // so the "in progress" goal stays somewhat in the middle of the list and always visible.
  setTimeout(
    () => {
      const { widgetFields, goalsFinalGap, amountOfGoalsThatFitsInTheGoalsList } = GlobalVariables;

      // Name shortcuts
      const animationDuration = widgetFields.goalListScrollAnimationDuration;
      const goalHeight = widgetFields.goalRecordHeight;

      // This should be a close enough position to the middle of the list
      const approximatePositionInTheMiddle = amountOfGoalsThatFitsInTheGoalsList / 2;

      // If the "in progress" goal exists, and it didn't pass the
      // approximate middle of the list, then we don't need to do anything.
      if (goalInProgressPosition && goalInProgressPosition < approximatePositionInTheMiddle) {
        return;
      }

      // Calculate how many goals we have to "hide".
      let numberOfGoalsToHide;

      // If "in progress" goal exists
      if (goalInProgressPosition) {
        numberOfGoalsToHide = Math.min(
          // This is the number of "extra" goals above
          Math.trunc(goalInProgressPosition - approximatePositionInTheMiddle),
          // This is the number of "future" goals in the list
          allNotHiddenGoals.length - amountOfGoalsThatFitsInTheGoalsList,
        );
      }
      // If all goals were completed
      else {
        numberOfGoalsToHide = allNotHiddenGoals.length - amountOfGoalsThatFitsInTheGoalsList;
      }

      // For each goal that we are going to "hide"
      for (let i = 0; i < numberOfGoalsToHide; i++) {
        if (!initialRenderUpdate) {
          // Add "scroll" animation if this is not the initial widget loading
          allNotHiddenGoals[i].style.transition =
            `margin-top ${animationDuration}s linear ${i * animationDuration}s`;
        }

        // Mark as "hidden" so we will skip it in the next updates
        allNotHiddenGoals[i].classList.add('hidden');
        // Move it outside the screen
        allNotHiddenGoals[i].style.marginTop = `-${goalHeight + goalsFinalGap}px`;
      }
    },
    // On the initial widget loading there no animations, so we don't need to wait for anything.
    // Otherwise, its 1.5s animation duration in CSS +0.5s just in case.
    initialRenderUpdate ? 0 : 1000 * 2,
  );
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
  // StreamElements widget builder has an ENORMOUS amount of trash in the console...
  console.clear();

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
  adjustTheGapBetweenGoals();

  // Render all the goals on the screen
  renderGoals();

  // Get current progress from the stream session and update goals accordingly
  const progress = widgetLoadEventObject.detail.session.data[goalMainType][goalSubType];

  GlobalVariables.currentProgress = progress;
  updateRenderedGoals(progress, !GlobalVariables.widgetFields.goalListScrollAnimationTest);

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
