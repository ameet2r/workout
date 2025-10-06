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
  IconButton
} from '@mui/material'
import { Add, Edit } from '@mui/icons-material'
import { authenticatedGet, authenticatedPost, authenticatedPatch } from '../utils/api'
import { getMuscleGroupOptions } from '../data/muscleGroups'

const CATEGORIES = ['strength', 'cardio', 'flexibility', 'sports']

const ExerciseLibraryPage = () => {
  const [open, setOpen] = useState(false)
  const [exercises, setExercises] = useState([])
  const [editingExercise, setEditingExercise] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    muscle_groups: [],
    equipment: '',
    category: 'strength',
    description: ''
  })

  useEffect(() => {
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    try {
      const data = await authenticatedGet('/api/exercises')
      setExercises(data)
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }

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
      // Normalize muscle_groups to array of strings
      const normalizedData = {
        ...formData,
        muscle_groups: formData.muscle_groups.map(mg =>
          typeof mg === 'string' ? mg : mg.value
        )
      }

      if (editingExercise) {
        await authenticatedPatch(`/api/exercises/${editingExercise.id}`, normalizedData)
      } else {
        await authenticatedPost('/api/exercises', normalizedData)
      }

      handleClose()
      fetchExercises()
    } catch (error) {
      console.error('Error saving exercise:', error)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Exercise Library</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>
          Add Exercise
        </Button>
      </Box>

      {exercises.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No exercises in your library yet. Add exercises to get started!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {exercises.map((exercise) => (
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
