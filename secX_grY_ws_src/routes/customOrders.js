// ==============================================================================
// Faculty of Information and Communication Technology, Mahidol University
// ITDS294 Fundamentals of Electronic Commerce Systems
// File: routes/customOrders.js
// Description: Custom Gunpla Build & Commission Web Services (with In-Memory Fallback)
// ==============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// In-Memory Fallback Custom Commissions Store
const fallbackCustomOrders = [
  {
    custom_id: 1,
    deal_number: 'CUS-25691115-001',
    customer_id: 6,
    customer_name: 'กันดัม เลิฟเวอร์ (GundamLover159)',
    builder_id: 2,
    builder_name: 'นายศรัณย์ วัฒนเมธี (ช่างดอน - Custom Paint & Candy Finish)',
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
    builder_name: 'นายอัครพล สุวรรณเวช (ช่างออฟ - Structural & LED Specialist)',
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

// 1. GET /api/custom-orders - ดึงรายการดีลสั่งทำ Custom ทั้งหมด
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM custom_orders ORDER BY created_at DESC');
    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      source: 'in-memory-fallback',
      count: fallbackCustomOrders.length,
      data: fallbackCustomOrders
    });
  }
});

// 2. POST /api/custom-orders - บันทึกใบดีลสั่งทำ Custom Gunpla ใหม่
router.post('/', async (req, res) => {
  const {
    customer_id = 6,
    customer_name = 'กันดัม เลิฟเวอร์ (GundamLover159)',
    builder_id = 1,
    builder_name = 'นายอัครพล สุวรรณเวช (ช่างออฟ - Structural & LED Specialist)',
    base_product_id = 1,
    base_model_name = 'MG 1/100 Freedom GUNDAM Ver.2.0',
    custom_packages = 'Clean Straight Build & Panel Line',
    color_theme = 'Original Anime Accurate',
    custom_brief = '',
    estimated_days = 14,
    total_price = 2250,
    deal_status = 'ยืนยันดีลแล้ว (Deal Confirmed)'
  } = req.body;

  const dealNumber = `CUS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  try {
    const [result] = await pool.query(
      `INSERT INTO custom_orders
       (deal_number, customer_id, customer_name, builder_id, builder_name, base_product_id, base_model_name, custom_packages, color_theme, custom_brief, estimated_days, total_price, deal_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dealNumber, customer_id, customer_name, builder_id, builder_name, base_product_id, base_model_name, custom_packages, color_theme, custom_brief, estimated_days, total_price, deal_status]
    );

    return res.status(201).json({
      success: true,
      message: 'บันทึกข้อตกลงดีลงาน Custom สำเร็จ',
      data: {
        custom_id: result.insertId,
        deal_number: dealNumber,
        customer_id,
        customer_name,
        builder_id,
        builder_name,
        base_product_id,
        base_model_name,
        custom_packages,
        color_theme,
        custom_brief,
        estimated_days,
        total_price,
        deal_status,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    const newDeal = {
      custom_id: fallbackCustomOrders.length + 1,
      deal_number: dealNumber,
      customer_id,
      customer_name,
      builder_id,
      builder_name,
      base_product_id,
      base_model_name,
      custom_packages,
      color_theme,
      custom_brief,
      estimated_days,
      total_price,
      deal_status,
      created_at: new Date().toISOString()
    };
    fallbackCustomOrders.unshift(newDeal);

    return res.status(201).json({
      success: true,
      source: 'in-memory-fallback',
      message: 'บันทึกข้อตกลงดีลงาน Custom สำเร็จ',
      data: newDeal
    });
  }
});

// 3. PUT /api/custom-orders/:id - อัปเดตสถานะงาน Custom (สำหรับช่าง/แอดมิน)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { deal_status } = req.body;

  try {
    await pool.query('UPDATE custom_orders SET deal_status = ? WHERE custom_id = ?', [deal_status, id]);
    return res.status(200).json({
      success: true,
      message: 'อัปเดตสถานะงาน Custom สำเร็จ'
    });
  } catch (error) {
    const found = fallbackCustomOrders.find(c => String(c.custom_id) === String(id));
    if (found && deal_status) {
      found.deal_status = deal_status;
    }
    return res.status(200).json({
      success: true,
      source: 'in-memory-fallback',
      message: 'อัปเดตสถานะงาน Custom สำเร็จ',
      data: found
    });
  }
});

module.exports = router;
