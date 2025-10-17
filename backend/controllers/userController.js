const bcrypt = require('bcryptjs');
const { generateToken, users } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

class UserController {
    // Register new user
    async register(req, res) {
        try {
            const { fullName, email, password, referralCode } = req.body;

            console.log('👤 Registration attempt:', { email, fullName });

            // Check if user already exists
            const existingUser = Array.from(users.values()).find(user => user.email === email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Generate user ID and referral code
            const userId = uuidv4();
            const userReferralCode = 'NMX' + Date.now().toString().slice(-6);

            // Create user object
            const user = {
                id: userId,
                fullName,
                email,
                password: hashedPassword,
                referralCode: userReferralCode,
                balance: 25, // Welcome bonus
                miningDays: 1,
                totalEarned: 25,
                joinDate: new Date().toISOString(),
                role: 'user',
                isActive: true,
                lastLogin: new Date().toISOString()
            };

            // Handle referral if provided
            if (referralCode) {
                const referrer = Array.from(users.values()).find(u => u.referralCode === referralCode);
                if (referrer) {
                    // Add bonus to referrer
                    referrer.balance += 50;
                    referrer.totalEarned += 50;
                    
                    // Add referral to user's record
                    user.referredBy = referrer.id;
                    user.referralBonus = true;
                    
                    console.log(`🎁 Referral applied: ${referrer.email} earned 50 NMXp`);
                }
            }

            // Save user to mock database
            users.set(userId, user);

            // Generate token
            const token = generateToken(user);

            // Remove password from response
            const { password: _, ...userWithoutPassword } = user;

            console.log('✅ User registered successfully:', user.email);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: userWithoutPassword,
                token
            });

        } catch (error) {
            console.error('❌ Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during registration'
            });
        }
    }

    // Login user
    async login(req, res) {
        try {
            const { email, password } = req.body;

            console.log('🔐 Login attempt:', email);

            // Find user
            const user = Array.from(users.values()).find(u => u.email === email && u.isActive);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Update last login
            user.lastLogin = new Date().toISOString();

            // Generate token
            const token = generateToken(user);

            // Remove password from response
            const { password: _, ...userWithoutPassword } = user;

            console.log('✅ Login successful:', user.email);

            res.json({
                success: true,
                message: 'Login successful',
                user: userWithoutPassword,
                token
            });

        } catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during login'
            });
        }
    }

    // Get user profile
    async getProfile(req, res) {
        try {
            const userId = req.user.id;
            const user = users.get(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Remove password from response
            const { password, ...userProfile } = user;

            res.json({
                success: true,
                user: userProfile
            });

        } catch (error) {
            console.error('❌ Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Update user profile
    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const { fullName, email } = req.body;

            const user = users.get(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update fields
            if (fullName) user.fullName = fullName;
            if (email) {
                // Check if email is already taken by another user
                const emailExists = Array.from(users.values())
                    .some(u => u.email === email && u.id !== userId);
                
                if (emailExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email is already taken'
                    });
                }
                user.email = email;
            }

            // Remove password from response
            const { password: _, ...updatedUser } = user;

            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: updatedUser
            });

        } catch (error) {
            console.error('❌ Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get user balance
    async getBalance(req, res) {
        try {
            const userId = req.user.id;
            const user = users.get(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                balance: user.balance,
                currency: 'NMXp',
                totalEarned: user.totalEarned
            });

        } catch (error) {
            console.error('❌ Get balance error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Claim mining reward
    async claimMiningReward(req, res) {
        try {
            const userId = req.user.id;
            const user = users.get(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const rewardAmount = 30;

            // Update user balance
            user.balance += rewardAmount;
            user.totalEarned += rewardAmount;
            user.miningDays += 1;

            // Create transaction record (in real app, save to transactions table)
            const transaction = {
                id: uuidv4(),
                userId: user.id,
                type: 'mining_reward',
                amount: rewardAmount,
                description: 'Daily mining reward',
                timestamp: new Date().toISOString()
            };

            console.log(`💰 Mining reward claimed: ${user.email} earned ${rewardAmount} NMXp`);

            res.json({
                success: true,
                message: `Successfully claimed ${rewardAmount} NMXp`,
                reward: rewardAmount,
                newBalance: user.balance
            });

        } catch (error) {
            console.error('❌ Claim mining reward error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = new UserController();