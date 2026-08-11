import { apiRequest } from "../../api/client.js";

export async function fetchTasks(params = {}) {
  return apiRequest("/tasks/", { params });
}

export async function updateTaskStatus(taskId, status) {
  return apiRequest(`/tasks/${taskId}/`, {
    method: "PATCH",
    json: { status },
  });
}
