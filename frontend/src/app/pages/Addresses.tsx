import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../components/Providers';
import { addressService } from '../utils/db';
import type { Address } from '../utils/types';
import { states, getDistrictsByState, validatePhone, validatePincode } from '../utils/stateDistrict';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CustomDropdown } from '../components/CustomDropdown';

export const Addresses = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading } = useAuthContext();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      console.log('[Addresses] Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    loadAddresses();
  }, [isAuthenticated, isLoading, navigate]);

  const loadAddresses = async () => {
    if (!user) return;
    const data = await addressService.getAll(user.id);
    setAddresses(data);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      isDefault: false,
    });
    setEditingId(null);
  };

  const handleEdit = (address: Address) => {
    setFormData({
      name: address.name,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      if (!user) return;
      await addressService.delete(id, user.id);
      await loadAddresses();
      toast.success('Address deleted');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.addressLine1 || !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!validatePincode(formData.pincode)) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }

    if (!user) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await addressService.update(editingId, user.id, formData);
        toast.success('Address updated');
      } else {
        await addressService.add(user.id, formData);
        toast.success('Address added');
      }
      await loadAddresses();
      setShowForm(false);
      resetForm();
    } catch {
      toast.error('Failed to save address');
    } finally {
      setIsSaving(false);
    }
  };

  const stateOptions = states.map(s => ({ id: s, name: s }));
  const districtOptions = formData.state ? getDistrictsByState(formData.state).map(d => ({ id: d, name: d })) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Addresses</h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Address</span>
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No addresses saved</h2>
            <p className="text-gray-600 mb-6">Add an address for faster checkout</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
            >
              Add Your First Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div key={address.id} className="bg-white rounded-lg shadow-sm p-6 relative">
                {address.isDefault && (
                  <span className="absolute top-4 right-4 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    Default
                  </span>
                )}
                <h3 className="font-semibold text-gray-900 mb-1">{address.name}</h3>
                <p className="text-sm text-gray-600 mb-1">{address.phone}</p>
                <p className="text-sm text-gray-700">
                  {address.addressLine1}
                  {address.addressLine2 && <>, {address.addressLine2}</>}
                  <br />
                  {address.city}, {address.state} - {address.pincode}
                </p>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleEdit(address)}
                    className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Address Form Modal */}
        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="sm:max-w-lg bg-white rounded-[2rem] border-none p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-gray-900">{editingId ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Address Line 1 *</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CustomDropdown
                  label="State *"
                  options={stateOptions}
                  value={formData.state}
                  onChange={(val) => setFormData({ ...formData, state: val, city: '' })}
                  placeholder="Select State"
                  required
                />
                <div className={!formData.state ? 'opacity-50 pointer-events-none' : ''}>
                  <CustomDropdown
                    label="District *"
                    options={districtOptions}
                    value={formData.city}
                    onChange={(val) => setFormData({ ...formData, city: val })}
                    placeholder="Select District"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Pincode *</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  maxLength={6}
                  placeholder="6-digit pincode"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
                />
              </div>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-gray-300 text-purple-600 focus:ring-purple-600 transition-all"
                />
                <span className="text-sm font-bold text-gray-700 group-hover:text-purple-600 transition-colors">Set as default address</span>
              </label>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black hover:bg-purple-700 transition shadow-xl shadow-purple-100 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : editingId ? 'Update Address' : 'Add Address'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};