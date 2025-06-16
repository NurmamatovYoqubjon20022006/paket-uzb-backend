const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Buyurtma qabul qilish
router.post('/', async (req, res) => {
  try {
    const { products, address, paymentMethod, date } = req.body;
    const newOrder = new Order({ products, address, paymentMethod, date });
    await newOrder.save();
    res.json({ message: 'Buyurtma qabul qilindi!', orderId: newOrder._id });
  } catch (error) {
    res.status(500).json({ message: 'Xatolik yuz berdi!' });
  }
});

module.exports = router;