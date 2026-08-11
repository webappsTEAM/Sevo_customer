export function validateBookingForm(data) {
  const errors = {};
  if (!data.serviceId && !data.service_type) {
    errors.service = "Please select a service";
  }
  if (!data.address) {
    errors.address = "Address is required";
  }
  if (!data.scheduledDate) {
    errors.scheduledDate = "Please choose a date and time";
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
