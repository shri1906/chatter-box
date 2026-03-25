const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  _id:         { type: String },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  icon:        { type: String, default: 'comments' },
  color:       { type: String, default: '#25D366' },
  type:        { type: String, default: 'group' },
  createdBy:   { type: String, default: 'system' },
  members:     [{
    _id:  false,          // don't auto-create _id for subdocs
    id:   { type: String, required: true },
    name: { type: String, required: true },
  }],
  createdAt:   { type: Date, default: Date.now },
}, { versionKey: false });

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
module.exports = Room;
