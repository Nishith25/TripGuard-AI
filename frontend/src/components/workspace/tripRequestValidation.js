export function validateTripRequest(form) {
  const errors = {};
  const travellerId = String(form.traveller_id || '').trim();

  if (!travellerId) {
    errors.traveller_id = 'Enter a traveller ID so decisions stay with the right traveller.';
  } else if (!/^[A-Za-z0-9_-]{3,32}$/.test(travellerId)) {
    errors.traveller_id = 'Use 3–32 letters, numbers, underscores or hyphens.';
  }

  if (form.departure_date && form.return_date && form.return_date <= form.departure_date) {
    errors.return_date = 'Return date must be after departure.';
  }

  if (!Number.isFinite(Number(form.budget)) || Number(form.budget) <= 0) {
    errors.budget = 'Budget must be greater than zero.';
  }

  return errors;
}
