import { HttpError } from '../lib/httpError.js';
import { getAuthenticatedUser } from '../lib/supabaseAdmin.js';

export async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'missing_token', 'Cabeçalho Authorization Bearer é obrigatório.');
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new HttpError(401, 'missing_token', 'Token Bearer não informado.');
  }

  const user = await getAuthenticatedUser(token);
  return { user, token };
}
