import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DropdownOption {
  id: string;
  name: string;
  [key: string]: any;
}

interface CustomDropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onDelete?: (id: string) => void;
  onAdd?: (name: string) => void;
  placeholder?: string;
  searchable?: boolean;
  canAdd?: boolean;
  canDelete?: boolean;
  required?: boolean;
}

export const CustomDropdown = ({
  label,
  options,
  value,
  onChange,
  onDelete,
  onAdd,
  placeholder = 'Select option',
  searchable = true,
  canAdd = false,
  canDelete = false,
  required = false,
}: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.name === value || o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      console.log(`[Dropdown] Opened. Options: ${options.length}, Filtered: ${filteredOptions.length}, Value: "${value}"`);
      if (options.length > 0 && filteredOptions.length === 0 && search === '') {
        console.warn("[Dropdown] Options exist but filtered is empty! Search is empty.");
      }
    }
  }, [isOpen, options, filteredOptions, search, value]);

  const handleSelect = (option: DropdownOption) => {
    onChange(option.name);
    setIsOpen(false);
    setSearch('');
  };

  const handleAdd = () => {
    if (newName.trim() && onAdd) {
      onAdd(newName.trim());
      setNewName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2 px-1">
          {label} {required && '*'}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-white border flex items-center justify-between transition-all font-normal text-gray-900 group ${
          isOpen ? 'border-purple-600 ring-2 ring-purple-100 rounded-lg' : 'border-gray-300 hover:border-purple-200 rounded-lg'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-purple-600' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 w-full bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden mt-1"
          >
            {searchable && !isAdding && (
              <div className="p-3 border-b border-gray-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-normal text-gray-900 focus:ring-2 focus:ring-purple-600 outline-none"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto">
              {isAdding ? (
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdd();
                      }
                    }}
                    placeholder="Enter new name..."
                    className="w-full px-4 py-3 bg-purple-50 border border-purple-100 rounded-lg text-sm font-medium text-purple-900 outline-none"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdd();
                      }}
                      className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-widest"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold text-xs uppercase tracking-widest">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-purple-50 group cursor-pointer transition-colors"
                        onClick={() => handleSelect(option)}
                      >
                        <span className={`text-sm font-medium ${selectedOption?.id === option.id ? 'text-purple-600' : 'text-gray-700'}`}>
                          {option.name}
                        </span>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.(option.id);
                            }}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm font-medium">
                      No results found
                    </div>
                  )}

                  {canAdd && (
                    <button
                      type="button"
                      onClick={() => setIsAdding(true)}
                      className="w-full px-4 py-4 border-t border-gray-50 flex items-center justify-center space-x-2 text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-bold uppercase tracking-wider">Add New</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
