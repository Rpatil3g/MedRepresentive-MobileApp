export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  assignedByName?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  dueDate: string;
  completedAt?: string;
  completionNotes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CompleteTaskRequest {
  taskId: string;
  completionNotes?: string;
  attachments?: string[];
}

export interface TaskSummary {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
}
