import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function persistentStoragePlugin(): Plugin {
  const dataDir = path.resolve(import.meta.dirname, 'data');
  const publicDir = path.resolve(import.meta.dirname, 'public');
  const distDir = path.resolve(import.meta.dirname, 'dist');
  const srcDataDir = path.resolve(import.meta.dirname, 'src', 'data');

  const suppliesFile = path.join(dataDir, 'recorded_price_list.json');
  const publicSuppliesFile = path.join(publicDir, 'recorded_price_list.json');
  const distSuppliesFile = path.join(distDir, 'recorded_price_list.json');
  const srcDataSuppliesFile = path.join(srcDataDir, 'initialSupplies.json');
  const ordersFile = path.join(dataDir, 'recorded_orders.json');
  const distOrdersFile = path.join(distDir, 'recorded_orders.json');

  const setupMiddleware = (middlewares: any) => {
    middlewares.use(async (req: any, res: any, next: any) => {
      const url = req.url ? req.url.split('?')[0] : '';

      if (url === '/api/supplies') {
        if (req.method === 'GET') {
          try {
            if (fs.existsSync(suppliesFile)) {
              const content = fs.readFileSync(suppliesFile, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
              res.setHeader('Surrogate-Control', 'no-store');
              res.end(content || '[]');
              return;
            }
          } catch (e) {
            console.error('Error reading supplies:', e);
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.end('[]');
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (Array.isArray(parsed)) {
                if (!fs.existsSync(dataDir)) {
                  fs.mkdirSync(dataDir, { recursive: true });
                }
                fs.writeFileSync(suppliesFile, JSON.stringify(parsed, null, 2), 'utf-8');

                try {
                  if (!fs.existsSync(publicDir)) {
                    fs.mkdirSync(publicDir, { recursive: true });
                  }
                  fs.writeFileSync(publicSuppliesFile, JSON.stringify(parsed, null, 2), 'utf-8');
                } catch {
                  // ignore
                }

                try {
                  if (fs.existsSync(distDir)) {
                    fs.writeFileSync(distSuppliesFile, JSON.stringify(parsed, null, 2), 'utf-8');
                  }
                } catch {
                  // ignore
                }

                try {
                  if (fs.existsSync(srcDataDir)) {
                    fs.writeFileSync(srcDataSuppliesFile, JSON.stringify(parsed, null, 2), 'utf-8');
                  }
                } catch {
                  // ignore
                }

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                res.end(JSON.stringify({ success: true, count: parsed.length }));
                return;
              }
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
              return;
            }
            res.statusCode = 400;
            res.end();
          });
          return;
        }

        if (req.method === 'DELETE') {
          try {
            if (fs.existsSync(suppliesFile)) {
              fs.writeFileSync(suppliesFile, '[]', 'utf-8');
            }
            if (fs.existsSync(publicSuppliesFile)) {
              fs.writeFileSync(publicSuppliesFile, '[]', 'utf-8');
            }
            if (fs.existsSync(distSuppliesFile)) {
              fs.writeFileSync(distSuppliesFile, '[]', 'utf-8');
            }
          } catch {
            // ignore
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.end(JSON.stringify({ success: true }));
          return;
        }
      }

      if (url === '/api/orders') {
        if (req.method === 'GET') {
          try {
            if (fs.existsSync(ordersFile)) {
              const content = fs.readFileSync(ordersFile, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
              res.end(content || '[]');
              return;
            }
          } catch {
            // ignore
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.end('[]');
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (Array.isArray(parsed)) {
                if (!fs.existsSync(dataDir)) {
                  fs.mkdirSync(dataDir, { recursive: true });
                }
                fs.writeFileSync(ordersFile, JSON.stringify(parsed, null, 2), 'utf-8');
                try {
                  if (fs.existsSync(distDir)) {
                    fs.writeFileSync(distOrdersFile, JSON.stringify(parsed, null, 2), 'utf-8');
                  }
                } catch {
                  // ignore
                }
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                res.end(JSON.stringify({ success: true, count: parsed.length }));
                return;
              }
            } catch {
              res.statusCode = 400;
              res.end();
              return;
            }
            res.statusCode = 400;
            res.end();
          });
          return;
        }
      }

      next();
    });
  };

  return {
    name: 'persistent-storage-api',
    configureServer(server) {
      setupMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      setupMiddleware(server.middlewares);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), persistentStoragePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/xlsx')) {
              return 'xlsx';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
