import { apiRequest } from "../../api/client.js";

export async function fetchPayrollSummary() {
  return apiRequest("/payroll/summary/");
}

export async function processPayroll(payload) {
  return apiRequest("/payroll/process/", {
    method: "POST",
    json: payload,
  });
}
