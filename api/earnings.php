<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

// Only creators/editors/admins can access earnings
if (!in_array($_SESSION['user']['role'], ['editor', 'creator', 'admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied']);
    exit();
}

$action = $_GET['action'] ?? 'earnings';
$user_id = $_SESSION['user']['id'];

switch ($action) {
    case 'earnings':
        handleGetEarnings($user_id);
        break;
    case 'transactions':
        handleGetTransactions($user_id);
        break;
    case 'paid_users':
        handleGetPaidUsers($user_id);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleGetEarnings($user_id) {
    $conn = getConnection();

    // Get total earnings
    $total_sql = "SELECT COALESCE(SUM(v.price), 0) as total_earnings 
                  FROM purchases p 
                  JOIN videos v ON p.video_id = v.id 
                  WHERE v.uploader_id = ?";
    $stmt = $conn->prepare($total_sql);
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $total_result = $stmt->get_result()->fetch_assoc();

    // Get monthly earnings (current month)
    $monthly_sql = "SELECT COALESCE(SUM(v.price), 0) as monthly_earnings 
                    FROM purchases p 
                    JOIN videos v ON p.video_id = v.id 
                    WHERE v.uploader_id = ? 
                    AND MONTH(p.created_at) = MONTH(CURRENT_DATE()) 
                    AND YEAR(p.created_at) = YEAR(CURRENT_DATE())";
    $stmt = $conn->prepare($monthly_sql);
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $monthly_result = $stmt->get_result()->fetch_assoc();

    // For demo purposes, set pending earnings to 10% of total
    $pending_earnings = $total_result['total_earnings'] * 0.1;

    echo json_encode([
        'success' => true,
        'earnings' => [
            'total_earnings' => (float)$total_result['total_earnings'],
            'monthly_earnings' => (float)$monthly_result['monthly_earnings'],
            'pending_earnings' => $pending_earnings
        ]
    ]);

    $conn->close();
}

function handleGetTransactions($user_id) {
    $conn = getConnection();

    $sql = "SELECT p.created_at as date, v.title as video_title, u.name as buyer_name, v.price as amount
            FROM purchases p 
            JOIN videos v ON p.video_id = v.id 
            JOIN users u ON p.user_id = u.id 
            WHERE v.uploader_id = ? 
            ORDER BY p.created_at DESC 
            LIMIT 10";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = [
            'date' => $row['date'],
            'video_title' => $row['video_title'],
            'buyer_name' => $row['buyer_name'],
            'amount' => (float)$row['amount']
        ];
    }

    echo json_encode([
        'success' => true,
        'transactions' => $transactions
    ]);

    $conn->close();
}

function handleGetPaidUsers($user_id) {
    $conn = getConnection();

    $sql = "SELECT u.name, u.email, 
                   COUNT(p.id) as purchases_count,
                   SUM(v.price) as total_spent,
                   MAX(p.created_at) as last_purchase
            FROM users u
            JOIN purchases p ON u.id = p.user_id
            JOIN videos v ON p.video_id = v.id
            WHERE v.uploader_id = ?
            GROUP BY u.id, u.name, u.email
            ORDER BY total_spent DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
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
?>