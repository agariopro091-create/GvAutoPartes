export interface InventoryItem {
  sku: string;
  description: string;
  vehicles: string;
  qtyPdf: number;
  qtyPhysical: number | null;
  status: 'ok' | 'missing' | 'partial' | 'pending' | 'extra';
  category: string;
}

export interface Category {
  id: number;
  name: string;
  items: InventoryItem[];
}

export const inventoryData: Category[] = [
  {
    id: 1,
    name: 'Bujías',
    items: [
      { sku: 'BUJ-001', description: 'Bujía NGK BKR6E-11', vehicles: 'Toyota Corolla, Honda Civic', qtyPdf: 100, qtyPhysical: 95, status: 'partial', category: 'Bujías' },
      { sku: 'BUJ-002', description: 'Bujía Denso IK20TT', vehicles: 'Mazda 3, Ford Focus', qtyPdf: 50, qtyPhysical: 50, status: 'ok', category: 'Bujías' },
      { sku: 'BUJ-003', description: 'Bujía Bosch FR7DC+)', vehicles: 'Volkswagen Gol, Chevrolet Corsa', qtyPdf: 75, qtyPhysical: 0, status: 'missing', category: 'Bujías' },
    ],
  },
  {
    id: 2,
    name: 'Filtros de Aceite',
    items: [
      { sku: 'FIL-001', description: 'Filtro de Aceite Mann W712/75', vehicles: 'Toyota Corolla 1.8', qtyPdf: 60, qtyPhysical: 60, status: 'ok', category: 'Filtros de Aceite' },
      { sku: 'FIL-002', description: 'Filtro de Aceite Fram PH4967', vehicles: 'Honda Civic 1.5', qtyPdf: 40, qtyPhysical: 35, status: 'partial', category: 'Filtros de Aceite' },
      { sku: 'FIL-003', description: 'Filtro de Aceite K&N PS-1010', vehicles: 'Mazda 3 2.0', qtyPdf: 30, qtyPhysical: 30, status: 'ok', category: 'Filtros de Aceite' },
    ],
  },
  {
    id: 3,
    name: 'Filtros de Aire',
    items: [
      { sku: 'AIR-001', description: 'Filtro de Aire K&N 33-2031', vehicles: 'Toyota Corolla 1.8', qtyPdf: 25, qtyPhysical: 25, status: 'ok', category: 'Filtros de Aire' },
      { sku: 'AIR-002', description: 'Filtro de Aire Mann C25114/1', vehicles: 'Honda Civic 1.5', qtyPdf: 20, qtyPhysical: 15, status: 'partial', category: 'Filtros de Aire' },
    ],
  },
  {
    id: 4,
    name: 'Pastillas de Freno',
    items: [
      { sku: 'FRE-001', description: 'Pastillas de Freno Delanteras Bosch', vehicles: 'Toyota Corolla 1.8', qtyPdf: 40, qtyPhysical: 40, status: 'ok', category: 'Pastillas de Freno' },
      { sku: 'FRE-002', description: 'Pastillas de Freno Traseras ACDelco', vehicles: 'Honda Civic 1.5', qtyPdf: 30, qtyPhysical: 0, status: 'missing', category: 'Pastillas de Freno' },
    ],
  },
  {
    id: 5,
    name: 'Aceites de Motor',
    items: [
      { sku: 'ACE-001', description: 'Aceite Mobil 1 5W-30 Sintético 1L', vehicles: 'Universal', qtyPdf: 100, qtyPhysical: 100, status: 'ok', category: 'Aceites de Motor' },
      { sku: 'ACE-002', description: 'Aceite Castrol GTX 10W-40 1L', vehicles: 'Universal', qtyPdf: 80, qtyPhysical: 75, status: 'partial', category: 'Aceites de Motor' },
      { sku: 'ACE-003', description: 'Aceite Motul 8100 X-clean 5W-40 1L', vehicles: 'Universal', qtyPdf: 50, qtyPhysical: 50, status: 'ok', category: 'Aceites de Motor' },
    ],
  },
];
