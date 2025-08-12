<?php
/**
 * Email Configuration for VideoHub
 */

// SMTP Configuration
define('SMTP_HOST', 'smtp-relay.sendinblue.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'phpdevgmicro@gmail.com');
define('SMTP_PASSWORD', 'N2DFZECX67YGBHRO');
define('SMTP_FROM_EMAIL', 'phpdevgmicro@gmail.com');
define('SMTP_FROM_NAME', 'Video Platform');
define('SMTP_ENCRYPTION', 'tls');

// Email templates
define('VERIFICATION_EMAIL_SUBJECT', 'Verify Your Email - VideoHub');
define('VERIFICATION_EMAIL_TEMPLATE', 'verification');
define('PASSWORD_RESET_EMAIL_SUBJECT', 'Reset Your Password - VideoHub');
define('PASSWORD_RESET_EMAIL_TEMPLATE', 'password_reset');

// App configuration
define('APP_URL', 'http://localhost:5000');
define('VERIFICATION_TOKEN_EXPIRY', 24); // hours
?>