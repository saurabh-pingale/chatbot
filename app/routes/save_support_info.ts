import { getRepository } from "typeorm";
import { Store } from "./db/entity/Store";
import { createDatabaseConnection } from "./db/database";

export const saveSupportInfo = async (shopId: string, supportEmail: string, supportPhone: string) => {
  let connection;
  try {
    connection = await createDatabaseConnection();

    const storeRepository = connection.getRepository(Store);

    let store = await storeRepository.findOne({ where: { store_name: shopId } });

    if (!store) {
      store = new Store();
      store.store_name = shopId;
    }

    store.support_email = supportEmail;
    store.support_phone = supportPhone;

    await storeRepository.save(store);
    return { success: true };
  } catch (error: any) {
    console.error("Error in saveSupportInfo:", error);
    throw new Error(`Failed to save support info: ${error.message || "unknown error"}`);
  }
};