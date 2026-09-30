import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { inventoryData, type InventoryItem } from './data/inventory';
import { unitPrices } from './data/prices';

export interface TrackedItem extends InventoryItem {
  id: string;
  categoryId: number;
  inPdf: boolean;
  inExcel: boolean;
  inPhysical: boolean;
  qtyPdf: number;
  qtyReceived: number | null;
  unitPrice: number;
}

export type InventoryPatch = Record<string, unknown>;

const COLLECTION_NAME = 'inventory';
const SETUP_DOCUMENT_ID = 'inventorySeed';

export function getFirestoreDocumentId(sku: string): string {
  const normalizedSku = sku.trim();
  if (!normalizedSku) throw new Error('El SKU no puede estar vacío.');

  return normalizedSku.includes('/')
    ? `sku_${encodeURIComponent(normalizedSku)}`
    : normalizedSku;
}

export function buildInitialInventory(): TrackedItem[] {
  return inventoryData.flatMap(category =>
    category.items.map((item, index) => ({
      ...item,
      id: `${category.id}-${index}`,
      categoryId: category.id,
      inPdf: true,
      inExcel: true,
      inPhysical: false,
      qtyPdf: item.qtyPdf,
      qtyReceived: item.qtyPhysical,
      unitPrice: unitPrices[item.sku] || 0,
    })),
  );
}

export function isValidInventoryItem(value: unknown): value is TrackedItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<TrackedItem>;
  return (
    typeof item.sku === 'string' && item.sku.trim().length > 0 &&
    typeof item.description === 'string' && item.description.trim().length > 0 &&
    typeof item.vehicles === 'string' &&
    typeof item.category === 'string' && item.category.trim().length > 0 &&
    typeof item.categoryId === 'number' && Number.isInteger(item.categoryId) &&
    typeof item.qtyPdf === 'number' && Number.isInteger(item.qtyPdf) && item.qtyPdf >= 0 &&
    (item.qtyReceived === null || (typeof item.qtyReceived === 'number' && Number.isInteger(item.qtyReceived) && item.qtyReceived >= 0)) &&
    (item.qtyPhysical === null || (typeof item.qtyPhysical === 'number' && Number.isInteger(item.qtyPhysical) && item.qtyPhysical >= 0)) &&
    typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice) && item.unitPrice >= 0 &&
    typeof item.inPdf === 'boolean' && typeof item.inExcel === 'boolean' && typeof item.inPhysical === 'boolean'
  );
}

export async function seedInventoryIfEmpty(database: Firestore, userId: string): Promise<void> {
  const productsRef = collection(database, COLLECTION_NAME);
  const setupRef = doc(database, 'system', SETUP_DOCUMENT_ID);
  const initialItems = buildInitialInventory();
  const existingProducts = await getDocs(productsRef);

  await runTransaction(database, async transaction => {
    const setupSnapshot = await transaction.get(setupRef);
    if (setupSnapshot.exists()) return;

    const initialProductRefs = initialItems.map(item =>
      doc(productsRef, getFirestoreDocumentId(item.sku)),
    );
    const initialProductSnapshots = await Promise.all(
      initialProductRefs.map(productRef => transaction.get(productRef)),
    );
    if (!existingProducts.empty || initialProductSnapshots.some(product => product.exists())) {
      transaction.set(setupRef, {
        version: 1,
        skippedExistingData: true,
        seededAt: serverTimestamp(),
        updatedBy: userId,
      });
      return;
    }

    initialItems.forEach((item, index) => {
      const productId = getFirestoreDocumentId(item.sku);
      transaction.set(initialProductRefs[index], {
        ...item,
        id: productId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        updatedBy: userId,
      });
    });
    transaction.set(setupRef, {
      version: 1,
      seededAt: serverTimestamp(),
      updatedBy: userId,
    });
  });
}

const OIL_INVOICE_MIGRATION_ID = 'invoice-2026-09-25-oils-units-v1';
const OIL_INVOICE_SKUS = [
  'ART-014946',
  'ART-014963',
  'ART-014868',
  'ART-015027',
  'ART-014908',
  'ART-014964',
] as const;
const OIL_UNITS_PER_CASE = 12;

export async function applyOilInvoiceUnitCorrection(
  database: Firestore,
  userId: string,
): Promise<void> {
  const markerRef = doc(database, 'system', OIL_INVOICE_MIGRATION_ID);
  const initialBySku = new Map(buildInitialInventory().map(item => [item.sku, item]));
  const productRefs = OIL_INVOICE_SKUS.map(sku =>
    doc(database, COLLECTION_NAME, getFirestoreDocumentId(sku)),
  );

  await runTransaction(database, async transaction => {
    const [markerSnapshot, ...productSnapshots] = await Promise.all([
      transaction.get(markerRef),
      ...productRefs.map(productRef => transaction.get(productRef)),
    ]);
    if (markerSnapshot.exists()) return;

    const updates = productSnapshots.map((snapshot, index) => {
      const sku = OIL_INVOICE_SKUS[index];
      if (!snapshot.exists()) {
        const initialItem = initialBySku.get(sku);
        if (!initialItem) throw new Error(`No se encontró la ficha inicial para ${sku}.`);
        return { kind: 'create' as const, productRef: productRefs[index], item: initialItem };
      }

      const current = snapshot.data();
      const quantities = [current.qtyPdf, current.qtyPhysical, current.qtyReceived];
      if (!quantities.every(quantity => quantity === 1 || quantity === OIL_UNITS_PER_CASE)) {
        throw new Error(
          `No se aplicó la corrección: ${sku} ya tiene cantidades distintas de 1 o 12. No se modificó ningún producto.`,
        );
      }
      return { kind: 'update' as const, productRef: productRefs[index] };
    });

    updates.forEach(update => {
      if (update.kind === 'create') {
        transaction.set(update.productRef, {
          ...update.item,
          id: update.productRef.id,
          qtyPdf: OIL_UNITS_PER_CASE,
          qtyPhysical: OIL_UNITS_PER_CASE,
          qtyReceived: OIL_UNITS_PER_CASE,
          unitPrice: unitPrices[update.item.sku] ?? 0,
          status: 'ok',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userId,
          updatedBy: userId,
        });
        return;
      }

      transaction.update(update.productRef, {
        qtyPdf: OIL_UNITS_PER_CASE,
        qtyPhysical: OIL_UNITS_PER_CASE,
        qtyReceived: OIL_UNITS_PER_CASE,
        status: 'ok',
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
    });

    transaction.set(markerRef, {
      version: 1,
      appliedAt: serverTimestamp(),
      updatedBy: userId,
    });
  });
}

export async function createInventoryItem(
  database: Firestore,
  item: TrackedItem,
  userId: string,
): Promise<void> {
  const productId = getFirestoreDocumentId(item.sku);
  const productRef = doc(database, COLLECTION_NAME, productId);

  await runTransaction(database, async transaction => {
    const existing = await transaction.get(productRef);
    if (existing.exists() && !existing.data().deleted) {
      throw new Error('Ya existe un producto con ese SKU.');
    }

    transaction.set(productRef, {
      ...item,
      id: productId,
      sku: item.sku.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    });
  });
}

export async function updateInventoryFields(
  database: Firestore,
  productId: string,
  patch: InventoryPatch,
  userId: string,
): Promise<void> {
  if (!Object.keys(patch).length) return;
  await updateDoc(doc(database, COLLECTION_NAME, productId), {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}

export async function saveEditedInventoryItem(
  database: Firestore,
  originalProductId: string,
  item: TrackedItem,
  patch: InventoryPatch,
  userId: string,
): Promise<void> {
  const nextProductId = getFirestoreDocumentId(item.sku);
  const oldRef = doc(database, COLLECTION_NAME, originalProductId);
  const nextRef = doc(database, COLLECTION_NAME, nextProductId);

  if (nextProductId === originalProductId) {
    await updateInventoryFields(database, originalProductId, patch, userId);
    return;
  }

  await runTransaction(database, async transaction => {
    const [oldSnapshot, nextSnapshot] = await Promise.all([
      transaction.get(oldRef),
      transaction.get(nextRef),
    ]);
    if (!oldSnapshot.exists()) throw new Error('El producto ya no existe en Firebase.');
    if (nextSnapshot.exists()) throw new Error('Ya existe un producto con ese SKU.');

    transaction.set(nextRef, {
      ...oldSnapshot.data(),
      ...patch,
      id: nextProductId,
      sku: item.sku.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
    transaction.delete(oldRef);
  });
}

export async function removeInventoryItem(database: Firestore, productId: string): Promise<void> {
  await deleteDoc(doc(database, COLLECTION_NAME, productId));
}

async function readExistingProducts(
  database: Firestore,
): Promise<{ refs: DocumentReference<DocumentData>[] }> {
  const snapshot = await getDocs(collection(database, COLLECTION_NAME));
  return { refs: snapshot.docs.map(product => product.ref) };
}

export async function importInventoryBackup(
  database: Firestore,
  items: TrackedItem[],
  userId: string,
): Promise<void> {
  if (items.length > 450) throw new Error('El respaldo supera el límite de 450 productos por operación.');
  if (!items.every(isValidInventoryItem)) {
    throw new Error('El respaldo contiene productos con campos o cantidades inválidos.');
  }

  const productIds = items.map(item => getFirestoreDocumentId(item.sku));
  if (new Set(productIds).size !== productIds.length) {
    throw new Error('El respaldo contiene SKU duplicados.');
  }

  const productsRef = collection(database, COLLECTION_NAME);
  await runTransaction(database, async transaction => {
    const currentSnapshots = await Promise.all(
      productIds.map(productId => transaction.get(doc(productsRef, productId))),
    );
    const currentById = new Map<string, DocumentData | undefined>(
      currentSnapshots.map((product, index) => [
        productIds[index], product.exists() ? product.data() : undefined,
      ]),
    );

    items.forEach((item, index) => {
      const productId = productIds[index];
      const previous = currentById.get(productId);
      transaction.set(doc(productsRef, productId), {
        ...item,
        id: productId,
        sku: item.sku.trim(),
        createdAt: previous?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: previous?.createdBy ?? userId,
        updatedBy: userId,
      });
    });
  });
}

export async function replaceInventory(
  database: Firestore,
  items: TrackedItem[],
  userId: string,
): Promise<void> {
  if (items.length > 450) {
    throw new Error('La operación admite hasta 450 productos a la vez.');
  }
  if (!items.every(isValidInventoryItem)) {
    throw new Error('El inventario contiene productos con campos o cantidades inválidos.');
  }

  const productIds = items.map(item => getFirestoreDocumentId(item.sku));
  if (new Set(productIds).size !== productIds.length) {
    throw new Error('El inventario contiene SKU duplicados.');
  }

  const productsRef = collection(database, COLLECTION_NAME);
  const existing = await readExistingProducts(database);
  const targetIds = new Set(productIds);
  const staleRefs = existing.refs.filter(productRef => !targetIds.has(productRef.id));
  if (items.length + staleRefs.length > 500) {
    throw new Error('Hay demasiados productos para restablecer el inventario en una sola operación.');
  }

  await runTransaction(database, async transaction => {
    const currentSnapshots = await Promise.all(
      existing.refs.map(productRef => transaction.get(productRef)),
    );
    const currentById = new Map<string, DocumentData | undefined>(
      currentSnapshots.map((product, index) => [
        existing.refs[index].id,
        product.exists() ? product.data() : undefined,
      ]),
    );

    items.forEach((item, index) => {
      const productId = productIds[index];
      const previous = currentById.get(productId);
      transaction.set(doc(productsRef, productId), {
        ...item,
        id: productId,
        sku: item.sku.trim(),
        createdAt: previous?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: previous?.createdBy ?? userId,
        updatedBy: userId,
      });
    });
    staleRefs.forEach(productRef => transaction.delete(productRef));
  });
}

export { COLLECTION_NAME };
