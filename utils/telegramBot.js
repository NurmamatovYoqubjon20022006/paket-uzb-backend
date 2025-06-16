const axios = require('axios');

class TelegramBot {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(text, options = {}) {
    if (!this.botToken || !this.chatId) {
      console.warn('⚠️ Telegram bot not configured - skipping message');
      return { success: false, reason: 'not_configured' };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      });
      
      console.log('✅ Telegram message sent successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Telegram send error:', error.response?.data || error.message);
      return false;
    }
  }

  async sendOrderNotification(order) {
    const productsList = order.products.map(item => 
      `• <b>${item.name}</b> (${item.size}) - ${item.quantity} ta × ${item.price.toLocaleString()} so'm`
    ).join('\n');

    const message = `
🛍 <b>YANGI BUYURTMA!</b>

📝 <b>Buyurtma raqami:</b> #${order.orderNumber}
📅 <b>Sana:</b> ${new Date(order.timestamps.orderDate).toLocaleString('uz-UZ')}

👤 <b>MIJOZ MA'LUMOTLARI:</b>
• <b>Ism:</b> ${order.customer.name}
• <b>Telefon:</b> ${order.customer.phone}
${order.customer.email ? `• <b>Email:</b> ${order.customer.email}` : ''}

📦 <b>MAHSULOTLAR:</b>
${productsList}

🏠 <b>YETKAZIB BERISH:</b>
• <b>Manzil:</b> ${order.delivery.address}
• <b>Shahar:</b> ${order.delivery.city}
${order.delivery.deliveryNotes ? `• <b>Izoh:</b> ${order.delivery.deliveryNotes}` : ''}

💰 <b>NARXLAR:</b>
• <b>Mahsulotlar:</b> ${order.pricing.subtotal.toLocaleString()} so'm
• <b>Yetkazib berish:</b> ${order.pricing.deliveryCost.toLocaleString()} so'm
${order.pricing.discount > 0 ? `• <b>Chegirma:</b> -${order.pricing.discount.toLocaleString()} so'm` : ''}
• <b>JAMI:</b> ${order.pricing.totalPrice.toLocaleString()} so'm

💳 <b>To'lov usuli:</b> ${this.getPaymentMethodText(order.payment.method)}
📊 <b>Holat:</b> ${this.getStatusText(order.status)}

${order.notes.customerNotes ? `📝 <b>Mijoz izohi:</b> ${order.notes.customerNotes}` : ''}

---
🔗 Buyurtmani ko'rish: ${process.env.ADMIN_URL || 'Admin panel'}/orders/${order._id}
    `;

    return await this.sendMessage(message);
  }

  async sendContactNotification(contact) {
    const message = `
📧 <b>YANGI MUROJAAT!</b>

👤 <b>MIJOZ:</b>
• <b>Ism:</b> ${contact.name}
• <b>Telefon:</b> ${contact.phone}
${contact.email ? `• <b>Email:</b> ${contact.email}` : ''}

📝 <b>MAVZU:</b> ${contact.subject || 'Mavzu ko\'rsatilmagan'}

💬 <b>XABAR:</b>
${contact.message}

📊 <b>Turi:</b> ${this.getContactTypeText(contact.type)}
⚡ <b>Muhimlik:</b> ${this.getPriorityText(contact.priority)}
📅 <b>Sana:</b> ${new Date(contact.createdAt).toLocaleString('uz-UZ')}

---
🔗 Javob berish: ${process.env.ADMIN_URL || 'Admin panel'}/contacts/${contact._id}
    `;

    return await this.sendMessage(message);
  }

  async sendOrderStatusUpdate(order, oldStatus, newStatus) {
    const message = `
📋 <b>BUYURTMA HOLATI O'ZGARTIRILDI</b>

📝 <b>Buyurtma:</b> #${order.orderNumber}
👤 <b>Mijoz:</b> ${order.customer.name} (${order.customer.phone})

📊 <b>Holat o'zgarishi:</b>
${this.getStatusText(oldStatus)} ➡️ ${this.getStatusText(newStatus)}

💰 <b>Summa:</b> ${order.pricing.totalPrice.toLocaleString()} so'm
📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}

${order.tracking.trackingNumber ? `🚚 <b>Track raqam:</b> ${order.tracking.trackingNumber}` : ''}
    `;

    return await this.sendMessage(message);
  }

  async sendLowStockAlert(product) {
    const message = `
⚠️ <b>PAST ZAXIRA OGOHLANTIRISHI!</b>

📦 <b>Mahsulot:</b> ${product.name}
📏 <b>O'lcham:</b> ${product.size}
📊 <b>Qolgan miqdor:</b> ${product.inventory.quantity} ta
🔻 <b>Minimal chegara:</b> ${product.inventory.lowStockThreshold} ta

💡 <b>Tavsiya:</b> Tez orada zaxirani to'ldiring!

📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}
    `;

    return await this.sendMessage(message);
  }

  async sendDailySummary(summary) {
    const message = `
📊 <b>KUNLIK HISOBOT</b>
📅 <b>Sana:</b> ${new Date().toLocaleDateString('uz-UZ')}

📦 <b>BUYURTMALAR:</b>
• Yangi buyurtmalar: ${summary.orders.new} ta
• Tasdiqlangan: ${summary.orders.confirmed} ta
• Yetkazilgan: ${summary.orders.delivered} ta
• Bekor qilingan: ${summary.orders.cancelled} ta

💰 <b>DAROMAD:</b>
• Bugungi sotuv: ${summary.revenue.today.toLocaleString()} so'm
• Haftalik sotuv: ${summary.revenue.week.toLocaleString()} so'm

📧 <b>MUROJAATLAR:</b>
• Yangi murojaatlar: ${summary.contacts.new} ta
• Javob berilgan: ${summary.contacts.replied} ta

🔝 <b>ENG KO'P SOTILGAN:</b>
${summary.topProducts.map((p, i) => `${i+1}. ${p.name} - ${p.sold} ta`).join('\n')}
    `;

    return await this.sendMessage(message);
  }

  // Helper methods
  getPaymentMethodText(method) {
    const methods = {
      'cash': '💵 Naqd pul',
      'payme': '💳 Payme',
      'click': '💳 Click',
      'card': '💳 Plastik karta'
    };
    return methods[method] || method;
  }

  getStatusText(status) {
    const statuses = {
      'pending': '⏳ Kutilmoqda',
      'confirmed': '✅ Tasdiqlangan',
      'processing': '🔄 Tayyorlanmoqda',
      'shipped': '🚚 Yuborilgan',
      'delivered': '📦 Yetkazilgan',
      'cancelled': '❌ Bekor qilingan'
    };
    return statuses[status] || status;
  }

  getContactTypeText(type) {
    const types = {
      'inquiry': '❓ So\'rov',
      'complaint': '😞 Shikoyat',
      'suggestion': '💡 Taklif',
      'support': '🆘 Yordam',
      'other': '📝 Boshqa'
    };
    return types[type] || type;
  }

  getPriorityText(priority) {
    const priorities = {
      'low': '🟢 Past',
      'medium': '🟡 O\'rtacha',
      'high': '🟠 Yuqori',
      'urgent': '🔴 Shoshilinch'
    };
    return priorities[priority] || priority;
  }

  // Test connection
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      console.log('✅ Telegram bot connected:', response.data.result.username);
      return true;
    } catch (error) {
      console.error('❌ Telegram bot connection failed:', error.message);
      return false;
    }
  }
}


module.exports = new TelegramBot();