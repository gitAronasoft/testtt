<?php
require_once 'api/smtp_config.php';

// Test SMTP connection
echo "Testing SMTP Configuration...\n";
$result = testSMTPConnection();
echo "Result: " . json_encode($result) . "\n";

// Test sending a verification email
if ($result['success']) {
    echo "\nTesting actual email sending...\n";
    
    require_once 'api/auth.php';
    
    // Test with a sample email
    $test_email = 'test@example.com';
    $test_token = 'test123';
    
    $emailResult = sendVerificationEmail($test_email, $test_token);
    echo "Email sending result: " . ($emailResult ? "SUCCESS" : "FAILED") . "\n";
}
?>