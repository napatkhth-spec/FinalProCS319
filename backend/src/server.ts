import 'dotenv/config';
import { app } from './app.js';
import { getAuthConfig } from './config/auth.js';

try {
  getAuthConfig();
} catch {
  console.error('Backend startup aborted: authentication configuration is missing or invalid');
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.info(`Local Farmer Market API listening on http://localhost:${port}`);
});
