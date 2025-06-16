const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
// server.js
require('dotenv').config();


// Import models
const Order = require('./models/Order');
const Product = require('./models/Product');
const Contact = require('./models/Contact');

// Import utils
const telegramBot = require('./utils/telegramBot');
const googleSheets = require('./utils/googleSheets');

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Server xatosi', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Ichki server xatosi' 
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB successfully connected');
  // Initialize sample products if empty
  initializeSampleProducts();
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Initialize sample products
async function initializeSampleProducts() {
  try {
    // First, clear existing products to avoid duplicate key errors
    await Product.deleteMany({});
    console.log('🗑️ Existing products cleared');
    
    const count = await Product.countDocuments();
    if (count === 0) {
      const sampleProducts = [
        {
          name: 'Selofan Paket Kichik',
          description: 'Do\'konlar uchun kichik o\'lchamdagi selofan paket',
          category: 'Selofan',
          size: '20x30 sm',
          price: 500,
          inStock: true,
          quantity: 1000,
          images: ['https://picsum.photos/400/300?random=1'],
          specifications: {
            material: 'Yuqori sifatli selofan',
            thickness: '25 mikron',
            color: 'Shaffof'
          },
          inventory: {
            quantity: 1000,
            inStock: true,
            sku: 'SEL001'
          },
          seo: {
            slug: 'selofan-paket-kichik'
          }
        },
        {
          name: 'Selofan Paket O\'rta',
          description: 'O\'rta bizneslar uchun selofan paket',
          category: 'Selofan', 
          size: '30x40 sm',
          price: 800,
          inStock: true,
          quantity: 800,
          images: ['https://picsum.photos/400/300?random=2'],
          specifications: {
            material: 'Yuqori sifatli selofan',
            thickness: '30 mikron',
            color: 'Shaffof'
          },
          inventory: {
            quantity: 800,
            inStock: true,
            sku: 'SEL002'
          },
          seo: {
            slug: 'selofan-paket-orta'
          }
        },
        {
          name: 'Selofan Paket Katta',
          description: 'Yirik do\'konlar uchun katta selofan paket',
          category: 'Selofan',
          size: '40x50 sm', 
          price: 1200,
          inStock: true,
          quantity: 500,
          images: ['https://picsum.photos/400/300?random=3'],
          specifications: {
            material: 'Yuqori sifatli selofan',
            thickness: '35 mikron',
            color: 'Shaffof'
          },
          inventory: {
            quantity: 500,
            inStock: true,
            sku: 'SEL003'
          },
          seo: {
            slug: 'selofan-paket-katta'
          }
        },
        {
          name: 'Rulon Paket Kichik',
          description: 'Kichik bizneslar uchun rulon paket',
          category: 'Rulon',
          size: '30 sm kenglik',
          price: 1500,
          inStock: true,
          quantity: 200,
          images: ['https://picsum.photos/400/300?random=4'],
          specifications: {
            material: 'Polietilen',
            length: '100 metr',
            thickness: '40 mikron'
          },
          inventory: {
            quantity: 200,
            inStock: true,
            sku: 'RUL001'
          },
          seo: {
            slug: 'rulon-paket-kichik'
          }
        },
        {
          name: 'Rulon Paket O\'rta',
          description: 'O\'rta bizneslar uchun rulon paket',
          category: 'Rulon',
          size: '50 sm kenglik',
          price: 2500,
          inStock: true,
          quantity: 150,
          images: ['https://picsum.photos/400/300?random=5'],
          specifications: {
            material: 'Polietilen',
            length: '100 metr', 
            thickness: '45 mikron'
          },
          inventory: {
            quantity: 150,
            inStock: true,
            sku: 'RUL002'
          },
          seo: {
            slug: 'rulon-paket-orta'
          }
        },
        {
          name: 'Rulon Paket Katta',
          description: 'Yirik bizneslar uchun rulon paket',
          category: 'Rulon',
          size: '70 sm kenglik',
          price: 3500,
          inStock: true,
          quantity: 100,
          images: ['https://picsum.photos/400/300?random=6'],
          specifications: {
            material: 'Polietilen',
            length: '100 metr',
            thickness: '50 mikron'
          },
          inventory: {
            quantity: 100,
            inStock: true,
            sku: 'RUL003'
          },
          seo: {
            slug: 'rulon-paket-katta'
          }
        }
      ];
      
      await Product.insertMany(sampleProducts);
      console.log('✅ Sample products initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing products:', error.message);
  }
}

// Routes

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    console.log('📦 Products API called with query:', req.query);
    
    const { category, minPrice, maxPrice, search, page = 1, limit = 12 } = req.query;
    
    let filter = { status: 'active' };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('🔍 Filter being used:', filter);
    
    const products = await Product.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
      
    const total = await Product.countDocuments(filter);
    
    console.log(`✅ Found ${products.length} products out of ${total} total`);
    
    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ Products fetch error:', error);
    res.status(500).json({ message: 'Mahsulotlarni olishda xato', error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Mahsulot topilmadi' });
    }
    res.json(product);
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ message: 'Mahsulotni olishda xato' });
  }
});

// Orders endpoints
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    console.log('📦 Received order data:', JSON.stringify(orderData, null, 2));
    
    // Validate required fields
    if (!orderData.customer?.name || !orderData.customer?.phone) {
      return res.status(400).json({ message: 'Mijoz ma\'lumotlari to\'liq emas' });
    }
    
    if (!orderData.delivery?.address || !orderData.delivery?.city) {
      return res.status(400).json({ message: 'Yetkazib berish ma\'lumotlari to\'liq emas' });
    }
    
    if (!orderData.products || orderData.products.length === 0) {
      return res.status(400).json({ message: 'Mahsulotlar ro\'yxati bo\'sh' });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();
    
    const order = new Order({
      orderNumber,
      products: orderData.products.map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      customer: {
        name: orderData.customer.name,
        phone: orderData.customer.phone,
        email: orderData.customer.email
      },
      delivery: {
        address: orderData.delivery.address,
        city: orderData.delivery.city,
        deliveryNotes: orderData.delivery.deliveryNotes
      },
      payment: {
        method: orderData.payment?.method || 'cash',
        status: 'pending'
      },
      pricing: {
        subtotal: orderData.pricing?.subtotal || 0,
        deliveryCost: orderData.pricing?.deliveryCost || 50000,
        discount: orderData.pricing?.discount || 0,
        totalPrice: orderData.pricing?.totalPrice || 0
      },
      notes: {
        customerNotes: orderData.notes?.customerNotes
      },
      status: 'pending'
    });
    
    await order.save();
    console.log('✅ Order saved successfully:', order.orderNumber);
    
    // Send notifications
    try {
      await Promise.all([
        telegramBot.sendOrderNotification(order),
        googleSheets.addOrder(order)
      ]);
      console.log('✅ Notifications sent successfully');
    } catch (notificationError) {
      console.error('❌ Notification error:', notificationError.message);
      // Don't fail the order creation if notifications fail
    }
    
    res.status(201).json({
      message: 'Buyurtma muvaffaqiyatli qabul qilindi!',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalPrice: order.pricing.totalPrice,
        status: order.status
      }
    });
  } catch (error) {
    console.error('❌ Order creation error:', error);
    res.status(500).json({ 
      message: 'Buyurtma yaratishda xato', 
      error: error.message 
    });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Buyurtma topilmadi' });
    }
    res.json(order);
  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({ message: 'Buyurtmani olishda xato' });
  }
});

// Payment endpoint
app.post('/api/payment', async (req, res) => {
  const { orderId, amount, paymentMethod } = req.body;

  try {
    let paymentUrl;
    
    if (paymentMethod === 'click') {
      // Click integration
      const clickResponse = await axios.post('https://api.click.uz/v2/merchant/invoice/create', {
        service_id: process.env.CLICK_SERVICE_ID,
        amount,
        order_id: orderId,
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
        description: `Paket UZB - Buyurtma #${orderId}`
      }, {
        headers: { 'Auth': process.env.CLICK_AUTH_TOKEN }
      });
      paymentUrl = clickResponse.data.invoice_url;
      
    } else if (paymentMethod === 'payme') {
      // Payme integration
      const params = Buffer.from(JSON.stringify({
        m: process.env.PAYME_MERCHANT_ID,
        ac: { order_id: orderId },
        a: amount * 100,
        l: 'uz'
      })).toString('base64');
      paymentUrl = `https://checkout.paycom.uz/${params}`;
      
    } else {
      throw new Error('Noto\'g\'ri to\'lov usuli');
    }

    // Update order payment status
    await Order.findByIdAndUpdate(orderId, { 
      paymentStatus: 'processing',
      paymentMethod 
    });

    res.json({ 
      message: 'To\'lov boshlandi', 
      paymentUrl,
      orderId 
    });
    
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ message: 'To\'lov xatosi', error: error.message });
  }
});

// Contact endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    
    // Send notification to Telegram
    try {
      await telegramBot.sendContactNotification(contact);
    } catch (notificationError) {
      console.error('Contact notification error:', notificationError);
    }
    
    res.status(201).json({ message: 'Murojaat muvaffaqiyatli yuborildi!' });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ message: 'Murojaat saqlashda xato' });
  }
});

// Categories endpoint
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ message: 'Kategoriyalarni olishda xato' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Paket UZB Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Utility functions
function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PKT${timestamp.slice(-6)}${random}`;
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint topilmadi' });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT}-portda ishlamoqda`);
  console.log(`📱 Telegram bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not configured'}`);
  console.log(`📊 Google Sheets: ${process.env.GOOGLE_SHEETS_ID ? 'Configured' : 'Not configured'}`);
});
