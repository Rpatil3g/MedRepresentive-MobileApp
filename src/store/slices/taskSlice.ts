import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Task, TaskSummary } from '../../types/task.types';

interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  summary: TaskSummary | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: string;
    priority?: string;
  };
}

const initialState: TaskState = {
  tasks: [],
  selectedTask: null,
  summary: null,
  loading: false,
  error: null,
  filters: {},
};

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload;
    },
    addTask: (state, action: PayloadAction<Task>) => {
      state.tasks.unshift(action.payload);
    },
    updateTask: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload;
    },
    setSummary: (state, action: PayloadAction<TaskSummary>) => {
      state.summary = action.payload;
    },
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setTasks,
  addTask,
  updateTask,
  setSelectedTask,
  setSummary,
  setFilters,
  setLoading,
  setError,
} = taskSlice.actions;

export default taskSlice.reducer;
