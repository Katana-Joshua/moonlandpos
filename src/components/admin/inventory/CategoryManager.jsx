import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOS } from '@/contexts/POSContext.jsx';
import { Edit, Trash2, ImagePlus } from 'lucide-react';

const CategoryManager = () => {
  const { categories, addCategory, removeCategory, updateCategory } = usePOS();
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const categoryFileInputRef = useRef(null);

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  const handleCategoryImageChange = (e) => {
    const file = e.target.files[0];
    if (file && editingCategory) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCategory(editingCategory.id, { image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const openCategoryEdit = (category) => {
    setEditingCategory(category);
    setEditName(category.name);
    // categoryFileInputRef.current?.click(); // Only open file input when editing image
  };

  const handleEditSave = () => {
    if (editName.trim() && editingCategory) {
      updateCategory(editingCategory.id, { name: editName });
      setEditingCategory(null);
      setEditName('');
    }
  };

  const handleEditCancel = () => {
    setEditingCategory(null);
    setEditName('');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name"
          className="bg-black/20 border-amber-800/50 text-amber-100"
        />
        <Button onClick={handleAddCategory} className="bg-amber-600 hover:bg-amber-700">Add</Button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between p-2 bg-black/20 rounded-md">
            <div className="flex items-center gap-3">
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="w-10 h-10 rounded-md object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-amber-950/50 flex items-center justify-center">
                  <ImagePlus className="w-5 h-5 text-amber-500" />
                </div>
              )}
              {editingCategory && editingCategory.id === cat.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="bg-black/10 border-amber-800/50 text-amber-100 w-32"
                  />
                  <Button size="sm" className="ml-2 bg-green-700 hover:bg-green-800" onClick={handleEditSave}>Save</Button>
                  <Button size="sm" variant="outline" className="ml-1" onClick={handleEditCancel}>Cancel</Button>
                </>
              ) : (
                <span className="text-amber-100">{cat.name}</span>
              )}
            </div>
            <div className="flex items-center">
              <Button size="sm" variant="ghost" onClick={() => openCategoryEdit(cat)}>
                <Edit className="w-4 h-4 text-amber-400" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => removeCategory(cat.id)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </div>
        ))}
        <input
          type="file"
          ref={categoryFileInputRef}
          onChange={handleCategoryImageChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default CategoryManager;
