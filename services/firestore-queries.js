async function upsertZoneSnapshot(db, collection, zone) {
  if (!db) return null;
  const ref = db.collection(collection).doc(zone.id);
  await ref.set({ ...zone, updatedAt: new Date().toISOString() }, { merge: true });
  return ref.id;
}

module.exports = { upsertZoneSnapshot };
