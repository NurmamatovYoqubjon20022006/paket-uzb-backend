const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  products: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    size: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    image: String
  }],
  customer: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\+998[0-9]{9}$/.test(v);
        },
        message: 'Telefon raqam formati noto\'g\'ri (+998XXXXXXXXX)'
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return !v || /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Email format noto\'g\'ri'
      }
    }
  },
  delivery: {
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    },
    deliveryDate: {
      type: Date
    },
    deliveryTime: {
      type: String
    },
    deliveryNotes: {
      type: String,
      trim: true
    }
  },
  payment: {
    method: {
      type: String,
      required: true,
      enum: ['cash', 'payme', 'click', 'card']
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded']
    },
    transactionId: String,
    paymentDate: Date
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryCost: {
      type: Number,
      default: 50000,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    }
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
  },
  notes: {
    customerNotes: String,
    adminNotes: String
  },
  tracking: {
    trackingNumber: String,
    courierName: String,
    courierPhone: String
  },
  timestamps: {
    orderDate: {
      type: Date,
      default: Date.now
    },
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date
  },
  notifications: {
    telegramSent: {
      type: Boolean,
      default: false
    },
    sheetUpdated: {
      type: Boolean,
      default: false
    },
    customerNotified: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for order total items count
orderSchema.virtual('totalItems').get(function() {
  return this.products.reduce((total, product) => total + product.quantity, 0);
});

// Virtual for order age in days
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.timestamps.orderDate) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  // Calculate subtotal
  this.pricing.subtotal = this.products.reduce((total, product) => {
    return total + (product.price * product.quantity);
  }, 0);
  
  // Calculate total price
  this.pricing.totalPrice = this.pricing.subtotal + 
                           this.pricing.deliveryCost - 
                           this.pricing.discount;
  
  next();
});

// Static methods
orderSchema.statics.getOrderStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$pricing.totalPrice' }
      }
    }
  ]);
};

orderSchema.statics.findByPhone = function(phone) {
  return this.find({ 'customer.phone': phone }).sort({ createdAt: -1 });
};

// Instance methods
orderSchema.methods.updateStatus = function(newStatus, adminNotes) {
  this.status = newStatus;
  if (adminNotes) {
    this.notes.adminNotes = adminNotes;
  }
  
  // Set timestamps based on status
  const now = new Date();
  switch(newStatus) {
    case 'confirmed':
      this.timestamps.confirmedAt = now;
      break;
    case 'shipped':
      this.timestamps.shippedAt = now;
      break;
    case 'delivered':
      this.timestamps.deliveredAt = now;
      this.payment.status = 'completed';
      break;
    case 'cancelled':
      this.timestamps.cancelledAt = now;
      break;
  }
  
  return this.save();
};

orderSchema.methods.addTracking = function(trackingNumber, courierName, courierPhone) {
  this.tracking = {
    trackingNumber,
    courierName,
    courierPhone
  };
  return this.save();
};

// Indexes for better query performance
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);