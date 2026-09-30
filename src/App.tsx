import { useState, useMemo, useEffect } from 'react';
import { inventoryData, type InventoryItem, type ItemStatus } from './data/inventory';
import { unitPrices } from './data/prices';
import ExcelJS from 'exceljs';

interface TrackedItem extends InventoryItem {
  id: string;
  categoryId: number;
  inInvoice: boolean;
  inExcel: boolean;
  inPhysical: boolean;
  qtyInvoice: number;
  qtyReceived: number | null;
  unitPrice: number;
  stock: number;
}

interface Sale {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  customer: string;
}

const allItems: TrackedItem[] = inventoryData.flatMap(category => 
  category.items.map((item, idx) => ({
    ...item,
    id: `${category.id}-${idx}`,
    categoryId: category.id,
    inInvoice: true,
    inExcel: true,
    inPhysical: false,
    qtyInvoice: item.qtyPdf,
    qtyReceived: item.qtyPhysical,
    unitPrice: unitPrices[item.sku] || 0,
    stock: item.qtyPhysical || 0
  }))
);

function calculateStatus(qtyInvoice: number, qtyReceived: number | null): ItemStatus {
  if (qtyReceived === null || qtyReceived === undefined) return 'pending';
  if (qtyReceived === 0) return 'missing';
  if (qtyReceived < qtyInvoice) return 'partial';
  if (qtyReceived === qtyInvoice) return 'ok';
  if (qtyReceived > qtyInvoice) return 'extra';
  return 'pending';
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function App() {
  const [items, setItems] = useState<TrackedItem[]>(allItems);
  const [sales, setSales] = useState<Sale[]>([]);
  const [currentView, setCurrentView] = useState<'inventory' | 'sales' | 'low-stock'>('inventory');
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null);
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleCustomer, setSaleCustomer] = useState('');

  useEffect(() => {
    const savedItems = localStorage.getItem('gvautopartes_items_v2');
    const savedSales = localStorage.getItem('gvautopartes_sales');
    
    if (savedItems) {
      try {
        setItems(JSON.parse(savedItems));
      } catch (e) {
        console.error('Error loading items:', e);
      }
    }
    
    if (savedSales) {
      try {
        setSales(JSON.parse(savedSales));
      } catch (e) {
        console.error('Error loading sales:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gvautopartes_items_v2', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('gvautopartes_sales', JSON.stringify(sales));
  }, [sales]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const status = calculateStatus(item.qtyInvoice, item.qtyReceived);
      const matchesFilter = currentFilter === 'all' || status === currentFilter;
      const matchesCategory = selectedCategory === 'all' || item.categoryId === parseInt(selectedCategory);
      const normalizedSearch = normalizeText(searchQuery);
      const matchesSearch = searchQuery === '' || 
        normalizeText(item.sku).includes(normalizedSearch) ||
        normalizeText(item.description).includes(normalizedSearch) ||
        normalizeText(item.vehicles).includes(normalizedSearch);
      return matchesFilter && matchesSearch && matchesCategory;
    });
  }, [items, currentFilter, searchQuery, selectedCategory]);

  const lowStockItems = useMemo(() => {
    return items.filter(item => item.stock < 5 && item.stock > 0);
  }, [items]);

  const totalSales = useMemo(() => {
    return sales.reduce((sum, sale) => sum + sale.total, 0);
  }, [sales]);

  const handleSale = () => {
    if (!selectedItem || saleQuantity <= 0 || saleQuantity > selectedItem.stock) {
      alert('Cantidad inválida o stock insuficiente');
      return;
    }

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      sku: selectedItem.sku,
      description: selectedItem.description,
      quantity: saleQuantity,
      unitPrice: selectedItem.unitPrice,
      total: saleQuantity * selectedItem.unitPrice,
      date: new Date().toISOString(),
      customer: saleCustomer || 'Cliente general'
    };

    setSales(prev => [newSale, ...prev]);
    setItems(prev => prev.map(item => 
      item.id === selectedItem.id 
        ? { ...item, stock: item.stock - saleQuantity }
        : item
    ));

    setShowSaleModal(false);
    setSelectedItem(null);
    setSaleQuantity(1);
    setSaleCustomer('');
    alert('✅ Venta registrada exitosamente');
  };

  const updateQtyInvoice = (id: string, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, qtyInvoice: parseInt(value) || 0 } : item
    ));
  };

  const updateQtyReceived = (id: string, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, qtyReceived: value === '' ? null : parseInt(value), stock: value === '' ? 0 : parseInt(value) } : item
    ));
  };

  const updateUnitPrice = (id: string, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, unitPrice: parseFloat(value) || 0 } : item
    ));
  };

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventario');

      worksheet.columns = [
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Descripción', key: 'description', width: 40 },
        { header: 'Vehículos', key: 'vehicles', width: 40 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Factura/Despacho', key: 'qtyInvoice', width: 15 },
        { header: 'Recibido Físico', key: 'qtyReceived', width: 15 },
        { header: 'Stock Actual', key: 'stock', width: 15 },
        { header: 'Precio Unitario', key: 'unitPrice', width: 15 },
        { header: 'Estado', key: 'status', width: 15 }
      ];

      items.forEach(item => {
        const status = calculateStatus(item.qtyInvoice, item.qtyReceived);
        worksheet.addRow({
          sku: item.sku,
          description: item.description,
          vehicles: item.vehicles,
          category: item.category,
          qtyInvoice: item.qtyInvoice,
          qtyReceived: item.qtyReceived || 0,
          stock: item.stock,
          unitPrice: item.unitPrice,
          status: status
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Inventario_GvAutoPartes_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error al exportar');
    }
  };

  const StatusBadge = ({ status }: { status: ItemStatus }) => {
    const config: Record<ItemStatus, { label: string; className: string }> = {
      pending: { label: '⏳ Pendiente', className: 'bg-gray-200 text-gray-700' },
      ok: { label: '✅ Completo', className: 'bg-green-200 text-green-800' },
      missing: { label: '❌ No Vino', className: 'bg-red-200 text-red-800' },
      partial: { label: '⚠️ Faltan', className: 'bg-yellow-200 text-yellow-800' },
      extra: { label: '⭐ Extra', className: 'bg-blue-200 text-blue-800' }
    };
    
    const { label, className } = config[status];
    return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${className}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📦 GvAutoPartes</h1>
              <p className="text-sm text-gray-600">Sistema de Inventario y Ventas</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('inventory')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'inventory' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📋 Inventario
              </button>
              <button
                onClick={() => setCurrentView('sales')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'sales' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                💰 Ventas
              </button>
              <button
                onClick={() => setCurrentView('low-stock')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'low-stock' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ⚠️ Stock Bajo
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Vista de Inventario */}
        {currentView === 'inventory' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">En Stock</p>
                <p className="text-2xl font-bold text-green-600">{items.filter(i => i.stock > 0).length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Ventas Totales</p>
                <p className="text-2xl font-bold text-blue-600">${totalSales.toFixed(2)}</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Buscar por SKU, descripción o vehículo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas las Categorías</option>
                  {inventoryData.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <select
                  value={currentFilter}
                  onChange={(e) => setCurrentFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="ok">✅ Completo</option>
                  <option value="missing">❌ No Vino</option>
                  <option value="partial">⚠️ Faltan</option>
                  <option value="extra">⭐ Extra</option>
                  <option value="pending">⏳ Pendiente</option>
                </select>
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📥 Exportar Excel
                </button>
              </div>
            </div>

            {/* Tabla de Inventario */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Descripción</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vehículos</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Factura/Despacho</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Recibido Físico</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Stock</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Precio</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Estado</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map(item => {
                      const status = calculateStatus(item.qtyInvoice, item.qtyReceived);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.sku}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.vehicles}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.qtyInvoice}
                              onChange={(e) => updateQtyInvoice(item.id, e.target.value)}
                              className="w-20 px-2 py-1 border rounded text-center"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.qtyReceived || ''}
                              onChange={(e) => updateQtyReceived(item.id, e.target.value)}
                              className="w-20 px-2 py-1 border rounded text-center"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${item.stock < 5 ? 'text-red-600' : 'text-green-600'}`}>
                              {item.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateUnitPrice(item.id, e.target.value)}
                              className="w-24 px-2 py-1 border rounded text-center"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setShowSaleModal(true);
                              }}
                              disabled={item.stock === 0}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                            >
                              Vender
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No se encontraron productos
                </div>
              )}
            </div>
          </>
        )}

        {/* Vista de Ventas */}
        {currentView === 'sales' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">💰 Historial de Ventas</h2>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Vendido</p>
                <p className="text-2xl font-bold text-green-600">${totalSales.toFixed(2)}</p>
              </div>
            </div>

            {sales.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay ventas registradas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Descripción</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Cantidad</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Precio Unit.</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(sale.date).toLocaleDateString('es-VE')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.customer}</td>
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">{sale.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.description}</td>
                        <td className="px-4 py-3 text-sm text-center">{sale.quantity}</td>
                        <td className="px-4 py-3 text-sm text-center">${sale.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-center font-bold text-green-600">${sale.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Vista de Stock Bajo */}
        {currentView === 'low-stock' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">⚠️ Productos con Stock Bajo (&lt; 5 unidades)</h2>
            
            {lowStockItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay productos con stock bajo
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Descripción</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vehículos</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Stock Actual</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Precio</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lowStockItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.vehicles}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-red-600">{item.stock}</span>
                        </td>
                        <td className="px-4 py-3 text-center">${item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <button className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm">
                            📦 Pedir Más
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Venta */}
      {showSaleModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Registrar Venta</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <p className="text-sm text-gray-900">{selectedItem.description}</p>
                <p className="text-xs text-gray-600">SKU: {selectedItem.sku}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Disponible</label>
                <p className="text-lg font-bold text-green-600">{selectedItem.stock} unidades</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  value={saleCustomer}
                  onChange={(e) => setSaleCustomer(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Vender</label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.stock}
                  value={saleQuantity}
                  onChange={(e) => setSaleQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario</label>
                <p className="text-lg font-bold text-blue-600">${selectedItem.unitPrice.toFixed(2)}</p>
              </div>

              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total de Venta:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${(saleQuantity * selectedItem.unitPrice).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSale}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ✅ Confirmar Venta
                </button>
                <button
                  onClick={() => {
                    setShowSaleModal(false);
                    setSelectedItem(null);
                    setSaleQuantity(1);
                    setSaleCustomer('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
