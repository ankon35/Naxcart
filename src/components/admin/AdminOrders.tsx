import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Package, Truck, CheckCircle, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  products?: {
    name: string;
    product_images?: { image_url: string }[];
  };
  product_variants?: {
    size: string;
  };
}

interface Order {
  id: string;
  user_id: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  delivery_charge: number;
  shipping_address: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_address: string;
    postal_code: string;
  };
  created_at: string;
  order_items: OrderItem[];
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            products (name, product_images (image_url)),
            product_variants (size)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as any);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      order.shipping_address?.customer_name?.toLowerCase().includes(searchLower) ||
      order.shipping_address?.customer_email?.toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower);
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(order.created_at) >= new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(order.created_at) <= end;
    }

    return matchesStatus && matchesSearch && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'processing': return 'text-blue-400 bg-blue-400/10';
      case 'shipped': return 'text-purple-400 bg-purple-400/10';
      case 'delivered': return 'text-green-400 bg-green-400/10';
      case 'cancelled': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) return <div className="text-text-primary">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-text-primary">Orders Management</h2>
        
        <div className="flex flex-col lg:flex-row gap-4 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-dark-bg/50 border border-border-primary rounded-xl pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:border-neon-blue"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-48 bg-dark-bg/50 border border-border-primary rounded-xl pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:border-neon-blue appearance-none cursor-pointer"
              >
                <option value="All" className="bg-dark-bg text-text-primary">All Status</option>
                <option value="pending" className="bg-dark-bg text-text-primary">Pending</option>
                <option value="processing" className="bg-dark-bg text-text-primary">Processing</option>
                <option value="shipped" className="bg-dark-bg text-text-primary">Shipped</option>
                <option value="delivered" className="bg-dark-bg text-text-primary">Delivered</option>
                <option value="cancelled" className="bg-dark-bg text-text-primary">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-dark-bg/50 border border-border-primary rounded-xl px-3 py-1">
            <Calendar size={16} className="text-text-secondary" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs text-text-primary focus:outline-none"
            />
            <span className="text-text-secondary text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs text-text-primary focus:outline-none"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-red-500 hover:text-red-400 font-bold ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card-bg border border-border-primary rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-primary text-text-secondary text-sm bg-dark-bg/50">
                <th className="py-4 px-6">Order ID</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Total</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr className="border-b border-border-primary/50 hover:bg-dark-bg/30 transition-colors">
                    <td className="py-4 px-6 font-mono text-neon-blue text-xs" title={order.id}>
                      #{order.id.substring(0, 8)}...
                    </td>
                    <td className="py-4 px-6 text-text-secondary">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-text-primary">{order.shipping_address?.customer_name || 'N/A'}</div>
                      <div className="text-sm text-text-secondary">{order.shipping_address?.customer_email || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-6 font-bold text-text-primary">
                      BDT {order.total_amount?.toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer ${getStatusColor(order.status)}`}
                      >
                        <option value="pending" className="bg-black text-white">Pending</option>
                        <option value="processing" className="bg-black text-white">Processing</option>
                        <option value="shipped" className="bg-black text-white">Shipped</option>
                        <option value="delivered" className="bg-black text-white">Delivered</option>
                        <option value="cancelled" className="bg-black text-white">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="text-text-secondary hover:text-text-primary flex items-center gap-1 text-sm"
                      >
                        {expandedOrder === order.id ? 'Hide Details' : 'View Details'}
                        {expandedOrder === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedOrder === order.id && (
                    <tr className="bg-dark-bg/20">
                      <td colSpan={6} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <h4 className="text-sm font-bold text-text-secondary mb-3 uppercase tracking-wider">Shipping Details</h4>
                            <div className="space-y-2 text-sm text-text-secondary">
                              <p><span className="opacity-70">Address:</span> {order.shipping_address?.customer_address}</p>
                              <p><span className="opacity-70">Postal Code:</span> {order.shipping_address?.postal_code}</p>
                              <p><span className="opacity-70">Phone:</span> {order.shipping_address?.customer_phone}</p>
                              <p><span className="opacity-70">Payment:</span> {order.payment_method}</p>
                              <p><span className="opacity-70">Payment Status:</span> {order.payment_status}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-bold text-text-secondary mb-3 uppercase tracking-wider">Order Items</h4>
                            <div className="space-y-3">
                              {order.order_items?.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 bg-dark-bg/50 p-3 rounded-lg border border-border-primary">
                                  {item.products?.product_images && item.products.product_images.length > 0 && (
                                    <img src={item.products.product_images[0].image_url} alt={item.products.name} className="w-12 h-12 object-cover rounded" />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-medium text-text-primary">{item.products?.name || 'Unknown Product'}</p>
                                    <p className="text-xs text-text-secondary">
                                      Size: {item.product_variants?.size || 'N/A'} | Qty: {item.quantity}
                                    </p>
                                  </div>
                                  <p className="font-mono text-neon-green">
                                    BDT {(item.unit_price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-border-primary space-y-2">
                              <div className="flex justify-between items-center text-sm text-text-secondary">
                                <span>Subtotal</span>
                                <span>BDT {(order.total_amount - (order.delivery_charge || 0)).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm text-text-secondary">
                                <span>Delivery Charge</span>
                                <span>BDT {(order.delivery_charge || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-border-primary">
                                <span className="font-bold text-text-primary">Total Amount</span>
                                <span className="font-bold text-xl text-neon-blue">BDT {order.total_amount?.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-secondary">
                    No orders found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
