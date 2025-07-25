
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const POSContext = createContext();

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const POSProvider = ({ children }) => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedShift = localStorage.getItem('moonland_shift');
    if (savedShift) {
      setCurrentShift(JSON.parse(savedShift));
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        apiClient.getInventory().then(data => setInventory(data || [])),
        apiClient.getSales().then(data => {
          // Normalize monetary fields, status, and parse JSON fields
          const normalized = (data || []).map(sale => {
            let customerInfo = sale.customer_info;
            if (typeof customerInfo === 'string') {
              try { customerInfo = JSON.parse(customerInfo); } catch { customerInfo = {}; }
            }
            let items = sale.items;
            if (typeof items === 'string') {
              try { items = JSON.parse(items); } catch { items = []; }
            }
            return {
              ...sale,
              total: sale.total !== undefined ? Number(sale.total) : 0,
              profit: sale.profit !== undefined ? Number(sale.profit) : 0,
              total_cost: sale.total_cost !== undefined ? Number(sale.total_cost) : 0,
              status: sale.status ? String(sale.status) : '',
              customerInfo,
              items,
              timestamp: sale.created_at || sale.timestamp,
              receiptNumber: sale.receipt_number || sale.receiptNumber,
            };
          });
          setSales(normalized);
        }),
        apiClient.getExpenses().then(data => setExpenses(data || [])),
        apiClient.getStaff().then(data => setStaff(data || [])),
        apiClient.getCategories().then(data => setCategories(data || [])),
      ]).finally(() => setLoading(false));
    } else {
      // Clear data on logout
      setInventory([]);
      setSales([]);
      setExpenses([]);
      setStaff([]);
      setCategories([]);
      setLoading(false);
    }
  }, [user]);

  // --- Cart ---
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };
  
  const removeFromCart = (itemId) => setCart(cart.filter(item => item.id !== itemId));
  
  const updateCartQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== itemId));
      return;
    }
    setCart(cart.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  };
  
  const clearCart = () => setCart([]);

  // --- Sales ---
  const processSale = async (paymentInfo) => {
    if (cart.length === 0) {
      toast({ title: "Error", description: "Cart is empty", variant: "destructive" });
      return null;
    }
    
    const receiptNumber = generateId('RCP');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalCost = cart.reduce((sum, item) => sum + ((item.cost_price || 0) * item.quantity), 0);

    const saleData = {
      receipt_number: receiptNumber,
      items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
      total,
      total_cost: totalCost,
      profit: total - totalCost,
      payment_method: paymentInfo.paymentMethod,
      customer_info: paymentInfo.customerInfo,
      status: paymentInfo.paymentMethod === 'credit' ? 'unpaid' : 'paid',
      cashier_name: currentShift?.cashierName || 'Unknown'
    };

    try {
      const newSale = await apiClient.addSale(saleData);

      // Update inventory stock
      const stockUpdates = cart.map(cartItem => {
        const currentItem = inventory.find(item => item.id === cartItem.id);
        const newStock = currentItem ? (Number(currentItem.stock) - Number(cartItem.quantity)) : 0;
        return apiClient.updateStock(cartItem.id, newStock);
      });
      await Promise.all(stockUpdates);

      setSales(prev => [...prev, newSale]);
      setCart([]);
      toast({ title: "Sale Completed", description: `Receipt #${receiptNumber}` });
      return { ...newSale, receiptNumber: newSale.receipt_number };
    } catch (error) {
      console.error('Process Sale Error:', error);
      toast({ title: "Sale Failed", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const payCreditSale = async (saleId) => {
    try {
      const updatedSale = await apiClient.payCreditSale(saleId);
      setSales(sales.map(s => s.id === saleId ? updatedSale : s));
      toast({ title: "Credit Sale Paid" });
    } catch (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  // --- Expenses ---
  const addExpense = async (expense) => {
    const expenseData = {
      ...expense,
      cashier_name: currentShift?.cashierName || 'Admin'
    };
    
    try {
      const newExpense = await apiClient.addExpense(expenseData);
      setExpenses(prev => [...prev, newExpense]);
      toast({ title: "Expense Recorded" });
    } catch (error) {
      toast({ title: "Expense Error", description: error.message, variant: "destructive" });
    }
  };

  // --- Shift ---
  const startShift = (cashierName, startingCash) => {
    const shift = {
      id: Date.now().toString(),
      cashierName,
      startTime: new Date().toISOString(),
      startingCash: parseFloat(startingCash),
    };
    setCurrentShift(shift);
    localStorage.setItem('moonland_shift', JSON.stringify(shift));
    toast({ title: "Shift Started", description: `Welcome ${cashierName}!` });
  };

  const endShift = () => {
    setCurrentShift(null);
    localStorage.removeItem('moonland_shift');
    toast({ title: "Shift Ended" });
  };

  // --- Inventory ---
  const addInventoryItem = async (item) => {
    try {
      const newItem = await apiClient.addInventoryItem(item);
      setInventory(prev => [...prev, newItem]);
      toast({ title: "Item Added" });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateInventoryItem = async (id, updatedItem) => {
    try {
      const updatedItemData = await apiClient.updateInventoryItem(id, updatedItem);
      setInventory(inventory.map(item => (item.id === id ? updatedItemData : item)));
      toast({ title: "Item Updated" });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteInventoryItem = async (id) => {
    try {
      await apiClient.deleteInventoryItem(id);
      setInventory(inventory.filter(item => item.id !== id));
      toast({ title: "Item Deleted" });
    } catch (error) {
      console.error('Delete Inventory Error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getLowStockItems = () => inventory.filter(item => item.stock <= item.low_stock_alert);

  const refreshInventory = async () => {
    const updatedInventory = await apiClient.getInventory();
    setInventory(updatedInventory || []);
  };

  // --- Categories ---
  const addCategory = async (name) => {
    try {
      const newCategory = await apiClient.addCategory({ name });
      // Refresh categories from backend after adding
      const updatedCategories = await apiClient.getCategories();
      setCategories(updatedCategories || []);
      toast({ title: "Category Added" });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const removeCategory = async (id) => {
    try {
      await apiClient.deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      toast({ title: "Category Removed" });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateCategory = async (id, data) => {
    try {
      const updatedCategory = await apiClient.updateCategory(id, data);
      setCategories(categories.map(c => c.id === id ? updatedCategory : c));
      toast({ title: "Category Updated" });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const value = {
    inventory,
    sales,
    expenses,
    currentShift,
    cart,
    staff,
    categories,
    loading,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    processSale,
    payCreditSale,
    addExpense,
    startShift,
    endShift,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getLowStockItems,
    addCategory,
    removeCategory,
    updateCategory,
    refreshInventory,
  };

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};
