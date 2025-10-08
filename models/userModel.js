// models/userModel.js
const mongoose = require('mongoose');

// Define the User Schema
const userSchema = new mongoose.Schema({
    walletId: {
            type: String,
                    required: true,
                            unique: true
                                },
                                    password: {
                                            type: String,
                                                    required: true,
                                                        },
                                                            balance: {
                                                                    type: Number,
                                                                            default: 0
                                                                                },
                                                                                    lastClaim: {
                                                                                            type: Date,
                                                                                                    default: Date.now
                                                                                                        }
                                                                                                        }, { timestamps: true }); 

                                                                                                        const User = mongoose.model('User', userSchema);
                                                                                                        module.exports = User;