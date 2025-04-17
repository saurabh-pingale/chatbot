import { getRepository } from 'typeorm';
import { Store } from './db/entity/Store';
import { createDatabaseConnection } from './db/database';

export const saveColorPreference = async (shopId: string, color: string) => {
  let connection;
  try {
    connection = await createDatabaseConnection();

    const storeRepository = getRepository(Store);

    let store = await storeRepository.findOne({ where: { store_name: shopId } });

    if (!store) {
      store = new Store();
      store.store_name = shopId;
      store.preferred_color = color;

      await storeRepository.save(store);
    } else {
      store.preferred_color = color;
      await storeRepository.save(store);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in saveColorPreference:", error);
    throw new Error(`Failed to save color preference: ${error.message || "Unknown error"}`);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
};