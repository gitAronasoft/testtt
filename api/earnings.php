<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit();
}

$user_id = $_SESSION['user']['id'];
$user_role = $_SESSION['user']['role'];

// Only allow creators/editors/admins to access earnings
if (!in_array($user_role, ['creator', 'editor', 'admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied']);
    exit();
}

$action = $_GET['action'] ?? 'earnings';

switch ($action) {
    case 'earnings':
        getEarnings($user_id, $user_role);
        break;
    case 'paid_users':
        getPaidUsers($user_id, $user_role);
        break;
    case 'transactions':
        getTransactions($user_id, $user_role);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getEarnings($user_id, $user_role) {
    $conn = getConnection();
    
    // Build query based on user role
    if ($user_role === 'admin') {
        // Admin sees all earnings
        $earnings_query = "
            SELECT 
                SUM(v.price) as total_earnings,
                COUNT(p.id) as total_sales,
                SUM(CASE WHEN MONTH(p.purchase_date) = MONTH(CURRENT_DATE()) 
                         AND YEAR(p.purchase_date) = YEAR(CURRENT_DATE()) 
                         THEN v.price ELSE 0 END) as monthly_earnings,
                SUM(CASE WHEN p.purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) 
                         THEN v.price ELSE 0 END) as pending_earnings
            FROM purchases p
            JOIN videos v ON p.video_id = v.id
        ";
    } else {
        // Creator/Editor sees only their earnings
        $earnings_query = "
            SELECT 
                SUM(v.price) as total_earnings,
                COUNT(p.id) as total_sales,
                SUM(CASE WHEN MONTH(p.purchase_date) = MONTH(CURRENT_DATE()) 
                         AND YEAR(p.purchase_date) = YEAR(CURRENT_DATE()) 
                         THEN v.price ELSE 0 END) as monthly_earnings,
                SUM(CASE WHEN p.purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) 
                         THEN v.price ELSE 0 END) as pending_earnings
            FROM purchases p
            JOIN videos v ON p.video_id = v.id
            WHERE v.uploader_id = ?
        ";
    }
    
    if ($user_role === 'admin') {
        $stmt = $conn->prepare($earnings_query);
        $stmt->execute();
    } else {
        $stmt = $conn->prepare($earnings_query);
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
    }
    
    $result = $stmt->get_result();
    $earnings = $result->fetch_assoc();
    
    // Convert null values to 0
    $earnings['total_earnings'] = $earnings['total_earnings'] ?? 0;
    $earnings['total_sales'] = $earnings['total_sales'] ?? 0;
    $earnings['monthly_earnings'] = $earnings['monthly_earnings'] ?? 0;
    $earnings['pending_earnings'] = $earnings['pending_earnings'] ?? 0;
    
    echo json_encode([
        'success' => true,
        'earnings' => [
            'total_earnings' => (float)$earnings['total_earnings'],
            'monthly_earnings' => (float)$earnings['monthly_earnings'],
            'pending_earnings' => (float)$earnings['pending_earnings'],
            'total_sales' => (int)$earnings['total_sales']
        ]
    ]);
    
    $conn->close();
}

function getPaidUsers($user_id, $user_role) {
    $conn = getConnection();
    
    if ($user_role === 'admin') {
        // Admin sees all paid users
        $query = "
            SELECT DISTINCT 
                u.name, u.email, 
                COUNT(p.id) as purchases_count,
                SUM(v.price) as total_spent,
                MAX(p.purchase_date) as last_purchase
            FROM purchases p
            JOIN users u ON p.user_id = u.id
            JOIN videos v ON p.video_id = v.id
            GROUP BY u.id, u.name, u.email
            ORDER BY total_spent DESC
        ";
        $stmt = $conn->prepare($query);
        $stmt->execute();
    } else {
        // Creator/Editor sees only users who bought their videos
        $query = "
            SELECT DISTINCT 
                u.name, u.email, 
                COUNT(p.id) as purchases_count,
                SUM(v.price) as total_spent,
                MAX(p.purchase_date) as last_purchase
            FROM purchases p
            JOIN users u ON p.user_id = u.id
            JOIN videos v ON p.video_id = v.id
            WHERE v.uploader_id = ?
            GROUP BY u.id, u.name, u.email
            ORDER BY total_spent DESC
        ";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
    }
    
    $result = $stmt->get_result();
    $paid_users = [];
    
    while ($row = $result->fetch_assoc()) {
        $paid_users[] = [
            'name' => $row['name'],
            'email' => $row['email'],
            'purchases_count' => (int)$row['purchases_count'],
            'total_spent' => (float)$row['total_spent'],
            'last_purchase' => $row['last_purchase']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'paid_users' => $paid_users
    ]);
    
    $conn->close();
}

function getTransactions($user_id, $user_role) {
    $conn = getConnection();
    
    if ($user_role === 'admin') {
        // Admin sees all transactions
        $query = "
            SELECT 
                p.purchase_date,
                v.title as video_title,
                u.name as buyer_name,
                u.email as buyer_email,
                v.price
            FROM purchases p
            JOIN videos v ON p.video_id = v.id
            JOIN users u ON p.user_id = u.id
            ORDER BY p.purchase_date DESC
            LIMIT 50
        ";
        $stmt = $conn->prepare($query);
        $stmt->execute();
    } else {
        // Creator/Editor sees only their video transactions
        $query = "
            SELECT 
                p.purchase_date,
                v.title as video_title,
                u.name as buyer_name,
                u.email as buyer_email,
                v.price
            FROM purchases p
            JOIN videos v ON p.video_id = v.id
            JOIN users u ON p.user_id = u.id
            WHERE v.uploader_id = ?
            ORDER BY p.purchase_date DESC
            LIMIT 50
        ";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
    }
    
    $result = $stmt->get_result();
    $transactions = [];
    
    while ($row = $result->fetch_assoc()) {
        $transactions[] = [
            'date' => $row['purchase_date'],
            'video_title' => $row['video_title'],
            'buyer_name' => $row['buyer_name'],
            'buyer_email' => $row['buyer_email'],
            'amount' => (float)$row['price']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'transactions' => $transactions
    ]);
    
    $conn->close();
}
?>
