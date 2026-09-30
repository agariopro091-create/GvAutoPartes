import { useState, useMemo, useEffect, useRef } from 'react';
import { inventoryData, type InventoryItem, type ItemStatus } from './data/inventory';
import { unitPrices } from './data/prices';
import ExcelJS from 'exceljs';

interface TrackedItem extends InventoryItem {
  id: string;
  categoryId: number;
  inPdf: boolean;
  inExcel: boolean;
  inPhysical: boolean;
  qtyPdf: number;
  qtyReceived: number | null;
  unitPrice: number;
}

const STORAGE_KEY = 'gvautopartes_inventory_data_v5';

const allItems: TrackedItem[] = inventoryData.flatMap(category => 
  category.items.map((item, idx) => ({
    ...item,
    id: `${category.id}-${idx}`,
    categoryId: category.id,
    inPdf: true,
    inExcel: true,
    inPhysical: false,
    qtyPdf: item.qtyPdf,
    qtyReceived: item.qtyPhysical,
    unitPrice: unitPrices[item.sku] || 0
  }))
);

function loadItems(): TrackedItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const savedItems: TrackedItem[] = JSON.parse(saved);
      const savedMap = new Map(savedItems.map(item => [item.sku, item]));
      
      const syncedItems = allItems.map(originalItem => {
        const savedItem = savedMap.get(originalItem.sku);
        if (savedItem) {
          return {
            ...originalItem,
            qtyReceived: savedItem.qtyReceived,
            unitPrice: savedItem.unitPrice !== undefined ? savedItem.unitPrice : originalItem.unitPrice,
            inPdf: savedItem.inPdf !== undefined ? savedItem.inPdf : originalItem.inPdf,
            inExcel: savedItem.inExcel !== undefined ? savedItem.inExcel : originalItem.inExcel,
            inPhysical: savedItem.inPhysical !== undefined ? savedItem.inPhysical : originalItem.inPhysical,
          };
        }
        return originalItem;
      });
      
      const originalSkus = new Set(allItems.map(item => item.sku));
      const customItems = savedItems.filter(item => !originalSkus.has(item.sku));
      
      return [...syncedItems, ...customItems];
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return allItems;
}

function saveItems(items: TrackedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

function calculateStatus(qtyPdf: number, qtyReceived: number | null): ItemStatus {
  if (qtyReceived === null || qtyReceived === undefined) return 'pending';
  if (qtyReceived === 0) return 'missing';
  if (qtyReceived < qtyPdf) return 'partial';
  if (qtyReceived === qtyPdf) return 'ok';
  if (qtyReceived > qtyPdf) return 'extra';
  return 'pending';
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const config: Record<ItemStatus, { label: string; className: string }> = {
    pending: { label: '⏳ Pendiente', className: 'bg-gray-200 text-gray-700' },
    ok: { label: '✅ Completo', className: 'bg-green-200 text-green-800' },
    missing: { label: '❌ No Vino', className: 'bg-red-200 text-red-800' },
    partial: { label: '⚠️ Faltan', className: 'bg-yellow-200 text-yellow-800' },
    extra: { label: '⭐ Extra', className: 'bg-blue-200 text-blue-800' }
  };
  
  const { label, className } = config[status];
  return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${className}`}>{label}</span>;
}

function IndicatorDots({ inPdf, inExcel, inPhysical }: { inPdf: boolean; inExcel: boolean; inPhysical: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {inPdf && <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)] border border-red-600" title="En Despacho PDF"></div>}
      {inExcel && <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)] border border-green-600" title="En Catálogo Excel"></div>}
      {inPhysical && <div className="w-3.5 h-3.5 rounded-full bg-purple-500 shadow-[0_0_4px_rgba(168,85,247,0.5)] border border-purple-600" title="Físico No en Lista"></div>}
      {!inPdf && !inExcel && !inPhysical && <span className="text-gray-400 text-xs">N/A</span>}
    </div>
  );
}

// ============================================
// SISTEMA DE AUTENTICACIÓN
// ============================================
const AUTH_KEY = 'gvautopartes_auth';
const DEFAULT_PASSWORD = 'gvautopartes2026';

function checkAuth(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'authenticated';
}

function login(password: string): boolean {
  const savedPassword = localStorage.getItem('gvautopartes_password') || DEFAULT_PASSWORD;
  if (password === savedPassword) {
    localStorage.setItem(AUTH_KEY, 'authenticated');
    return true;
  }
  return false;
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
}

function changePassword(oldPassword: string, newPassword: string): boolean {
  const savedPassword = localStorage.getItem('gvautopartes_password') || DEFAULT_PASSWORD;
  if (oldPassword === savedPassword) {
    localStorage.setItem('gvautopartes_password', newPassword);
    return true;
  }
  return false;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      onLogin();
    } else {
      setError('Contraseña incorrecta');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (changePassword(oldPass, newPass)) {
      alert('✅ Contraseña cambiada exitosamente');
      setShowChangePassword(false);
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      setError('');
    } else {
      setError('La contraseña actual es incorrecta');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">GvAutoPartes</h1>
          <p className="text-gray-500">Sistema de Inventario Privado</p>
          <p className="text-xs text-gray-400 mt-2">Proveedor: Guzimport, C.A.</p>
        </div>

        {!showChangePassword ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="Ingresa tu contraseña"
                autoFocus
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">❌ {error}</div>
            )}
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors">🔓 Iniciar Sesión</button>
            <button type="button" onClick={() => setShowChangePassword(true)} className="w-full text-gray-500 hover:text-gray-700 text-sm underline">¿Cambiar contraseña?</button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Cambiar Contraseña</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña Actual</label>
              <input type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nueva Contraseña</label>
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar Nueva Contraseña</label>
              <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none" required minLength={6} />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">❌ {error}</div>}
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">💾 Guardar</button>
              <button type="button" onClick={() => { setShowChangePassword(false); setError(''); }} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold">❌ Cancelar</button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Documento: 80010868 | Proveedor: Guzimport, C.A.</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth);
  const [items, setItems] = useState<TrackedItem[]>(loadItems);
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para el modal de ventas
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    sku: '', description: '', vehicles: '', category: '', newCategory: '',
    qtyPdf: 0, qtyReceived: null as number | null,
    inPdf: true, inExcel: true, inPhysical: false
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackedItem | null>(null);

  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      const success = saveItems(items);
      setSaveStatus(success ? 'saved' : 'error');
    }, 300);
    return () => clearTimeout(timer);
  }, [items]);



  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const status = calculateStatus(item.qtyPdf, item.qtyReceived);
      const matchesFilter = currentFilter === 'all' || status === currentFilter;
      const matchesCategory = selectedCategory === 'all' || item.categoryId === parseInt(selectedCategory);
      const normalizedSearch = normalizeText(searchQuery);
      const matchesSearch = searchQuery === '' || 
        normalizeText(item.sku).includes(normalizedSearch) ||
        normalizeText(item.description).includes(normalizedSearch) ||
        normalizeText(item.vehicles).includes(normalizedSearch) ||
        normalizeText(item.category).includes(normalizedSearch);
      return matchesFilter && matchesSearch && matchesCategory;
    });
  }, [items, currentFilter, searchQuery, selectedCategory]);

  const updateQtyPdf = (id: string, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, qtyPdf: parseInt(value) || 0 } : item));
  };

  const updateQtyReceived = (id: string, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, qtyReceived: value === '' ? null : parseInt(value) } : item));
  };

  const updateUnitPrice = (id: string, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, unitPrice: parseFloat(value) || 0 } : item));
  };

  const resetData = () => {
    if (window.confirm('¿Resetear todos los datos?')) {
      setItems(allItems);
      saveItems(allItems);
      setSaveStatus('saved');
    }
  };

  const handleDeleteItem = (id: string, sku: string) => {
    if (window.confirm(`¿Eliminar "${sku}"?`)) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleEditItem = (item: TrackedItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    if (!editingItem.sku.trim() || !editingItem.description.trim()) {
      alert('❌ SKU y descripción son obligatorios');
      return;
    }
    setItems(prev => prev.map(item => item.id === editingItem.id ? editingItem : item));
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleAddItem = () => {
    if (!newItem.sku.trim() || !newItem.description.trim()) {
      alert('❌ SKU y descripción son obligatorios');
      return;
    }
    const category = newItem.newCategory.trim() || newItem.category;
    if (!category) {
      alert('❌ Debes seleccionar o crear una categoría');
      return;
    }
    
    const newItemData: TrackedItem = {
      id: `custom-${Date.now()}`,
      sku: newItem.sku.trim(),
      description: newItem.description.trim(),
      vehicles: newItem.vehicles.trim(),
      category: category,
      categoryId: 999,
      qtyPdf: newItem.qtyPdf,
      qtyPhysical: newItem.qtyReceived,
      qtyReceived: newItem.qtyReceived,
      status: calculateStatus(newItem.qtyPdf, newItem.qtyReceived),
      inPdf: newItem.inPdf,
      inExcel: newItem.inExcel,
      inPhysical: newItem.inPhysical,
      unitPrice: 0
    };
    
    setItems(prev => [...prev, newItemData]);
    setNewItem({ sku: '', description: '', vehicles: '', category: '', newCategory: '', qtyPdf: 0, qtyReceived: null, inPdf: true, inExcel: true, inPhysical: false });
    setShowAddModal(false);
  };

  const exportCSV = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GvAutoPartes';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet('Inventario', { properties: { defaultRowHeight: 20 } });

      worksheet.columns = [
        { header: 'N°', key: 'num', width: 6 },
        { header: 'Indicadores', key: 'indicators', width: 14 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Código SKU', key: 'sku', width: 18 },
        { header: 'Descripción', key: 'description', width: 35 },
        { header: 'Vehículos Compatibles', key: 'vehicles', width: 40 },
        { header: 'Cant. PDF', key: 'qtyPdf', width: 12 },
        { header: 'Cant. Física', key: 'qtyReceived', width: 12 },
        { header: 'Estado', key: 'status', width: 14 },
        { header: 'Precio Unitario', key: 'unitPrice', width: 14 },
        { header: 'Precio Venta', key: 'salePrice', width: 14 }
      ];

      const now = new Date();
      const fecha = now.toLocaleDateString('es-VE');
      const hora = now.toLocaleTimeString('es-VE');
      const totalItems = items.length;
      const completados = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'ok').length;
      const faltantes = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'missing').length;
      const incompletos = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'partial').length;
      const extra = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'extra').length;
      const pendientes = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'pending').length;

      worksheet.mergeCells('A1:K1');
      const cellEmpresa = worksheet.getCell('A1');
      cellEmpresa.value = 'GvAutoPartes';
      cellEmpresa.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1E3A8A' } };
      cellEmpresa.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      worksheet.mergeCells('A2:K2');
      worksheet.getCell('A2').value = 'Inventario General - Respaldo de Emergencia';
      worksheet.getCell('A2').font = { name: 'Arial', size: 14, bold: true };
      worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells('A3:F3');
      worksheet.getCell('A3').value = `Fecha: ${fecha} ${hora}`;
      worksheet.mergeCells('G3:K3');
      worksheet.getCell('G3').value = `Total: ${totalItems} productos`;
      worksheet.getCell('G3').alignment = { horizontal: 'right' };

      worksheet.mergeCells('A4:K4');
      worksheet.getCell('A4').value = `✅ Completos: ${completados} | ❌ Faltantes: ${faltantes} | ⚠️ Incompletos: ${incompletos} | ⭐ Extra: ${extra} | ⏳ Pendientes: ${pendientes}`;
      worksheet.getCell('A4').alignment = { horizontal: 'center' };

      worksheet.getRow(5).height = 8;

      const headerRowNum = 6;
      const headerRow = worksheet.getRow(headerRowNum);
      headerRow.eachCell((cell: ExcelJS.Cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      items.forEach((item, index) => {
        let indicators = '';
        if (item.inPdf) indicators += '🔴 PDF ';
        if (item.inExcel) indicators += '🟢 Excel ';
        if (item.inPhysical) indicators += '🟣 Físico';

        const status = calculateStatus(item.qtyPdf, item.qtyReceived);
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
          qtyPdf: item.qtyPdf,
          qtyReceived: item.qtyReceived === null ? 0 : item.qtyReceived,
          status: statusText[status],
          unitPrice: item.unitPrice,
          salePrice: ''
        });

        const isEven = index % 2 === 0;
        row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF3F4F6' } };
          if (colNumber === 10) {
            cell.numFmt = '$#,##0.00';
            cell.font = { name: 'Arial', size: 10, color: { argb: 'FF059669' } };
          }
          if (colNumber === 11) {
            cell.numFmt = '$#,##0.00';
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4E6' } };
          }
        });
      });

      worksheet.views = [{ state: 'frozen', ySplit: headerRowNum, xSplit: 0 }];
      worksheet.autoFilter = { from: { row: headerRowNum, column: 1 }, to: { row: headerRowNum + items.length, column: 11 } };

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

  const exportJSON = () => {
    const fecha = new Date().toISOString().split('T')[0];
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Respaldo_GvAutoPartes_${fecha}.json`;
    link.click();
  };

  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data) && data.every((item: any) => 'sku' in item)) {
          setItems(data);
          saveItems(data);
          alert('✅ Respaldo cargado');
        } else {
          alert('❌ Archivo inválido');
        }
      } catch {
        alert('❌ Error al leer archivo');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stats = useMemo(() => {
    return {
      total: items.length,
      ok: items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'ok').length,
      missing: items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'missing').length,
      partial: items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'partial').length,
      pending: items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'pending').length,
      extra: items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'extra').length
    };
  }, [items]);

  const categories = useMemo(() => {
    return inventoryData.map(cat => ({ id: cat.id, name: cat.name, count: cat.items.length }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        {/* Header */}
        <div className="mb-6 border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">📦 GvAutoPartes</h1>
              <p className="text-gray-500 text-sm mt-1">Sistema de Inventario y Ventas</p>
              <p className="text-xs text-gray-400 mt-1">Documento: 80010868 | Proveedor: Guzimport, C.A.</p>
            </div>
            <button onClick={() => { if (window.confirm('¿Cerrar sesión?')) { logout(); setIsAuthenticated(false); } }} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 shadow-md font-semibold text-sm mt-2 md:mt-0">🚪 Salir</button>
          </div>
          
          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-md font-semibold text-sm">📥 Exportar Excel</button>
            <button onClick={exportJSON} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md font-semibold text-sm">💾 Respaldo JSON</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-md font-semibold text-sm">📂 Cargar Respaldo</button>
            <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-md font-semibold text-sm">➕ Agregar</button>
            <button onClick={() => { if (window.confirm(`¿Recargar ${allItems.length} productos?`)) { setItems(allItems); saveItems(allItems); } }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-md font-semibold text-sm">📥 Recargar Todo</button>
            <button onClick={resetData} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 shadow-md font-semibold text-sm">🔄 Resetear</button>
          </div>
          <input type="file" ref={fileInputRef} onChange={importJSON} accept=".json" style={{ display: 'none' }} />
          <div className="text-xs mt-2">
            {saveStatus === 'saving' && <span className="text-yellow-600">⏳ Guardando...</span>}
            {saveStatus === 'saved' && <span className="text-green-600">✅ Guardado automáticamente</span>}
            {saveStatus === 'error' && <span className="text-red-600">❌ Error al guardar</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-xs text-gray-600 mt-1">Total Items</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
              <div className="text-xs text-gray-600 mt-1">✅ Completos</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <div className="text-2xl font-bold text-red-600">{stats.missing}</div>
              <div className="text-xs text-gray-600 mt-1">❌ No Vino</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{stats.partial}</div>
              <div className="text-xs text-gray-600 mt-1">⚠️ Faltan</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{stats.extra}</div>
              <div className="text-xs text-gray-600 mt-1">⭐ Extra</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
              <div className="text-2xl font-bold text-gray-500">{stats.pending}</div>
              <div className="text-xs text-gray-600 mt-1">⏳ Pendientes</div>
            </div>
          </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="font-bold text-gray-700">Leyenda:</span>
                <span className="flex items-center gap-1"><div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-600"></div>PDF</span>
                <span className="flex items-center gap-1"><div className="w-3.5 h-3.5 rounded-full bg-green-500 border border-green-600"></div>Excel</span>
                <span className="flex items-center gap-1"><div className="w-3.5 h-3.5 rounded-full bg-purple-500 border border-purple-600"></div>Físico</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'ok', 'missing', 'partial', 'extra'].map(filter => (
                  <button key={filter} onClick={() => setCurrentFilter(filter)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${currentFilter === filter ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                    {filter === 'all' ? 'Todos' : filter === 'pending' ? '⏳ Pendientes' : filter === 'ok' ? '✅ Completos' : filter === 'missing' ? '❌ No Vino' : filter === 'partial' ? '⚠️ Faltan' : '⭐ Extra'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="Buscar por SKU, descripción o vehículo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
              </div>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 outline-none text-sm bg-white min-w-[200px]">
                <option value="all">Todas las Categorías</option>
                {categories.map(cat => <option key={cat.id} value={cat.id.toString()}>{cat.name} ({cat.count})</option>)}
              </select>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full bg-white text-sm">
                <thead className="bg-gray-800 text-white text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 text-center">Indicadores</th>
                    <th className="py-3 px-4 text-left">Código SKU</th>
                    <th className="py-3 px-4 text-left">Descripción / Vehículos</th>
                    <th className="py-3 px-4 text-center">Enviado (PDF)</th>
                    <th className="py-3 px-4 text-center">Recibido (Físico)</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Precio Unitario</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {filteredItems.map((item) => {
                    const status = calculateStatus(item.qtyPdf, item.qtyReceived);
                    return (
                      <tr key={item.id} className="border-b hover:bg-blue-50 transition-colors">
                        <td className="py-3 px-4 text-center"><IndicatorDots inPdf={item.inPdf} inExcel={item.inExcel} inPhysical={item.inPhysical} /></td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{item.sku}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800">{item.description}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.vehicles}</div>
                          <div className="text-xs text-gray-400 mt-0.5 italic">{item.category}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input type="number" min="0" className="w-[70px] text-center border-2 border-dashed border-gray-300 rounded-md px-2 py-1 font-bold focus:border-blue-500 focus:bg-blue-50 outline-none" value={item.qtyPdf} onChange={(e) => updateQtyPdf(item.id, e.target.value)} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input type="number" min="0" className="w-[70px] text-center border-2 border-dashed border-gray-300 rounded-md px-2 py-1 font-bold focus:border-blue-500 focus:bg-blue-50 outline-none" value={item.qtyReceived === null ? '' : item.qtyReceived} placeholder="0" onChange={(e) => updateQtyReceived(item.id, e.target.value)} onFocus={(e) => e.target.select()} />
                        </td>
                        <td className="py-3 px-4 text-center"><StatusBadge status={status} /></td>
                        <td className="py-3 px-4 text-center">
                          <input type="number" min="0" step="0.01" className="w-[90px] text-center border-2 border-dashed border-green-300 rounded-md px-2 py-1 font-bold text-green-700 focus:border-green-500 focus:bg-green-50 outline-none" value={item.unitPrice} onChange={(e) => updateUnitPrice(item.id, e.target.value)} onFocus={(e) => e.target.select()} placeholder="0.00" />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => handleEditItem(item)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">✏️</button>
                            <button onClick={() => handleDeleteItem(item.id, item.sku)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-600">No se encontraron resultados</h3>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4 text-center">
          Mostrando: <span className="font-bold">{filteredItems.length}</span> de {items.length} productos
        </p>

        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400"><strong className="text-gray-600">GvAutoPartes</strong> | Proveedor: Guzimport, C.A.</p>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-emerald-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                <h2 className="text-xl font-bold">➕ Agregar Nueva Pieza</h2>
                <button onClick={() => setShowAddModal(false)} className="text-white text-2xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                <input type="text" value={newItem.sku} onChange={(e) => setNewItem({...newItem, sku: e.target.value})} placeholder="Código SKU *" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <input type="text" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} placeholder="Descripción *" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <textarea value={newItem.vehicles} onChange={(e) => setNewItem({...newItem, vehicles: e.target.value})} placeholder="Vehículos Compatibles" rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <select value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="">Seleccionar categoría...</option>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                <input type="text" value={newItem.newCategory} onChange={(e) => setNewItem({...newItem, newCategory: e.target.value})} placeholder="O crear nueva categoría..." className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" min="0" value={newItem.qtyPdf} onChange={(e) => setNewItem({...newItem, qtyPdf: parseInt(e.target.value) || 0})} placeholder="Cantidad PDF" className="px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="number" min="0" value={newItem.qtyReceived === null ? '' : newItem.qtyReceived} onChange={(e) => setNewItem({...newItem, qtyReceived: e.target.value === '' ? null : parseInt(e.target.value)})} placeholder="Cantidad Recibida" className="px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleAddItem} className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-semibold">✅ Agregar</button>
                  <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold">❌ Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEditModal && editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                <h2 className="text-xl font-bold">✏️ Editar Pieza</h2>
                <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-white text-2xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                <input type="text" value={editingItem.sku} onChange={(e) => setEditingItem({...editingItem, sku: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <input type="text" value={editingItem.description} onChange={(e) => setEditingItem({...editingItem, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <textarea value={editingItem.vehicles} onChange={(e) => setEditingItem({...editingItem, vehicles: e.target.value})} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <input type="text" value={editingItem.category} onChange={(e) => setEditingItem({...editingItem, category: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <div className="grid grid-cols-3 gap-4">
                  <input type="number" min="0" value={editingItem.qtyPdf} onChange={(e) => setEditingItem({...editingItem, qtyPdf: parseInt(e.target.value) || 0})} placeholder="Cant. PDF" className="px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="number" min="0" value={editingItem.qtyReceived === null ? '' : editingItem.qtyReceived} onChange={(e) => setEditingItem({...editingItem, qtyReceived: e.target.value === '' ? null : parseInt(e.target.value)})} placeholder="Cant. Física" className="px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="number" min="0" step="0.01" value={editingItem.unitPrice} onChange={(e) => setEditingItem({...editingItem, unitPrice: parseFloat(e.target.value) || 0})} placeholder="Precio Unit." className="px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">💾 Guardar</button>
                  <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold">❌ Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
