import { MongoClient } from 'mongodb';

const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/srbakery';
const atlasUri = process.env.ATLAS_MONGODB_URI;
const replaceTarget = process.argv.includes('--replace');

if (!atlasUri) {
  console.error('ATLAS_MONGODB_URI is required.');
  process.exit(1);
}

if (/localhost|127\.0\.0\.1/i.test(atlasUri)) {
  console.error('ATLAS_MONGODB_URI must point to Atlas, not localhost.');
  process.exit(1);
}

const localClient = new MongoClient(localUri);
const atlasClient = new MongoClient(atlasUri);

const getDbName = (uri) => {
  const parsed = new URL(uri);
  return parsed.pathname.replace(/^\//, '') || 'test';
};

const copyCollection = async (sourceDb, targetDb, collectionName) => {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);
  const count = await sourceCollection.countDocuments();

  if (replaceTarget) {
    try {
      await targetCollection.drop();
    } catch (error) {
      if (error.codeName !== 'NamespaceNotFound') throw error;
    }
  }

  await targetDb.createCollection(collectionName).catch((error) => {
    if (error.codeName !== 'NamespaceExists') throw error;
  });

  if (count > 0) {
    const cursor = sourceCollection.find({});
    let batch = [];
    for await (const document of cursor) {
      batch.push(document);
      if (batch.length >= 500) {
        await targetCollection.insertMany(batch, { ordered: false });
        batch = [];
      }
    }
    if (batch.length > 0) {
      await targetCollection.insertMany(batch, { ordered: false });
    }
  }

  const indexes = await sourceCollection.indexes();
  const customIndexes = indexes.filter((index) => index.name !== '_id_');
  if (customIndexes.length > 0) {
    await targetCollection.createIndexes(customIndexes);
  }

  console.log(`${collectionName}: copied ${count} document(s)`);
};

try {
  await localClient.connect();
  await atlasClient.connect();

  const localDb = localClient.db(getDbName(localUri));
  const atlasDb = atlasClient.db(getDbName(atlasUri));

  await localDb.command({ ping: 1 });
  await atlasDb.command({ ping: 1 });

  const collections = await localDb.listCollections().toArray();
  for (const collection of collections) {
    await copyCollection(localDb, atlasDb, collection.name);
  }

  console.log('Migration completed successfully.');
} finally {
  await localClient.close();
  await atlasClient.close();
}
