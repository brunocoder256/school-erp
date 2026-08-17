process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '4000';
process.env.FRONTEND_URL ??= 'http://localhost:3000';
process.env.JWT_SECRET ??= 'e2e-test-jwt-secret';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/school_erp_e2e';
