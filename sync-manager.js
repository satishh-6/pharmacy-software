const { db } = require('./local-db');

let isOnline = false;
let mongoConnected = false;
let syncTimer = null;

// ── INTERNET CHECK ──
async function checkInternet() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch('https://www.google.com/generate_204', { 
      signal: controller.signal,
      method: 'HEAD'
    });
    clearTimeout(timeout);
    return true;
  } catch { return false; }
}

// ── MONGODB CONNECT ──
async function connectMongo() {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) return true;
    
    await mongoose.connect(
      'mongodb+srv://pharmacyadmin:MedXpertadmin@pharmacy-db.mpam1i3.mongodb.net/pharmacy',
      { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 10000 }
    );
    mongoConnected = true;
    console.log('✅ MongoDB connected for sync');
    return true;
  } catch(e) {
    mongoConnected = false;
    console.log('📴 MongoDB sync unavailable:', e.message);
    return false;
  }
}

// ── ADD TO SYNC QUEUE ──
async function addToQueue(op) {
  await db.syncQueue.insert({
    ...op,
    queued: new Date(),
    synced: false,
    retries: 0
  });
}

// ── PROCESS QUEUE ──
async function processQueue() {
  const pending = await db.syncQueue.find({ synced: false, retries: { $lt: 5 } });
  if (!pending.length) return;

  console.log(`🔄 Processing ${pending.length} pending sync operations...`);

  for (const op of pending) {
    try {
      await syncToMongo(op);
      await db.syncQueue.update(
        { _id: op._id },
        { $set: { synced: true, syncedAt: new Date() } }
      );
    } catch(e) {
      await db.syncQueue.update(
        { _id: op._id },
        { $inc: { retries: 1 }, $set: { lastError: e.message } }
      );
    }
  }
  console.log('✅ Sync complete');
}

// ── SYNC TO MONGODB ──
async function syncToMongo(op) {
  const mongoose = require('mongoose');
  const collections = {
    products:  'Product',
    sales:     'Sale',
    purchases: 'Purchase',
    customers: 'Customer',
  };

  const modelName = collections[op.collection];
  if (!modelName) return;
  
  const Model = mongoose.model(modelName);

  if (op.action === 'insert') {
    await Model.findOneAndUpdate(
      { localId: op.localId, tenantId: op.tenantId },
      { ...op.data, localId: op.localId, tenantId: op.tenantId },
      { upsert: true, new: true }
    );
  } else if (op.action === 'update') {
    await Model.updateOne(
      { localId: op.localId },
      { $set: op.data }
    );
  } else if (op.action === 'delete') {
    await Model.deleteOne({ localId: op.localId });
  }
}

// ── SYNC MONITOR (har 30 sec) ──
async function startSyncMonitor(onStatusChange) {
  const check = async () => {
    const online = await checkInternet();
    
    if (online !== isOnline) {
      isOnline = online;
      onStatusChange && onStatusChange(online);
      
      if (online) {
        console.log('🌐 Internet connected!');
        const connected = await connectMongo();
        if (connected) await processQueue();
      } else {
        console.log('📴 Internet disconnected — offline mode');
      }
    }
  };

  // Startup check
  await check();
  
  // Periodic check
  syncTimer = setInterval(check, 30000);
}

function stopSync() {
  if (syncTimer) clearInterval(syncTimer);
}

function getStatus() { return isOnline; }

module.exports = { addToQueue, processQueue, startSyncMonitor, stopSync, getStatus, checkInternet };