// adminRoutes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    user: 'your_db_user',
    host: 'localhost',
    database: 'nemexcoin',
    password: 'your_db_password',
    port: 5432,
});

// 1. Dashboard Statistics
router.get('/dashboard-stats', async (req, res) => {
    try {
        const queries = {
            totalUsers: 'SELECT COUNT(*) FROM users',
            totalReferrals: 'SELECT COUNT(*) FROM users WHERE referrer_id IS NOT NULL',
            totalRevenue: 'SELECT COALESCE(SUM(amount), 0) FROM user_purchase_history WHERE status = $1',
            totalPurchases: 'SELECT COUNT(*) FROM user_purchase_history WHERE status = $1',
            activeUsers: 'SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL $1',
            pendingPayments: 'SELECT COUNT(*) FROM pending_transactions WHERE status = $1'
        };

        const [
            totalUsersResult,
            totalReferralsResult,
            totalRevenueResult,
            totalPurchasesResult,
            activeUsersResult,
            pendingPaymentsResult
        ] = await Promise.all([
            pool.query(queries.totalUsers),
            pool.query(queries.totalReferrals),
            pool.query(queries.totalRevenue, ['completed']),
            pool.query(queries.totalPurchases, ['completed']),
            pool.query(queries.activeUsers, ['30 days']),
            pool.query(queries.pendingPayments, ['pending'])
        ]);

        const stats = {
            totalUsers: parseInt(totalUsersResult.rows[0].count),
            totalReferrals: parseInt(totalReferralsResult.rows[0].count),
            totalRevenue: parseFloat(totalRevenueResult.rows[0].coalesce),
            totalPurchases: parseInt(totalPurchasesResult.rows[0].count),
            activeUsers: parseInt(activeUsersResult.rows[0].count),
            pendingPayments: parseInt(pendingPaymentsResult.rows[0].count)
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// 2. Recent Users
router.get('/recent-users', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;
        const query = `
            SELECT 
                id, 
                name, 
                email, 
                balance,
                created_at,
                (SELECT COUNT(*) FROM users u2 WHERE u2.referrer_id = users.id) as referrals,
                (SELECT COALESCE(SUM(amount), 0) FROM user_purchase_history WHERE user_id = users.id AND status = $1) as total_spent,
                (CASE WHEN balance > 1000 THEN true ELSE false END) as is_vip,
                'active' as status
            FROM users 
            ORDER BY created_at DESC 
            LIMIT $2
        `;

        const result = await pool.query(query, ['completed', limit]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching recent users:', error);
        res.status(500).json({ error: 'Failed to fetch recent users' });
    }
});

// 3. Pending Payments
router.get('/pending-payments', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        let query = `
            SELECT 
                pt.id,
                pt.amount,
                pt.package_name,
                pt.status,
                pt.created_at,
                pt.payment_method,
                pt.payment_proof,
                u.name as user_name,
                u.email as user_email
            FROM pending_transactions pt
            LEFT JOIN users u ON pt.user_id = u.id
            WHERE pt.status = $1
            ORDER BY pt.created_at DESC
        `;

        if (limit) {
            query += ' LIMIT $2';
            const result = await pool.query(query, ['pending', limit]);
            res.json(result.rows);
        } else {
            const result = await pool.query(query, ['pending']);
            res.json(result.rows);
        }
    } catch (error) {
        console.error('Error fetching pending payments:', error);
        res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
});

// 4. Referral Tree
router.get('/referral-tree', async (req, res) => {
    try {
        // This is a simplified version - you might want a more complex recursive query
        const query = `
            WITH RECURSIVE referral_tree AS (
                SELECT 
                    id,
                    name,
                    email,
                    referrer_id,
                    created_at,
                    1 as level,
                    ARRAY[id] as path
                FROM users 
                WHERE referrer_id IS NULL
                
                UNION ALL
                
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    u.referrer_id,
                    u.created_at,
                    rt.level + 1 as level,
                    rt.path || u.id
                FROM users u
                INNER JOIN referral_tree rt ON u.referrer_id = rt.id
                WHERE rt.level < 5 -- Limit to 5 levels deep
            )
            SELECT * FROM referral_tree 
            ORDER BY path
        `;

        const result = await pool.query(query);
        
        // Transform flat data into tree structure
        const tree = buildReferralTree(result.rows);
        res.json({ users: result.rows, tree });
    } catch (error) {
        console.error('Error fetching referral tree:', error);
        res.status(500).json({ error: 'Failed to fetch referral tree' });
    }
});

// Helper function to build referral tree
function buildReferralTree(users) {
    const map = {};
    const roots = [];
    
    users.forEach(user => {
        map[user.id] = { ...user, children: [] };
    });
    
    users.forEach(user => {
        if (user.referrer_id && map[user.referrer_id]) {
            map[user.referrer_id].children.push(map[user.id]);
        } else {
            roots.push(map[user.id]);
        }
    });
    
    return roots;
}

// 5. Orphaned Users (no referrer)
router.get('/orphaned-users', async (req, res) => {
    try {
        const query = `
            SELECT 
                id, 
                name, 
                email, 
                balance,
                created_at,
                (SELECT COUNT(*) FROM users u2 WHERE u2.referrer_id = users.id) as referrals,
                (SELECT COALESCE(SUM(amount), 0) FROM user_purchase_history WHERE user_id = users.id AND status = $1) as total_spent,
                'orphaned' as status
            FROM users 
            WHERE referrer_id IS NULL
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query, ['completed']);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching orphaned users:', error);
        res.status(500).json({ error: 'Failed to fetch orphaned users' });
    }
});

// 6. Users with No Referrals
router.get('/users-no-referrals', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.balance,
                u.created_at,
                0 as referrals,
                (SELECT COALESCE(SUM(amount), 0) FROM user_purchase_history WHERE user_id = u.id AND status = $1) as total_spent,
                'no-refs' as status
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1 FROM users u2 WHERE u2.referrer_id = u.id
            )
            ORDER BY u.created_at DESC
        `;

        const result = await pool.query(query, ['completed']);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users with no referrals:', error);
        res.status(500).json({ error: 'Failed to fetch users with no referrals' });
    }
});

// 7. Purchase History
router.get('/purchase-history', async (req, res) => {
    try {
        const query = `
            SELECT 
                uph.id,
                uph.package_name,
                uph.amount,
                uph.status,
                uph.created_at,
                u.name as user_name,
                u.email as user_email
            FROM user_purchase_history uph
            LEFT JOIN users u ON uph.user_id = u.id
            ORDER BY uph.created_at DESC
            LIMIT 100
        `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching purchase history:', error);
        res.status(500).json({ error: 'Failed to fetch purchase history' });
    }
});

// 8. Approve Payment
router.post('/payments/:id/approve', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Update transaction status
        const updateQuery = `
            UPDATE pending_transactions 
            SET status = $1, processed_at = NOW(), admin_notes = $2
            WHERE id = $3 AND status = $4
            RETURNING *
        `;
        
        const updateResult = await client.query(updateQuery, [
            'approved', 
            'Approved by admin', 
            req.params.id, 
            'pending'
        ]);

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found or already processed' });
        }

        const transaction = updateResult.rows[0];

        // Update user balance
        const balanceQuery = `
            UPDATE users 
            SET balance = balance + $1 
            WHERE id = $2
        `;
        
        await client.query(balanceQuery, [transaction.amount, transaction.user_id]);

        // Record in purchase history
        const historyQuery = `
            INSERT INTO user_purchase_history (user_id, package_name, amount, status, transaction_id)
            VALUES ($1, $2, $3, $4, $5)
        `;
        
        await client.query(historyQuery, [
            transaction.user_id,
            transaction.package_name,
            transaction.amount,
            'completed',
            transaction.id
        ]);

        await client.query('COMMIT');
        res.json({ message: 'Payment approved successfully', transaction: updateResult.rows[0] });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving payment:', error);
        res.status(500).json({ error: 'Failed to approve payment' });
    } finally {
        client.release();
    }
});

// 9. Reject Payment
router.post('/payments/:id/reject', async (req, res) => {
    try {
        const query = `
            UPDATE pending_transactions 
            SET status = $1, processed_at = NOW(), admin_notes = $2
            WHERE id = $3 AND status = $4
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            'rejected', 
            'Rejected by admin', 
            req.params.id, 
            'pending'
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found or already processed' });
        }

        res.json({ message: 'Payment rejected successfully', transaction: result.rows[0] });
    } catch (error) {
        console.error('Error rejecting payment:', error);
        res.status(500).json({ error: 'Failed to reject payment' });
    }
});

// 10. Maintenance Mode
router.post('/maintenance', async (req, res) => {
    try {
        const { enabled } = req.body;
        
        // In a real application, you might store this in a settings table or use Redis
        // For now, we'll just log it
        console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
        
        res.json({ 
            message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
            maintenance: enabled 
        });
    } catch (error) {
        console.error('Error toggling maintenance mode:', error);
        res.status(500).json({ error: 'Failed to toggle maintenance mode' });
    }
});

// 11. Export Data
router.get('/export-data', async (req, res) => {
    try {
        const queries = {
            users: 'SELECT id, name, email, balance, created_at FROM users ORDER BY created_at DESC',
            transactions: 'SELECT * FROM pending_transactions ORDER BY created_at DESC',
            purchases: 'SELECT * FROM user_purchase_history ORDER BY created_at DESC'
        };

        const [usersResult, transactionsResult, purchasesResult] = await Promise.all([
            pool.query(queries.users),
            pool.query(queries.transactions),
            pool.query(queries.purchases)
        ]);

        const exportData = {
            users: usersResult.rows,
            transactions: transactionsResult.rows,
            purchases: purchasesResult.rows,
            exported_at: new Date().toISOString()
        };

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=nemexcoin-export.csv');
        
        // Convert to CSV (simplified version)
        const csv = convertToCSV(exportData);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
    let csv = 'NemexCoin Data Export\n\n';
    
    // Users section
    csv += 'USERS\n';
    if (data.users.length > 0) {
        const headers = Object.keys(data.users[0]).join(',');
        csv += headers + '\n';
        data.users.forEach(user => {
            const row = Object.values(user).map(value => 
                typeof value === 'string' && value.includes(',') ? `"${value}"` : value
            ).join(',');
            csv += row + '\n';
        });
    }
    
    csv += '\nTRANSACTIONS\n';
    if (data.transactions.length > 0) {
        const headers = Object.keys(data.transactions[0]).join(',');
        csv += headers + '\n';
        data.transactions.forEach(transaction => {
            const row = Object.values(transaction).map(value => 
                typeof value === 'string' && value.includes(',') ? `"${value}"` : value
            ).join(',');
            csv += row + '\n';
        });
    }
    
    return csv;
}

module.exports = router;