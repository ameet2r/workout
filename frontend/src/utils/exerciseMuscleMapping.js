// Mapping of exercise keywords to their primary muscle groups
// Used for auto-suggesting muscle groups when creating exercises

const EXERCISE_MUSCLE_MAPPING = {
  // Chest exercises
  'bench press': ['Chest', 'Chest - Mid Chest', 'Arms - Triceps', 'Shoulders - Front Delt'],
  'incline bench': ['Chest', 'Chest - Upper Chest', 'Arms - Triceps', 'Shoulders - Front Delt'],
  'decline bench': ['Chest', 'Chest - Lower Chest', 'Arms - Triceps', 'Shoulders - Front Delt'],
  'chest press': ['Chest', 'Chest - Mid Chest', 'Arms - Triceps', 'Shoulders - Front Delt'],
  'push up': ['Chest', 'Chest - Mid Chest', 'Arms - Triceps', 'Core'],
  'dip': ['Chest', 'Chest - Lower Chest', 'Arms - Triceps'],
  'fly': ['Chest', 'Chest - Mid Chest'],
  'pec deck': ['Chest', 'Chest - Inner Chest'],
  'cable crossover': ['Chest', 'Chest - Inner Chest'],

  // Back exercises
  'deadlift': ['Legs - Hamstrings', 'Legs - Glutes', 'Back - Lower Back', 'Back - Lats', 'Back - Traps'],
  'pull up': ['Back - Lats', 'Back', 'Arms - Biceps', 'Back - Teres Major'],
  'chin up': ['Back - Lats', 'Back', 'Arms - Biceps'],
  'lat pulldown': ['Back - Lats', 'Back', 'Arms - Biceps'],
  'row': ['Back - Lats', 'Back - Upper Back', 'Back - Rhomboids', 'Arms - Biceps'],
  'barbell row': ['Back - Lats', 'Back - Upper Back', 'Back - Rhomboids', 'Arms - Biceps'],
  'dumbbell row': ['Back - Lats', 'Back - Upper Back', 'Back - Rhomboids', 'Arms - Biceps'],
  't-bar row': ['Back - Lats', 'Back - Upper Back', 'Back - Rhomboids'],
  'cable row': ['Back - Lats', 'Back - Upper Back', 'Back - Rhomboids', 'Arms - Biceps'],
  'face pull': ['Back - Rear Delt', 'Back - Upper Back', 'Shoulders - Rotator Cuff'],
  'shrug': ['Back - Traps'],
  'hyperextension': ['Back - Lower Back', 'Legs - Glutes', 'Legs - Hamstrings'],

  // Shoulder exercises
  'overhead press': ['Shoulders', 'Shoulders - Front Delt', 'Shoulders - Side Delt', 'Arms - Triceps'],
  'shoulder press': ['Shoulders', 'Shoulders - Front Delt', 'Shoulders - Side Delt', 'Arms - Triceps'],
  'military press': ['Shoulders', 'Shoulders - Front Delt', 'Shoulders - Side Delt', 'Arms - Triceps'],
  'lateral raise': ['Shoulders', 'Shoulders - Side Delt'],
  'front raise': ['Shoulders', 'Shoulders - Front Delt'],
  'rear delt': ['Shoulders', 'Shoulders - Rear Delt'],
  'arnold press': ['Shoulders', 'Shoulders - Front Delt', 'Shoulders - Side Delt'],
  'upright row': ['Shoulders', 'Shoulders - Side Delt', 'Back - Traps'],

  // Leg exercises
  'squat': ['Legs - Quads', 'Legs - Glutes', 'Legs - Hamstrings', 'Core'],
  'front squat': ['Legs - Quads', 'Legs - Glutes', 'Core'],
  'back squat': ['Legs - Quads', 'Legs - Glutes', 'Legs - Hamstrings'],
  'leg press': ['Legs - Quads', 'Legs - Glutes', 'Legs - Hamstrings'],
  'leg extension': ['Legs - Quads'],
  'leg curl': ['Legs - Hamstrings'],
  'lunge': ['Legs - Quads', 'Legs - Glutes', 'Legs - Hamstrings'],
  'bulgarian split squat': ['Legs - Quads', 'Legs - Glutes', 'Legs - Hamstrings'],
  'hip thrust': ['Legs - Glutes', 'Legs - Hamstrings'],
  'glute bridge': ['Legs - Glutes', 'Legs - Hamstrings'],
  'rdl': ['Legs - Hamstrings', 'Legs - Glutes', 'Back - Lower Back'],
  'romanian deadlift': ['Legs - Hamstrings', 'Legs - Glutes', 'Back - Lower Back'],
  'stiff leg deadlift': ['Legs - Hamstrings', 'Legs - Glutes', 'Back - Lower Back'],
  'good morning': ['Legs - Hamstrings', 'Legs - Glutes', 'Back - Lower Back'],
  'calf raise': ['Calves', 'Calves - Gastrocnemius'],
  'seated calf raise': ['Calves', 'Calves - Soleus'],

  // Arm exercises
  'curl': ['Arms - Biceps'],
  'bicep curl': ['Arms - Biceps'],
  'hammer curl': ['Arms - Biceps', 'Arms - Brachialis', 'Arms - Brachioradialis'],
  'preacher curl': ['Arms - Biceps'],
  'concentration curl': ['Arms - Biceps'],
  'tricep extension': ['Arms - Triceps'],
  'tricep pushdown': ['Arms - Triceps'],
  'skull crusher': ['Arms - Triceps'],
  'close grip bench': ['Arms - Triceps', 'Chest'],
  'wrist curl': ['Arms - Forearms'],

  // Core exercises
  'crunch': ['Core - Abs', 'Core - Upper Abs'],
  'sit up': ['Core - Abs', 'Core - Hip Flexors'],
  'plank': ['Core', 'Core - Transverse Abdominis', 'Core - Abs'],
  'ab wheel': ['Core - Abs', 'Core - Transverse Abdominis'],
  'hanging leg raise': ['Core - Abs', 'Core - Lower Abs', 'Legs - Hip Flexors'],
  'leg raise': ['Core - Abs', 'Core - Lower Abs', 'Legs - Hip Flexors'],
  'russian twist': ['Core - Obliques', 'Core - Abs'],
  'side plank': ['Core - Obliques', 'Core - Transverse Abdominis'],
  'cable crunch': ['Core - Abs'],
  'wood chop': ['Core - Obliques', 'Core - Abs'],

  // Olympic lifts
  'clean': ['Legs - Quads', 'Legs - Glutes', 'Back - Traps', 'Shoulders', 'Back - Lower Back'],
  'snatch': ['Legs - Quads', 'Legs - Glutes', 'Back - Traps', 'Shoulders', 'Back - Lower Back'],
  'power clean': ['Legs - Quads', 'Legs - Glutes', 'Back - Traps', 'Shoulders', 'Back - Lower Back'],
  'hang clean': ['Legs - Hamstrings', 'Legs - Glutes', 'Back - Traps', 'Shoulders'],

  // Additional exercises
  'lat pull': ['Back - Lats', 'Back', 'Arms - Biceps'],
  'pulldown': ['Back - Lats', 'Back', 'Arms - Biceps'],
  'farmer': ['Arms - Forearms', 'Back - Traps', 'Core', 'Legs - Glutes'],
  'farmers walk': ['Arms - Forearms', 'Back - Traps', 'Core', 'Legs - Glutes'],
  'incline press': ['Chest', 'Chest - Upper Chest', 'Arms - Triceps', 'Shoulders - Front Delt'],
  'bridge': ['Legs - Glutes', 'Legs - Hamstrings', 'Back - Lower Back'],
  'birddog': ['Core', 'Back - Lower Back', 'Legs - Glutes'],
  'bird dog': ['Core', 'Back - Lower Back', 'Legs - Glutes'],
  'ghd': ['Core - Abs', 'Legs - Hip Flexors'],
  'tibialis': ['Legs', 'Calves'],
  'vacuum': ['Core', 'Core - Transverse Abdominis'],
  'neck': ['Neck'],
}

/**
 * Suggests muscle groups based on exercise name
 * @param {string} exerciseName - The name of the exercise
 * @returns {string[]} Array of suggested muscle group strings
 */
export const suggestMuscleGroups = (exerciseName) => {
  if (!exerciseName) return []

  const nameLower = exerciseName.toLowerCase().trim()

  // Check for exact or partial matches
  for (const [keyword, muscles] of Object.entries(EXERCISE_MUSCLE_MAPPING)) {
    if (nameLower.includes(keyword)) {
      return muscles
    }
  }

  // If no match found, return empty array
  return []
}

/**
 * Updates the exercise muscle mapping with a new exercise and its muscle groups
 * This can be used to learn from user inputs over time
 * @param {string} exerciseName - The name of the exercise
 * @param {string[]} muscleGroups - The muscle groups for this exercise
 */
export const addToMapping = (exerciseName, muscleGroups) => {
  if (!exerciseName || !muscleGroups || muscleGroups.length === 0) return

  const nameLower = exerciseName.toLowerCase().trim()

  // Only add if it doesn't already exist
  if (!EXERCISE_MUSCLE_MAPPING[nameLower]) {
    EXERCISE_MUSCLE_MAPPING[nameLower] = muscleGroups
  }
}

export default { suggestMuscleGroups, addToMapping }
