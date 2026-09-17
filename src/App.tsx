import { useState, useMemo, useEffect, useRef } from 'react';
import { inventoryData, InventoryItem, ItemStatus } from './data/inventory';

// Flatten all items and add tracking fields
interface TrackedItem extends InventoryItem {
  id: string;
  categoryId: number;
  inPdf: boolean;
  inExcel: boolean;
  inPhysical: boolean;
  qtyPdf: number;
  qtyReceived: number | null;
}

const STORAGE_KEY = 'guzimport_inventory_data';

const allItems: TrackedItem[] = inventoryData.flatMap(category => 
  category.items.map((item, idx) => ({
    ...item,
    id: `${category.id}-${idx}`,
    categoryId: category.id,
    inPdf: true,
    inExcel: true,
    inPhysical: false,
    qtyPdf: item.qtyPdf,
    qtyReceived: item.qtyPhysical
  }))
);

// Load data from localStorage or use default
function loadItems(): TrackedItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const savedItems: TrackedItem[] = JSON.parse(saved);
      
      // Verificar si faltan items del archivo original
      const savedSkus = new Set(savedItems.map(item => item.sku));
      const missingItems = allItems.filter(item => !savedSkus.has(item.sku));
      
      if (missingItems.length > 0) {
        console.log(`Agregando ${missingItems.length} items nuevos desde el archivo original`);
        return [...savedItems, ...missingItems];
      }
      
      return savedItems;
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
  }
  return allItems;
}

// Save data to localStorage
function saveItems(items: TrackedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
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

// Función para normalizar texto (remover acentos)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const config = {
    pending: { label: '⏳ Pendiente', className: 'bg-gray-200 text-gray-700' },
    ok: { label: '✅ Completo', className: 'bg-green-200 text-green-800' },
    missing: { label: '❌ No Vino', className: 'bg-red-200 text-red-800' },
    partial: { label: '⚠️ Faltan', className: 'bg-yellow-200 text-yellow-800' },
    extra: { label: '⭐ Extra', className: 'bg-blue-200 text-blue-800' }
  };
  
  const { label, className } = config[status];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${className}`}>
      {label}
    </span>
  );
}

function IndicatorDots({ inPdf, inExcel, inPhysical }: { inPdf: boolean; inExcel: boolean; inPhysical: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {inPdf && (
        <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)] border border-red-600" title="En Despacho PDF"></div>
      )}
      {inExcel && (
        <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)] border border-green-600" title="En Catálogo Excel"></div>
      )}
      {inPhysical && (
        <div className="w-3.5 h-3.5 rounded-full bg-purple-500 shadow-[0_0_4px_rgba(168,85,247,0.5)] border border-purple-600" title="Físico No en Lista"></div>
      )}
      {!inPdf && !inExcel && !inPhysical && (
        <span className="text-gray-400 text-xs">N/A</span>
      )}
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState<TrackedItem[]>(loadItems);
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para el modal de agregar pieza
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    sku: '',
    description: '',
    vehicles: '',
    category: '',
    newCategory: '',
    qtyPdf: 0,
    qtyReceived: null as number | null,
    inPdf: true,
    inExcel: true,
    inPhysical: false
  });

  // Estados para el modal de editar pieza
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackedItem | null>(null);

  // Auto-save to localStorage whenever items change
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      const success = saveItems(items);
      setSaveStatus(success ? 'saved' : 'error');
    }, 300);
    return () => clearTimeout(timer);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const status = calculateStatus(item.qtyPdf, item.qtyReceived);
      const matchesFilter = currentFilter === 'all' || status === currentFilter;
      const matchesCategory = selectedCategory === 'all' || item.categoryId === parseInt(selectedCategory);
      
      // Normalizar búsqueda y campos para comparar sin acentos
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
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, qtyPdf: parseInt(value) || 0 } : item
    ));
  };

  const updateQtyReceived = (id: string, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, qtyReceived: value === '' ? null : parseInt(value) } : item
    ));
  };

  const resetData = () => {
    if (window.confirm('¿Estás seguro de que deseas resetear todos los datos? Esta acción no se puede deshacer.')) {
      setItems(allItems);
      saveItems(allItems);
      setSaveStatus('saved');
    }
  };

  // NUEVA FUNCIÓN: Eliminar pieza
  const handleDeleteItem = (id: string, sku: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la pieza "${sku}"?\n\nEsta acción no se puede deshacer.`)) {
      setItems(prev => prev.filter(item => item.id !== id));
      alert('✅ Pieza eliminada exitosamente');
    }
  };

  // NUEVA FUNCIÓN: Abrir modal de edición
  const handleEditItem = (item: TrackedItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  // NUEVA FUNCIÓN: Guardar cambios de edición
  const handleSaveEdit = () => {
    if (!editingItem) return;

    if (!editingItem.sku.trim()) {
      alert('❌ El código SKU es obligatorio');
      return;
    }
    
    if (!editingItem.description.trim()) {
      alert('❌ La descripción es obligatoria');
      return;
    }

    const skuExists = items.some(item => 
      item.id !== editingItem.id && 
      item.sku.toLowerCase() === editingItem.sku.trim().toLowerCase()
    );
    
    if (skuExists) {
      alert('❌ Ya existe otra pieza con ese código SKU');
      return;
    }

    setItems(prev => prev.map(item => 
      item.id === editingItem.id ? editingItem : item
    ));

    setShowEditModal(false);
    setEditingItem(null);
    alert('✅ Pieza actualizada exitosamente');
  };

  // NUEVA FUNCIÓN: Agregar nueva pieza
  const handleAddItem = () => {
    if (!newItem.sku.trim()) {
      alert('❌ El código SKU es obligatorio');
      return;
    }
    
    if (!newItem.description.trim()) {
      alert('❌ La descripción es obligatoria');
      return;
    }
    
    const skuExists = items.some(item => item.sku.toLowerCase() === newItem.sku.trim().toLowerCase());
    if (skuExists) {
      alert('❌ Ya existe un producto con ese código SKU');
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
      inPhysical: newItem.inPhysical
    };
    
    setItems(prev => [...prev, newItemData]);
    
    setNewItem({
      sku: '',
      description: '',
      vehicles: '',
      category: '',
      newCategory: '',
      qtyPdf: 0,
      qtyReceived: null,
      inPdf: true,
      inExcel: true,
      inPhysical: false
    });
    
    setShowAddModal(false);
    alert('✅ Pieza agregada exitosamente');
  };

  const exportCSV = () => {
    const fecha = new Date().toLocaleDateString('es-VE');
    const hora = new Date().toLocaleTimeString('es-VE');
    
    const totalItems = filteredItems.length;
    const completados = filteredItems.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'ok').length;
    const faltantes = filteredItems.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'missing').length;
    const incompletos = filteredItems.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'partial').length;
    const extra = filteredItems.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'extra').length;
    const pendientes = filteredItems.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'pending').length;
    
    let csvContent = "\uFEFF";
    
    csvContent += "GUZIMPORT, C.A.;;;;;;;;;;\n";
    csvContent += "REPORTE DE INVENTARIO FISICO VS DESPACHO;;;;;;;;;;\n";
    csvContent += ";;;;;;;;;;\n";
    csvContent += `Documento:;80010868;;;Fecha:;${fecha};;;;\n`;
    csvContent += `Hora de Exportacion:;${hora};;;Cliente:;AUTOPARTES GV 2023 C.A.;;;;\n`;
    csvContent += ";;;;;;;;;;\n";
    csvContent += "================================================================================\n";
    csvContent += "RESUMEN GENERAL;;;;;;;;;;\n";
    csvContent += "================================================================================\n";
    csvContent += `Total de Items:;${totalItems};;;;;;;;;\n`;
    csvContent += `Completos:;${completados};;;;;;;;;\n`;
    csvContent += `Faltantes:;${faltantes};;;;;;;;;\n`;
    csvContent += `Incompletos:;${incompletos};;;;;;;;;\n`;
    csvContent += `Extra:;${extra};;;;;;;;;\n`;
    csvContent += `Pendientes:;${pendientes};;;;;;;;;\n`;
    csvContent += ";;;;;;;;;;\n";
    csvContent += "================================================================================\n";
    csvContent += "LEYENDA DE INDICADORES;;;;;;;;;;\n";
    csvContent += "================================================================================\n";
    csvContent += "PDF = En Despacho (Documento PDF);;;;;;;;;;\n";
    csvContent += "Excel = En Catalogo (Excel Maestro);;;;;;;;;;\n";
    csvContent += "Fisico = Fisico No en Lista;;;;;;;;;;\n";
    csvContent += ";;;;;;;;;;\n";
    csvContent += "================================================================================\n";
    csvContent += "DETALLE DE INVENTARIO;;;;;;;;;;\n";
    csvContent += "================================================================================\n";
    csvContent += ";;;;;;;;;;\n";
    
    csvContent += "N;Indicadores;Categoria;Codigo SKU;Descripcion;Vehiculos Compatibles;Cant. PDF;Cant. Fisica;Estado;Precio Venta\n";
    csvContent += "--------------------------------------------------------------------------------\n";
    
    filteredItems.forEach((item, index) => {
      let ind = "";
      if (item.inPdf) ind += "PDF ";
      if (item.inExcel) ind += "Excel ";
      if (item.inPhysical) ind += "Fisico";
      
      const status = calculateStatus(item.qtyPdf, item.qtyReceived);
      const cleanDesc = item.description.replace(/"/g, '""');
      const cleanVehicles = item.vehicles.replace(/"/g, '""');
      
      const row = [
        index + 1,
        ind,
        item.category,
        item.sku,
        `"${cleanDesc}"`,
        `"${cleanVehicles}"`,
        item.qtyPdf,
        item.qtyReceived === null ? 0 : item.qtyReceived,
        status.toUpperCase(),
        ""
      ].join(";");
      csvContent += row + "\n";
    });
    
    csvContent += "--------------------------------------------------------------------------------\n";
    csvContent += ";;;;;;;;;;\n";
    csvContent += "NOTAS;;;;;;;;;;\n";
    csvContent += "La columna 'Precio Venta' esta vacia para que usted pueda completar los precios.;;;;;;;;;;\n";
    csvContent += "Este reporte fue generado automaticamente por el sistema de inventario de Guzimport.;;;;;;;;;;\n";
    csvContent += ";;;;;;;;;;\n";
    csvContent += "GUZIMPORT, C.A. | Pedido Minimo 3000$ | Solo Pago en Divisas;;;;;;;;;;\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventario_Guzimport_${fecha.replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    try {
      const fecha = new Date().toISOString().split('T')[0];
      const jsonContent = JSON.stringify(items, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Respaldo_Inventario_Guzimport_${fecha}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('✅ Respaldo guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar respaldo:', error);
      alert('❌ Error al guardar el respaldo');
    }
  };

  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!Array.isArray(data)) {
          alert('❌ Error: El archivo no contiene un array válido');
          return;
        }

        const isValid = data.every((item: any) => 
          item && typeof item === 'object' && 'sku' in item
        );

        if (!isValid) {
          alert('❌ Error: El archivo no contiene datos de inventario válidos');
          return;
        }

        setItems(data);
        saveItems(data);
        setSaveStatus('saved');
        alert('✅ Respaldo cargado exitosamente');
      } catch (error) {
        console.error('Error al cargar respaldo:', error);
        alert('❌ Error al leer el archivo JSON');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exportHTML = () => {
    try {
      const fecha = new Date().toISOString().split('T')[0];
      
      const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventario Guzimport - ${fecha}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    h1 { color: #1f2937; margin-bottom: 10px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #1f2937; color: white; padding: 12px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
    td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:hover { background: #f9fafb; }
    .sku { font-family: monospace; font-weight: bold; color: #2563eb; }
    .desc { font-weight: 600; color: #1f2937; }
    .vehicles { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .category { font-size: 11px; color: #9ca3af; font-style: italic; margin-top: 2px; }
    .qty-input { width: 70px; text-align: center; border: 2px dashed #d1d5db; border-radius: 6px; padding: 4px; font-weight: bold; }
    .qty-input:focus { border-color: #3b82f6; outline: none; background: #eff6ff; border-style: solid; }
    .badge { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .badge-pending { background: #e5e7eb; color: #4b5563; }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-missing { background: #fee2e2; color: #991b1b; }
    .badge-partial { background: #fef9c3; color: #854d0e; }
    .badge-extra { background: #dbeafe; color: #1e40af; }
    .dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; margin: 0 2px; }
    .dot-red { background: #ef4444; box-shadow: 0 0 4px rgba(239,68,68,0.5); }
    .dot-green { background: #22c55e; box-shadow: 0 0 4px rgba(34,197,94,0.5); }
    .dot-purple { background: #a855f7; box-shadow: 0 0 4px rgba(168,85,247,0.5); }
    .indicators { text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📦 Control de Inventario Físico vs Despacho</h1>
    <p class="subtitle">Edita las cantidades. El estado se calcula automáticamente.</p>
    <p class="subtitle">Documento: 80010868 | Fecha: ${fecha} | Cliente: AUTOPARTES GV 2023 C.A.</p>
    
    <table>
      <thead>
        <tr>
          <th>Indicadores</th>
          <th>Código SKU</th>
          <th>Descripción / Vehículos</th>
          <th>Enviado (PDF)</th>
          <th>Recibido (Físico)</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>
  </div>

  <script>
    const items = ${JSON.stringify(items)};

    function calculateStatus(qtyPdf, qtyReceived) {
      if (qtyReceived === null || qtyReceived === undefined) return 'pending';
      if (qtyReceived === 0) return 'missing';
      if (qtyReceived < qtyPdf) return 'partial';
      if (qtyReceived === qtyPdf) return 'ok';
      if (qtyReceived > qtyPdf) return 'extra';
      return 'pending';
    }

    function getStatusBadge(status) {
      const map = {
        'pending': '<span class="badge badge-pending">⏳ Pendiente</span>',
        'ok': '<span class="badge badge-ok">✅ Completo</span>',
        'missing': '<span class="badge badge-missing">❌ No Vino</span>',
        'partial': '<span class="badge badge-partial">⚠️ Faltan</span>',
        'extra': '<span class="badge badge-extra">⭐ Extra</span>'
      };
      return map[status] || '';
    }

    function renderTable() {
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';

      items.forEach((item, index) => {
        const status = calculateStatus(item.qtyPdf, item.qtyReceived);
        
        let indicators = '';
        if (item.inPdf) indicators += '<span class="dot dot-red" title="En Despacho PDF"></span>';
        if (item.inExcel) indicators += '<span class="dot dot-green" title="En Catálogo Excel"></span>';
        if (item.inPhysical) indicators += '<span class="dot dot-purple" title="Físico No en Lista"></span>';
        if (!item.inPdf && !item.inExcel && !item.inPhysical) indicators += '<span style="color:#9ca3af;font-size:12px;">N/A</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td class="indicators">\${indicators}</td>
          <td class="sku">\${item.sku}</td>
          <td>
            <div class="desc">\${item.description}</div>
            <div class="vehicles">\${item.vehicles}</div>
            <div class="category">\${item.category}</div>
          </td>
          <td style="text-align:center;">
            <input type="number" min="0" class="qty-input" value="\${item.qtyPdf}" 
                   onchange="updatePdf(\${index}, this.value)">
          </td>
          <td style="text-align:center;">
            <input type="number" min="0" class="qty-input" value="\${item.qtyReceived === null ? '' : item.qtyReceived}" 
                   placeholder="0" onchange="updateReceived(\${index}, this.value)" onfocus="this.select()">
          </td>
          <td style="text-align:center;">\${getStatusBadge(status)}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function updatePdf(index, value) {
      items[index].qtyPdf = parseInt(value) || 0;
      renderTable();
    }

    function updateReceived(index, value) {
      items[index].qtyReceived = value === '' ? null : parseInt(value);
      renderTable();
    }

    renderTable();
  </script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Inventario_Guzimport_${fecha}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('✅ HTML guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar HTML:', error);
      alert('❌ Error al guardar el archivo HTML');
    }
  };

  const stats = useMemo(() => {
    const total = items.length;
    const ok = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'ok').length;
    const missing = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'missing').length;
    const partial = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'partial').length;
    const pending = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'pending').length;
    const extra = items.filter(i => calculateStatus(i.qtyPdf, i.qtyReceived) === 'extra').length;
    return { total, ok, missing, partial, pending, extra };
  }, [items]);

  const categories = useMemo(() => {
    return inventoryData.map(cat => ({
      id: cat.id,
      name: cat.name,
      count: cat.items.length
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📦 Control de Inventario Físico vs Despacho</h1>
            <p className="text-gray-500 text-sm mt-1">Edita las cantidades. El estado se calcula automáticamente.</p>
            <p className="text-xs text-gray-400 mt-1">Documento: 80010868 | Fecha: 07/09/2026 | Cliente: AUTOPARTES GV 2023 C.A.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap gap-2 justify-end">
              <button 
                onClick={exportCSV} 
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-md flex items-center gap-2 font-semibold transition-colors text-sm"
              >
                📥 Exportar Excel
              </button>
              <button 
                onClick={exportJSON} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 font-semibold transition-colors text-sm"
              >
                💾 Respaldo JSON
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-md flex items-center gap-2 font-semibold transition-colors text-sm"
              >
                📂 Cargar Respaldo
              </button>
              <button 
                onClick={exportHTML} 
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 shadow-md flex items-center gap-2 font-semibold transition-colors text-sm"
              >
                📄 Guardar HTML
              </button>
              <button 
                onClick={() => setShowAddModal(true)} 
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-md flex items-center gap-2 font-semibold transition-colors text-sm"
              >
                ➕ Agregar
              </button>
              <button 
                onClick={resetData} 
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 shadow-md flex items-center gap-2 font-semibold transition-colors text-sm"
                title="Resetear todos los datos a valores originales"
              >
                🔄 Resetear
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={importJSON}
              accept=".json"
              style={{ display: 'none' }}
            />
            <div className="flex items-center gap-2 text-xs">
              {saveStatus === 'saving' && (
                <span className="text-yellow-600 flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-green-600 flex items-center gap-1">
                  ✅ Cambios guardados automáticamente
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-600 flex items-center gap-1">
                  ❌ Error al guardar
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
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

        {/* Legend & Filters */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-bold text-gray-700">Leyenda:</span>
            <span className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-600"></div>
              En Despacho (PDF)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded-full bg-green-500 border border-green-600"></div>
              En Catálogo (Excel)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded-full bg-purple-500 border border-purple-600"></div>
              Físico No en Lista
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCurrentFilter('all')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${currentFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Todos</button>
            <button onClick={() => setCurrentFilter('pending')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${currentFilter === 'pending' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>⏳ Pendientes</button>
            <button onClick={() => setCurrentFilter('ok')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${currentFilter === 'ok' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>✅ Completos</button>
            <button onClick={() => setCurrentFilter('missing')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${currentFilter === 'missing' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>❌ No Vino</button>
            <button onClick={() => setCurrentFilter('partial')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${currentFilter === 'partial' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>⚠️ Faltan</button>
            <button onClick={() => setCurrentFilter('extra')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${currentFilter === 'extra' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>⭐ Extra</button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por SKU, descripción o vehículo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white min-w-[200px]"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id.toString()}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
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
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {filteredItems.map((item) => {
                const status = calculateStatus(item.qtyPdf, item.qtyReceived);
                return (
                  <tr key={item.id} className="border-b hover:bg-blue-50 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <IndicatorDots inPdf={item.inPdf} inExcel={item.inExcel} inPhysical={item.inPhysical} />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{item.sku}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-800">{item.description}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.vehicles}</div>
                      <div className="text-xs text-gray-400 mt-0.5 italic">{item.category}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input type="number" min="0" className="w-[70px] text-center border-2 border-dashed border-gray-300 rounded-md px-2 py-1 font-bold focus:border-blue-500 focus:bg-blue-50 focus:border-solid outline-none transition-all" value={item.qtyPdf} onChange={(e) => updateQtyPdf(item.id, e.target.value)} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input type="number" min="0" className="w-[70px] text-center border-2 border-dashed border-gray-300 rounded-md px-2 py-1 font-bold focus:border-blue-500 focus:bg-blue-50 focus:border-solid outline-none transition-all" value={item.qtyReceived === null ? '' : item.qtyReceived} placeholder="0" onChange={(e) => updateQtyReceived(item.id, e.target.value)} onFocus={(e) => e.target.select()} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleEditItem(item)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors" title="Editar pieza">✏️</button>
                        <button onClick={() => handleDeleteItem(item.id, item.sku)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors" title="Eliminar pieza">🗑️</button>
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
            <p className="text-sm text-gray-400 mt-1">Intenta con otro término de búsqueda o cambia los filtros</p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4 text-center">
          Total de registros mostrados: <span className="font-bold">{filteredItems.length}</span> de {items.length}
        </p>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Documento generado para control de inventario y etiquetado por modelo/marca de vehículo.</p>
          <p className="text-xs text-gray-400 mt-1"><strong className="text-gray-600">GUZIMPORT, C.A.</strong> | Pedido Mínimo 3000$ — Solo Pago en Divisas</p>
        </div>

        {/* Modal Agregar Pieza */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-emerald-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center sticky top-0">
                <h2 className="text-xl font-bold">➕ Agregar Nueva Pieza</h2>
                <button onClick={() => setShowAddModal(false)} className="text-white hover:text-gray-200 text-2xl font-bold">×</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código SKU <span className="text-red-500">*</span></label>
                  <input type="text" value={newItem.sku} onChange={(e) => setNewItem({...newItem, sku: e.target.value})} placeholder="Ej: DK-1234-W" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción <span className="text-red-500">*</span></label>
                  <input type="text" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} placeholder="Ej: Filtro de Aceite" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vehículos Compatibles</label>
                  <textarea value={newItem.vehicles} onChange={(e) => setNewItem({...newItem, vehicles: e.target.value})} placeholder="Ej: CHEVROLET CORSA, CHEVROLET AVEO" rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría <span className="text-red-500">*</span></label>
                  <select value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none mb-2">
                    <option value="">Seleccionar categoría existente...</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.name}>{cat.name}</option>))}
                  </select>
                  <input type="text" value={newItem.newCategory} onChange={(e) => setNewItem({...newItem, newCategory: e.target.value})} placeholder="O crear nueva categoría..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad PDF</label>
                    <input type="number" min="0" value={newItem.qtyPdf} onChange={(e) => setNewItem({...newItem, qtyPdf: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad Recibida</label>
                    <input type="number" min="0" value={newItem.qtyReceived === null ? '' : newItem.qtyReceived} onChange={(e) => setNewItem({...newItem, qtyReceived: e.target.value === '' ? null : parseInt(e.target.value)})} placeholder="Dejar vacío" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">¿En qué fuentes existe?</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newItem.inPdf} onChange={(e) => setNewItem({...newItem, inPdf: e.target.checked})} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div>En PDF</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newItem.inExcel} onChange={(e) => setNewItem({...newItem, inExcel: e.target.checked})} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div>En Excel</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newItem.inPhysical} onChange={(e) => setNewItem({...newItem, inPhysical: e.target.checked})} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500"></div>Físico No en Lista</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <button onClick={handleAddItem} className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-semibold transition-colors">✅ Agregar Pieza</button>
                  <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-colors">❌ Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar Pieza */}
        {showEditModal && editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center sticky top-0">
                <h2 className="text-xl font-bold">✏️ Editar Pieza</h2>
                <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-white hover:text-gray-200 text-2xl font-bold">×</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código SKU <span className="text-red-500">*</span></label>
                  <input type="text" value={editingItem.sku} onChange={(e) => setEditingItem({...editingItem, sku: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción <span className="text-red-500">*</span></label>
                  <input type="text" value={editingItem.description} onChange={(e) => setEditingItem({...editingItem, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vehículos Compatibles</label>
                  <textarea value={editingItem.vehicles} onChange={(e) => setEditingItem({...editingItem, vehicles: e.target.value})} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                  <input type="text" value={editingItem.category} onChange={(e) => setEditingItem({...editingItem, category: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad PDF</label>
                    <input type="number" min="0" value={editingItem.qtyPdf} onChange={(e) => setEditingItem({...editingItem, qtyPdf: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad Recibida</label>
                    <input type="number" min="0" value={editingItem.qtyReceived === null ? '' : editingItem.qtyReceived} onChange={(e) => setEditingItem({...editingItem, qtyReceived: e.target.value === '' ? null : parseInt(e.target.value)})} placeholder="Dejar vacío" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">¿En qué fuentes existe?</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingItem.inPdf} onChange={(e) => setEditingItem({...editingItem, inPdf: e.target.checked})} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div>En PDF</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingItem.inExcel} onChange={(e) => setEditingItem({...editingItem, inExcel: e.target.checked})} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div>En Excel</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingItem.inPhysical} onChange={(e) => setEditingItem({...editingItem, inPhysical: e.target.checked})} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500"></div>Físico No en Lista</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors">💾 Guardar Cambios</button>
                  <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-colors">❌ Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
