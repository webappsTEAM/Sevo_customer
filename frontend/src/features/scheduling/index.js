import { apiRequest } from "../../api/client.js";

export async function fetchSchedules() {
  return apiRequest("/scheduling/");
}

export async function createSchedule(data) {
  return apiRequest("/scheduling/", {
    method: "POST",
    json: data,
  });
}
