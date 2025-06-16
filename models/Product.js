const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['Selofan', 'Rulon', 'Aksessuarlar'],
    index: true
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
  originalPrice: {
    type: Number,
    min: 0
  },
  images: [{
    type: String,
    required: true
  }],
  specifications: {
    material: String,
    thickness: String,
    length: String,
    width: String,
    color: String,
    weight: String,
    packSize: String
  },
  inventory: {
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    inStock: {
      type: Boolean,
      default: true
    },
    lowStockThreshold: {
      type: Number,
      default: 10
    },
    sku: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  seo: {
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true
    },
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  features: [String],
  usage: [String],
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  sales: {
    totalSold: {
      type: Number,
      default: 0
    },
    weekSales: {
      type: Number,
      default: 0
    },
    monthSales: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  isNew: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  suppressReservedKeysWarning: true
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.inventory.quantity === 0) return 'out_of_stock';
  if (this.inventory.quantity <= this.inventory.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

// Virtual for main image
productSchema.virtual('mainImage').get(function() {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

// Pre-save middleware
productSchema.pre('save', function(next) {
  // Generate slug from name if not provided
  if (!this.seo.slug) {
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Generate SKU if not provided
  if (!this.inventory.sku) {
    const categoryPrefix = this.category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    this.inventory.sku = `${categoryPrefix}-${timestamp}`;
  }
  
  // Update stock status
  this.inventory.inStock = this.inventory.quantity > 0;
  
  // Set isNew to false for products older than 30 days
  if (this.createdAt && (Date.now() - this.createdAt.getTime()) > (30 * 24 * 60 * 60 * 1000)) {
    this.isNew = false;
  }
  
  next();
});

// Static methods
productSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category, 
    status: 'active',
    'inventory.inStock': true 
  });
};

productSchema.statics.findFeatured = function() {
  return this.find({ 
    featured: true, 
    status: 'active',
    'inventory.inStock': true 
  });
};

productSchema.statics.findNew = function() {
  return this.find({ 
    isNew: true, 
    status: 'active',
    'inventory.inStock': true 
  }).sort({ createdAt: -1 });
};

productSchema.statics.findBestSellers = function() {
  return this.find({ 
    status: 'active',
    'inventory.inStock': true 
  }).sort({ 'sales.totalSold': -1 });
};

productSchema.statics.searchProducts = function(query) {
  return this.find({
    $and: [
      { status: 'active' },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { 'seo.keywords': { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  });
};

// Instance methods
productSchema.methods.updateStock = function(quantity, operation = 'subtract') {
  if (operation === 'subtract') {
    this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
  } else if (operation === 'add') {
    this.inventory.quantity += quantity;
  }
  
  this.inventory.inStock = this.inventory.quantity > 0;
  return this.save();
};

productSchema.methods.recordSale = function(quantity = 1) {
  this.sales.totalSold += quantity;
  this.sales.weekSales += quantity;
  this.sales.monthSales += quantity;
  
  return this.updateStock(quantity, 'subtract');
};

productSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.ratings.average * this.ratings.count) + newRating;
  this.ratings.count += 1;
  this.ratings.average = totalRating / this.ratings.count;
  
  return this.save();
};

// Indexes for better performance
productSchema.index({ category: 1, status: 1 });
productSchema.index({ 'inventory.inStock': 1, status: 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ 'sales.totalSold': -1 });
productSchema.index({ 'seo.slug': 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);