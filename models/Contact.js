const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
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
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['inquiry', 'complaint', 'suggestion', 'support', 'other'],
    default: 'inquiry'
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  adminNotes: {
    type: String,
    trim: true
  },
  repliedAt: {
    type: Date
  },
  repliedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
contactSchema.index({ status: 1 });
contactSchema.index({ type: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ createdAt: -1 });

// Static methods
contactSchema.statics.getUnreadCount = function() {
  return this.countDocuments({ status: 'new' });
};

contactSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Instance methods
contactSchema.methods.markAsRead = function() {
  this.status = 'read';
  return this.save();
};

contactSchema.methods.reply = function(repliedBy) {
  this.status = 'replied';
  this.repliedAt = new Date();
  this.repliedBy = repliedBy;
  return this.save();
};

module.exports = mongoose.model('Contact', contactSchema);