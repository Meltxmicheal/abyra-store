// ============================================================
// ABYRA STORE — Supabase Database Service
// Replaces the localStorage-based storage.ts
// ============================================================
import { supabase } from "./supabase";
import type {
  Product,
  Variant,
  Category,
  Order,
  OrderStatus,
  CartItem,
  Address,
  SupportRequest,
} from "./types";

export type {
  Product,
  Variant,
  Category,
  Order,
  CartItem,
  Address,
  SupportRequest,
};

// ============================================================
// PRODUCTS
// ============================================================
export const productService = {
  getAll: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(`*, categories(name), product_images(image_url, is_primary), product_variants(*)`)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapProduct);
  },

  getById: async (id: string): Promise<Product | null> => {
    const { data, error } = await supabase
      .from("products")
      .select(`*, categories(name), product_images(image_url, is_primary), product_variants(*)`)
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return mapProduct(data);
  },

  save: async (
    product: Partial<Product> & { id?: string },
  ): Promise<Product | null> => {
    try {
      // 1. Find or create category
      let categoryId: string | null = null;
      if (product.category) {
        console.log("[Product] Looking up category:", product.category);
        const { data: cat, error: catError } = await supabase
          .from("categories")
          .select("id")
          .eq("name", product.category)
          .maybeSingle();

        if (catError) {
          console.error("[Product] Category lookup error:", catError);
        }

        if (cat) {
          categoryId = cat.id;
        } else {
          const { data: newCat, error: createError } = await supabase
            .from("categories")
            .insert({ name: product.category })
            .select("id")
            .single();

          if (!createError) {
            categoryId = newCat.id;
          }
        }
      }

      // Build the DB payload — column "price" stores the base price
      const payload: Record<string, any> = {
        name: product.name,
        description: product.description || '',
        price: product.basePrice,
        discount_enabled: product.discountEnabled ?? false,
        category_id: categoryId,
        images: product.images || [],
        variants: product.variants || [],
        production_time: product.productionTime ?? 7,
        payment_methods: product.paymentMethods || { cod: true, upi: true, cards: true, netbanking: true, wallets: true },
      };

      // Only set discount_price when discount is enabled and value is valid
      if (product.discountEnabled && product.discountPrice != null && product.discountPrice > 0) {
        payload.discount_price = product.discountPrice;
      } else {
        payload.discount_price = null;
      }

      let savedProductData;
      if (product.id) {
        // UPDATE existing product
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id)
          .select(`id`)
          .single();
        if (error) throw error;
        savedProductData = data;
      } else {
        // INSERT new product
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select(`id`)
          .single();
        if (error) throw error;
        savedProductData = data;
      }

      const productId = savedProductData.id;

      // 2. Sync product_images table (non-blocking)
      if (product.images && product.images.length > 0) {
        await supabase.from("product_images").delete().eq("product_id", productId);

        const imagesPayload = product.images.map((url, index) => ({
          product_id: productId,
          image_url: url,
          is_primary: index === 0,
        }));
        await supabase.from("product_images").insert(imagesPayload);
      }

      // 3. Sync product_variants table (non-blocking)
      if (product.variants && product.variants.length > 0) {
        await supabase.from("product_variants").delete().eq("product_id", productId);

        const variantsPayload = product.variants.map((v) => ({
          product_id: productId,
          variant_name: v.name,
          price: v.price || null,
          image_url: v.image || null,
          delivery_days: v.deliveryDays || 3,
        }));
        await supabase.from("product_variants").insert(variantsPayload);
      }

      // Fetch and return the full saved product
      const finalProduct = await productService.getById(productId);
      if (!finalProduct) {
        // Product was saved to DB but getById returned null — still a success
        // Return a minimal product object so the caller doesn't think save failed
        console.warn("[Product] getById returned null after successful save — returning minimal product");
        return {
          id: productId,
          name: product.name || '',
          description: product.description || '',
          category: product.category || '',
          basePrice: product.basePrice || 0,
          discountPrice: product.discountPrice,
          discountEnabled: product.discountEnabled || false,
          images: product.images || [],
          variants: product.variants || [],
          productionTime: product.productionTime || 7,
          paymentMethods: product.paymentMethods || { cod: true, upi: true, cards: true, netbanking: true, wallets: true },
          rating: 0,
          reviews: [],
        };
      }
      return finalProduct;
    } catch (err: any) {
      console.error("[Product] Critical save error:", err?.message || err);
      console.error("[Product] Error details:", JSON.stringify(err));
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    return !error;
  },

  updateRating: async (productId: string): Promise<void> => {
    const { data } = await supabase
      .from("reviews")
      .select("rating")
      .eq("product_id", productId);

    if (data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      await supabase
        .from("products")
        .update({ rating: Math.round(avg * 10) / 10 })
        .eq("id", productId);
    }
  },
};

// ============================================================
// CATEGORIES
// ============================================================
export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, image")
        .order("name");
      
      if (error) return [];
      
      return (data || []).map((c) => ({ 
        id: c.id, 
        name: c.name || "Unnamed", 
        image: c.image || "" 
      }));
    } catch (err) {
      console.error("[Category] Unexpected fetch error:", err);
      return [];
    }
  },

  save: async (name: string): Promise<Category | null> => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .upsert({ name }, { onConflict: "name" })
        .select("id, name, image")
        .single();
      
      if (error) return null;

      return { id: data.id, name: data.name, image: data.image || "" };
    } catch (err) {
      console.error("[Category] Unexpected save error:", err);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      console.log(`[Category] Deleting category ID: ${id}`);
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      
      if (error) {
        console.error("[Category] Delete error:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[Category] Unexpected delete error:", err);
      return false;
    }
  },
};

// ============================================================
// CART
// ============================================================
export const cartService = {
  get: async (userId: string): Promise<CartItem[]> => {
    try {
      // Use a race to detect if the cart fetch is the one hanging
      const { data, error } = await Promise.race([
        supabase.from("cart").select("items").eq("user_id", userId).maybeSingle(),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('CART_TIMEOUT')), 8000))
      ]);
      
      if (error) return [];
      return (data?.items as any[]) || [];
    } catch (err: any) {
      return [];
    }
  },


  save: async (userId: string, items: CartItem[]): Promise<void> => {
    // Check if cart exists for user
    const { data: existingCart } = await supabase
      .from("cart")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingCart) {
      await supabase
        .from("cart")
        .update({ items, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("cart")
        .insert({ user_id: userId, items, updated_at: new Date().toISOString() });
    }
  },

  clear: async (userId: string): Promise<void> => {
    const { data: existingCart } = await supabase
      .from("cart")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingCart) {
      await supabase
        .from("cart")
        .update({ items: [], updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("cart")
        .insert({ user_id: userId, items: [], updated_at: new Date().toISOString() });
    }
  },

  getTotal: (items: CartItem[]): number => {
    return items.reduce((total, item) => {
      const price =
        item.variant?.price ||
        item.product?.discountPrice ||
        item.product?.basePrice ||
        0;
      return total + price * item.quantity;
    }, 0);
  },
};

// ============================================================
// ADDRESSES
// ============================================================
export const addressService = {
  getAll: async (userId: string): Promise<Address[]> => {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });
    if (error || !data) return [];
    return data.map(mapAddress);
  },

  add: async (
    userId: string,
    address: Omit<Address, "id">,
  ): Promise<Address | null> => {
    // Remove default from others if this is default
    if (address.isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert({
        user_id: userId,
        name: address.name,
        phone: address.phone,
        address_line1: address.addressLine1,
        address_line2: address.addressLine2 || null,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        is_default: address.isDefault,
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapAddress(data);
  },

  update: async (
    addressId: string,
    userId: string,
    updates: Partial<Address>,
  ): Promise<boolean> => {
    if (updates.isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
    }
    const { error } = await supabase
      .from("addresses")
      .update({
        name: updates.name,
        phone: updates.phone,
        address_line1: updates.addressLine1,
        address_line2: updates.addressLine2 || null,
        city: updates.city,
        state: updates.state,
        pincode: updates.pincode,
        is_default: updates.isDefault,
      })
      .eq("id", addressId)
      .eq("user_id", userId);
    return !error;
  },

  delete: async (addressId: string, userId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", userId);
    return !error;
  },

  getDefault: async (userId: string): Promise<Address | null> => {
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .limit(1)
      .single();
    return data ? mapAddress(data) : null;
  },
};

// ============================================================
// ORDERS
// ============================================================
export const orderService = {
  create: async (
    userId: string,
    cartItems: CartItem[],
    address: Address,
    totalAmount: number,
    paymentMethod: string,
    paymentStatus: "pending" | "paid" | "cod",
    razorpayOrderId?: string,
    razorpayPaymentId?: string,
  ): Promise<Order | null> => {
    // 0. Security Check: Verify User
    if (!userId || userId !== (await supabase.auth.getUser()).data.user?.id) {
      console.error("[db.ts] Security Error: Unauthorized order creation attempt.");
      return null;
    }

    // 1. Idempotency Check: Prevent duplicate orders for the same payment
    if (razorpayPaymentId) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select(`*, order_items(*)`)
        .eq("razorpay_payment_id", razorpayPaymentId)
        .maybeSingle();

      if (existingOrder) {
        console.log("[db.ts] Order already exists for payment ID:", razorpayPaymentId);
        return mapOrderFromDB(existingOrder);
      }
    }

    // 2. Payment Method Validation: Ensure all products allow the selected method
    for (const item of cartItems) {
      const pm = item.product.paymentMethods || { cod: true, upi: true, cards: true, netbanking: true, wallets: true };
      if (paymentMethod === 'COD' && !pm.cod) {
        console.error(`[db.ts] Security Error: COD not allowed for product ${item.product.name}`);
        return null;
      }
      if (paymentMethod === 'UPI' && !pm.upi && !pm.netbanking && !pm.wallets) {
        console.error(`[db.ts] Security Error: UPI/Online not allowed for product ${item.product.name}`);
        return null;
      }
      if (paymentMethod === 'Card' && !pm.cards) {
        console.error(`[db.ts] Security Error: Card not allowed for product ${item.product.name}`);
        return null;
      }
    }

    // 3. Price Integrity Check: Recalculate total from database prices
    const productIds = cartItems.map(i => i.productId);
    const { data: dbProducts } = await supabase
      .from("products")
      .select("id, price, discount_price, discount_enabled")
      .in("id", productIds);

    if (!dbProducts) return null;

    let verifiedTotal = 0;
    cartItems.forEach(item => {
      const dbProd = dbProducts.find(p => p.id === item.productId);
      if (dbProd) {
        // Use variant price if available, otherwise base/discount price from DB
        const unitPrice = item.variant?.price || (dbProd.discount_enabled ? dbProd.discount_price : dbProd.price);
        verifiedTotal += (unitPrice || 0) * item.quantity;
      }
    });

    // Add shipping logic (must match frontend exactly)
    const shipping = verifiedTotal > 1000 ? 0 : 50;
    const finalVerifiedTotal = verifiedTotal + shipping;

    // If there's a significant mismatch, log it (allow small rounding differences if any, but ideally exact)
    if (Math.abs(finalVerifiedTotal - totalAmount) > 1) {
      console.error(`[db.ts] Security Warning: Price mismatch detected! Expected ₹${finalVerifiedTotal}, received ₹${totalAmount}`);
      // In production, you might block the order here. For now, we'll use the verified amount.
    }

    const orderId = `ABYRA-${Date.now()}`;
    const maxProductionTime = Math.max(
      ...cartItems.map((i) => i.product.productionTime || 7),
    );
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(
      estimatedDelivery.getDate() + maxProductionTime + 5,
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: finalVerifiedTotal, // Use the verified total, not the frontend value
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        order_status: 'placed' as OrderStatus,
        address: {
          name: address.name,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        estimated_delivery: estimatedDelivery.toISOString(),
        razorpay_order_id: razorpayOrderId || null,
        razorpay_payment_id: razorpayPaymentId || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("[db.ts] Supabase Order Insert Error:", orderError);
      return null;
    }
    if (!order) return null;

    // Insert order items
    const orderItemsPayload = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      price: item.variant?.price || item.product.basePrice,
      product_snapshot: {
        id: item.product.id,
        name: item.product.name,
        images: item.product.images,
        category: item.product.category,
        basePrice: item.product.basePrice,
        variant: item.variant,
      },
    }));

    await supabase.from("order_items").insert(orderItemsPayload);

    return mapOrder(order, cartItems, address);
  },

  getById: async (orderId: string): Promise<Order | null> => {
    const { data: order, error } = await supabase
      .from("orders")
      .select(`*, order_items(id, order_id, product_id, variant_id, quantity, price, product_snapshot, products(name, images)), users(name, email)`)
      .eq("id", orderId)
      .single();

    if (error || !order) return null;
    return mapOrderFromDB(order);
  },

  getUserOrders: async (userId: string): Promise<Order[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items(id, order_id, product_id, variant_id, quantity, price, product_snapshot, products(name, images))`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapOrderFromDB);
  },

  getAllOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items(id, order_id, product_id, variant_id, quantity, price, product_snapshot, products(name, images)), users(name, email)`)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapOrderFromDB);
  },

  updateStatus: async (
    orderId: string,
    status: Order["status"],
  ): Promise<{ success: boolean; error?: string }> => {
    const updates: any = { order_status: status };
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);
    
    if (error) {
      console.error("[db.ts] Failed to update order status:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  updatePaymentStatus: async (
    orderId: string,
    paymentStatus: "paid" | "failed",
    razorpayPaymentId: string,
  ): Promise<boolean> => {
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: paymentStatus,
        razorpay_payment_id: razorpayPaymentId,
      })
      .eq("id", orderId);
    return !error;
  },

  cancelOrder: async (orderId: string, reason: string): Promise<boolean> => {
    const { error } = await supabase
      .from("orders")
      .update({ 
        order_status: "cancelled",
        cancel_reason: reason
      })
      .eq("id", orderId);
    return !error;
  },



  markAsProduction: async (orderId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("orders")
      .update({ order_status: "in_production" as OrderStatus })
      .eq("id", orderId);
    return !error;
  },

  markAsReady: async (orderId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("orders")
      .update({ order_status: "ready" as OrderStatus })
      .eq("id", orderId);
    return !error;
  },

  markAsShipped: async (orderId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("orders")
      .update({ order_status: "shipped" as OrderStatus })
      .eq("id", orderId);
    return !error;
  },

  markAsDelivered: async (orderId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("orders")
      .update({ 
        order_status: "delivered" as OrderStatus,
        delivered_at: new Date().toISOString()
      })
      .eq("id", orderId);
    return !error;
  },

  getMetrics: async (): Promise<{
    totalOrders: number;
    totalRevenue: number;
    activeOrders: number;
    averageOrderValue: number;
  }> => {
    const { data } = await supabase
      .from("orders")
      .select("total_amount, order_status");
    
    if (!data) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        activeOrders: 0,
        averageOrderValue: 0,
      };
    }

    const totalOrders = data.length;
    const totalRevenue = data
      .filter(o => o.order_status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const activeOrders = data.filter(
      (o) =>
        !["cancelled", "delivered"].includes(o.order_status)
    ).length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue,
      activeOrders,
      averageOrderValue,
    };
  },

  getRevenueSummary: async (month: number, year: number, day?: number): Promise<{
    totalRevenue: number;
    productRevenue: { productId: string; name: string; revenue: number; quantity: number }[];
  }> => {
    let startDate: string;
    let endDate: string;

    if (day !== undefined) {
      // Day is 1-indexed
      startDate = new Date(year, month, day, 0, 0, 0).toISOString();
      endDate = new Date(year, month, day, 23, 59, 59).toISOString();
    } else {
      startDate = new Date(year, month, 1, 0, 0, 0).toISOString();
      endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    }

    // Fetch orders that were either created or delivered in this period
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        order_status,
        payment_method,
        payment_status,
        delivered_at,
        created_at,
        order_items(
          product_id,
          quantity,
          price,
          product_snapshot
        )
      `)
      .or(`created_at.gte.${startDate},delivered_at.gte.${startDate}`)
      .neq("order_status", "cancelled");

    if (error || !data) return { totalRevenue: 0, productRevenue: [] };

    // Filter by revenue recognition logic
    const revenueOrders = data.filter(o => {
      const createdDate = new Date(o.created_at).toISOString();
      const deliveredDate = o.delivered_at ? new Date(o.delivered_at).toISOString() : null;
      
      const createdInPeriod = createdDate >= startDate && createdDate <= endDate;
      const deliveredInPeriod = deliveredDate && deliveredDate >= startDate && deliveredDate <= endDate;
      
      const isOnlinePaid = o.payment_method !== 'COD' && o.payment_status === 'paid' && createdInPeriod;
      const isCODDelivered = o.payment_method === 'COD' && o.order_status === 'delivered' && deliveredInPeriod;
      
      return isOnlinePaid || isCODDelivered;
    });

    const totalRevenue = revenueOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const productAggregation: Record<string, { productId: string; name: string; revenue: number; quantity: number }> = {};
    
    revenueOrders.forEach(order => {
      (order.order_items as any[])?.forEach((item: any) => {
        const productId = item.product_id;
        const snapshot = item.product_snapshot as any;
        const name = snapshot?.name || "Unknown Product";
        
        if (!productAggregation[productId]) {
          productAggregation[productId] = { productId, name, revenue: 0, quantity: 0 };
        }
        
        productAggregation[productId].revenue += item.price * item.quantity;
        productAggregation[productId].quantity += item.quantity;
      });
    });

    return {
      totalRevenue,
      productRevenue: Object.values(productAggregation).sort((a, b) => b.revenue - a.revenue)
    };
  },

  exportToCSV: async (type: "orders" | "revenue_month" | "revenue_products", options?: { month?: number; year?: number; month_only?: boolean }): Promise<string> => {
    if (type === "orders") {
      const { data } = await supabase
        .from("orders")
        .select(`*, order_items(*)`)
        .order("created_at", { ascending: false });

      if (!data) return "";

      const headers = ["Order ID", "Customer Name", "Phone", "Products", "Total", "Payment", "Status", "Date"];
      const rows = data.map((o) => {
        const address = o.address as any;
        const items = (o.order_items || [])
          .map((i: any) => `${(i.product_snapshot as any)?.name} (x${i.quantity})`)
          .join("; ");
        return [o.id, address?.name || "", address?.phone || "", `"${items}"`, o.total_amount, o.payment_method, o.order_status, new Date(o.created_at).toLocaleDateString("en-IN")];
      });

      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    if (type === "revenue_products") {
      const { month = new Date().getMonth(), year = new Date().getFullYear() } = options || {};
      const { productRevenue } = await orderService.getRevenueSummary(month, year);
      
      const headers = ["Product ID", "Product Name", "Total Quantity Sold", "Total Revenue (₹)"];
      const rows = productRevenue.map(p => [p.productId, `"${p.name}"`, p.quantity, p.revenue]);
      
      return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    }

    if (type === "revenue_month") {
      const year = options?.year || new Date().getFullYear();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const headers = ["Month", "Total Orders", "Total Revenue (₹)"];
      
      const results = await Promise.all(months.map(async (_, i) => {
        const { totalRevenue, productRevenue } = await orderService.getRevenueSummary(i, year);
        const totalItems = productRevenue.reduce((sum, p) => sum + p.quantity, 0);
        return [months[i], totalItems, totalRevenue];
      }));

      return [headers.join(","), ...results.map(r => r.join(","))].join("\n");
    }

    return "";
  },

  subscribeToOrder: (orderId: string, callback: (order: Order) => void) => {
    return supabase
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("orders")
            .select(`*, order_items(id, order_id, product_id, variant_id, quantity, price, product_snapshot, products(name, images))`)
            .eq("id", orderId)
            .single();
          if (data) callback(mapOrderFromDB(data));
        }
      )
      .subscribe();
  },

  subscribeToUserOrders: (userId: string, callback: () => void) => {
    return supabase
      .channel(`user-orders:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          callback();
        }
      )
      .subscribe();
  },

  subscribeToAllOrders: (callback: () => void) => {
    return supabase
      .channel('all-orders')
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          callback();
        }
      )
      .subscribe();
  },

  markReviewDone: async (orderId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("orders")
      .update({ review_pending: false })
      .eq("id", orderId);
    return !error;
  },
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationService = {
  getAll: async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data;
  },

  markAsRead: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    return !error;
  },

  markAllAsRead: async (userId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    return !error;
  },

  subscribe: (userId: string, callback: () => void) => {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          callback();
        }
      )
      .subscribe();
  },

  dismiss: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    return !error;
  },

  clearAll: async (userId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId);
    return !error;
  },
};

// ============================================================
// REVIEWS
// ============================================================
export const reviewService = {
  getForProduct: async (productId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from("reviews")
      .select(`*, users(name)`)
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.users?.name || "Anonymous",
      productId: r.product_id,
      rating: r.rating,
      comment: r.comment,
      adminReply: r.admin_reply,
      date: r.created_at,
    }));
  },

  getAll: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from("reviews")
      .select(`*, users(name), products(name)`)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.users?.name || "Anonymous",
      productId: r.product_id,
      productName: r.products?.name || "",
      rating: r.rating,
      comment: r.comment,
      adminReply: r.admin_reply,
      date: r.created_at,
    }));
  },

  add: async (userId: string, productId: string, rating: number, comment: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      product_id: productId,
      rating,
      comment,
    });
    if (error) {
      if (error.code === "23505") return { success: false, error: "You have already reviewed this product" };
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  hasReviewed: async (userId: string, productId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .maybeSingle();
    return !!data;
  },

  saveAdminReply: async (reviewId: string, reply: string): Promise<boolean> => {
    const { error } = await supabase
      .from("reviews")
      .update({ admin_reply: reply })
      .eq("id", reviewId);
    return !error;
  },

  hasUserPurchased: async (
    userId: string,
    productId: string,
  ): Promise<boolean> => {
    const { data } = await supabase
      .from("order_items")
      .select(`order_id, orders!inner(user_id, order_status)`)
      .eq("product_id", productId)
      .eq("orders.user_id", userId)
      .eq("orders.order_status", "delivered");
    return (data?.length || 0) > 0;
  },
};

// ============================================================
// SUPPORT REQUESTS
// ============================================================
export const supportService = {
  create: async (
    request: Omit<SupportRequest, "id" | "createdAt" | "status">,
  ): Promise<SupportRequest | null> => {
    const { data, error } = await supabase
      .from("support_requests")
      .insert({
        order_id: request.orderId,
        user_id: request.userId,
        user_name: request.userName,
        user_email: request.userEmail,
        issue_type: request.issueType,
        message: request.message,
        image_proof: request.imageProof || null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      orderId: data.order_id,
      userId: data.user_id,
      userName: data.user_name,
      userEmail: data.user_email,
      issueType: data.issue_type,
      message: data.message,
      status: data.status,
      createdAt: data.created_at,
      imageProof: data.image_proof || undefined,
    };
  },

  getAll: async (): Promise<SupportRequest[]> => {
    const { data, error } = await supabase
      .from("support_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((d) => ({
      id: d.id,
      orderId: d.order_id,
      userId: d.user_id,
      userName: d.user_name,
      userEmail: d.user_email,
      issueType: d.issue_type,
      message: d.message,
      status: d.status,
      createdAt: d.created_at,
      imageProof: d.image_proof || undefined,
    }));
  },
};

// ============================================================
// ADMIN STATS
// ============================================================
export const adminService = {
  getStats: async () => {
    const [ordersRes, productsRes, usersRes] = await Promise.all([
      supabase.from("orders").select("total_amount, order_status, created_at"),
      supabase.from("products").select("id"),
      supabase.from("users").select("id").eq("role", "user"),
    ]);

    const orders = ordersRes.data || [];
    const totalRevenue = orders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0,
    );
    const pendingOrders = orders.filter(
      (o) => o.order_status !== "delivered",
    ).length;
    const avgOrderValue = orders.length ? totalRevenue / orders.length : 0;

    return {
      totalRevenue,
      pendingOrders,
      totalOrders: orders.length,
      avgOrderValue,
      totalProducts: productsRes.data?.length || 0,
      totalUsers: usersRes.data?.length || 0,
    };
  },

  dangerouslyResetOrders: async (): Promise<boolean> => {
    // Safety check: Only allow in development mode (localhost)
    const isDev = window.location.hostname === 'localhost';
    if (!isDev) {
      console.error("[Admin] Order reset blocked: This action is only permitted in development environments.");
      return false;
    }

    try {
      console.warn("[Admin] STARTING DATA RESET: Deleting all test orders and related items...");
      
      // 1. Delete order items
      await supabase.from("order_items").delete().not("id", "is", null);
      
      // 2. Delete support requests
      await supabase.from("support_requests").delete().not("id", "is", null);

      // 3. Delete all orders
      const { error } = await supabase.from("orders").delete().not("id", "is", null);

      if (error) {
        throw new Error(error.message);
      }

      console.log("[Admin] Success: All order data has been purged. Revenue reset to ₹0.");
      return true;
    } catch (err) {
      console.error("[Admin] Critical failure during reset:", err);
      return false;
    }
  },
};

// ============================================================
// MAPPERS — DB row → App types
// ============================================================
function mapProduct(row: any): Product {
  // Extract images from relational table if available, else fallback to JSON array
  let images = row.images || [];
  if (row.product_images && row.product_images.length > 0) {
    // Sort so primary is first
    const sortedImages = [...row.product_images].sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1));
    images = sortedImages.map(img => img.image_url);
  }

  // Extract variants from relational table if available, else fallback to JSON array
  let variants = (row.variants as Variant[]) || [];
  if (row.product_variants && row.product_variants.length > 0) {
    variants = row.product_variants.map((v: any) => ({
      id: v.id,
      name: v.variant_name,
      price: v.price || undefined,
      image: v.image_url || undefined,
      deliveryDays: v.delivery_days || 3,
      attributes: v.attributes || {},
    }));
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    category: row.categories?.name || "",
    // Use the actual "price" column (the writable base price), NOT "base_price"
    // which is a GENERATED column with wrong semantics (COALESCE(discount_price, price))
    basePrice: row.price ?? row.base_price ?? 0,
    discountPrice: row.discount_price || undefined,
    discountEnabled: row.discount_enabled || false,
    images: images,
    variants: variants,
    productionTime: row.production_time || 7,
    paymentMethods: row.payment_methods || { cod: true, upi: true, cards: true, netbanking: true, wallets: true },
    rating: row.rating || 0,
    reviews: [],
  };
}

function mapAddress(row: any): Address {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 || undefined,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: row.is_default || false,
  };
}

function mapOrder(row: any, items: CartItem[], address: Address): Order {
  return {
    id: row.id,
    userId: row.user_id,
    items,
    totalAmount: row.total_amount,
    address,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status || 'pending',
    status: row.order_status || 'placed',
    cancelReason: row.cancel_reason,
    orderDate: row.created_at,
    estimatedDelivery: row.estimated_delivery,
  };
}

function mapOrderFromDB(row: any): Order {
  const address = (row.address || {}) as any;
  const items: CartItem[] = (row.order_items || []).map((oi: any) => {
    const snapshot = (oi.product_snapshot || {}) as any;
    const productName = snapshot.name?.trim() || oi.products?.name?.trim() || "Product Info Unavailable";
    const productImages = snapshot.images || oi.products?.images || [];
    const productCategory = snapshot.category || oi.products?.category || "";
    const productBasePrice = snapshot.basePrice || oi.price || 0;
    const productVariant = snapshot.variant || {
      id: oi.variant_id,
      name: snapshot.variant?.name || "",
      price: oi.price,
      attributes: snapshot.variant?.attributes || {},
    };

    return {
      productId: oi.product_id || snapshot.id,
      variantId: oi.variant_id,
      quantity: oi.quantity,
      product: {
        id: snapshot.id || oi.product_id,
        name: productName,
        images: productImages,
        category: productCategory,
        basePrice: productBasePrice,
        variants: [],
        productionTime: snapshot.productionTime || 7,
        paymentMethods: snapshot.paymentMethods || { cod: true, upi: true, cards: true, netbanking: true, wallets: true },
        rating: snapshot.rating || 0,
        reviews: snapshot.reviews || [],
        description: snapshot.description || "",
      },
      variant: productVariant,
    };
  });

  return {
    id: row.id,
    userId: row.user_id,
    userName: row.users?.name,
    userEmail: row.users?.email,
    items,
    totalAmount: row.total_amount,
    address: {
      id: "",
      name: address.name || "",
      phone: address.phone || "",
      addressLine1: address.addressLine1 || "",
      addressLine2: address.addressLine2,
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      isDefault: false,
    },
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status || 'pending',
    status: row.order_status || 'placed',
    cancelReason: row.cancel_reason,
    adminFeedback: row.admin_feedback,
    receiptUrl: row.receipt_url,
    reviewPending: row.review_pending,
    orderDate: row.created_at,
    estimatedDelivery: row.estimated_delivery,
    deliveredAt: row.delivered_at,
  };
}
