
<?php
require_once 'config.php';
require_once 'auth.php';
require_once 'youtube_api.php';

$auth = new Auth($pdo);
$youtube = new YouTubeAPI($pdo);

if (!$auth->isLoggedIn()) {
    header('Location: index.php?action=login');
    exit;
}

$auth->requireRole(['admin', 'editor']);

$message = '';

if ($_POST && isset($_FILES['video'])) {
    $user = $auth->getCurrentUser();
    $title = $_POST['title'];
    $description = $_POST['description'];
    $tags = explode(',', $_POST['tags']);
    $price = floatval($_POST['price']);
    $isFree = isset($_POST['is_free']);
    
    // Handle file upload
    $uploadDir = 'uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $fileName = time() . '_' . $_FILES['video']['name'];
    $filePath = $uploadDir . $fileName;
    
    if (move_uploaded_file($_FILES['video']['tmp_name'], $filePath)) {
        $videoId = $youtube->uploadVideo($user['id'], $filePath, $title, $description, $tags);
        
        if ($videoId) {
            // Update video record with price info
            $stmt = $pdo->prepare("UPDATE videos SET price = ?, is_free = ? WHERE youtube_video_id = ?");
            $stmt->execute([$price, $isFree, $videoId]);
            
            $message = 'Video uploaded successfully!';
            unlink($filePath); // Remove local file after upload
        } else {
            $message = 'Failed to upload video to YouTube.';
        }
    } else {
        $message = 'Failed to upload file.';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Video - YouTube Video Manager</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Upload Video</h1>
        
        <?php if ($message): ?>
            <div class="alert <?= strpos($message, 'success') !== false ? 'alert-success' : 'alert-error' ?>">
                <?= htmlspecialchars($message) ?>
            </div>
        <?php endif; ?>
        
        <form method="POST" enctype="multipart/form-data">
            <div class="form-group">
                <label>Video File:</label>
                <div class="upload-area">
                    <input type="file" name="video" accept="video/*" required>
                    <p>Drag and drop your video file here or click to select</p>
                </div>
            </div>
            
            <div class="form-group">
                <label>Title:</label>
                <input type="text" name="title" required>
            </div>
            
            <div class="form-group">
                <label>Description:</label>
                <textarea name="description" rows="4"></textarea>
            </div>
            
            <div class="form-group">
                <label>Tags (comma-separated):</label>
                <input type="text" name="tags" placeholder="tag1, tag2, tag3">
            </div>
            
            <div class="form-group">
                <label>Price ($):</label>
                <input type="number" name="price" step="0.01" min="0" value="0">
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" name="is_free"> Free to watch
                </label>
            </div>
            
            <button type="submit" class="btn">Upload Video</button>
            <a href="index.php?action=dashboard" class="btn">Back to Dashboard</a>
        </form>
    </div>
</body>
</html>
