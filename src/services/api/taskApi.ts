import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { Task, CompleteTaskRequest, TaskSummary } from '../../types/task.types';
class TaskApi {
  async getMyTasks(): Promise<Task[]> {
    const response = await axiosInstance.get<Task[]>(
      API_CONFIG.ENDPOINTS.TASKS_MY_TASKS
    );
    return response.data;
  }

  async getTaskById(id: string): Promise<Task> {
    const response = await axiosInstance.get<Task>(
      `${API_CONFIG.ENDPOINTS.TASKS}/${id}`
    );
    return response.data;
  }

  async getTaskSummary(): Promise<TaskSummary> {
    const response = await axiosInstance.get<TaskSummary>(
      API_CONFIG.ENDPOINTS.TASKS_MY_SUMMARY
    );
    return response.data;
  }

  async getOverdueTasks(): Promise<Task[]> {
    const response = await axiosInstance.get<Task[]>(
      API_CONFIG.ENDPOINTS.TASKS_OVERDUE
    );
    return response.data;
  }

  async getTasksDueToday(): Promise<Task[]> {
    const response = await axiosInstance.get<Task[]>(
      API_CONFIG.ENDPOINTS.TASKS_DUE_TODAY
    );
    return response.data;
  }

  async completeTask(data: CompleteTaskRequest): Promise<Task> {
    const url = API_CONFIG.ENDPOINTS.TASKS_COMPLETE.replace('{id}', data.taskId);
    const response = await axiosInstance.patch<Task>(url, {
      completionNotes: data.completionNotes,
      attachments: data.attachments,
    });
    return response.data;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const response = await axiosInstance.put<Task>(
      `${API_CONFIG.ENDPOINTS.TASKS}/${id}`,
      data
    );
    return response.data;
  }
}

export default new TaskApi();
