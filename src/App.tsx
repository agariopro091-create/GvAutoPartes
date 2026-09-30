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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    sku: '',
    description: '',
    vehicles: '',
    category: '',
    qtyInvoice: 0,
    qtyReceived: null as number | null,
    unitPrice: 0
  });

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

  const handleAddItem = () => {
    if (!newItem.sku.trim() || !newItem.description.trim() || !newItem.category.trim()) {
      alert('❌ SKU, descripción y categoría son obligatorios');
      return;
    }

    if (items.some(item => item.sku.toLowerCase() === newItem.sku.trim().toLowerCase())) {
      alert('❌ Ya existe un producto con ese SKU');
      return;
    }

    const categoryId = inventoryData.find(cat => cat.name === newItem.category)?.id || 999;

    const newItemData: TrackedItem = {
      id: `custom-${Date.now()}`,
      sku: newItem.sku.trim(),
      description: newItem.description.trim(),
      vehicles: newItem.vehicles.trim(),
      category: newItem.category.trim(),
      categoryId: categoryId,
      qtyPdf: newItem.qtyInvoice,
      qtyPhysical: newItem.qtyReceived,
      status: calculateStatus(newItem.qtyInvoice, newItem.qtyReceived),
      inInvoice: true,
      inExcel: true,
      inPhysical: false,
      qtyInvoice: newItem.qtyInvoice,
      qtyReceived: newItem.qtyReceived,
      unitPrice: newItem.unitPrice,
      stock: newItem.qtyReceived || 0
    };

    setItems(prev => [...prev, newItemData]);
    setNewItem({
      sku: '',
      description: '',
      vehicles: '',
      category: '',
      qtyInvoice: 0,
      qtyReceived: null,
      unitPrice: 0
    });
    setShowAddModal(false);
    alert('✅ Producto agregado exitosamente');
  };

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GvAutoPartes';
      workbook.created = new Date();
      
      const worksheet = workbook.addWorksheet('Inventario', {
        properties: { defaultRowHeight: 20 }
      });

      // Configuración de columnas
      worksheet.columns = [
        { header: 'N°', key: 'num', width: 6 },
        { header: 'Indicadores', key: 'indicators', width: 14 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Código SKU', key: 'sku', width: 18 },
        { header: 'Descripción', key: 'description', width: 35 },
        { header: 'Vehículos Compatibles', key: 'vehicles', width: 40 },
        { header: 'Factura/Despacho', key: 'qtyInvoice', width: 15 },
        { header: 'Recibido Físico', key: 'qtyReceived', width: 15 },
        { header: 'Stock Actual', key: 'stock', width: 12 },
        { header: 'Estado', key: 'status', width: 14 },
        { header: 'Precio Unitario', key: 'unitPrice', width: 14 },
        { header: 'Precio Venta', key: 'salePrice', width: 14 }
      ];

      // === ENCABEZADO DEL REPORTE ===
      const now = new Date();
      const fecha = now.toLocaleDateString('es-VE');
      const hora = now.toLocaleTimeString('es-VE');
      
      const totalItems = items.length;
      const completados = items.filter(i => calculateStatus(i.qtyInvoice, i.qtyReceived) === 'ok').length;
      const faltantes = items.filter(i => calculateStatus(i.qtyInvoice, i.qtyReceived) === 'missing').length;
      const incompletos = items.filter(i => calculateStatus(i.qtyInvoice, i.qtyReceived) === 'partial').length;
      const extra = items.filter(i => calculateStatus(i.qtyInvoice, i.qtyReceived) === 'extra').length;
      const pendientes = items.filter(i => calculateStatus(i.qtyInvoice, i.qtyReceived) === 'pending').length;

      // Fila 1: Nombre de la empresa
      worksheet.mergeCells('A1:L1');
      const cellEmpresa = worksheet.getCell('A1');
      cellEmpresa.value = 'GvAutoPartes';
      cellEmpresa.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1E3A8A' } };
      cellEmpresa.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      // Fila 2: Título del reporte
      worksheet.mergeCells('A2:L2');
      const cellTitulo = worksheet.getCell('A2');
      cellTitulo.value = 'Inventario General - Respaldo de Emergencia';
      cellTitulo.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF374151' } };
      cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 25;

      // Fila 3: Metadatos
      worksheet.mergeCells('A3:F3');
      worksheet.getCell('A3').value = `Fecha: ${fecha} ${hora}`;
      worksheet.getCell('A3').font = { name: 'Arial', size: 10, color: { argb: 'FF6B7280' } };
      worksheet.getCell('A3').alignment = { horizontal: 'left' };

      worksheet.mergeCells('G3:L3');
      worksheet.getCell('G3').value = `Total: ${totalItems} productos`;
      worksheet.getCell('G3').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
      worksheet.getCell('G3').alignment = { horizontal: 'right' };
      worksheet.getRow(3).height = 20;

      // Fila 4: Resumen
      worksheet.mergeCells('A4:L4');
      const cellResumen = worksheet.getCell('A4');
      cellResumen.value = `✅ Completos: ${completados} | ❌ Faltantes: ${faltantes} | ⚠️ Incompletos: ${incompletos} | ⭐ Extra: ${extra} | ⏳ Pendientes: ${pendientes}`;
      cellResumen.font = { name: 'Arial', size: 9, color: { argb: 'FF4B5563' } };
      cellResumen.alignment = { horizontal: 'center', vertical: 'middle' };
      cellResumen.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      worksheet.getRow(4).height = 22;

      // Fila 5: Espacio
      worksheet.getRow(5).height = 8;

      // === TABLA DE DATOS ===
      const headerRowNum = 6;
      const headerRow = worksheet.getRow(headerRowNum);
      
      // Estilo del encabezado de la tabla
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };
      });
      headerRow.height = 25;

      // Agregar datos
      items.forEach((item, index) => {
        let indicators = '';
        if (item.inInvoice) indicators += '🔴 Factura ';
        if (item.inExcel) indicators += '🟢 Excel ';
        if (item.inPhysical) indicators += '🟣 Físico';

        const status = calculateStatus(item.qtyInvoice, item.qtyReceived);
        const statusText: Record<ItemStatus, string> = {
          'ok': '✅ Completo', 'missing': '❌ No Vino', 'partial': '⚠️ Faltan', 'extra': '⭐ Extra', 'pending': '⏳ Pendiente'
        };

        const row = worksheet.addRow({
          num: index + 1,
          indicators: indicators,
          category: item.category,
          sku: item.sku,
          description: item.description,
          vehicles: item.vehicles,
          qtyInvoice: item.qtyInvoice,
          qtyReceived: item.qtyReceived === null ? 0 : item.qtyReceived,
          stock: item.stock,
          status: statusText[status],
          unitPrice: item.unitPrice,
          salePrice: ''
        });

        // Estilo de las filas (efecto cebra)
        const isEven = index % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF3F4F6' } };
          if (colNumber === 11) {
            cell.numFmt = '$#,##0.00';
            cell.font = { name: 'Arial', size: 10, color: { argb: 'FF059669' } };
          }
          if (colNumber === 12) {
            cell.numFmt = '$#,##0.00';
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4E6' } };
          }
        });
      });

      worksheet.views = [{ state: 'frozen', ySplit: headerRowNum, xSplit: 0 }];
      worksheet.autoFilter = { from: { row: headerRowNum, column: 1 }, to: { row: headerRowNum + items.length, column: 12 } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Inventario_GvAutoPartes_${fecha.replace(/\//g, '-')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('❌ Error al exportar');
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
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
              >
                ➕ Agregar
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

      {/* Modal de Agregar Producto */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">➕ Agregar Nuevo Producto</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código SKU *</label>
                <input
                  type="text"
                  value={newItem.sku}
                  onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                  placeholder="Ej: FLAM-001"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  placeholder="Ej: Filtro de Aceite Flamingo"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehículos Compatibles</label>
                <textarea
                  value={newItem.vehicles}
                  onChange={(e) => setNewItem({...newItem, vehicles: e.target.value})}
                  placeholder="Ej: CHEVROLET AVEO, TOYOTA COROLLA"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar categoría...</option>
                  {inventoryData.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Factura/Despacho</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.qtyInvoice}
                    onChange={(e) => setNewItem({...newItem, qtyInvoice: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recibido Físico</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.qtyReceived === null ? '' : newItem.qtyReceived}
                    onChange={(e) => setNewItem({...newItem, qtyReceived: e.target.value === '' ? null : parseInt(e.target.value)})}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleAddItem}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                >
                  ✅ Agregar Producto
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewItem({
                      sku: '',
                      description: '',
                      vehicles: '',
                      category: '',
                      qtyInvoice: 0,
                      qtyReceived: null,
                      unitPrice: 0
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
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
