import { apiRequest } from "../api/client.js";

export async function fetchEmployees() {
  return apiRequest("/employees/");
}

export async function fetchEmployeeJobs() {
  return apiRequest("/employees/jobs/");
}

export async function updateJobStatus(jobId, status) {
  return apiRequest(`/employees/jobs/${jobId}/status/`, {
    method: "PATCH",
    json: { status },
  });
}
