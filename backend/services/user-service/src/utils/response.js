export function ok(res, data = {}, status = 200) {
  return res.status(status).json({ data });
}

export function fail(res, message, status = 400, details) {
  return res.status(status).json({ error: { message, details } });
}
