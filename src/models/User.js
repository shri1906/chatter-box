const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName:  { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  color:        { type: String, default: '#25D366' },
  avatar:       { type: String, default: null },
  status:       { type: String, default: 'Hey there! I am using ChatterBox' },
  createdAt:    { type: Date,   default: Date.now },
}, { versionKey: false });

userSchema.methods.toSafe = function () {
  return {
    id:          this._id.toString(),
    username:    this.username,
    displayName: this.displayName,
    color:       this.color,
    avatar:      this.avatar,
    status:      this.status,
    createdAt:   this.createdAt,
  };
};

// Guard against model re-registration on hot reload
const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;
