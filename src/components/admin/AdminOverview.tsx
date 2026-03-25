import { useEffect, useState } from 'react';
import { Package, ShoppingBag, DollarSign, Users, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminOverview() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({
    totalOrders: 0,
    shippedRevenue: 0,
    pendingRevenue: 0,
    totalProfit: 0,
    totalProducts: 0,
    totalCancelled: 0,
    cancellationRate: 0,
    lowStock: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          supabase.from('orders').select(`
            *,
            order_items (
              quantity,
              unit_price,
              products (cost_price)
            )
          `),
          supabase.from('products').select(`
            id,
            product_variants (stock_quantity)
          `)
        ]);
        
        let orders = ordersRes.data || [];
        let products = productsRes.data || [];
        
        // Filter orders by date range if specified
        let filteredOrders = [...orders];
        if (startDate) {
          filteredOrders = filteredOrders.filter(o => new Date(o.created_at) >= new Date(startDate));
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filteredOrders = filteredOrders.filter(o => new Date(o.created_at) <= end);
        }
        
        // Revenue only from shipped orders
        const shippedRevenue = filteredOrders
          .filter((order: any) => order.status === 'shipped')
          .reduce((acc: number, order: any) => acc + (Number(order.total_amount) || 0), 0);
        
        // Revenue from pending/confirmed orders
        const pendingRevenue = filteredOrders
          .filter((order: any) => order.status === 'pending' || order.status === 'processing')
          .reduce((acc: number, order: any) => acc + (Number(order.total_amount) || 0), 0);
        
        const totalCancelled = filteredOrders.filter((order: any) => order.status === 'cancelled').length;
        const cancellationRate = filteredOrders.length > 0 ? (totalCancelled / filteredOrders.length) * 100 : 0;
        
        const lowStock = products.filter((p: any) => {
          const totalStock = p.product_variants?.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0) || 0;
          return totalStock < 10;
        }).length;

        // Profit calculation (Shipped orders only)
        const totalProfit = filteredOrders
          .filter((order: any) => order.status === 'shipped')
          .reduce((acc: number, order: any) => {
            const orderCost = (order.order_items || []).reduce((itemAcc: number, item: any) => {
              const cost = item.products?.cost_price || 0;
              return itemAcc + (cost * item.quantity);
            }, 0);
            const orderRevenueWithoutShipping = (Number(order.total_amount) || 0) - (Number(order.delivery_charge) || 0);
            return acc + (orderRevenueWithoutShipping - orderCost);
          }, 0);

        setStats({
          totalOrders: filteredOrders.length,
          shippedRevenue,
          pendingRevenue,
          totalProfit,
          totalProducts: products.length,
          totalCancelled,
          cancellationRate,
          lowStock
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const statCards = [
    { 
      title: 'Shipped Revenue', 
      value: `BDT ${stats.shippedRevenue.toFixed(2)}`, 
      icon: DollarSign, 
      color: 'text-neon-green',
      subtext: 'Completed orders'
    },
    { 
      title: 'Estimated Profit', 
      value: `BDT ${stats.totalProfit.toFixed(2)}`, 
      icon: DollarSign, 
      color: 'text-neon-blue',
      subtext: 'Excl. ad spend/shipping'
    },
    { 
      title: 'Pending Revenue', 
      value: `BDT ${stats.pendingRevenue.toFixed(2)}`, 
      icon: Clock, 
      color: 'text-yellow-400',
      subtext: 'Pending/Processing'
    },
    { 
      title: 'Total Orders', 
      value: stats.totalOrders, 
      icon: ShoppingBag, 
      color: 'text-neon-blue',
      subtext: 'All time orders'
    },
    { 
      title: 'Cancellations', 
      value: stats.totalCancelled, 
      icon: Package, 
      color: 'text-red-500',
      subtext: `${stats.cancellationRate.toFixed(1)}% rate`
    },
    { 
      title: 'Low Stock Items', 
      value: stats.lowStock, 
      icon: Users, 
      color: 'text-orange-400',
      subtext: 'Needs attention'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Overview</h2>
        
        <div className="flex flex-wrap items-center gap-4 bg-card-bg p-3 rounded-2xl border border-border-primary">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-neon-blue" />
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Filter Date:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-dark-bg/50 border border-border-primary rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-neon-blue"
            />
            <span className="text-text-secondary text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-dark-bg/50 border border-border-primary rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-neon-blue"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-red-500 hover:text-red-400 font-bold ml-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-card-bg p-6 rounded-2xl border border-border-primary shadow-lg hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-dark-bg/50 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <h3 className="text-text-secondary text-sm font-medium">{stat.title}</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
            </div>
            <p className="text-xs text-text-secondary mt-2 opacity-60">{stat.subtext}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
