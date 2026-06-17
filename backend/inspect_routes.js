process.env.PORT = '5002';
const { app } = require('./src/server');

console.log('--- REGISTERED ROUTES ---');
const routes = [];

function print(path, layer) {
  if (layer.route) {
    layer.route.stack.forEach(function(stack) {
      var method = stack.method ? stack.method.toUpperCase() : 'ALL';
      routes.push({ method, path: layer.route.path });
    });
  } else if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach(function(stack) {
      print(path, stack);
    });
  }
}

const router = app.router || app._router;
if (!router || !router.stack) {
  console.error('Express router stack is undefined.');
  process.exit(1);
}

router.stack.forEach(function(layer) {
  print('', layer);
});

// Sort routes by path for readability
routes.sort((a, b) => String(a.path).localeCompare(String(b.path)));

routes.forEach(r => {
  console.log(`${r.method.padEnd(7)} ${r.path}`);
});

process.exit(0);
