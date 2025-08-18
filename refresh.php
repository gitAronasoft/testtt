<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://oauth2.googleapis.com/token',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => 'client_secret=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&client_id=824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com&grant_type=refresh_token&refresh_token=1//0gdyFJaXrMsbICgYIARAAGBASNwF-L9Ir4sH5eDr-ls9IBCti3h8ET9Cwfr75SlxoZfzt7AQLWA2jnf8F_5ZVZOvax9bO68pNOV0',
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/x-www-form-urlencoded'
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
