import { useState } from 'react'
import { Box, Typography, TextField, Grid, Chip, Button, IconButton, Checkbox, FormControlLabel, FormControl, InputLabel, Select, MenuItem, Paper, Accordion, AccordionSummary, AccordionDetails, Tooltip } from '@mui/material'
import { Delete, ArrowUpward, ArrowDownward, ExpandMore, Info } from '@mui/icons-material'

const ExerciseEditCard = ({
  exercise,
  index,
  totalExercises,
  exerciseName,
  exerciseDescription,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  history,
  disabled = false
}) => {
  const [timerHours, setTimerHours] = useState('')
  const [timerMinutes, setTimerMinutes] = useState('')
  const [timerSeconds, setTimerSeconds] = useState('')
  const [timerType, setTimerType] = useState('per_set')

  const handleFieldChange = (field, value) => {
    onUpdate(index, field, value)
  }

  const handleAddTimer = () => {
    const hours = parseInt(timerHours) || 0
    const minutes = parseInt(timerMinutes) || 0
    const seconds = parseInt(timerSeconds) || 0
    const totalSeconds = hours * 3600 + minutes * 60 + seconds

    if (totalSeconds > 0) {
      const newTimers = [...(exercise.timers || []), {
        duration: totalSeconds,
        type: timerType
      }]
      handleFieldChange('timers', newTimers)
      setTimerHours('')
      setTimerMinutes('')
      setTimerSeconds('')
      setTimerType('per_set')
    }
  }

  const handleRemoveTimer = (timerIndex) => {
    const newTimers = exercise.timers.filter((_, i) => i !== timerIndex)
    handleFieldChange('timers', newTimers)
  }

  const formatTimerDisplay = (duration, type) => {
    if (!duration) return ''
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = duration % 60

    let timeStr = ''
    if (hours > 0) timeStr += `${hours}h`
    if (minutes > 0) timeStr += `${timeStr ? ' ' : ''}${minutes}m`
    if (seconds > 0 || !timeStr) timeStr += `${timeStr ? ' ' : ''}${seconds}s`

    return type === 'total' ? `${timeStr} total` : `${timeStr} per set`
  }

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
      {/* Header with exercise name and actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">
            {index + 1}. {exerciseName}
          </Typography>
          {exerciseDescription && (
            <Tooltip title={exerciseDescription}>
              <Info fontSize="small" color="action" />
            </Tooltip>
          )}
        </Box>
        <Box>
          <IconButton
            onClick={() => onMoveUp(index)}
            disabled={disabled || index === 0}
            size="small"
          >
            <ArrowUpward />
          </IconButton>
          <IconButton
            onClick={() => onMoveDown(index)}
            disabled={disabled || index === totalExercises - 1}
            size="small"
          >
            <ArrowDownward />
          </IconButton>
          <IconButton
            onClick={() => onRemove(index)}
            disabled={disabled}
            size="small"
            color="error"
          >
            <Delete />
          </IconButton>
        </Box>
      </Box>

      {/* Main editing fields */}
      <Grid container spacing={2}>
        <Grid item xs={4} sm={3}>
          <TextField
            size="small"
            label="Sets"
            type="number"
            fullWidth
            value={exercise.planned_sets || ''}
            onChange={(e) => handleFieldChange('planned_sets', e.target.value ? parseInt(e.target.value) : null)}
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={4} sm={3}>
          <TextField
            size="small"
            label="Reps"
            fullWidth
            value={exercise.planned_reps || ''}
            onChange={(e) => handleFieldChange('planned_reps', e.target.value || null)}
            placeholder="e.g. 8-12"
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={4} sm={3}>
          <TextField
            size="small"
            label="Weight"
            type="number"
            fullWidth
            value={exercise.planned_weight || ''}
            onChange={(e) => handleFieldChange('planned_weight', e.target.value ? parseFloat(e.target.value) : null)}
            disabled={disabled || exercise.is_bodyweight}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={exercise.is_bodyweight || false}
                onChange={(e) => {
                  handleFieldChange('is_bodyweight', e.target.checked)
                  if (e.target.checked) {
                    handleFieldChange('planned_weight', null)
                  }
                }}
                disabled={disabled}
              />
            }
            label="Body weight"
          />
        </Grid>

        {/* Instruction field */}
        <Grid item xs={12}>
          <TextField
            size="small"
            label="Instruction (optional)"
            fullWidth
            multiline
            rows={2}
            value={exercise.instruction || ''}
            onChange={(e) => handleFieldChange('instruction', e.target.value || null)}
            disabled={disabled}
            placeholder="Add specific instructions for this exercise..."
          />
        </Grid>

        {/* Timer management */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Timers
          </Typography>
          {exercise.timers && exercise.timers.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {exercise.timers.map((timer, timerIdx) => (
                <Chip
                  key={timerIdx}
                  label={formatTimerDisplay(timer.duration, timer.type)}
                  onDelete={() => handleRemoveTimer(timerIdx)}
                  size="small"
                  color="primary"
                  variant="outlined"
                  disabled={disabled}
                />
              ))}
            </Box>
          )}
          <Grid container spacing={1}>
            <Grid item xs={3} sm={2}>
              <TextField
                size="small"
                label="Hours"
                type="number"
                fullWidth
                value={timerHours}
                onChange={(e) => setTimerHours(e.target.value)}
                disabled={disabled}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={3} sm={2}>
              <TextField
                size="small"
                label="Minutes"
                type="number"
                fullWidth
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value)}
                disabled={disabled}
                inputProps={{ min: 0, max: 59 }}
              />
            </Grid>
            <Grid item xs={3} sm={2}>
              <TextField
                size="small"
                label="Seconds"
                type="number"
                fullWidth
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(e.target.value)}
                disabled={disabled}
                inputProps={{ min: 0, max: 59 }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small" disabled={disabled}>
                <InputLabel>Timer Type</InputLabel>
                <Select
                  value={timerType}
                  label="Timer Type"
                  onChange={(e) => setTimerType(e.target.value)}
                >
                  <MenuItem value="per_set">Per Set</MenuItem>
                  <MenuItem value="total">Total Exercise Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleAddTimer}
                disabled={disabled}
                fullWidth
              >
                Add Timer
              </Button>
            </Grid>
          </Grid>
        </Grid>

        {/* Exercise History */}
        {(history?.sessions?.length > 0 || history?.estimated_1rm || history?.actual_1rm) && (
          <Grid item xs={12}>
            <Accordion sx={{ bgcolor: 'success.lighter' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2">
                  Your Progress for this Exercise
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* Stats Summary */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {history.estimated_1rm && (
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1, bgcolor: 'background.paper', textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Est. 1RM
                        </Typography>
                        <Typography variant="h6">
                          {history.estimated_1rm}lbs
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  {history.actual_1rm && (
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1, bgcolor: 'primary.main', color: 'primary.contrastText', textAlign: 'center' }}>
                        <Typography variant="caption" display="block">
                          Actual 1RM
                        </Typography>
                        <Typography variant="h6">
                          {history.actual_1rm}lbs
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>

                {history.sessions?.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Last {history.sessions.length} workout sessions:
                    </Typography>
                    {history.sessions.map((session, idx) => (
                      <Paper key={idx} sx={{ p: 1.5, mb: 1, bgcolor: 'background.paper' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(session.date).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                          {session.sets.map((set, setIdx) => (
                            <Typography key={setIdx} variant="body2">
                              Set {setIdx + 1}: {set.reps} reps
                              {set.weight && ` @ ${set.weight}lbs`}
                              {set.rpe && ` (RPE ${set.rpe})`}
                            </Typography>
                          ))}
                        </Box>
                      </Paper>
                    ))}
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}
      </Grid>
    </Paper>
  )
}

export default ExerciseEditCard
