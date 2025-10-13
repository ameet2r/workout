import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Card,
  CardContent,
  Autocomplete,
  IconButton,
  InputAdornment,
  CircularProgress
} from '@mui/material'
import { Add, Edit, Search } from '@mui/icons-material'
import { authenticatedGet, authenticatedPost, authenticatedPatch } from '../utils/api'
import { useExercises } from '../contexts/ExerciseContext'
import { getMuscleGroupOptions } from '../data/muscleGroups'
import { suggestMuscleGroups } from '../utils/exerciseMuscleMapping'

const CATEGORIES = ['strength', 'cardio', 'flexibility', 'sports']

const ExerciseLibraryPage = () => {
  const { exercises, refreshExercises, loading } = useExercises()
  const [open, setOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    muscle_groups: [],
    equipment: '',
    category: 'strength',
    description: ''
  })

  // Auto-suggest muscle groups when exercise name changes (only for new exercises)
  useEffect(() => {
    if (!editingExercise && formData.name && formData.muscle_groups.length === 0) {
      const suggested = suggestMuscleGroups(formData.name)
      if (suggested.length > 0) {
        setFormData(prev => ({ ...prev, muscle_groups: suggested }))
      }
    }
  }, [formData.name, editingExercise])

  const handleOpen = () => setOpen(true)
  const handleClose = () => {
    setOpen(false)
    setEditingExercise(null)
    setFormData({
      name: '',
      muscle_groups: [],
      equipment: '',
      category: 'strength',
      description: ''
    })
  }

  const handleEdit = (exercise, event) => {
    // Remove focus from the button to prevent aria-hidden warning
    if (event?.currentTarget) {
      event.currentTarget.blur()
    }
    setEditingExercise(exercise)
    setFormData({
      name: exercise.name,
      muscle_groups: exercise.muscle_groups,
      equipment: exercise.equipment || '',
      category: exercise.category,
      description: exercise.description || ''
    })
    setOpen(true)
  }

  const handleSubmit = async () => {
    try {
      // Normalize and trim all text fields
      const normalizedData = {
        ...formData,
        name: formData.name.trim(),
        equipment: formData.equipment ? formData.equipment.trim() : '',
        description: formData.description ? formData.description.trim() : '',
        muscle_groups: formData.muscle_groups.map(mg =>
          typeof mg === 'string' ? mg.trim() : mg.value.trim()
        ).filter(mg => mg.length > 0) // Remove empty strings after trim
      }

      if (editingExercise) {
        await authenticatedPatch(`/api/exercises/${editingExercise.id}`, normalizedData)
      } else {
        await authenticatedPost('/api/exercises', normalizedData)
      }

      handleClose()
      await refreshExercises()
    } catch (error) {
      console.error('Error saving exercise:', error)
    }
  }

  // Filter exercises based on search query
  const filteredExercises = exercises.filter((exercise) => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    const nameMatch = exercise.name.toLowerCase().includes(query)
    const muscleMatch = exercise.muscle_groups.some(mg => mg.toLowerCase().includes(query))
    const equipmentMatch = exercise.equipment?.toLowerCase().includes(query)
    const descriptionMatch = exercise.description?.toLowerCase().includes(query)

    return nameMatch || muscleMatch || equipmentMatch || descriptionMatch
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Exercise Library</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>
          Add Exercise
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search exercises by name, muscle group, equipment, or description..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          )
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <CircularProgress />
        </Box>
      ) : exercises.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No exercises in your library yet. Add exercises to get started!
          </Typography>
        </Paper>
      ) : filteredExercises.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No exercises match your search criteria.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredExercises.map((exercise) => (
            <Grid item xs={12} sm={6} md={4} key={exercise.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6">
                      {exercise.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleEdit(exercise, e)}
                      sx={{ mt: -1, mr: -1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Category: {exercise.category}
                  </Typography>
                  {exercise.equipment && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Equipment: {exercise.equipment}
                    </Typography>
                  )}
                  {exercise.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                      {exercise.description}
                    </Typography>
                  )}
                  {exercise.muscle_groups.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {exercise.muscle_groups.map((group) => (
                        <Chip
                          key={group}
                          label={group}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingExercise ? 'Edit Exercise' : 'Add New Exercise'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Exercise Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              label="Category"
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            multiple
            freeSolo
            options={getMuscleGroupOptions()}
            value={formData.muscle_groups}
            onChange={(_, newValue) => {
              setFormData({ ...formData, muscle_groups: newValue })
            }}
            getOptionLabel={(option) => {
              if (typeof option === 'string') return option
              return option.label || option.value
            }}
            groupBy={(option) => {
              if (typeof option === 'string') return 'Custom'
              return option.category
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Muscle Groups"
                placeholder="Select or type to add custom"
                helperText="Select from list or type your own"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const label = typeof option === 'string' ? option : option.label || option.value
                const { key, ...tagProps } = getTagProps({ index })
                return (
                  <Chip
                    key={key}
                    label={label}
                    {...tagProps}
                    size="small"
                  />
                )
              })
            }
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Equipment (optional)"
            fullWidth
            value={formData.equipment}
            onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name}>
            {editingExercise ? 'Save Changes' : 'Add Exercise'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ExerciseLibraryPage
