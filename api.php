
<?php
require_once 'config.php';
require_once 'auth.php';
require_once 'payment.php';

header('Content-Type: application/json');

$auth = new Auth($pdo);
$payment = new PaymentManager($pdo);

if (!$auth->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'create_payment':
        if ($_POST) {
            $videoId = intval($_POST['video_id']);
            $user = $auth->getCurrentUser();
            
            // Get video price
            $stmt = $pdo->prepare("SELECT price FROM videos WHERE id = ?");
            $stmt->execute([$videoId]);
            $video = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($video) {
                $clientSecret = $payment->createPaymentIntent($user['id'], $videoId, $video['price']);
                if ($clientSecret) {
                    echo json_encode(['client_secret' => $clientSecret]);
                } else {
                    echo json_encode(['error' => 'Failed to create payment']);
                }
            } else {
                echo json_encode(['error' => 'Video not found']);
            }
        }
        break;
        
    case 'confirm_payment':
        if ($_POST) {
            $paymentIntentId = $_POST['payment_intent_id'];
            if ($payment->confirmPayment($paymentIntentId)) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['error' => 'Payment confirmation failed']);
            }
        }
        break;
        
    case 'get_videos':
        $user = $auth->getCurrentUser();
        $stmt = $pdo->prepare("
            SELECT v.*, u.username as uploader,
                   (SELECT COUNT(*) FROM video_access va WHERE va.video_id = v.id AND va.user_id = ?) as has_access
            FROM videos v 
            JOIN users u ON v.uploaded_by = u.id 
            ORDER BY v.created_at DESC
        ");
        $stmt->execute([$user['id']]);
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($videos as &$video) {
            $video['can_access'] = $payment->hasVideoAccess($user['id'], $video['id']);
        }
        
        echo json_encode($videos);
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Action not found']);
}
?>
