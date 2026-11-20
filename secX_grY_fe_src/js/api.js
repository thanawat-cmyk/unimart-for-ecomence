/**
 * ==============================================================================
 * คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยมหิดล (ICT Mahidol)
 * วิชา ITDS242 Web Technologies Lab - งานที่ 4: Frontend & Web Services Integration
 * ไฟล์: js/api.js
 * หน้าที่: โมดูลสื่อสารกับ Web Services หลังบ้านด้วย Fetch API
 *          รวมศูนย์การเรียก API สำหรับการยืนยันตัวตน, จัดการสินค้า, จัดการผู้ใช้,
 *          ดึงข้อมูลประวัติคำสั่งซื้อ และเชื่อมต่อ Public API อัตราแลกเปลี่ยนเงินเยน (JPY)
 * ==============================================================================
 */

// ที่อยู่หลัก (Base URL) ของ Web Services Backend บนเครื่อง Localhost
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * ฟังก์ชันกลางสำหรับเรียกใช้งาน Fetch API (fetchApi)
 * ทำหน้าที่แนบ Header มาตรฐาน, แปลง JSON และดักจับ Error ส่งต่อให้ฟังก์ชันต้นทาง
 * 
 * @param {string} endpoint - พาธของ API เช่น '/products' หรือ '/auth/login'
 * @param {object} options - อ็อบเจกต์ตัวเลือกของ Fetch เช่น method, headers, body
 * @returns {Promise<any>} - ข้อมูลผลลัพธ์ JSON ที่ได้รับจากเซิร์ฟเวอร์
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json', // ระบุประเภทเนื้อหาเป็น JSON
    'Accept': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    // ถ้า HTTP Status Code ไม่อยู่ในช่วง 200-299 ให้โยน Error ออกมา
    if (!response.ok) {
      const errorMsg = data.message || `HTTP Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }
    return data;
  } catch (error) {
    console.warn(`[Unimart API ข้อความแจ้งเตือน] เรียกใช้งาน ${endpoint} ไม่สำเร็จ:`, error.message);
    throw error;
  }
}

/**
 * อ็อบเจกต์ UnimartAPI: รวบรวมเมธอดสำหรับเรียก Web Services ทั้งหมดของระบบ
 */
const UnimartAPI = {

  // ============================================================================
  // 1. ระบบยืนยันตัวตนและการจัดการเซสชัน (Authentication & Session Management)
  // ============================================================================

  /**
   * เข้าสู่ระบบ (Login)
   * ส่ง username และ password ไปยัง POST /api/auth/login
   * หากสำเร็จจะบันทึกข้อมูลผู้ใช้และ Token ลงใน localStorage
   * 
   * @param {string} username - ชื่อผู้เข้าใช้
   * @param {string} password - รหัสผ่าน
   */
  async login(username, password) {
    try {
      const result = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (result.success && result.user) {
        // บันทึกข้อมูลโปรไฟล์และ Token ลงใน localStorage ของเบราว์เซอร์
        localStorage.setItem('unimart_user', JSON.stringify(result.user));
        localStorage.setItem('unimart_token', result.token || '');
      }
      return result;
    } catch (error) {
      // โหมดสำรองออฟไลน์ (Offline Fallback): ช่วยให้ทดสอบล็อกอินได้แม้ปิดเซิร์ฟเวอร์
      console.warn('สลับไปใช้ระบบตรวจสอบบัญชีตัวอย่างจำลอง (Offline Mode)...');
      if (username === 'admin' && password === 'admin123') {
        const adminUser = {
          id: 1,
          username: 'admin',
          fullname: 'ธนวัฒน์ แสนโบราณ (Admin RakGundam)',
          email: 'adminrakgundam01@gmail.com',
          role: 'Super Admin',
          status: 'Active'
        };
        localStorage.setItem('unimart_user', JSON.stringify(adminUser));
        return { success: true, user: adminUser, message: 'เข้าสู่ระบบสำเร็จ (Offline Mode)' };
      } else if (username === 'GundamLover159' && password === 'customer123') {
        const customerUser = {
          id: 6,
          username: 'GundamLover159',
          fullname: 'กันดัม เลิฟเวอร์',
          email: 'gundamlover159@gmail.com',
          role: 'Customer',
          status: 'Active'
        };
        localStorage.setItem('unimart_user', JSON.stringify(customerUser));
        return { success: true, user: customerUser, message: 'เข้าสู่ระบบสำเร็จ (Offline Mode)' };
      }
      throw error;
    }
  },

  /**
   * ออกจากระบบ (Logout)
   * ล้างค่าข้อมูลผู้ใช้ใน localStorage และนำทางกลับไปยังหน้าล็อกอิน
   */
  logout() {
    localStorage.removeItem('unimart_user');
    localStorage.removeItem('unimart_token');
    window.location.href = 'login.html';
  },

  /**
   * ดึงข้อมูลผู้ใช้งานปัจจุบันที่เข้าสู่ระบบค้างไว้ใน localStorage
   * @returns {object|null} ข้อมูลโปรไฟล์ผู้ใช้ หรือ null ถ้ายังไม่ได้ล็อกอิน
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('unimart_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // ============================================================================
  // 2. เว็บเซอร์วิสจัดการสินค้า (Products Services: CRUD & Multi-criteria Search)
  // ============================================================================

  /**
   * ค้นหาและดึงรายการสินค้า (Search & View Products)
   * ส่งคำขอ GET /api/products พร้อมแนบ Query Parameters ต่าง ๆ
   * 
   * @param {object} params - ตัวกรอง เช่น { q, grade, category, minPrice, maxPrice, sortBy, status }
   * @returns {Promise<Array>} รายการสินค้า
   */
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.grade) query.append('grade', params.grade);
    if (params.category) query.append('category', params.category);
    if (params.minPrice) query.append('minPrice', params.minPrice);
    if (params.maxPrice) query.append('maxPrice', params.maxPrice);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.status) query.append('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';

    try {
      const res = await fetchApi(`/products${queryString}`);
      return res.data || [];
    } catch (err) {
      // Fallback: ดึงข้อมูลจาก localStorage หรือไฟล์ products.js หากเซิร์ฟเวอร์ยังไม่เปิด (Offline / Cloudflare Pages Mode)
      console.warn('เซิร์ฟเวอร์ Backend ยังไม่พร้อม ใช้งานโมเดลสำรองจาก localStorage / products.js');
      let list = [];
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('unimart_local_products') : null;
        if (stored) {
          list = JSON.parse(stored);
        }
      } catch (e) {
        list = [];
      }

      if (!list || list.length === 0) {
        if (typeof window !== 'undefined' && Array.isArray(window.UNIMART_PRODUCTS)) {
          list = JSON.parse(JSON.stringify(window.UNIMART_PRODUCTS));
          try {
            localStorage.setItem('unimart_local_products', JSON.stringify(list));
          } catch (e) {}
        }
      }

      if (params.q) {
        const t = params.q.toLowerCase();
        list = list.filter(p => (p.name && p.name.toLowerCase().includes(t)) || (p.series && p.series.toLowerCase().includes(t)));
      }
      if (params.grade) list = list.filter(p => p.grade && p.grade.toLowerCase() === params.grade.toLowerCase());
      if (params.category) list = list.filter(p => p.category && p.category.toLowerCase() === params.category.toLowerCase());
      return list;
    }
  },

  /**
   * ดึงรายละเอียดสินค้าเดี่ยวตามรหัส ID
   * ส่งคำขอ GET /api/products/:id
   * 
   * @param {number|string} id - รหัสสินค้า
   * @returns {Promise<object|null>} ข้อมูลสินค้า
   */
  async getProductById(id) {
    try {
      const res = await fetchApi(`/products/${id}`);
      return res.data;
    } catch (err) {
      const numId = parseInt(id, 10);
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('unimart_local_products') : null;
        if (stored) {
          const list = JSON.parse(stored);
          const found = list.find(p => p.id === numId);
          if (found) return found;
        }
      } catch (e) {}

      if (typeof window !== 'undefined' && Array.isArray(window.UNIMART_PRODUCTS)) {
        return window.UNIMART_PRODUCTS.find(p => p.id === numId) || null;
      }
      return null;
    }
  },

  /**
   * เพิ่มสินค้าใหม่เข้าสู่ระบบ (Insert Product)
   * ส่งคำขอ POST /api/products พร้อมข้อมูลสินค้าในรูปแบบ JSON
   * 
   * @param {object} productData - ข้อมูลสินค้าใหม่
   */
  async createProduct(productData) {
    try {
      return await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      });
    } catch (err) {
      console.warn('บันทึกลง Backend ไม่สำเร็จ สลับไปบันทึกลง localStorage (Offline / Cloudflare Pages Mode):', err.message);
      let list = [];
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('unimart_local_products') : null;
        if (stored) list = JSON.parse(stored);
      } catch (e) { list = []; }

      if (!list || list.length === 0) {
        if (typeof window !== 'undefined' && Array.isArray(window.UNIMART_PRODUCTS)) {
          list = JSON.parse(JSON.stringify(window.UNIMART_PRODUCTS));
        }
      }

      const newId = list.length > 0 ? Math.max(...list.map(p => Number(p.id) || 0)) + 1 : 1;
      const createdItem = { id: newId, ...productData };
      list.unshift(createdItem);

      try {
        localStorage.setItem('unimart_local_products', JSON.stringify(list));
      } catch (e) {
        console.warn('ไม่สามารถบันทึกรูปภาพขนาดใหญ่ลงใน localStorage ได้:', e);
      }

      return { success: true, message: 'เพิ่มสินค้าสำเร็จ (Offline / Cloudflare Mode)', data: createdItem };
    }
  },

  /**
   * แก้ไขข้อมูลสินค้า (Update Product)
   * ส่งคำขอ PUT /api/products/:id พร้อมข้อมูลฟิลด์ที่ต้องการแก้ไข
   * 
   * @param {number|string} id - รหัสสินค้าที่ต้องการแก้ไข
   * @param {object} productData - ข้อมูลที่ต้องการอัปเดต
   */
  async updateProduct(id, productData) {
    try {
      return await fetchApi(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
      });
    } catch (err) {
      console.warn('อัปเดตลง Backend ไม่สำเร็จ สลับไปอัปเดตลง localStorage (Offline / Cloudflare Pages Mode):', err.message);
      let list = [];
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('unimart_local_products') : null;
        if (stored) list = JSON.parse(stored);
      } catch (e) { list = []; }

      if (!list || list.length === 0) {
        if (typeof window !== 'undefined' && Array.isArray(window.UNIMART_PRODUCTS)) {
          list = JSON.parse(JSON.stringify(window.UNIMART_PRODUCTS));
        }
      }

      const numId = parseInt(id, 10);
      const index = list.findIndex(p => p.id === numId);
      if (index !== -1) {
        list[index] = { ...list[index], ...productData };
        try {
          localStorage.setItem('unimart_local_products', JSON.stringify(list));
        } catch (e) {
          console.warn('ไม่สามารถบันทึกขนาดใหญ่ลงใน localStorage ได้:', e);
        }
        return { success: true, message: 'แก้ไขสินค้าสำเร็จ (Offline / Cloudflare Mode)', data: list[index] };
      }
      throw new Error(`ไม่พบสินค้ารหัส ID ${id}`);
    }
  },

  /**
   * ลบสินค้าออกจากระบบ (Delete Product)
   * ส่งคำขอ DELETE /api/products/:id
   * 
   * @param {number|string} id - รหัสสินค้าที่ต้องการลบ
   */
  async deleteProduct(id) {
    try {
      return await fetchApi(`/products/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('ลบข้อมูลบน Backend ไม่สำเร็จ สลับไปลบใน localStorage (Offline / Cloudflare Pages Mode):', err.message);
      let list = [];
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('unimart_local_products') : null;
        if (stored) list = JSON.parse(stored);
      } catch (e) { list = []; }

      if (!list || list.length === 0) {
        if (typeof window !== 'undefined' && Array.isArray(window.UNIMART_PRODUCTS)) {
          list = JSON.parse(JSON.stringify(window.UNIMART_PRODUCTS));
        }
      }

      const numId = parseInt(id, 10);
      list = list.filter(p => p.id !== numId);
      try {
        localStorage.setItem('unimart_local_products', JSON.stringify(list));
      } catch (e) {}

      return { success: true, message: 'ลบสินค้าสำเร็จ (Offline / Cloudflare Mode)' };
    }
  },

  // ============================================================================
  // 3. เว็บเซอร์วิสจัดการผู้ใช้งาน (Users Services: CRUD & Search)
  // ============================================================================

  /**
   * ดึงรายชื่อผู้ใช้และแอดมินทั้งหมด หรือค้นหาตามเงื่อนไข (Search & View Users)
   * ส่งคำขอ GET /api/users
   * 
   * @param {object} params - ตัวกรอง เช่น { q, role, status }
   */
  async getUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    try {
      const res = await fetchApi(`/users${queryString}`);
      return res.data || [];
    } catch (err) {
      console.warn('เซิร์ฟเวอร์ยังไม่พร้อม สลับไปใช้ข้อมูลผู้ใช้จำลอง');
      return [
        { id: 1, fullname: 'ธนวัฒน์ แสนโบราณ (Admin RakGundam)', username: 'admin', email: 'adminrakgundam01@gmail.com', phone: '095-125-1834', role: 'Super Admin', status: 'Active' },
        { id: 2, fullname: 'ณิชาภัทร วิชาธรรม', username: 'nichaphat', email: 'nichaphat.wic@student.mahidol.ac.th', phone: '081-234-5678', role: 'Manager', status: 'Active' },
        { id: 3, fullname: 'อโยสรา ต้องทรัพย์', username: 'ayosara', email: 'ayosara.ton@student.mahidol.ac.th', phone: '082-345-6789', role: 'Staff', status: 'Active' },
        { id: 4, fullname: 'คชาธร ศิริเลิศ', username: 'khachatorn', email: 'khachatorn.sir@student.mahidol.ac.th', phone: '083-456-7890', role: 'Staff', status: 'Active' },
        { id: 5, fullname: 'ธัญชนก โรจนสฤษฎิ์', username: 'thanchanok', email: 'thanchanok.roj@student.mahidol.ac.th', phone: '084-567-8901', role: 'Staff', status: 'Active' },
        { id: 6, fullname: 'กันดัม เลิฟเวอร์', username: 'GundamLover159', email: 'gundamlover159@gmail.com', phone: '098-159-1594', role: 'Customer', status: 'Active' }
      ];
    }
  },

  /**
   * ดึงข้อมูลผู้ใช้เดี่ยวตามรหัส ID
   * @param {number|string} id - รหัสผู้ใช้
   */
  async getUserById(id) {
    const res = await fetchApi(`/users/${id}`);
    return res.data;
  },

  /**
   * เพิ่มผู้ใช้หรือเจ้าหน้าที่ใหม่ (Insert User)
   * ส่งคำขอ POST /api/users
   * @param {object} userData - ข้อมูลผู้ใช้ใหม่
   */
  async createUser(userData) {
    return await fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  /**
   * แก้ไขข้อมูลผู้ใช้ (Update User)
   * ส่งคำขอ PUT /api/users/:id
   * @param {number|string} id - รหัสผู้ใช้
   * @param {object} userData - ข้อมูลที่ต้องการแก้ไข
   */
  async updateUser(id, userData) {
    return await fetchApi(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  /**
   * ลบผู้ใช้ออกจากระบบ (Delete User)
   * ส่งคำขอ DELETE /api/users/:id
   * @param {number|string} id - รหัสผู้ใช้
   */
  async deleteUser(id) {
    return await fetchApi(`/users/${id}`, {
      method: 'DELETE'
    });
  },

  // ============================================================================
  // 4. การเชื่อมต่อกับ PUBLIC API ภายนอก (FOREIGN CURRENCY EXCHANGE RATE)
  // ตรงตามเกณฑ์งานที่ 4 ข้อ 11: เชื่อมต่อ API สาธารณะที่เป็นประโยชน์ต่อแอปพลิเคชัน
  // ============================================================================

  /**
   * ดึงอัตราแลกเปลี่ยนเงินเยนญี่ปุ่น (JPY) เทียบเงินบาทไทย (THB)
   * สามารถส่งจำนวนเงินเยนมาเพื่อให้แปลงเป็นเงินบาทได้โดยตรง
   * 
   * @param {number|null} amountJpy - จำนวนเงินเยนที่ต้องการคำนวณ (ถ้ามี)
   * @returns {Promise<object>} อัตราแลกเปลี่ยนและผลการคำนวณ
   */
  async getExchangeRate(amountJpy = null) {
    try {
      const endpoint = amountJpy ? `/public/exchange-rate?amount_jpy=${amountJpy}` : '/public/exchange-rate';
      return await fetchApi(endpoint);
    } catch {
      // Fallback Rate: 1 JPY = 0.238 THB
      const rate = 0.238;
      return {
        success: true,
        provider: 'Offline Fallback',
        base_currency: 'JPY',
        target_currency: 'THB',
        rate: rate,
        conversion: amountJpy ? {
          amount_jpy: amountJpy,
          converted_thb: Math.round(amountJpy * rate),
          formatted_thb: `${Math.round(amountJpy * rate).toLocaleString()} บาท`
        } : null
      };
    }
  },

  // ============================================================================
  // 5. บริการประวัติคำสั่งซื้อ & ระบบสั่งทำ Custom Gunpla (ORDERS & CUSTOM STUDIO)
  // ============================================================================

  /**
   * ดึงประวัติคำสั่งซื้อของลูกค้ารายบุคคล (สำหรับหน้า profile.html)
   * @param {number|string} userId - รหัสลูกค้า
   */
  async getUserOrders(userId) {
    let localOrders = [];
    try {
      const raw = localStorage.getItem('unimart_local_orders');
      if (raw) localOrders = JSON.parse(raw);
    } catch {}

    try {
      const res = await fetchApi(`/orders/user/${userId}`);
      const serverOrders = res.data || [];
      return [...localOrders, ...serverOrders];
    } catch {
      if (localOrders.length > 0) return localOrders;
      return [
        {
          order_id: 1,
          order_number: 'ORD-25690912-001',
          user_id: 6,
          order_date: '2026-09-12T11:20:00.000Z',
          total_amount: 1750,
          payment_method: 'QR PromptPay',
          order_status: 'Delivered',
          items: [
            {
              product_id: 1,
              product_name: 'MG 1/100 Freedom GUNDAM Ver.2.0',
              product_image: 'assets/images/product-freedom.png',
              quantity: 1,
              unit_price: 1750
            }
          ]
        }
      ];
    }
  },

  /**
   * สร้างคำสั่งซื้อใหม่จากตะกร้าสินค้า (Checkout & Payment)
   */
  async createOrder(orderData) {
    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const newLocalOrder = {
      order_id: Date.now(),
      order_number: orderNumber,
      user_id: orderData.user_id || 6,
      customer_name: orderData.customer_name || 'กันดัม เลิฟเวอร์',
      order_date: new Date().toISOString(),
      total_amount: orderData.total_amount || 0,
      payment_method: orderData.payment_method || 'QR PromptPay',
      promo_code: orderData.promo_code || '-',
      shipping_address: orderData.shipping_address || '',
      order_status: 'Processing',
      items: (orderData.items || []).map(it => ({
        product_id: it.id,
        product_name: it.name,
        product_image: it.image || 'assets/images/product-freedom.png',
        quantity: it.qty || 1,
        unit_price: it.price || 0,
        custom_meta: it.customMeta || null
      }))
    };

    try {
      const raw = localStorage.getItem('unimart_local_orders');
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(newLocalOrder);
      localStorage.setItem('unimart_local_orders', JSON.stringify(arr));
    } catch {}

    try {
      const res = await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...orderData,
          items: newLocalOrder.items
        })
      });
      return res.data || newLocalOrder;
    } catch {
      return newLocalOrder;
    }
  },

  /**
   * ดึงรายการดีลสั่งทำ Custom Gunpla ทั้งหมด
   */
  async getCustomOrders() {
    const defaultDeals = [
      {
        custom_id: 1,
        deal_number: 'CUS-25691115-001',
        customer_id: 6,
        customer_name: 'กันดัม เลิฟเวอร์ (GundamLover159)',
        builder_id: 2,
        builder_name: 'ดอน แซลมอนเนลลี่ (The Godfather of Custom Paint)',
        base_product_id: 1,
        base_model_name: 'MG 1/100 Freedom GUNDAM Ver.2.0',
        custom_packages: 'Full Airbrush Custom Color + Water Slide Decal & UV Topcoat',
        color_theme: 'Titanium Pearl & Midnight Blue',
        custom_brief: 'พ่นสีขาวมุก Titanium Finish โครงในสี Gunmetal ติดดีคอลน้ำ Ver.Ka ทั้งตัวและเคลือบเงากึ่งด้าน',
        estimated_days: 14,
        total_price: 3950,
        deal_status: 'กำลังประกอบและทำสี (In Progress)',
        created_at: '2026-11-15T10:30:00.000Z'
      },
      {
        custom_id: 2,
        deal_number: 'CUS-25691117-002',
        customer_id: 6,
        customer_name: 'กันดัม เลิฟเวอร์ (GundamLover159)',
        builder_id: 1,
        builder_name: 'ช่างออร์น (Chief Forge Master & Inner Frame Specialist)',
        base_product_id: 4,
        base_model_name: 'MG 1/100 Nu GUNDAM Ver.Ka',
        custom_packages: 'Clean Straight Build + Custom LED Unit & Action Base Setup',
        color_theme: 'Original Anime Accurate + Green Psycho-Frame LED',
        custom_brief: 'เดินไฟ LED สีเขียวมรกตใต้เกราะ Psycho-Frame และดวงตา พร้อมจัดท่าปล่อย Fin Funnel บนฐานตั้ง',
        estimated_days: 10,
        total_price: 3400,
        deal_status: 'ยืนยันดีลแล้ว (Deal Confirmed)',
        created_at: '2026-11-17T14:15:00.000Z'
      }
    ];

    let localDeals = null;
    try {
      const raw = localStorage.getItem('unimart_custom_deals');
      if (raw) localDeals = JSON.parse(raw);
    } catch {}

    try {
      const res = await fetchApi('/custom-orders');
      if (res && Array.isArray(res.data)) {
        if (!localDeals) {
          localStorage.setItem('unimart_custom_deals', JSON.stringify(res.data));
          return res.data;
        }
        return localDeals;
      }
    } catch {}

    if (!localDeals) {
      try {
        localStorage.setItem('unimart_custom_deals', JSON.stringify(defaultDeals));
      } catch {}
      return defaultDeals;
    }
    return localDeals;
  },

  /**
   * บันทึกข้อตกลงดีลสั่งทำ Custom Gunpla กับช่างของ Unimart
   */
  async createCustomOrder(dealData) {
    const dealNumber = `CUS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const newDeal = {
      custom_id: Date.now(),
      deal_number: dealNumber,
      customer_id: dealData.customer_id || 6,
      customer_name: dealData.customer_name || 'กันดัม เลิฟเวอร์ (GundamLover159)',
      builder_id: dealData.builder_id || 1,
      builder_name: dealData.builder_name || 'ช่างภูมิ - ธนวัฒน์ (Lead Master Builder)',
      base_product_id: dealData.base_product_id || 1,
      base_model_name: dealData.base_model_name || 'MG 1/100 Freedom GUNDAM Ver.2.0',
      custom_packages: dealData.custom_packages || 'Clean Straight Build & Panel Line',
      color_theme: dealData.color_theme || 'Original Anime Accurate',
      custom_brief: dealData.custom_brief || '',
      estimated_days: dealData.estimated_days || 14,
      total_price: Number(dealData.total_price) || 2250,
      deal_status: dealData.deal_status || 'ยืนยันดีลแล้ว (Deal Confirmed)',
      created_at: new Date().toISOString()
    };

    try {
      const current = await this.getCustomOrders();
      current.unshift(newDeal);
      localStorage.setItem('unimart_custom_deals', JSON.stringify(current));
    } catch {}

    try {
      await fetchApi('/custom-orders', {
        method: 'POST',
        body: JSON.stringify(newDeal)
      });
    } catch {}

    return newDeal;
  },

  /**
   * อัปเดตสถานะงาน Custom Gunpla (สำหรับช่างและแอดมิน)
   */
  async updateCustomOrderStatus(customId, newStatus) {
    try {
      const current = await this.getCustomOrders();
      const idx = current.findIndex(d => String(d.custom_id) === String(customId));
      if (idx !== -1) {
        current[idx].deal_status = newStatus;
        localStorage.setItem('unimart_custom_deals', JSON.stringify(current));
      }
    } catch {}

    try {
      await fetchApi(`/custom-orders/${customId}`, {
        method: 'PUT',
        body: JSON.stringify({ deal_status: newStatus })
      });
    } catch {}
    return { success: true };
  }
};

// ============================================================================
// 6. GLOBAL SHOPPING CART, PROMO CODES & CHECKOUT ENGINE (E-COMMERCE MVP)
// ============================================================================
const PROMO_CODES = {
  'NEWBUILDER10': { code: 'NEWBUILDER10', type: 'percent', value: 10, label: 'ลด 10% ต้อนรับนักต่อกันพลาใหม่' },
  'CUSTOMDEAL300': { code: 'CUSTOMDEAL300', type: 'fixed', value: 300, label: 'ส่วนลดพิเศษค่าบริการช่าง Custom ฿300' },
  'FREESHIP': { code: 'FREESHIP', type: 'freeship', value: 80, label: 'ฟรีค่าจัดส่งด่วน EMS/Kerry (฿80)' }
};

const UnimartCart = {
  appliedPromo: null,
  selectedPayment: 'QR PromptPay',

  getItems() {
    try {
      const raw = localStorage.getItem('unimart_cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveItems(items) {
    try {
      localStorage.setItem('unimart_cart', JSON.stringify(items));
    } catch {}
    this.updateBadge();
  },

  addItem(item, openDrawer = true) {
    const items = this.getItems();
    const existingIdx = items.findIndex(x => String(x.id) === String(item.id) && !item.customMeta);
    if (existingIdx !== -1 && !item.customMeta) {
      items[existingIdx].qty = (Number(items[existingIdx].qty) || 1) + (Number(item.qty) || 1);
    } else {
      items.push({
        id: item.id || `item-${Date.now()}`,
        name: item.name || 'Gunpla Model',
        price: Number(item.price) || 0,
        qty: Number(item.qty) || 1,
        image: item.image || 'assets/images/product-freedom.png',
        grade: item.grade || 'Gunpla',
        customMeta: item.customMeta || null
      });
    }
    this.saveItems(items);
    if (openDrawer) {
      this.openCartModal();
    }
  },

  updateQty(index, delta) {
    const items = this.getItems();
    if (!items[index]) return;
    items[index].qty += delta;
    if (items[index].qty <= 0) {
      items.splice(index, 1);
    }
    this.saveItems(items);
    this.renderCartModalContent();
  },

  removeItem(index) {
    const items = this.getItems();
    items.splice(index, 1);
    this.saveItems(items);
    this.renderCartModalContent();
  },

  clear() {
    this.appliedPromo = null;
    this.saveItems([]);
  },

  getCount() {
    return this.getItems().reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
  },

  calculateTotals() {
    const items = this.getItems();
    const subtotal = items.reduce((sum, it) => sum + (Number(it.price) * Number(it.qty)), 0);
    let shipping = subtotal > 0 ? (subtotal >= 3000 ? 0 : 80) : 0;
    let discount = 0;

    if (this.appliedPromo && subtotal > 0) {
      const p = PROMO_CODES[this.appliedPromo];
      if (p) {
        if (p.type === 'percent') discount = Math.round(subtotal * (p.value / 100));
        else if (p.type === 'fixed') discount = Math.min(subtotal, p.value);
        else if (p.type === 'freeship') shipping = 0;
      }
    }

    const total = Math.max(0, subtotal - discount + shipping);
    return { subtotal, shipping, discount, total };
  },

  applyPromoCode(codeStr) {
    const clean = (codeStr || '').trim().toUpperCase();
    if (!clean) return;
    if (PROMO_CODES[clean]) {
      this.appliedPromo = clean;
      this.renderCartModalContent();
    } else {
      alert('❌ ไม่พบรหัสคูปองนี้ ลองใช้โค้ด: NEWBUILDER10, CUSTOMDEAL300 หรือ FREESHIP');
    }
  },

  updateBadge() {
    const count = this.getCount();
    document.querySelectorAll('.unimart-cart-count').forEach(el => {
      el.textContent = count;
    });
  },

  ensureModalDOM() {
    if (document.getElementById('unimart-cart-overlay')) return;
    const style = document.createElement('style');
    style.textContent = `
      #unimart-cart-overlay {
        position: fixed; inset: 0; background: rgba(9, 13, 19, 0.78);
        backdrop-filter: blur(4px); z-index: 9999; display: none;
        align-items: center; justify-content: flex-end;
      }
      #unimart-cart-overlay.open { display: flex; }
      .unimart-cart-drawer {
        width: 100%; max-width: 500px; height: 100vh; background: #0f172a;
        color: #f8fafc; display: flex; flex-direction: column;
        box-shadow: -8px 0 32px rgba(0,0,0,0.6); border-left: 1px solid rgba(255,255,255,0.12);
        font-family: 'Inter', 'Kanit', sans-serif;
      }
      .unimart-cart-header {
        padding: 18px 22px; background: #1e293b; border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex; align-items: center; justify-content: space-between;
      }
      .unimart-cart-body {
        padding: 18px 22px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px;
      }
      .unimart-cart-item {
        display: flex; gap: 12px; background: #1e293b; padding: 12px;
        border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); align-items: center;
      }
      .unimart-cart-item img {
        width: 64px; height: 64px; object-fit: cover; border-radius: 8px; background: #fff;
      }
      .unimart-cart-footer {
        padding: 16px 22px; background: #1e293b; border-top: 1px solid rgba(255,255,255,0.1);
      }
      .promo-chip {
        background: rgba(59, 130, 246, 0.18); border: 1px dashed #60a5fa; color: #93c5fd;
        padding: 4px 10px; border-radius: 999px; font-size: 0.76rem; cursor: pointer;
        transition: all 0.2s;
      }
      .promo-chip:hover { background: #2563eb; color: #fff; }
      .pay-method-btn {
        flex: 1; padding: 8px 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
        background: #0f172a; color: #cbd5e1; font-size: 0.8rem; font-weight: 600; cursor: pointer;
        text-align: center;
      }
      .pay-method-btn.active {
        border-color: #38bdf8; background: rgba(56, 189, 248, 0.15); color: #38bdf8;
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'unimart-cart-overlay';
    overlay.innerHTML = `
      <div class="unimart-cart-drawer">
        <div class="unimart-cart-header">
          <div>
            <h3 style="margin:0; font-size:1.15rem; color:#fff;">🛒 ตะกร้าสินค้า & ชำระเงิน (Checkout)</h3>
            <small style="color:#94a3b8;">UNIMART E-Commerce & Custom Gunpla Studio</small>
          </div>
          <button type="button" id="btn-close-cart-drawer" style="background:transparent; border:none; color:#94a3b8; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <div class="unimart-cart-body" id="unimart-cart-body-content"></div>
        <div class="unimart-cart-footer" id="unimart-cart-footer-content"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeCartModal();
    });
    document.getElementById('btn-close-cart-drawer').addEventListener('click', () => this.closeCartModal());
  },

  openCartModal() {
    this.ensureModalDOM();
    this.renderCartModalContent();
    document.getElementById('unimart-cart-overlay').classList.add('open');
  },

  closeCartModal() {
    const el = document.getElementById('unimart-cart-overlay');
    if (el) el.classList.remove('open');
  },

  renderCartModalContent() {
    this.ensureModalDOM();
    const bodyEl = document.getElementById('unimart-cart-body-content');
    const footerEl = document.getElementById('unimart-cart-footer-content');
    const items = this.getItems();

    if (items.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align:center; padding:45px 15px; color:#94a3b8;">
          <div style="font-size:3rem; margin-bottom:10px;">🛍️</div>
          <h4 style="color:#fff; margin-bottom:6px;">ยังไม่มีสินค้าในตะกร้า</h4>
          <p style="font-size:0.9rem; margin-bottom:18px;">เลือกช้อปกันพลา อุปกรณ์ต่อโมเดล หรือสั่งดีลงาน Custom กับช่างมืออาชีพของ UNIMART ได้เลย!</p>
          <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
            <a href="search.html" style="background:#2563eb; color:#fff; padding:9px 16px; border-radius:8px; font-weight:600; font-size:0.88rem;">เลือกดูสินค้า</a>
            <a href="custom-studio.html" style="background:linear-gradient(135deg,#f59e0b,#ea580c); color:#fff; padding:9px 16px; border-radius:8px; font-weight:600; font-size:0.88rem;">🛠️ สั่งทำ Custom กันดั้ม</a>
          </div>
        </div>
      `;
      footerEl.innerHTML = '';
      return;
    }

    const itemsHtml = items.map((it, idx) => `
      <div class="unimart-cart-item">
        <img src="${it.image || 'assets/images/product-freedom.png'}" alt="${it.name}" onerror="this.src='assets/images/product-freedom.png'">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:0.92rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${it.name}</div>
          ${it.customMeta ? `
            <div style="font-size:0.76rem; color:#fbbf24; margin-top:2px;">🛠️ ช่าง: ${it.customMeta.builderName}</div>
            <div style="font-size:0.74rem; color:#94a3b8;">แพ็กเกจ: ${it.customMeta.packages} (${it.customMeta.colorTheme})</div>
          ` : `<div style="font-size:0.78rem; color:#94a3b8;">หมวด/เกรด: ${it.grade || 'Gunpla'}</div>`}
          <div style="color:#38bdf8; font-weight:700; font-size:0.92rem; margin-top:4px;">฿${(Number(it.price) * Number(it.qty)).toLocaleString()}</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" onclick="UnimartCart.updateQty(${idx}, -1)" style="width:26px; height:26px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:#fff; cursor:pointer;">-</button>
          <span style="min-width:20px; text-align:center; font-size:0.88rem; font-weight:600;">${it.qty}</span>
          <button type="button" onclick="UnimartCart.updateQty(${idx}, 1)" style="width:26px; height:26px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:#fff; cursor:pointer;">+</button>
          <button type="button" onclick="UnimartCart.removeItem(${idx})" title="ลบ" style="margin-left:4px; background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:1rem;">🗑️</button>
        </div>
      </div>
    `).join('');

    const { subtotal, shipping, discount, total } = this.calculateTotals();
    const user = UnimartAPI.getCurrentUser();
    const defaultAddress = (user && user.address) ? user.address : '159/41 หมู่ 5 ถ.สุขุมวิท ต.บางนา อ.บางนา จ.กรุงเทพมหานคร 10260';

    bodyEl.innerHTML = `
      <div>${itemsHtml}</div>

      <!-- ส่วนโปรโมชัน & คูปองการตลาด (E-Commerce Marketing) -->
      <div style="background:#1e293b; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
        <div style="font-size:0.82rem; font-weight:700; color:#e2e8f0; margin-bottom:6px;">🎟️ โค้ดส่วนลดโปรโมชัน (คลิกเพื่อใช้คูปองทันที)</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
          <span class="promo-chip" onclick="UnimartCart.applyPromoCode('NEWBUILDER10')">NEWBUILDER10 (ลด 10%)</span>
          <span class="promo-chip" onclick="UnimartCart.applyPromoCode('CUSTOMDEAL300')">CUSTOMDEAL300 (-฿300)</span>
          <span class="promo-chip" onclick="UnimartCart.applyPromoCode('FREESHIP')">FREESHIP (ส่งฟรี)</span>
        </div>
        <div style="display:flex; gap:6px;">
          <input type="text" id="cart-promo-input" value="${this.appliedPromo || ''}" placeholder="กรอกโค้ดส่วนลด..." style="flex:1; padding:7px 10px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:0.84rem;">
          <button type="button" onclick="UnimartCart.applyPromoCode(document.getElementById('cart-promo-input').value)" style="background:#3b82f6; color:#fff; border:none; padding:7px 14px; border-radius:6px; font-weight:600; font-size:0.84rem; cursor:pointer;">ใช้โค้ด</button>
        </div>
        ${this.appliedPromo ? `<div style="color:#4ade80; font-size:0.78rem; margin-top:6px;">✅ ใช้คูปอง <b>${this.appliedPromo}</b>: ${PROMO_CODES[this.appliedPromo].label}</div>` : ''}
      </div>

      <!-- ที่อยู่จัดส่ง -->
      <div style="background:#1e293b; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
        <label style="font-size:0.82rem; font-weight:700; color:#e2e8f0; display:block; margin-bottom:4px;">📍 ที่อยู่จัดส่งสินค้า</label>
        <textarea id="cart-shipping-address" rows="2" style="width:100%; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:0.82rem;">${defaultAddress}</textarea>
      </div>

      <!-- ระบบชำระเงิน (E-Commerce Payment System) -->
      <div style="background:#1e293b; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
        <div style="font-size:0.82rem; font-weight:700; color:#e2e8f0; margin-bottom:8px;">💳 เลือกช่องทางชำระเงินออนไลน์</div>
        <div style="display:flex; gap:6px; margin-bottom:10px;">
          <button type="button" class="pay-method-btn ${this.selectedPayment === 'QR PromptPay' ? 'active' : ''}" onclick="UnimartCart.selectPayment('QR PromptPay')">📱 QR PromptPay</button>
          <button type="button" class="pay-method-btn ${this.selectedPayment === 'Credit Card' ? 'active' : ''}" onclick="UnimartCart.selectPayment('Credit Card')">💳 บัตรเครดิต</button>
          <button type="button" class="pay-method-btn ${this.selectedPayment === 'COD' ? 'active' : ''}" onclick="UnimartCart.selectPayment('COD')">🚚 เก็บปลายทาง</button>
        </div>
        ${this.selectedPayment === 'QR PromptPay' ? `
          <div style="background:#fff; color:#0f172a; padding:12px; border-radius:8px; text-align:center;">
            <div style="background:#1e3a8a; color:#fff; font-weight:700; font-size:0.8rem; padding:4px 8px; border-radius:4px; margin-bottom:8px;">THAI QR PROMPTPAY • UNIMART OFFICIAL</div>
            <div style="width:120px; height:120px; margin:0 auto 6px; border:3px solid #1e3a8a; border-radius:8px; display:flex; align-items:center; justify-content:center; background:repeating-linear-gradient(45deg,#0f172a,#0f172a 6px,#fff 6px,#fff 12px); position:relative;">
              <span style="background:#fff; padding:4px 8px; border-radius:4px; font-weight:800; font-size:0.75rem; color:#1e3a8a; box-shadow:0 2px 6px rgba(0,0,0,0.3);">SCAN PAY</span>
            </div>
            <div style="font-size:0.82rem; font-weight:700;">ยอดสแกนชำระ: <span style="color:#dc2626;">฿${total.toLocaleString()}</span></div>
          </div>
        ` : this.selectedPayment === 'Credit Card' ? `
          <div style="display:flex; flex-direction:column; gap:6px;">
            <input type="text" value="4532 •••• •••• 8891 (VISA)" readonly style="padding:7px 10px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#38bdf8; font-size:0.82rem;">
            <small style="color:#94a3b8; font-size:0.74rem;">🔒 เข้ารหัสความปลอดภัย SSL/TLS 256-bit มาตรฐาน E-Commerce Security</small>
          </div>
        ` : `
          <div style="font-size:0.8rem; color:#cbd5e1;">📦 ชำระเงินสดหรือสแกนจ่ายกับพนักงานขนส่งเมื่อได้รับสินค้าหน้าบ้าน</div>
        `}
      </div>
    `;

    footerEl.innerHTML = `
      <div style="font-size:0.84rem; display:flex; flex-direction:column; gap:4px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; color:#cbd5e1;"><span>ยอดรวมสินค้า (${this.getCount()} ชิ้น)</span><span>฿${subtotal.toLocaleString()}</span></div>
        <div style="display:flex; justify-content:space-between; color:#cbd5e1;"><span>ค่าจัดส่งด่วน (ฟรีเมื่อครบ ฿3,000)</span><span>${shipping === 0 ? '<b style="color:#4ade80;">ฟรี</b>' : '฿' + shipping}</span></div>
        ${discount > 0 ? `<div style="display:flex; justify-content:space-between; color:#4ade80;"><span>ส่วนลดโปรโมชัน (${this.appliedPromo})</span><span>-฿${discount.toLocaleString()}</span></div>` : ''}
        <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800; color:#fff; border-top:1px solid rgba(255,255,255,0.12); padding-top:8px; margin-top:4px;">
          <span>ยอดชำระสุทธิ</span><span style="color:#38bdf8;">฿${total.toLocaleString()}</span>
        </div>
      </div>
      <button type="button" onclick="UnimartCart.checkout()" style="width:100%; padding:12px; border:none; border-radius:10px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; font-weight:700; font-size:0.98rem; cursor:pointer; box-shadow:0 4px 14px rgba(37,99,235,0.4);">
        ✅ ยืนยันการชำระเงิน (฿${total.toLocaleString()})
      </button>
    `;
  },

  selectPayment(method) {
    this.selectedPayment = method;
    this.renderCartModalContent();
  },

  async checkout() {
    const items = this.getItems();
    if (items.length === 0) return;

    const { total } = this.calculateTotals();
    const addrEl = document.getElementById('cart-shipping-address');
    const shipping_address = addrEl ? addrEl.value.trim() : 'กรุงเทพมหานคร';
    const currentUser = UnimartAPI.getCurrentUser();

    const createdOrder = await UnimartAPI.createOrder({
      user_id: currentUser ? currentUser.id : 6,
      customer_name: currentUser ? currentUser.fullname : 'กันดัม เลิฟเวอร์ (GundamLover159)',
      shipping_address,
      payment_method: this.selectedPayment,
      promo_code: this.appliedPromo || '-',
      total_amount: total,
      items
    });

    this.clear();

    const bodyEl = document.getElementById('unimart-cart-body-content');
    const footerEl = document.getElementById('unimart-cart-footer-content');
    bodyEl.innerHTML = `
      <div style="text-align:center; padding:25px 12px;">
        <div style="font-size:3.2rem; margin-bottom:8px;">🎉</div>
        <h3 style="color:#4ade80; margin-bottom:6px;">ชำระเงินและสร้างคำสั่งซื้อสำเร็จ!</h3>
        <p style="font-size:0.88rem; color:#cbd5e1; margin-bottom:16px;">ขอบคุณที่ใช้บริการ UNIMART E-Commerce & Custom Studio</p>
        <div style="background:#1e293b; border:1px solid rgba(74,222,128,0.3); border-radius:10px; padding:14px; text-align:left; font-size:0.84rem; margin-bottom:18px;">
          <div style="margin-bottom:6px;"><b>หมายเลขคำสั่งซื้อ:</b> <span style="color:#38bdf8;">${createdOrder.order_number}</span></div>
          <div style="margin-bottom:6px;"><b>ช่องทางชำระเงิน:</b> ${this.selectedPayment}</div>
          <div style="margin-bottom:6px;"><b>ยอดชำระสุทธิ:</b> <span style="color:#4ade80; font-weight:700;">฿${Number(total).toLocaleString()}</span></div>
          <div><b>สถานะ:</b> กำลังเตรียมจัดส่ง / ส่งงานให้ช่าง Custom</div>
        </div>
        <div style="display:flex; gap:10px; justify-content:center;">
          <a href="profile.html" style="background:#2563eb; color:#fff; padding:10px 18px; border-radius:8px; font-weight:700; font-size:0.88rem;">ดูประวัติคำสั่งซื้อในโปรไฟล์</a>
          <button type="button" onclick="UnimartCart.closeCartModal()" style="background:#334155; color:#fff; border:none; padding:10px 16px; border-radius:8px; font-weight:600; font-size:0.88rem; cursor:pointer;">ปิดหน้าต่าง</button>
        </div>
      </div>
    `;
    footerEl.innerHTML = '';
  }
};

// ผูกอ็อบเจกต์เข้ากับ window เพื่อให้สคริปต์ในทุกหน้า HTML เรียกใช้งานได้
if (typeof window !== 'undefined') {
  window.UnimartAPI = UnimartAPI;
  window.UnimartCart = UnimartCart;
}

/**
 * ฟังก์ชันปรับปรุงแถบเมนูนำทาง (Navbar) อัตโนมัติในทุกหน้า:
 * - เพิ่มเมนู "🛠️ Custom Studio" ในแถบเมนูหลัก
 * - เพิ่มปุ่ม "🛒 ตะกร้า (N)"
 * - อัปเดตข้อความชื่อวิชาเป็น ITDS294 Fundamentals of Electronic Commerce Systems
 */
function updateNavbarAuth() {
  // 1. เพิ่มลิงก์ Custom Studio ใน Navbar ทุกหน้าถ้ายังไม่มี
  const navMenu = document.querySelector('.nav-menu');
  if (navMenu && !navMenu.querySelector('a[href="custom-studio.html"]')) {
    const li = document.createElement('li');
    const isCustomPage = window.location.pathname.includes('custom-studio.html');
    li.innerHTML = `<a href="custom-studio.html" class="nav-link ${isCustomPage ? 'active' : ''}" style="color:#fbbf24; font-weight:700;">🛠️ Custom Studio</a>`;
    // แทรกก่อนช่องค้นหา หรือต่อท้ายเมนู
    const searchLi = navMenu.querySelector('form') ? navMenu.querySelector('form').closest('li') : null;
    if (searchLi) navMenu.insertBefore(li, searchLi);
    else navMenu.appendChild(li);
  }

  const figmaNavLinks = document.querySelector('.figma-profile-nav-links');
  if (figmaNavLinks && !figmaNavLinks.querySelector('a[href="custom-studio.html"]')) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="custom-studio.html" style="color:#fbbf24; font-weight:700;">🛠️ Custom Studio</a>`;
    figmaNavLinks.appendChild(li);
  }

  // 2. อัปเดตชื่อวิชาจาก ITDS242 เป็น ITDS294 E-Commerce อัตโนมัติ
  document.querySelectorAll('.footer-bottom p, .about-hero-subtitle, .reference-card p').forEach(el => {
    if (el.innerHTML.includes('ITDS242')) {
      el.innerHTML = el.innerHTML.replace(/ITDS242 Web Technologies Lab/g, 'ITDS294 Fundamentals of Electronic Commerce Systems');
    }
  });

  // 3. จัดการปุ่มตะกร้าสินค้าและสถานะผู้ใช้ใน .nav-actions
  const currentUser = UnimartAPI.getCurrentUser();
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const cartBtnHtml = `
    <button type="button" onclick="UnimartCart.openCartModal()" class="btn-secondary" style="padding: 7px 14px; font-size: 0.88rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; border: 1px solid #38bdf8; color: #38bdf8; background: rgba(56,189,248,0.1);" title="เปิดตะกร้าสินค้าและชำระเงิน">
      🛒 ตะกร้า (<span class="unimart-cart-count">${UnimartCart.getCount()}</span>)
    </button>
  `;

  if (currentUser) {
    const isCustomer = currentUser.role === 'Customer';
    const roleBadge = isCustomer ? '👤 Customer' : '🛡️ Staff/Admin';
    const badgeColor = isCustomer ? '#2563eb' : '#0d1117';
    const roleLink = isCustomer ? 'profile.html' : 'admin-products.html';
    const roleLabel = isCustomer ? 'My Profile' : 'Admin Panel';

    navActions.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        ${cartBtnHtml}
        <span style="font-size: 0.78rem; font-weight: 700; background: ${badgeColor}; color: #ffffff; padding: 4px 10px; border-radius: 6px;">
          ${roleBadge}: ${currentUser.username}
        </span>
        <a href="${roleLink}" class="btn-primary" style="padding: 7px 14px; font-size: 0.85rem;" title="${roleLabel}">
          ${roleLabel}
        </a>
        <button type="button" id="btn-global-logout" class="btn-secondary" style="padding: 7px 12px; font-size: 0.85rem; cursor: pointer;" title="ออกจากระบบ">
          Sign out
        </button>
      </div>
    `;

    const logoutBtn = document.getElementById('btn-global-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('คุณต้องการออกจากระบบ (Sign out) ใช่หรือไม่?')) {
          UnimartAPI.logout();
        }
      });
    }
  } else {
    navActions.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        ${cartBtnHtml}
        <a href="login.html" class="btn-primary" title="เข้าสู่ระบบ">Sign in</a>
        <a href="profile.html" class="btn-secondary" title="โปรไฟล์ของฉัน">👤 Profile</a>
      </div>
    `;
  }
}

// อัปเดตเมนูอัตโนมัติเมื่อหน้าเว็บโหลดเสร็จ
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavbarAuth);
  } else {
    updateNavbarAuth();
  }
}
