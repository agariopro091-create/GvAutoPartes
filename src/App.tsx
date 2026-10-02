import { useState, useMemo, useEffect } from 'react';
import { inventoryData } from './data/inventory';
import { unitPrices } from './data/prices';
import ExcelJS from 'exceljs';

// Tipos
interface TrackedItem {
  id: string;
  sku: string;
  description: string;
  vehicles: string;
  category: string;
  categoryId: number;
  qtyPdf: number;
  qtyReceived: number | null;
  unitPrice: number;
  status: 'ok' | 'missing' | 'partial' | 'pending' | 'extra';
  inPdf: boolean;
  inExcel: boolean;
  inPhysical: boolean;
}

interface Sale {
  id: string;
  itemId: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  salePrice: number;
  totalPrice: number;
  date: string;
  customerName: string;
  customerPhone: string;
  customerId: string;
  notes: string;
}

// Constantes
const STORAGE_KEY = 'gvautopartes_inventory_data_v6';
const SALES_KEY = 'gvautopartes_sales_data_v6';
const AUTH_KEY = 'gvautopartes_auth';
const DEFAULT_PASSWORD = 'gvautopartes2026';

// Funciones de autenticación
const checkAuth = (): boolean => localStorage.getItem(AUTH_KEY) === 'authenticated';
const login = (password: string): boolean => {
  if (password === DEFAULT_PASSWORD) {
    localStorage.setItem(AUTH_KEY, 'authenticated');
    return true;
  }
  return false;
};
const logout = () => localStorage.removeItem(AUTH_KEY);

// Funciones de almacenamiento
const loadItems = (): TrackedItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveItems = (items: TrackedItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const loadSales = (): Sale[] => {
  try {
    const saved = localStorage.getItem(SALES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveSales = (sales: Sale[]) => {
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
};

// Inicializar datos
const initializeItems = (): TrackedItem[] => {
  const saved = loadItems();
  if (saved.length > 0) return saved;

  const items: TrackedItem[] = [];
  inventoryData.forEach((category) => {
    category.items.forEach((item, idx) => {
      items.push({
        id: `${category.id}-${idx}`,
        sku: item.sku,
        description: item.description,
        vehicles: item.vehicles,
        category: category.name,
        categoryId: category.id,
        qtyPdf: item.qtyPdf,
        qtyReceived: item.qtyPhysical,
        unitPrice: unitPrices[item.sku] || 0,
        status: item.status,
        inPdf: true,
        inExcel: true,
        inPhysical: false,
      });
    });
  });
  saveItems(items);
  return items;
};

// Componente de Login
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      setPassword('');
      setError('');
      setTimeout(() => onLogin(), 100);
    } else {
      setError('Contraseña incorrecta');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🔐</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">GvAutoPartes</h1>
          <p className="text-sm sm:text-base text-gray-500">Sistema de Inventario Privado</p>
          <p className="text-xs text-gray-400 mt-2">Proveedor: Guzimport, C.A.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-base"
              placeholder="Ingresa tu contraseña"
              autoFocus
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">❌ {error}</div>
          )}
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors text-base">
            🔓 Iniciar Sesión
          </button>
        </form>

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Documento: 80010868 | Proveedor: Guzimport, C.A.</p>
        </div>
      </div>
    </div>
  );
}

// Componente principal
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth);
  const [items, setItems] = useState<TrackedItem[]>(initializeItems);
  const [sales, setSales] = useState<Sale[]>(loadSales);
  const [currentView, setCurrentView] = useState<'inventory' | 'sales'>('inventory');
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedItemForSale, setSelectedItemForSale] = useState<TrackedItem | null>(null);
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleCustomerPhone, setSaleCustomerPhone] = useState('');
  const [saleCustomerId, setSaleCustomerId] = useState('');
  const [saleUnitPrice, setSaleUnitPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleNotes, setSaleNotes] = useState('');
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackedItem | null>(null);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  useEffect(() => {
    saveSales(sales);
  }, [sales]);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // Funciones de inventario
  const updateQtyPdf = (id: string, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, qtyPdf: parseInt(value) || 0 } : item));
  };

  const updateQtyReceived = (id: string, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, qtyReceived: value === '' ? null : parseInt(value) } : item));
  };

  const updateUnitPrice = (id: string, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, unitPrice: parseFloat(value) || 0 } : item));
  };

  const calculateStatus = (qtyPdf: number, qtyReceived: number | null): 'ok' | 'missing' | 'partial' | 'pending' | 'extra' => {
    if (qtyReceived === null) return 'pending';
    if (qtyReceived === 0) return 'missing';
    if (qtyReceived < qtyPdf) return 'partial';
    if (qtyReceived === qtyPdf) return 'ok';
    return 'extra';
  };

  const getStockForItem = (item: TrackedItem): number => {
    const totalSold = sales.filter(s => s.itemId === item.id).reduce((sum, s) => sum + s.quantity, 0);
    return (item.qtyReceived || 0) - totalSold;
  };

  // Funciones de ventas
  const handleOpenSaleModal = (item: TrackedItem) => {
    setSelectedItemForSale(item);
    setSaleQuantity(1);
    setSaleCustomerName('');
    setSaleCustomerPhone('');
    setSaleCustomerId('');
    setSaleUnitPrice(item.unitPrice);
    setSalePrice(item.unitPrice);
    setSaleDate(new Date().toISOString().split('T')[0]);
    setSaleNotes('');
    setShowSaleModal(true);
  };

  const handleRegisterSale = () => {
    if (!selectedItemForSale) return;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      itemId: selectedItemForSale.id,
      sku: selectedItemForSale.sku,
      description: selectedItemForSale.description,
      quantity: saleQuantity,
      unitPrice: saleUnitPrice,
      salePrice: salePrice,
      totalPrice: saleQuantity * salePrice,
      date: saleDate,
      customerName: saleCustomerName || 'Cliente general',
      customerPhone: saleCustomerPhone,
      customerId: saleCustomerId,
      notes: saleNotes,
    };

    setSales(prev => [newSale, ...prev]);
    setShowSaleModal(false);
    setSaleQuantity(1);
    setSaleCustomerName('');
    setSaleCustomerPhone('');
    setSaleCustomerId('');
    setSaleNotes('');
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowEditSaleModal(true);
  };

  const handleSaveEditedSale = () => {
    if (!editingSale) return;
    setSales(prev => prev.map(s => s.id === editingSale.id ? editingSale : s));
    setShowEditSaleModal(false);
    setEditingSale(null);
  };

  const handleCancelSale = (saleId: string) => {
    if (confirm('¿Estás seguro de cancelar esta venta?')) {
      setSales(prev => prev.filter(s => s.id !== saleId));
    }
  };

  // Funciones de edición de productos
  const handleEditItem = (item: TrackedItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    setItems(prev => prev.map(item => item.id === editingItem.id ? editingItem : item));
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string, sku: string) => {
    if (confirm(`¿Estás seguro de eliminar "${sku}"?`)) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  // Estadísticas
  const stats = useMemo(() => {
    const total = items.length;
    const ok = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'ok').length;
    const missing = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'missing').length;
    const partial = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'partial').length;
    const pending = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'pending').length;
    const extra = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'extra').length;
    return { total, ok, missing, partial, pending, extra };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesFilter = currentFilter === 'all' || calculateStatus(item.qtyPdf, item.qtyReceived) === currentFilter;
      const matchesCategory = selectedCategory === 'all' || item.categoryId === parseInt(selectedCategory);
      const matchesSearch = searchQuery === '' || 
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vehicles.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesCategory && matchesSearch;
    });
  }, [items, currentFilter, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    return inventoryData.map(cat => ({ id: cat.id, name: cat.name, count: cat.items.length }));
  }, []);

  const totalSalesAmount = useMemo(() => sales.reduce((sum, s) => sum + s.totalPrice, 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((sum, s) => sum + ((s.salePrice - s.unitPrice) * s.quantity), 0), [sales]);

  const monthlySales = useMemo(() => {
    const grouped: Record<string, Sale[]> = {};
    sales.forEach(sale => {
      const month = sale.date.substring(0, 7);
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(sale);
    });
    return grouped;
  }, [sales]);

  const outOfStockItems = useMemo(() => {
    return items.filter(item => getStockForItem(item) === 0 && item.qtyReceived !== null && item.qtyReceived > 0);
  }, [items, sales]);

  const frequentSalesItems = useMemo(() => {
    const salesCount: Record<string, number> = {};
    sales.forEach(sale => {
      salesCount[sale.sku] = (salesCount[sale.sku] || 0) + 1;
    });
    return items
      .filter(item => salesCount[item.sku] >= 2)
      .map(item => ({ ...item, salesCount: salesCount[item.sku] || 0 }))
      .sort((a, b) => b.salesCount - a.salesCount);
  }, [items, sales]);

  // Exportar inventario a Excel
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario');

    worksheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Descripción', key: 'description', width: 30 },
      { header: 'Vehículos', key: 'vehicles', width: 25 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Cantidad PDF', key: 'qtyPdf', width: 12 },
      { header: 'Cantidad Física', key: 'qtyReceived', width: 15 },
      { header: 'Precio Unitario', key: 'unitPrice', width: 15 },
      { header: 'Estado', key: 'status', width: 12 },
    ];

    items.forEach(item => {
      worksheet.addRow({
        sku: item.sku,
        description: item.description,
        vehicles: item.vehicles,
        category: item.category,
        qtyPdf: item.qtyPdf,
        qtyReceived: item.qtyReceived || 0,
        unitPrice: item.unitPrice,
        status: calculateStatus(item.qtyPdf, item.qtyReceived),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventario_GvAutoPartes_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exportar ventas a Excel (MEJORADO)
  const exportSalesToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GvAutoPartes';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Ventas', { properties: { defaultRowHeight: 20 } });

    worksheet.columns = [
      { key: 'num', width: 6 },
      { key: 'date', width: 12 },
      { key: 'customerName', width: 20 },
      { key: 'customerPhone', width: 15 },
      { key: 'customerId', width: 12 },
      { key: 'sku', width: 15 },
      { key: 'description', width: 30 },
      { key: 'quantity', width: 10 },
      { key: 'unitPrice', width: 12 },
      { key: 'salePrice', width: 12 },
      { key: 'totalPrice', width: 12 },
      { key: 'profit', width: 12 },
      { key: 'notes', width: 25 },
    ];

    // Encabezado profesional
    const now = new Date();
    const fecha = now.toLocaleDateString('es-VE');
    const hora = now.toLocaleTimeString('es-VE');
    const totalVentas = sales.length;
    const montoTotal = sales.reduce((sum, s) => sum + s.totalPrice, 0);
    const gananciaTotal = sales.reduce((sum, s) => sum + ((s.salePrice - s.unitPrice) * s.quantity), 0);

    // Fila 1: Nombre de la empresa
    worksheet.mergeCells('A1:M1');
    const cellEmpresa = worksheet.getCell('A1');
    cellEmpresa.value = 'GvAutoPartes';
    cellEmpresa.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1E3A8A' } };
    cellEmpresa.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Fila 2: Título del reporte
    worksheet.mergeCells('A2:M2');
    const cellTitulo = worksheet.getCell('A2');
    cellTitulo.value = 'Reporte de Ventas';
    cellTitulo.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF374151' } };
    cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;

    // Fila 3: Metadatos
    worksheet.mergeCells('A3:G3');
    worksheet.getCell('A3').value = `Fecha de Exportación: ${fecha} ${hora}`;
    worksheet.getCell('A3').font = { name: 'Arial', size: 10, color: { argb: 'FF6B7280' } };
    worksheet.getCell('A3').alignment = { horizontal: 'left' };

    worksheet.mergeCells('H3:M3');
    worksheet.getCell('H3').value = `Total de Ventas: ${totalVentas}`;
    worksheet.getCell('H3').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
    worksheet.getCell('H3').alignment = { horizontal: 'right' };
    worksheet.getRow(3).height = 20;

    // Fila 4: Resumen financiero
    worksheet.mergeCells('A4:M4');
    const cellResumen = worksheet.getCell('A4');
    cellResumen.value = `💰 Monto Total: $${montoTotal.toFixed(2)} | 📈 Ganancia Total: $${gananciaTotal.toFixed(2)}`;
    cellResumen.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF059669' } };
    cellResumen.alignment = { horizontal: 'center', vertical: 'middle' };
    cellResumen.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
    worksheet.getRow(4).height = 25;

    // Fila 5: Espacio
    worksheet.getRow(5).height = 8;

    // Fila 6: Encabezados de tabla (agregados manualmente)
    const headerRowNum = 6;
    const headerRow = worksheet.getRow(headerRowNum);
    headerRow.values = ['N°', 'Fecha', 'Cliente', 'Teléfono', 'Cédula', 'SKU', 'Producto', 'Cantidad', 'Precio Ref.', 'Precio Venta', 'Total', 'Ganancia', 'Notas'];
    headerRow.eachCell((cell: any) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });
    headerRow.height = 25;

    // Agregar datos de ventas
    sales.forEach((sale, index) => {
      const profit = (sale.salePrice - sale.unitPrice) * sale.quantity;
      
      // CORRECCIÓN DE FECHA: Parsear correctamente la fecha
      let formattedDate = '';
      if (sale.date) {
        // Si la fecha está en formato YYYY-MM-DD
        if (sale.date.includes('-')) {
          const [year, month, day] = sale.date.split('-');
          formattedDate = `${day}/${month}/${year}`;
        } else {
          // Si es un timestamp ISO completo
          const dateObj = new Date(sale.date);
          if (!isNaN(dateObj.getTime())) {
            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const year = dateObj.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
          }
        }
      }
      
      const row = worksheet.addRow({
        num: index + 1,
        date: formattedDate,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone || '',
        customerId: sale.customerId || '',
        sku: sale.sku,
        description: sale.description,
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
        salePrice: sale.salePrice,
        totalPrice: sale.totalPrice,
        profit: profit,
        notes: sale.notes || '',
      });

      // Estilo de las filas (efecto cebra)
      const isEven = index % 2 === 0;
      row.eachCell((cell: any, colNumber: number) => {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF333333' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF3F4F6' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };

        // Alineaciones específicas por columna
        if (colNumber === 1) { // N°
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2) { // Fecha
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 7) { // Descripción
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        } else if (colNumber === 8) { // Cantidad
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber >= 9 && colNumber <= 12) { // Precios y ganancia
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '$#,##0.00';
          
          // Colorear ganancia
          if (colNumber === 12) {
            const profitValue = cell.value as number;
            if (profitValue > 0) {
              cell.font = { name: 'Arial', size: 10, color: { argb: 'FF059669' }, bold: true };
            } else if (profitValue < 0) {
              cell.font = { name: 'Arial', size: 10, color: { argb: 'FFDC2626' }, bold: true };
            }
          }
        } else if (colNumber === 13) { // Notas
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });

      row.height = 20;
    });

    // Congelar paneles (congelar encabezados)
    worksheet.views = [
      { state: 'frozen', ySplit: headerRowNum, xSplit: 0 }
    ];

    // Activar autofiltros
    worksheet.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum + sales.length, column: 13 }
    };

    // Pie de página
    const footerRowNum = headerRowNum + sales.length + 2;
    worksheet.mergeCells(`A${footerRowNum}:M${footerRowNum}`);
    const cellFooter = worksheet.getCell(`A${footerRowNum}`);
    cellFooter.value = 'Documento generado automáticamente por el Sistema de Ventas de GvAutoPartes | Proveedor: Guzimport, C.A.';
    cellFooter.font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF9CA3AF' } };
    cellFooter.alignment = { horizontal: 'center', vertical: 'middle' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ventas_GvAutoPartes_${fecha.replace(/\//g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Respaldo JSON
  const exportJSON = () => {
    const data = { items, sales, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Respaldo_GvAutoPartes_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.items) setItems(data.items);
        if (data.sales) setSales(data.sales);
        alert('✅ Respaldo cargado exitosamente');
      } catch {
        alert('❌ Error al cargar el respaldo');
      }
    };
    reader.readAsText(file);
  };

  const resetData = () => {
    if (confirm('¿Estás seguro de resetear todos los datos?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SALES_KEY);
      setItems(initializeItems());
      setSales([]);
    }
  };

  // Componente de badge de estado
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      ok: 'bg-green-100 text-green-800',
      missing: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800',
      extra: 'bg-blue-100 text-blue-800',
    };
    const labels: Record<string, string> = {
      ok: '✅ Completo',
      missing: '❌ Faltante',
      partial: '⚠️ Parcial',
      pending: '⏳ Pendiente',
      extra: '⭐ Extra',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📦 GvAutoPartes</h1>
              <p className="text-xs sm:text-sm text-gray-600">Sistema de Inventario y Ventas</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCurrentView('inventory')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'inventory' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📋 Inventario
              </button>
              <button
                onClick={() => setCurrentView('sales')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'sales' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                💰 Ventas ({sales.length})
              </button>
              <button
                onClick={() => { logout(); setIsAuthenticated(false); }}
                className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm transition-colors"
              >
                🚪 Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {currentView === 'inventory' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">✅ Completos</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.ok}</p>
              </div>
              <div className="bg-red-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">❌ Faltantes</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.missing}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">⚠️ Parciales</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.partial}</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">⭐ Extra</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.extra}</p>
              </div>
              <div className="bg-gray-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">⏳ Pendientes</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Buscar por SKU, descripción o vehículo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  <option value="all">Todas las Categorías</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.count})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {['all', 'ok', 'missing', 'partial', 'pending', 'extra'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setCurrentFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      currentFilter === filter ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {filter === 'all' ? 'Todos' : filter === 'ok' ? '✅ Completos' : filter === 'missing' ? '❌ Faltantes' : filter === 'partial' ? '⚠️ Parciales' : filter === 'pending' ? '⏳ Pendientes' : '⭐ Extra'}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={exportToExcel} className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors">
                📥 Exportar Excel
              </button>
              <button onClick={exportJSON} className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors">
                💾 Respaldo JSON
              </button>
              <label className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-colors cursor-pointer">
                📂 Cargar Respaldo
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
              <button onClick={resetData} className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm transition-colors">
                🔄 Resetear
              </button>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700">SKU</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700">Descripción</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 hidden md:table-cell">Vehículos</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700">PDF</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700">Físico</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700">Precio</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700">Estado</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-mono text-blue-600 font-semibold">{item.sku}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="font-medium text-gray-900">{item.description}</div>
                          <div className="text-xs text-gray-500 md:hidden">{item.vehicles}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 hidden md:table-cell">{item.vehicles}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          <input
                            type="number"
                            value={item.qtyPdf}
                            onChange={(e) => updateQtyPdf(item.id, e.target.value)}
                            className="w-14 sm:w-16 px-2 py-1 border border-gray-300 rounded text-center text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          <input
                            type="number"
                            value={item.qtyReceived || ''}
                            onChange={(e) => updateQtyReceived(item.id, e.target.value)}
                            className="w-14 sm:w-16 px-2 py-1 border border-gray-300 rounded text-center text-xs sm:text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateUnitPrice(item.id, e.target.value)}
                            className="w-16 sm:w-20 px-2 py-1 border border-gray-300 rounded text-center text-xs sm:text-sm"
                            step="0.01"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          <StatusBadge status={calculateStatus(item.qtyPdf, item.qtyReceived)} />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button
                              onClick={() => handleOpenSaleModal(item)}
                              disabled={getStockForItem(item) <= 0}
                              className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                              title="Vender"
                            >
                              💰
                            </button>
                            <button
                              onClick={() => handleEditItem(item)}
                              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium transition-colors"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.sku)}
                              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-medium transition-colors"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sales Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-green-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">💰 Total Vendido</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">${totalSalesAmount.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">📈 Ganancia</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">${totalProfit.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">📊 Total Ventas</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{sales.length}</p>
              </div>
              <div className="bg-purple-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">📅 Meses</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">{Object.keys(monthlySales).length}</p>
              </div>
              <div className="bg-orange-50 rounded-lg shadow p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">🔥 Frecuentes</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{frequentSalesItems.length}</p>
              </div>
            </div>

            {/* Alerts */}
            {outOfStockItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4">
                <h3 className="text-base sm:text-lg font-bold text-red-800 mb-2">❌ Productos Sin Stock</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {outOfStockItems.slice(0, 6).map(item => (
                    <div key={item.id} className="bg-white rounded p-2 sm:p-3 border border-red-300">
                      <div className="font-mono text-xs sm:text-sm text-blue-700 font-bold">{item.sku}</div>
                      <div className="text-xs sm:text-sm text-gray-800 mt-1">{item.description}</div>
                      <div className="text-xs text-red-600 font-bold mt-1">❌ Sin Stock</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {frequentSalesItems.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 sm:p-3 mb-4">
                <h3 className="text-sm sm:text-base font-bold text-orange-800 mb-2">🔥 Ventas Frecuentes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {frequentSalesItems.slice(0, 8).map(item => (
                    <div key={item.id} className="bg-white rounded p-2 border border-orange-300">
                      <div className="font-mono text-xs text-blue-700 font-bold truncate">{item.sku}</div>
                      <div className="text-xs text-orange-600 font-bold mt-1">🔥 {item.salesCount} ventas</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sales Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={exportSalesToExcel} className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors">
                📥 Exportar Ventas Excel
              </button>
            </div>

            {/* Sales by Month */}
            {Object.keys(monthlySales).length > 0 ? (
              <div className="space-y-4 sm:space-y-6">
                {Object.keys(monthlySales).sort().reverse().map(month => {
                  const monthSales = monthlySales[month];
                  const monthTotal = monthSales.reduce((sum, s) => sum + s.totalPrice, 0);
                  const monthName = new Date(month + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
                  
                  return (
                    <div key={month} className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <h3 className="text-base sm:text-xl font-bold capitalize">{monthName}</h3>
                          <div className="text-right">
                            <div className="text-lg sm:text-2xl font-bold">${monthTotal.toFixed(2)}</div>
                            <div className="text-xs sm:text-sm opacity-90">{monthSales.length} ventas</div>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700">Fecha</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700">Cliente</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 hidden md:table-cell">Teléfono</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 hidden lg:table-cell">Cédula</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700">Producto</th>
                              <th className="px-2 sm:px-4 py-2 text-center font-semibold text-gray-700">Cant.</th>
                              <th className="px-2 sm:px-4 py-2 text-right font-semibold text-gray-700 hidden sm:table-cell">P. Ref.</th>
                              <th className="px-2 sm:px-4 py-2 text-right font-semibold text-gray-700">P. Venta</th>
                              <th className="px-2 sm:px-4 py-2 text-right font-semibold text-gray-700">Total</th>
                              <th className="px-2 sm:px-4 py-2 text-center font-semibold text-gray-700">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {monthSales.map(sale => (
                              <tr key={sale.id} className="hover:bg-gray-50">
                                <td className="px-2 sm:px-4 py-2 text-gray-600">
                                  {new Date(sale.date).toLocaleDateString('es-VE')}
                                </td>
                                <td className="px-2 sm:px-4 py-2 text-gray-800 font-medium">{sale.customerName}</td>
                                <td className="px-2 sm:px-4 py-2 text-gray-600 hidden md:table-cell">{sale.customerPhone || '-'}</td>
                                <td className="px-2 sm:px-4 py-2 text-gray-600 hidden lg:table-cell">{sale.customerId || '-'}</td>
                                <td className="px-2 sm:px-4 py-2">
                                  <div className="font-mono text-blue-700 text-xs">{sale.sku}</div>
                                  <div className="text-gray-800 text-xs sm:text-sm">{sale.description}</div>
                                </td>
                                <td className="px-2 sm:px-4 py-2 text-center font-bold">{sale.quantity}</td>
                                <td className="px-2 sm:px-4 py-2 text-right text-gray-500 hidden sm:table-cell">${sale.unitPrice.toFixed(2)}</td>
                                <td className="px-2 sm:px-4 py-2 text-right text-green-700 font-semibold">${sale.salePrice.toFixed(2)}</td>
                                <td className="px-2 sm:px-4 py-2 text-right font-bold text-green-700">${sale.totalPrice.toFixed(2)}</td>
                                <td className="px-2 sm:px-4 py-2 text-center">
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => handleEditSale(sale)}
                                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleCancelSale(sale.id)}
                                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-medium"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">💰</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No hay ventas registradas</h3>
                <p className="text-sm sm:text-base text-gray-500">Ve al inventario y haz click en 💰 para registrar tu primera venta</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Sale Modal */}
      {showSaleModal && selectedItemForSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
              <h2 className="text-lg sm:text-xl font-bold">💰 Registrar Venta</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="font-mono text-sm text-blue-700 font-bold">{selectedItemForSale.sku}</div>
                <div className="text-sm sm:text-base text-gray-800 mt-1">{selectedItemForSale.description}</div>
                <div className="text-xs text-gray-500 mt-1">{selectedItemForSale.vehicles}</div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Stock disponible:</span>
                  <span className="text-base sm:text-lg font-bold text-green-600">{getStockForItem(selectedItemForSale)} unidades</span>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Fecha de Venta</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  value={saleCustomerName}
                  onChange={(e) => setSaleCustomerName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={saleCustomerPhone}
                    onChange={(e) => setSaleCustomerPhone(e.target.value)}
                    placeholder="0414-1234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cédula</label>
                  <input
                    type="text"
                    value={saleCustomerId}
                    onChange={(e) => setSaleCustomerId(e.target.value)}
                    placeholder="V-12345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  max={getStockForItem(selectedItemForSale)}
                  value={saleQuantity}
                  onChange={(e) => setSaleQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Precio Ref.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={saleUnitPrice}
                    onChange={(e) => setSaleUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Precio Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border-2 border-green-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-green-700 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Notas</label>
                <textarea
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="Observaciones..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base resize-none"
                />
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 sm:p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Total:</span>
                  <span className="text-lg sm:text-2xl font-bold text-green-700">${(saleQuantity * salePrice).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleRegisterSale}
                  className="flex-1 bg-green-600 text-white px-4 py-2 sm:py-3 rounded-lg hover:bg-green-700 font-semibold text-sm sm:text-base transition-colors"
                >
                  ✅ Registrar
                </button>
                <button
                  onClick={() => setShowSaleModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 sm:py-3 rounded-lg hover:bg-gray-300 font-semibold text-sm sm:text-base transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showEditSaleModal && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
              <h2 className="text-lg sm:text-xl font-bold">✏️ Editar Venta</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="font-mono text-sm text-blue-700 font-bold">{editingSale.sku}</div>
                <div className="text-sm sm:text-base text-gray-800 mt-1">{editingSale.description}</div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editingSale.date.split('T')[0]}
                  onChange={(e) => setEditingSale({ ...editingSale, date: new Date(e.target.value).toISOString() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  value={editingSale.customerName}
                  onChange={(e) => setEditingSale({ ...editingSale, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editingSale.customerPhone}
                    onChange={(e) => setEditingSale({ ...editingSale, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cédula</label>
                  <input
                    type="text"
                    value={editingSale.customerId}
                    onChange={(e) => setEditingSale({ ...editingSale, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={editingSale.quantity}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 1;
                    setEditingSale({ ...editingSale, quantity: qty, totalPrice: qty * editingSale.salePrice });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Precio Ref.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingSale.unitPrice}
                    onChange={(e) => setEditingSale({ ...editingSale, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Precio Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingSale.salePrice}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0;
                      setEditingSale({ ...editingSale, salePrice: price, totalPrice: editingSale.quantity * price });
                    }}
                    className="w-full px-3 py-2 border-2 border-green-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-green-700 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Notas</label>
                <textarea
                  value={editingSale.notes}
                  onChange={(e) => setEditingSale({ ...editingSale, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base resize-none"
                />
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Total:</span>
                  <span className="text-lg sm:text-2xl font-bold text-blue-700">${editingSale.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleSaveEditedSale}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 sm:py-3 rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base transition-colors"
                >
                  💾 Guardar
                </button>
                <button
                  onClick={() => setShowEditSaleModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 sm:py-3 rounded-lg hover:bg-gray-300 font-semibold text-sm sm:text-base transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
              <h2 className="text-lg sm:text-xl font-bold">✏️ Editar Producto</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={editingItem.sku}
                  onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Vehículos Compatibles</label>
                <textarea
                  value={editingItem.vehicles}
                  onChange={(e) => setEditingItem({ ...editingItem, vehicles: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base resize-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Categoría</label>
                <input
                  type="text"
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cantidad PDF</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.qtyPdf}
                    onChange={(e) => setEditingItem({ ...editingItem, qtyPdf: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Cantidad Física</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.qtyReceived || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, qtyReceived: e.target.value === '' ? null : parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Precio Unitario</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingItem.unitPrice}
                  onChange={(e) => setEditingItem({ ...editingItem, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 sm:py-3 rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base transition-colors"
                >
                  💾 Guardar
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 sm:py-3 rounded-lg hover:bg-gray-300 font-semibold text-sm sm:text-base transition-colors"
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
