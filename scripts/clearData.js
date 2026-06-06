// Clear all Firestore data
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-key.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
} catch (err) {
  console.log('Firebase already initialized or using default credentials');
}

const db = admin.firestore();

async function clearCollections() {
  const collections = ['vendors', 'rfqs', 'quotations', 'approvals', 'purchaseOrders', 'invoices', 'activityLogs'];
  
  for (const collectionName of collections) {
    try {
      console.log(`Clearing collection: ${collectionName}`);
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`  ✓ ${collectionName} is already empty`);
        continue;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`  ✓ Deleted ${snapshot.size} documents from ${collectionName}`);
    } catch (err) {
      console.error(`  ✗ Error clearing ${collectionName}:`, err.message);
    }
  }
  
  console.log('\n✅ Data clearing complete!');
  process.exit(0);
}

clearCollections().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
