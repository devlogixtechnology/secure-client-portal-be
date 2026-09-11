import request from 'supertest';
import { app } from '../../src/app';

describe('Task 2 Scaffold & App Verification', () => {
  it('GET /health should respond with health data structure', async () => {
    const response = await request(app).get('/health');
    
    // Status is 503 when disconnected from DB, or 200 when connected
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('service', 'Albroe Client Portal API');
    expect(response.body.data).toHaveProperty('database');
  });

  it('GET /api/v1/health should respond via versioned router', async () => {
    const response = await request(app).get('/v1/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body.data).toHaveProperty('service', 'Albroe Client Portal API');
  });

  it('GET /non-existent-route should trigger 404 error handler with standard error format', async () => {
    const response = await request(app).get('/non-existent-route');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(response.body.error).toHaveProperty('message');
  });
});
