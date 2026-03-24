const bcrypt = require('bcryptjs');
const { generateAccessToken } = require('./generateTokens');
const { getDatabase } = require('./database');

/**
 * Integrated Authentication Controller
 * Combines backend bcrypt/JWT logic with SQLite database
 */

// Get database instance
const db = getDatabase();

/**
 * User Registration/Singup Controller
 * Based on the backend auth controller but adapted for SQLite
 */
const signup = async (req, res) => {
    try {
        const { fullname, email, password, phone, role, location, crop_type, land_area } = req.body;

        // Validation
        if (!fullname || !email || !password || !role) {
            return res.status(400).json({
                error: "Name, email, password, and role are required"
            });
        }

        // Validate role
        if (!['farmer', 'city_planner', 'urban', 'admin'].includes(role)) {
            return res.status(400).json({
                error: "Invalid role. Must be farmer, city_planner, urban, or admin"
            });
        }

        // Check if user already exists
        // Check if user already exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user data object
        const userData = {
            email: email,
            password: hashedPassword,
            role: role,
            name: fullname,
            location: location || '',
            crop_type: crop_type || null,
            land_area: land_area || null
        };

        // Create user in database
        const newUser = await db.createUser(userData);

        if (!newUser) {
            return res.status(500).json({ error: "Failed to create user" });
        }

        // Generate token
        const token = generateAccessToken(newUser.id);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            userid: newUser.id,
            token: token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
};

/**
 * Login Controller
 * Based on the backend auth controller but adapted for SQLite
 */
const login = async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Support both username and email as login field
        const loginField = username || email;

        if (!loginField || !password) {
            return res.status(400).json({ error: "Email/Username and password are required" });
        }

        // Find user by email
        const user = await db.authenticateUser(loginField, password);

        if (!user) {
            return res.status(401).json({ error: "User not found or invalid credentials" });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        // Generate JWT token
        const token = generateAccessToken(user.id);

        // Update last login
        await db.updateUser(user.id, { last_login: new Date().toISOString() });

        res.json({
            success: true,
            message: "Login Successful",
            token: token,
            role: user.role,
            fullname: user.name,
            user_id: user.id,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                crop_type: user.crop_type,
                land_area: user.land_area
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: "Login Failed" });
    }
};

/**
 * Logout Controller
 */
const logout = async (req, res) => {
    try {
        // In JWT-based auth, logout is handled client-side by removing token
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Current User Profile
 */
const getProfile = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const user = await db.getUserById(req.userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Remove password from response
        delete user.password;

        res.json({
            user: user
        });

    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Change Password
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current password and new password are required" });
        }

        // Get user
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.updateUser(userId, { password: hashedNewPassword });

        res.json({ message: "Password changed successfully" });

    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Validate Token
 */
const validateToken = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const user = await db.getUserById(req.userId);

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        res.json({
            valid: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Token validation error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Register Demo Users (for testing)
 * This creates some default users with proper bcrypt hashing
 */
const registerDemoUsers = async () => {
    const demoUsers = [
        {
            email: "demo@demo.com",
            password: await bcrypt.hash("demo", 10),
            role: "farmer",
            name: "Demo User",
            location: "Noida",
            crop_type: "Rice",
            land_area: "3 Hectares"
        }
    ];

    try {
        for (const demoUser of demoUsers) {
            // Check if user exists
            // Check if user exists
            const existingUser = await db.getUserByEmail(demoUser.email);
            if (!existingUser) {
                // Create the demo user
                const userData = { ...demoUser };
                delete userData.password; // Remove password for createUser call
                userData.password = demoUser.password;

                await db.createUser(userData);
                console.log(`Demo user created: ${demoUser.email}`);
            }
        }
    } catch (error) {
        console.error('Error creating demo users:', error);
    }
};

module.exports = {
    signup,
    login,
    logout,
    getProfile,
    changePassword,
    validateToken,
    registerDemoUsers
};
