// Comprehensive muscle groups with subgroups
export const MUSCLE_GROUPS = {
  'Chest': [
    'Upper Chest',
    'Mid Chest',
    'Lower Chest',
    'Inner Chest',
    'Outer Chest'
  ],
  'Back': [
    'Lats',
    'Upper Back',
    'Lower Back',
    'Rhomboids',
    'Traps',
    'Teres Major',
    'Teres Minor'
  ],
  'Shoulders': [
    'Front Delt',
    'Side Delt',
    'Rear Delt',
    'Rotator Cuff'
  ],
  'Arms': [
    'Biceps',
    'Triceps',
    'Brachialis',
    'Brachioradialis',
    'Forearms'
  ],
  'Legs': [
    'Quads',
    'Hamstrings',
    'Glutes',
    'Hip Flexors',
    'Hip Adductors',
    'Hip Abductors'
  ],
  'Calves': [
    'Gastrocnemius',
    'Soleus'
  ],
  'Core': [
    'Abs',
    'Obliques',
    'Transverse Abdominis',
    'Serratus Anterior',
    'Lower Abs',
    'Upper Abs'
  ],
  'Neck': [
    'Neck Flexors',
    'Neck Extensors',
    'Sternocleidomastoid'
  ]
}

// Flatten muscle groups into a single array with category prefixes
export const getFlatMuscleGroups = () => {
  const flat = []
  Object.entries(MUSCLE_GROUPS).forEach(([category, subgroups]) => {
    // Add main category
    flat.push(category)
    // Add subgroups with category prefix for display
    subgroups.forEach(subgroup => {
      flat.push(`${category} - ${subgroup}`)
    })
  })
  return flat
}

// Get all muscle groups as options for autocomplete
export const getMuscleGroupOptions = () => {
  const options = []
  Object.entries(MUSCLE_GROUPS).forEach(([category, subgroups]) => {
    options.push({
      label: category,
      value: category,
      category: 'Main Groups',
      isCategory: true
    })
    subgroups.forEach(subgroup => {
      options.push({
        label: `${category} - ${subgroup}`,
        value: `${category} - ${subgroup}`,
        category: category,
        isCategory: false
      })
    })
  })
  // Sort by category to prevent duplicated headers
  return options.sort((a, b) => {
    if (a.category === b.category) {
      return a.label.localeCompare(b.label)
    }
    return a.category.localeCompare(b.category)
  })
}
