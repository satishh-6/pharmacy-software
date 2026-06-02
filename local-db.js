const Datastore = require('nedb-promises');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Windows: C:\Users\username\AppData\Roaming\DawaHisaab\
// Mac: ~/Library/Application Support/DawaHisaab/
const DATA_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'DawaHisaab', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = {
  tenants:   Datastore.create({ filename: path.join(DATA_DIR, 'tenants.db'),   autoload: true }),
  products:  Datastore.create({ filename: path.join(DATA_DIR, 'products.db'),  autoload: true }),
  sales:     Datastore.create({ filename: path.join(DATA_DIR, 'sales.db'),     autoload: true }),
  purchases: Datastore.create({ filename: path.join(DATA_DIR, 'purchases.db'), autoload: true }),
  customers: Datastore.create({ filename: path.join(DATA_DIR, 'customers.db'), autoload: true }),
  syncQueue: Datastore.create({ filename: path.join(DATA_DIR, 'syncqueue.db'), autoload: true }),
};

console.log('📂 Local DB path:', DATA_DIR);
module.exports = { db, DATA_DIR };