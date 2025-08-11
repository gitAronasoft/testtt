<?php
/**
 * Validation utilities for VideoShare Platform
 * Input validation and sanitization functions
 */

/**
 * Validate email address
 * @param string $email
 * @return bool
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate password strength
 * @param string $password
 * @return array
 */
function validatePassword($password) {
    $errors = [];
    
    if (strlen($password) < PASSWORD_MIN_LENGTH) {
        $errors[] = "Password must be at least " . PASSWORD_MIN_LENGTH . " characters long";
    }
    
    if (!preg_match('/[A-Z]/', $password)) {
        $errors[] = "Password must contain at least one uppercase letter";
    }
    
    if (!preg_match('/[a-z]/', $password)) {
        $errors[] = "Password must contain at least one lowercase letter";
    }
    
    if (!preg_match('/[0-9]/', $password)) {
        $errors[] = "Password must contain at least one number";
    }
    
    return $errors;
}

/**
 * Validate user registration data
 * @param array $data
 * @return array
 */
function validateUserRegistration($data) {
    $errors = [];
    
    // Required fields
    $required = ['email', 'password', 'name'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            $errors[] = ucfirst($field) . " is required";
        }
    }
    
    // Email validation
    if (!empty($data['email']) && !validateEmail($data['email'])) {
        $errors[] = "Invalid email address";
    }
    
    // Password validation
    if (!empty($data['password'])) {
        $passwordErrors = validatePassword($data['password']);
        $errors = array_merge($errors, $passwordErrors);
    }
    
    // Name validation
    if (!empty($data['name']) && strlen($data['name']) < 2) {
        $errors[] = "Name must be at least 2 characters long";
    }
    
    // Role validation
    if (!empty($data['role']) && !in_array($data['role'], ['viewer', 'creator'])) {
        $errors[] = "Invalid role specified";
    }
    
    return $errors;
}

/**
 * Validate video data
 * @param array $data
 * @return array
 */
function validateVideoData($data) {
    $errors = [];
    
    // Required fields
    if (empty($data['title'])) {
        $errors[] = "Title is required";
    }
    
    if (empty($data['description'])) {
        $errors[] = "Description is required";
    }
    
    // Title length
    if (!empty($data['title']) && strlen($data['title']) > 200) {
        $errors[] = "Title must be less than 200 characters";
    }
    
    // Price validation
    if (isset($data['price'])) {
        if (!is_numeric($data['price']) || $data['price'] < 0) {
            $errors[] = "Price must be a valid positive number";
        }
        
        if ($data['price'] > 999.99) {
            $errors[] = "Price cannot exceed $999.99";
        }
    }
    
    // Category validation
    $validCategories = ['education', 'entertainment', 'technology', 'business', 'lifestyle', 'sports', 'music', 'other'];
    if (!empty($data['category']) && !in_array($data['category'], $validCategories)) {
        $errors[] = "Invalid category";
    }
    
    return $errors;
}

/**
 * Validate video rating
 * @param array $data
 * @return array
 */
function validateVideoRating($data) {
    $errors = [];
    
    if (empty($data['rating'])) {
        $errors[] = "Rating is required";
    }
    
    if (!empty($data['rating']) && (!is_numeric($data['rating']) || $data['rating'] < 1 || $data['rating'] > 5)) {
        $errors[] = "Rating must be between 1 and 5";
    }
    
    if (!empty($data['review']) && strlen($data['review']) > 1000) {
        $errors[] = "Review must be less than 1000 characters";
    }
    
    return $errors;
}

/**
 * Validate search parameters
 * @param array $params
 * @return array
 */
function validateSearchParams($params) {
    $validSorts = ['created_at', 'updated_at', 'title', 'price', 'view_count', 'rating'];
    $validOrders = ['ASC', 'DESC'];
    
    $errors = [];
    
    if (!empty($params['sort']) && !in_array($params['sort'], $validSorts)) {
        $errors[] = "Invalid sort parameter";
    }
    
    if (!empty($params['order']) && !in_array(strtoupper($params['order']), $validOrders)) {
        $errors[] = "Invalid order parameter";
    }
    
    if (!empty($params['limit']) && ($params['limit'] < 1 || $params['limit'] > MAX_PAGE_SIZE)) {
        $errors[] = "Limit must be between 1 and " . MAX_PAGE_SIZE;
    }
    
    return $errors;
}

/**
 * Validate profile update data
 * @param array $data
 * @return array
 */
function validateProfileUpdate($data) {
    $errors = [];
    
    // Name validation
    if (isset($data['name'])) {
        if (empty($data['name'])) {
            $errors[] = "Name cannot be empty";
        } elseif (strlen($data['name']) < 2) {
            $errors[] = "Name must be at least 2 characters long";
        }
    }
    
    // Bio validation
    if (isset($data['bio']) && strlen($data['bio']) > 500) {
        $errors[] = "Bio must be less than 500 characters";
    }
    
    // Email validation (if changing)
    if (isset($data['email']) && !validateEmail($data['email'])) {
        $errors[] = "Invalid email address";
    }
    
    return $errors;
}

/**
 * Sanitize and validate video search query
 * @param string $query
 * @return string
 */
function sanitizeSearchQuery($query) {
    // Remove special characters that could interfere with database queries
    $query = preg_replace('/[^\w\s-]/', '', $query);
    
    // Limit length
    $query = substr($query, 0, 100);
    
    // Trim whitespace
    return trim($query);
}

/**
 * Validate platform settings update
 * @param array $data
 * @return array
 */
function validatePlatformSettings($data) {
    $errors = [];
    
    if (isset($data['commission_rate'])) {
        if (!is_numeric($data['commission_rate']) || $data['commission_rate'] < 0 || $data['commission_rate'] > 50) {
            $errors[] = "Commission rate must be between 0 and 50";
        }
    }
    
    if (isset($data['min_payout_amount'])) {
        if (!is_numeric($data['min_payout_amount']) || $data['min_payout_amount'] < 1) {
            $errors[] = "Minimum payout amount must be at least $1";
        }
    }
    
    if (isset($data['max_video_size'])) {
        if (!is_numeric($data['max_video_size']) || $data['max_video_size'] < 1) {
            $errors[] = "Maximum video size must be at least 1 MB";
        }
    }
    
    return $errors;
}
?>