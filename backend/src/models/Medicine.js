const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      minlength: [2, 'Medicine name must be at least 2 characters long'],
      maxlength: [100, 'Medicine name cannot exceed 100 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer stock value',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Tablet', 'Syrup', 'Injection', 'Capsule'],
        message: '{VALUE} is not a valid category',
      },
    },
    expiry: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
medicineSchema.index({ name: 'text' });
medicineSchema.index({ name: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ expiry: 1 });
medicineSchema.index({ stock: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
