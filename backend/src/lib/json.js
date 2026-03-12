import { HttpError } from './httpError.js';

const MAX_BODY_SIZE = 1_000_000;

export async function parseJsonBody(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_SIZE) {
      throw new HttpError(413, 'payload_too_large', 'Payload excede o limite permitido.');
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');

  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'invalid_json', 'JSON inválido no corpo da requisição.');
  }
}
