import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePOS } from '@/contexts/POSContext.jsx';
import InventoryItemCard from './InventoryItemCard';
import InventoryForm from './InventoryForm';
import { Input } from '@/components/ui/input';

const InventoryList = () => {
  const { inventory, updateInventoryItem, deleteInventoryItem } = usePOS();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState('');

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (formData) => {
    updateInventoryItem(editingItem.id, formData);
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteInventoryItem(id);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search inventory..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-1/2 lg:w-1/3 bg-black/20 border-amber-800/50 text-amber-100"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <InventoryItemCard
              item={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id)}
            />
          </motion.div>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-effect border-amber-800/50">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Edit Item</DialogTitle>
          </DialogHeader>
          <InventoryForm
            item={editingItem}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InventoryList;
