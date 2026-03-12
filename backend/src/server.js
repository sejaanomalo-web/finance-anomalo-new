import http from 'node:http';
import crypto from 'node:crypto';
import { authenticateRequest } from './middleware/auth.js';
import { toErrorResponse } from './lib/httpError.js';
import { financeRoutes } from './routes/financeRoutes.js';
import { logger } from './lib/logger.js';

const PORT = Number(process.env.PORT ?? 8787);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const corsAllowList = CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAnyOrigin = corsAllowList.includes('*');

const routes = financeRoutes();

function resolveAllowedOrigin(req) {
  const requestOrigin = req.headers.origin;

  if (allowAnyOrigin) {
    return requestOrigin ?? '*';
  }

  if (!requestOrigin) {
    return corsAllowList[0] ?? 'http://localhost:5173';
  }

  if (corsAllowList.includes(requestOrigin)) {
    return requestOrigin;
  }

  return null;
}

function setCorsHeaders(req, res) {
  const allowedOrigin = resolveAllowedOrigin(req);
  if (!allowedOrigin) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Idempotency-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  res.setHeader('X-Request-Id', requestId);
  const corsAllowed = setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    if (!corsAllowed) {
      res.statusCode = 403;
      res.end();
      return;
    }
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'finance-anomalo-api',
        timestamp: new Date().toISOString(),
        requestId,
      });
      return;
    }

    const route = routes.find((item) => item.method === req.method && item.pattern.test(url.pathname));

    if (!route) {
      sendJson(res, 404, {
        error: 'not_found',
        message: 'Rota não encontrada.',
        requestId,
      });
      return;
    }

    const auth = await authenticateRequest(req);
    const params = route.pattern.exec(url.pathname) ?? [];

    const result = await route.handler({
      req,
      res,
      auth,
      params,
      searchParams: url.searchParams,
    });

    sendJson(res, result.status ?? 200, result.body ?? {});
    logger.info('request_ok', {
      requestId,
      method: req.method,
      path: url.pathname,
      status: result.status ?? 200,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const payload = toErrorResponse(error);

    if (payload.status >= 500) {
      logger.error('request_failed', {
        requestId,
        method: req.method,
        path: req.url,
        error: String(error),
        durationMs: Date.now() - startedAt,
      });
    }

    sendJson(res, payload.status, {
      ...payload.body,
      requestId,
    });
  }
});

server.listen(PORT, () => {
  logger.info('finance_api_started', {
    port: PORT,
    corsOrigin: allowAnyOrigin ? '*' : corsAllowList,
  });
});
