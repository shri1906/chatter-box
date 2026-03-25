const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  channelId:    { type: String, required: true },
  channelType:  { type: String, enum: ['room', 'dm'], required: true },
  type:         { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  text:         { type: String, default: null },
  fileName:     { type: String, default: null },
  fileType:     { type: String, default: null },
  fileSize:     { type: Number, default: null },
  fileData:     { type: String, default: null },
  senderId:     { type: String, required: true },
  senderName:   { type: String, required: true },
  senderColor:  { type: String, default: null },
  senderAvatar: { type: String, default: null },
  timestamp:    { type: Date,   default: Date.now },
}, { versionKey: false });

// Compound index for efficient history queries
messageSchema.index({ channelId: 1, timestamp: 1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
module.exports = Message;
