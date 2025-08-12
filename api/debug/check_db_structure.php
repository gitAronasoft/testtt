<?php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$pdo = $database->getConnection();

echo "=== Database Structure Check ===\n\n";

// Check users table
echo "USERS TABLE:\n";
try {
    $stmt = $pdo->query("DESCRIBE users");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\nVIDEOS TABLE:\n";
try {
    $stmt = $pdo->query("DESCRIBE videos");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\nPURCHASES TABLE:\n";
try {
    $stmt = $pdo->query("DESCRIBE purchases");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n=== Sample Data ===\n\n";

echo "USERS SAMPLE:\n";
try {
    $stmt = $pdo->query("SELECT * FROM users LIMIT 2");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  ID: " . $row['id'] . ", Columns: " . implode(', ', array_keys($row)) . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>