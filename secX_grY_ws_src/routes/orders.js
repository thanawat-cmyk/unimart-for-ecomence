// ==============================================================================
// Faculty of Information and Communication Technology, Mahidol University
// ITDS294 Fundamentals of Electronic Commerce Systems
// File: routes/orders.js
// Description: E-Commerce Orders & Checkout Web Services (with In-Memory Fallback)
// ==============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// In-Memory Fallback Orders Store (ทำงานได้ทันทีแม้ไม่ได้เปิด MySQL)
const fallbackOrders = [
  {
    order_id: 1,
    order_number: 'ORD-25690912-001',
    user_id: 6,
    customer_name: 'กันดัม เลิฟเวอร์',
    customer_email: 'gundamlover159@gmail.com',
    order_date: '2026-09-12T11:20:00.000Z',
    total_amount: 1750.00,
    payment_method: 'QR PromptPay',
    promo_code: '-',
    shipping_address: '159/41 หมู่ 5 ถ.สุขุมวิท ต.บางนา อ.บางนา จ.กรุงเทพมหานคร 10260',
    order_status: 'Delivered',
    items: [
      {
        item_id: 1,
        order_id: 1,
        product_id: 1,
        product_name: 'MG 1/100 Freedom GUNDAM Ver.2.0',
        product_image: 'assets/images/product-freedom.png',
        quantity: 1,
        unit_price: 1750.00
      }
    ]
  }
];

// ==============================================================================
// 1. GET /api/orders/user/:userId - ดึงประวัติคำสั่งซื้อของลูกค้ารายบุคคล
// ==============================================================================
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [orderRows] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC',
      [userId]
    );

    for (const order of orderRows) {
      const [items] = await pool.query(
        `SELECT oi.*, p.name as product_name, p.image_url as product_image
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.order_id]
      );
      order.items = items;
    }

    return res.status(200).json({
      success: true,
      count: orderRows.length,
      data: orderRows
    });
  } catch (error) {
    const userOrders = fallbackOrders.filter(o => String(o.user_id) === String(userId));
    return res.status(200).json({
      success: true,
      source: 'in-memory-fallback',
      count: userOrders.length,
      data: userOrders
    });
  }
});

// ==============================================================================
// 2. GET /api/orders - ดึงรายการคำสั่งซื้อทั้งหมด (สำหรับแอดมิน)
// ==============================================================================
router.get('/', async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.fullname as customer_name, u.email as customer_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.order_date DESC`
    );

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      source: 'in-memory-fallback',
      count: fallbackOrders.length,
      data: fallbackOrders
    });
  }
});

// ==============================================================================
// 3. POST /api/orders - สร้างคำสั่งซื้อใหม่จากหน้า Checkout (E-Commerce Transaction)
// ==============================================================================
router.post('/', async (req, res) => {
  const {
    user_id = 6,
    customer_name = 'กันดัม เลิฟเวอร์',
    shipping_address = '159/41 หมู่ 5 ถ.สุขุมวิท ต.บางนา อ.บางนา จ.กรุงเทพมหานคร 10260',
    payment_method = 'QR PromptPay',
    promo_code = '',
    total_amount = 0,
    items = []
  } = req.body;

  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  try {
    const [result] = await pool.query(
      `INSERT INTO orders (order_number, user_id, total_amount, shipping_address, order_status)
       VALUES (?, ?, ?, ?, 'Processing')`,
      [orderNumber, user_id, total_amount, shipping_address]
    );
    const newOrderId = result.insertId;

    for (const item of items) {
      if (item.product_id && !String(item.product_id).startsWith('custom')) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [newOrderId, item.product_id, item.quantity || 1, item.unit_price || item.price || 0]
        );
        await pool.query(
          `UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?`,
          [item.quantity || 1, item.product_id]
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: 'สร้างคำสั่งซื้อและชำระเงินสำเร็จ',
      data: {
        order_id: newOrderId,
        order_number: orderNumber,
        user_id,
        total_amount,
        payment_method,
        promo_code,
        shipping_address,
        order_status: 'Processing',
        order_date: new Date().toISOString(),
        items
      }
    });
  } catch (error) {
    const newOrder = {
      order_id: fallbackOrders.length + 1,
      order_number: orderNumber,
      user_id,
      customer_name,
      order_date: new Date().toISOString(),
      total_amount,
      payment_method,
      promo_code,
      shipping_address,
      order_status: 'Processing',
      items: items.map((it, idx) => ({
        item_id: idx + 1,
        product_id: it.product_id || it.id || 1,
        product_name: it.product_name || it.name,
        product_image: it.product_image || it.image || 'assets/images/product-freedom.png',
        quantity: it.quantity || 1,
        unit_price: it.unit_price || it.price || 0
      }))
    };
    fallbackOrders.unshift(newOrder);

    return res.status(201).json({
      success: true,
      source: 'in-memory-fallback',
      message: 'สร้างคำสั่งซื้อและชำระเงินสำเร็จ',
      data: newOrder
    });
  }
});

module.exports = router;
